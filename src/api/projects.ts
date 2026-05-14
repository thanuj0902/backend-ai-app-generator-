import { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import {
  buildPaginatedResponse,
  buildSuccessResponse,
  getPagination,
  etagFromData,
  notModifiedIfMatch,
} from "@/server/config"
import { slugify } from "@/server/utils"
import { getAuthUser } from "@/middleware/auth"
import { parseBody, requireFields } from "@/middleware/validation"
import { handleApiError, NotFoundError, ForbiddenError } from "@/middleware/errors"
import { requestLogger } from "@/middleware/logging"
import { rateLimitMiddleware } from "@/middleware/rate-limit"
import type { ProjectStatus } from "@prisma/client"

async function getOwnedProject(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { _count: { select: { workflows: true } } },
  })
  if (!project) throw new NotFoundError("Project")
  if (project.userId !== userId) throw new ForbiddenError()
  return project
}

export async function listProjectsHandler(request: NextRequest) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const { searchParams } = request.nextUrl
    const { page, limit, skip } = getPagination(searchParams)
    const search = searchParams.get("search")
    const where: Record<string, any> = { userId: user.id }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }
    const [projects, total] = await Promise.all([
      prisma.project.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.project.count({ where }),
    ])

    const etag = etagFromData(projects)
    if (notModifiedIfMatch(request, etag)) {
      return new Response(null, { status: 304 })
    }

    const response = buildPaginatedResponse(projects, total, page, limit)
    response.headers.set("ETag", etag)
    return response
  } catch (error) {
    return handleApiError(error)
  }
}

export async function createProjectHandler(request: NextRequest) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const body = await parseBody<{ name: string; description?: string }>(request)
    requireFields(body, ["name"])
    const project = await prisma.project.create({
      data: {
        name: body.name,
        description: body.description || null,
        slug: slugify(body.name),
        userId: user.id,
        status: "DRAFT" as ProjectStatus,
      },
    })
    return buildSuccessResponse(project, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function getProjectHandler(request: NextRequest, projectId: string) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const project = await getOwnedProject(projectId, user.id)
    return buildSuccessResponse(project)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function updateProjectHandler(request: NextRequest, projectId: string) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    await getOwnedProject(projectId, user.id)
    const body = await parseBody<{ name?: string; description?: string; status?: ProjectStatus }>(request)
    const updateData: Record<string, any> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.status !== undefined) updateData.status = body.status
    const project = await prisma.project.update({ where: { id: projectId }, data: updateData })
    return buildSuccessResponse(project)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function deleteProjectHandler(request: NextRequest, projectId: string) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    await getOwnedProject(projectId, user.id)
    await prisma.project.delete({ where: { id: projectId } })
    return buildSuccessResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
