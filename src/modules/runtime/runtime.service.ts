import { prisma } from "@/server/db"

const ROOT_DOMAIN = process.env.ROOT_DOMAIN || "appforge.dev"

// ─── Subdomain Resolver ────────────────────────────────

export interface ResolvedApp {
  projectId: string
  subdomain: string
  url: string
  status: string
  config: Record<string, unknown> | null
}

export function extractSubdomain(hostname: string): string | null {
  if (!hostname) return null
  const parts = hostname.split(".")
  if (parts.length < 3) return null
  const domain = parts.slice(-2).join(".")
  if (domain !== ROOT_DOMAIN) return null
  return parts.slice(0, -2).join(".")
}

export async function resolveSubdomain(hostname: string): Promise<ResolvedApp | null> {
  const subdomain = extractSubdomain(hostname)
  if (!subdomain) return null

  const domain = await prisma.domain.findFirst({
    where: { subdomain, status: "ACTIVE" },
    include: { project: { include: { runtimeConfigs: true } } },
  })
  if (!domain) return null

  const runtimeConfig = domain.project.runtimeConfigs[0] || null
  return {
    projectId: domain.projectId,
    subdomain: domain.subdomain,
    url: `https://${subdomain}.${ROOT_DOMAIN}`,
    status: domain.project.status,
    config: (runtimeConfig?.settings as Record<string, unknown>) || null,
  }
}

export async function resolveByProjectId(projectId: string): Promise<ResolvedApp | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { domains: { where: { status: "ACTIVE" }, take: 1 }, runtimeConfigs: true },
  })
  if (!project || project.domains.length === 0) return null
  const domain = project.domains[0]
  const runtimeConfig = project.runtimeConfigs[0] || null
  return {
    projectId: project.id,
    subdomain: domain.subdomain,
    url: `https://${domain.subdomain}.${ROOT_DOMAIN}`,
    status: project.status,
    config: (runtimeConfig?.settings as Record<string, unknown>) || null,
  }
}

// ─── Route Manager ─────────────────────────────────────

export interface RouteDefinition {
  id: string
  path: string
  type: "API" | "PAGE" | "STATIC"
  method?: string
  config?: Record<string, unknown>
  priority: number
}

export async function getAppRoutes(projectId: string): Promise<RouteDefinition[]> {
  const routes = await prisma.appRoute.findMany({ where: { projectId }, orderBy: { priority: "asc" } })
  return routes.map((r) => ({
    id: r.id, path: r.path, type: r.type as "API" | "PAGE" | "STATIC",
    method: r.method || undefined, config: (r.config as Record<string, unknown>) || undefined, priority: r.priority,
  }))
}

export async function createRoute(projectId: string, definition: Omit<RouteDefinition, "id">): Promise<RouteDefinition> {
  const existing = await prisma.appRoute.findUnique({ where: { projectId_path: { projectId, path: definition.path } } })
  if (existing) throw new Error(`Route already exists for path: ${definition.path}`)
  const route = await prisma.appRoute.create({
    data: { projectId, path: definition.path, type: definition.type, method: definition.method, config: definition.config as any, priority: definition.priority },
  })
  return { id: route.id, path: route.path, type: route.type as "API" | "PAGE" | "STATIC", method: route.method || undefined, config: (route.config as Record<string, unknown>) || undefined, priority: route.priority }
}

export async function updateRoute(routeId: string, updates: Partial<Omit<RouteDefinition, "id">>): Promise<RouteDefinition> {
  const route = await prisma.appRoute.update({
    where: { id: routeId },
    data: { ...(updates.path ? { path: updates.path } : {}), ...(updates.type ? { type: updates.type } : {}), ...(updates.method ? { method: updates.method } : {}), ...(updates.config ? { config: updates.config as any } : {}), ...(updates.priority !== undefined ? { priority: updates.priority } : {}) },
  })
  return { id: route.id, path: route.path, type: route.type as "API" | "PAGE" | "STATIC", method: route.method || undefined, config: (route.config as Record<string, unknown>) || undefined, priority: route.priority }
}

export async function deleteRoute(routeId: string): Promise<void> {
  await prisma.appRoute.delete({ where: { id: routeId } })
}

export async function syncRoutesFromGeneration(projectId: string, files: Array<{ path: string; language: string }>): Promise<void> {
  await prisma.appRoute.deleteMany({ where: { projectId } })

  const routes: Array<{ projectId: string; path: string; type: string; method: string | null; priority: number }> = []
  for (const file of files) {
    const route = inferRouteFromFile(file.path, file.language)
    if (route) routes.push({ projectId, ...route })
  }
  if (routes.length > 0) await prisma.appRoute.createMany({ data: routes })
}

function inferRouteFromFile(filePath: string, language: string): { path: string; type: string; method: string | null; priority: number } | null {
  const normalized = filePath.replace(/\\/g, "/")

  if (normalized.startsWith("pages/") || normalized.startsWith("src/pages/")) {
    const routePath = normalized.replace(/^src\/pages\//, "").replace(/^pages\//, "").replace(/\.(tsx|jsx|ts|js)$/, "").replace(/\/index$/, "").replace(/\[\.\.\./, ":").replace(/\[/, ":").replace(/\]/g, "")
    return { path: `/${routePath}`, type: "PAGE", method: null, priority: routePath === "" ? 0 : 10 }
  }
  if (normalized.startsWith("api/") || normalized.startsWith("src/pages/api/")) {
    const routePath = normalized.replace(/^src\/pages\/api\//, "").replace(/^api\//, "").replace(/\.(ts|js)$/, "").replace(/\/index$/, "")
    return { path: `/api/${routePath}`, type: "API", method: "GET", priority: 20 }
  }
  if (["html", "css", "js", "json", "svg", "png", "ico"].includes(language)) {
    return { path: `/${normalized}`, type: "STATIC", method: null, priority: 30 }
  }
  return null
}

// ─── Config Loader ─────────────────────────────────────

export interface RuntimeConfigData {
  environment: Record<string, string>
  variables: Record<string, string>
  features: Record<string, boolean>
  settings: Record<string, unknown>
}

export async function getRuntimeConfig(projectId: string): Promise<RuntimeConfigData | null> {
  const config = await prisma.runtimeConfig.findUnique({ where: { projectId } })
  if (!config) return null
  return {
    environment: (config.environment as Record<string, string>) || {},
    variables: (config.variables as Record<string, string>) || {},
    features: (config.features as Record<string, boolean>) || {},
    settings: (config.settings as Record<string, unknown>) || {},
  }
}

export async function upsertRuntimeConfig(projectId: string, data: Partial<RuntimeConfigData>): Promise<RuntimeConfigData> {
  const existing = await prisma.runtimeConfig.findUnique({ where: { projectId } })
  const merged: RuntimeConfigData = {
    environment: { ...(existing?.environment as Record<string, string>), ...data.environment },
    variables: { ...(existing?.variables as Record<string, string>), ...data.variables },
    features: { ...(existing?.features as Record<string, boolean>), ...data.features },
    settings: { ...(existing?.settings as Record<string, unknown>), ...data.settings },
  }
  const config = await prisma.runtimeConfig.upsert({
    where: { projectId },
    create: { projectId, environment: merged.environment as any, variables: merged.variables as any, features: merged.features as any, settings: merged.settings as any },
    update: { environment: merged.environment as any, variables: merged.variables as any, features: merged.features as any, settings: merged.settings as any },
  })
  return {
    environment: (config.environment as Record<string, string>) || {},
    variables: (config.variables as Record<string, string>) || {},
    features: (config.features as Record<string, boolean>) || {},
    settings: (config.settings as Record<string, unknown>) || {},
  }
}

export async function deleteRuntimeConfig(projectId: string): Promise<void> {
  await prisma.runtimeConfig.delete({ where: { projectId } }).catch(() => {})
}

export async function getRuntimeConfigValue(projectId: string, key: string): Promise<string | boolean | unknown | null> {
  const config = await getRuntimeConfig(projectId)
  if (!config) return null
  if (key in config.environment) return config.environment[key]
  if (key in config.variables) return config.variables[key]
  if (key in config.features) return config.features[key]
  return null
}
