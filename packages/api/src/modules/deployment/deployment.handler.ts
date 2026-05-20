import { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { buildSuccessResponse, buildPaginatedResponse, getPagination } from "@/server/config"
import { getAuthUser } from "@/middleware/auth"
import { parseBody, requireFields } from "@/middleware/validation"
import { handleApiError, NotFoundError } from "@/middleware/errors"
import { requestLogger } from "@/middleware/logging"
import { rateLimitMiddleware } from "@/middleware/rate-limit"
import {
  startDeploymentPipeline,
  listDeployments,
  rollbackDeployment,
  updateDeploymentStatus,
  getDeploymentStatus,
  registerDomain,
} from "./deployment.service"

export async function listDeploymentsHandler(request: NextRequest) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const { searchParams } = request.nextUrl
    const projectId = searchParams.get("projectId")
    if (!projectId) return buildSuccessResponse([])

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project || project.userId !== user.id) throw new NotFoundError("Project")

    const { page, limit } = getPagination(searchParams)
    const [total, deployments] = await Promise.all([
      prisma.deployment.count({ where: { projectId } }),
      prisma.deployment.findMany({
        where: { projectId },
        orderBy: { version: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return buildPaginatedResponse(deployments, total, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function createDeploymentHandler(request: NextRequest) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const body = await parseBody<{ projectId: string; generationId?: string }>(request)
    requireFields(body, ["projectId"])

    const project = await prisma.project.findUnique({ where: { id: body.projectId } })
    if (!project || project.userId !== user.id) throw new NotFoundError("Project")

    const result = await startDeploymentPipeline({
      projectId: body.projectId,
      generationId: body.generationId,
    })

    return buildSuccessResponse(result, 202)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function getDeploymentHandler(request: NextRequest, deploymentId: string) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const deployment = await prisma.deployment.findUnique({ where: { id: deploymentId }, include: { project: true } })
    if (!deployment) throw new NotFoundError("Deployment")
    if (deployment.project.userId !== user.id) throw new NotFoundError("Deployment")
    return buildSuccessResponse(deployment)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function checkDeploymentStatusHandler(request: NextRequest, deploymentId: string) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const deployment = await prisma.deployment.findUnique({ where: { id: deploymentId }, include: { project: true } })
    if (!deployment) throw new NotFoundError("Deployment")
    if (deployment.project.userId !== user.id) throw new NotFoundError("Deployment")

    if (deployment.url) {
      try {
        const cfStatus = await getDeploymentStatus(deploymentId)
        await updateDeploymentStatus(deploymentId, cfStatus.status.toUpperCase(), { url: cfStatus.url || undefined })
      } catch { /* optional */ }
    }

    const updated = await prisma.deployment.findUnique({ where: { id: deploymentId } })
    return buildSuccessResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function rollbackDeploymentHandler(request: NextRequest, projectId: string) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project || project.userId !== user.id) throw new NotFoundError("Project")

    const body = await parseBody<{ version: number }>(request)
    requireFields(body, ["version"])

    const result = await rollbackDeployment(projectId, body.version)
    if (!result) return buildSuccessResponse({ error: "Target deployment not found or not active" }, 404)
    return buildSuccessResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function registerDomainHandler(request: NextRequest, projectId: string) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project || project.userId !== user.id) throw new NotFoundError("Project")

    const body = await parseBody<{ subdomain?: string }>(request)
    const subdomain = body.subdomain || `${(project.slug || project.name).toLowerCase().replace(/[^a-z0-9-]/g, "-")}-${Math.random().toString(36).substring(2, 6)}`
    const domain = await registerDomain(projectId, subdomain)
    return buildSuccessResponse(domain, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
