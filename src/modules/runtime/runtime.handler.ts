import { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { buildSuccessResponse } from "@/server/config"
import { getAuthUser } from "@/middleware/auth"
import { parseBody, requireFields } from "@/middleware/validation"
import { handleApiError, NotFoundError } from "@/middleware/errors"
import { requestLogger } from "@/middleware/logging"
import { rateLimitMiddleware } from "@/middleware/rate-limit"
import {
  getRuntimeConfig,
  upsertRuntimeConfig,
  getAppRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
  syncRoutesFromGeneration,
  resolveSubdomain,
  extractSubdomain,
} from "./runtime.service"

export async function getRuntimeConfigHandler(request: NextRequest, projectId: string) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project || project.userId !== user.id) throw new NotFoundError("Project")
    const config = await getRuntimeConfig(projectId)
    return buildSuccessResponse(config || { environment: {}, variables: {}, features: {}, settings: {} })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function upsertRuntimeConfigHandler(request: NextRequest, projectId: string) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project || project.userId !== user.id) throw new NotFoundError("Project")
    const body = await parseBody<{ environment?: Record<string, string>; variables?: Record<string, string>; features?: Record<string, boolean>; settings?: Record<string, unknown> }>(request)
    const config = await upsertRuntimeConfig(projectId, body)
    return buildSuccessResponse(config)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function listAppRoutesHandler(request: NextRequest, projectId: string) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project || project.userId !== user.id) throw new NotFoundError("Project")
    const routes = await getAppRoutes(projectId)
    return buildSuccessResponse(routes)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function createAppRouteHandler(request: NextRequest, projectId: string) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project || project.userId !== user.id) throw new NotFoundError("Project")
    const body = await parseBody<{ path: string; type: "API" | "PAGE" | "STATIC"; method?: string; config?: Record<string, unknown>; priority?: number }>(request)
    requireFields(body, ["path", "type"])
    const route = await createRoute(projectId, { path: body.path, type: body.type, method: body.method, config: body.config, priority: body.priority || 0 })
    return buildSuccessResponse(route, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function updateAppRouteHandler(request: NextRequest, projectId: string, routeId: string) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project || project.userId !== user.id) throw new NotFoundError("Project")
    const body = await parseBody<{ path?: string; type?: "API" | "PAGE" | "STATIC"; method?: string; config?: Record<string, unknown>; priority?: number }>(request)
    const route = await updateRoute(routeId, body)
    return buildSuccessResponse(route)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function deleteAppRouteHandler(request: NextRequest, projectId: string, routeId: string) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project || project.userId !== user.id) throw new NotFoundError("Project")
    await deleteRoute(routeId)
    return buildSuccessResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function resolveSubdomainHandler(request: NextRequest) {
  try {
    requestLogger(request)
    const hostname = request.headers.get("host") || request.nextUrl.hostname
    const subdomain = extractSubdomain(hostname)
    if (!subdomain) return buildSuccessResponse({ resolved: false, subdomain: null })
    const app = await resolveSubdomain(hostname)
    if (!app) return buildSuccessResponse({ resolved: false, subdomain })
    return buildSuccessResponse({ resolved: true, ...app })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function syncRoutesFromGenerationHandler(request: NextRequest, projectId: string) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project || project.userId !== user.id) throw new NotFoundError("Project")
    const body = await parseBody<{ generationId: string }>(request)
    requireFields(body, ["generationId"])
    const generation = await prisma.generation.findUnique({ where: { id: body.generationId } })
    if (!generation || generation.projectId !== projectId) throw new NotFoundError("Generation")
    const result = generation.result as { files?: Array<{ path: string; language: string }> } | null
    if (!result?.files) return buildSuccessResponse({ synced: false, message: "No files in generation result" })
    await syncRoutesFromGeneration(projectId, result.files)
    return buildSuccessResponse({ synced: true, count: result.files.length })
  } catch (error) {
    return handleApiError(error)
  }
}
