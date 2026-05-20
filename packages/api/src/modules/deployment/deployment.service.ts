import { prisma } from "@/server/db"
import { enqueueJob } from "@/modules/queue"

const ROOT_DOMAIN = process.env.ROOT_DOMAIN || "appforge.dev"
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || ""
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || ""
const CF_PAGES_PROJECT = process.env.CLOUDFLARE_PAGES_PROJECT || ""
const CF_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID || ""

// ─── DNS & Subdomains ──────────────────────────────────

export function generateSubdomain(projectSlug: string): string {
  const safe = projectSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 63)
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${safe}-${suffix}`
}

export function buildPreviewUrl(subdomain: string): string {
  return `https://${subdomain}.${ROOT_DOMAIN}`
}

export function buildDeployUrl(subdomain: string): string {
  return `https://${subdomain}.${CF_PAGES_PROJECT || "ai-app-generator"}.pages.dev`
}

export async function createDnsRecord(
  subdomain: string,
  target: string,
  type: "CNAME" | "A" = "CNAME",
): Promise<string> {
  if (!CLOUDFLARE_API_TOKEN || !CF_ZONE_ID) {
    throw new Error("Cloudflare DNS not configured.")
  }
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` },
      body: JSON.stringify({ type, name: subdomain, content: target, ttl: 120, proxied: true }),
    },
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DNS record creation failed (${res.status}): ${err}`)
  }
  const data = await res.json()
  return data.result.id
}

export async function registerDomain(projectId: string, subdomain: string): Promise<{
  id: string
  subdomain: string
  url: string
}> {
  const existing = await prisma.domain.findUnique({
    where: { projectId_subdomain: { projectId, subdomain } },
  })
  if (existing) {
    return { id: existing.id, subdomain: existing.subdomain, url: buildPreviewUrl(existing.subdomain) }
  }

  const target = `${CF_PAGES_PROJECT || "ai-app-generator"}.pages.dev`
  let dnsRecordId: string | null = null
  try {
    dnsRecordId = await createDnsRecord(subdomain, target)
  } catch (error) {
    console.warn("[DNS] Failed to create DNS record:", error)
  }

  const domain = await prisma.domain.create({
    data: { projectId, subdomain, domain: ROOT_DOMAIN, status: dnsRecordId ? "ACTIVE" : "PENDING", dnsRecordId },
  })
  return { id: domain.id, subdomain: domain.subdomain, url: buildPreviewUrl(domain.subdomain) }
}

// ─── Cloudflare Pages ──────────────────────────────────

export async function triggerDeployHook(hookUrl: string): Promise<{ id: string; url: string; status: string }> {
  const res = await fetch(hookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Deploy hook error (${res.status}): ${err}`)
  }
  return res.json()
}

export async function getDeploymentStatus(deploymentId: string): Promise<{
  status: string
  url: string | null
  environment: string
}> {
  if (!CLOUDFLARE_API_TOKEN || !CF_ACCOUNT_ID || !CF_PAGES_PROJECT) {
    throw new Error("Cloudflare credentials not configured")
  }
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${CF_PAGES_PROJECT}/deployments/${deploymentId}`,
    { headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` } },
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Cloudflare status error (${res.status}): ${err}`)
  }
  const data = await res.json()
  return {
    status: data.result.status,
    url: data.result.url || null,
    environment: data.result.environment || "preview",
  }
}

export function isCloudflareConfigured(): boolean {
  return !!(CLOUDFLARE_API_TOKEN && CF_ACCOUNT_ID && CF_PAGES_PROJECT)
}

// ─── Tracking & Pipeline ───────────────────────────────

export async function trackDeploymentStart(
  projectId: string,
  generationId?: string,
): Promise<string> {
  const latestDeployment = await prisma.deployment.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
  })
  const deployment = await prisma.deployment.create({
    data: { projectId, generationId, version: (latestDeployment?.version || 0) + 1, status: "PENDING" },
  })
  return deployment.id
}

export async function updateDeploymentStatus(
  deploymentId: string,
  status: string,
  extra?: { url?: string; errorMessage?: string },
): Promise<void> {
  const data: Record<string, unknown> = { status }
  if (extra?.url) data.url = extra.url
  if (extra?.errorMessage) data.errorMessage = extra.errorMessage
  if (["ACTIVE", "FAILED", "ROLLED_BACK"].includes(status)) data.completedAt = new Date()
  if (status === "ACTIVE" || status === "BUILDING") data.startedAt = new Date()

  await prisma.deployment.update({ where: { id: deploymentId }, data: data as any })
}

async function sendDeploymentWebhook(
  projectId: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return
  await enqueueJob({
    type: "WEBHOOK",
    payload: { projectId, event, ...payload, userId: project.userId },
  })
}

export async function listDeployments(
  projectId: string,
  limit: number = 10,
): Promise<{ deploymentId: string; status: string; url: string | null; version: number }[]> {
  const deployments = await prisma.deployment.findMany({
    where: { projectId },
    orderBy: { version: "desc" },
    take: limit,
  })
  return deployments.map((d) => ({ deploymentId: d.id, status: d.status, url: d.url, version: d.version }))
}

export async function rollbackDeployment(
  projectId: string,
  targetVersion: number,
): Promise<{ deploymentId: string; status: string; url: string | null; version: number } | null> {
  const target = await prisma.deployment.findFirst({
    where: { projectId, version: targetVersion, status: "ACTIVE" },
  })
  if (!target) return null
  const deployment = await prisma.deployment.create({
    data: { projectId, generationId: target.generationId, version: target.version + 1, status: "ACTIVE", url: target.url, environment: target.environment as any },
  })
  return { deploymentId: deployment.id, status: deployment.status, url: deployment.url, version: deployment.version }
}

export async function startDeploymentPipeline(options: {
  projectId: string
  generationId?: string
}): Promise<{ deploymentId: string; status: string; url: null; version: number }> {
  const { projectId, generationId } = options
  const deploymentId = await trackDeploymentStart(projectId, generationId)
  await updateDeploymentStatus(deploymentId, "BUILDING")

  await enqueueJob({
    type: "DEPLOYMENT",
    payload: { deploymentId, projectId, generationId },
    maxRetries: 2,
  })

  await sendDeploymentWebhook(projectId, "deployment.started", { deploymentId, projectId })

  const deployment = await prisma.deployment.findUnique({ where: { id: deploymentId } })
  return { deploymentId, status: "BUILDING", url: null, version: deployment?.version || 1 }
}

export async function executeDeploymentPipeline(deploymentId: string): Promise<void> {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { project: true },
  })
  if (!deployment) throw new Error(`Deployment ${deploymentId} not found`)

  try {
    await updateDeploymentStatus(deploymentId, "BUILDING")
    await updateDeploymentStatus(deploymentId, "UPLOADING")

    const project = deployment.project
    let subdomain = project.subdomain
    if (!subdomain) {
      subdomain = generateSubdomain(project.slug || project.name)
      const domain = await registerDomain(project.id, subdomain)
      subdomain = domain.subdomain
      await prisma.project.update({ where: { id: project.id }, data: { subdomain } })
    }

    if (isCloudflareConfigured()) {
      const deployHookUrl = process.env.CLOUDFLARE_DEPLOY_HOOK_URL
      if (deployHookUrl) await triggerDeployHook(deployHookUrl)
    }

    await updateDeploymentStatus(deploymentId, "ACTIVATING")
    const deployUrl = buildDeployUrl(subdomain)

    await prisma.project.update({
      where: { id: project.id },
      data: { deployedUrl: deployUrl, status: "COMPLETE" },
    })

    await updateDeploymentStatus(deploymentId, "ACTIVE", { url: deployUrl })
    await sendDeploymentWebhook(project.id, "deployment.completed", {
      deploymentId, projectId: project.id, url: deployUrl, subdomain,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Deployment pipeline failed"
    await updateDeploymentStatus(deploymentId, "FAILED", { errorMessage: message })
    await sendDeploymentWebhook(deployment.projectId, "deployment.failed", {
      deploymentId, projectId: deployment.projectId, error: message,
    })
    throw error
  }
}
