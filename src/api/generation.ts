import { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { buildSuccessResponse } from "@/server/config"
import { getAuthUser } from "@/middleware/auth"
import { parseBody, requireFields } from "@/middleware/validation"
import { handleApiError, NotFoundError } from "@/middleware/errors"
import { requestLogger } from "@/middleware/logging"
import { rateLimitMiddleware } from "@/middleware/rate-limit"
import { generateAppCode } from "@/services/ai"

export async function startGenerationHandler(request: NextRequest) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const body = await parseBody<{ projectId: string; prompt: string }>(request)
    requireFields(body, ["projectId", "prompt"])

    const project = await prisma.project.findUnique({ where: { id: body.projectId } })
    if (!project) throw new NotFoundError("Project")
    if (project.userId !== user.id) throw new NotFoundError("Project")

    const generation = await prisma.generation.create({
      data: {
        projectId: body.projectId,
        prompt: body.prompt,
        status: "PENDING",
      },
    })

    prisma.project.update({ where: { id: body.projectId }, data: { status: "GENERATING" } }).catch(() => {})

    generateAppCode(body.prompt)
      .then(async (result) => {
        await prisma.generation.update({
          where: { id: generation.id },
          data: { status: "COMPLETE", result: result as any, completedAt: new Date() },
        })
        await prisma.project.update({ where: { id: body.projectId }, data: { status: "COMPLETE" } })
      })
      .catch(async (err) => {
        await prisma.generation.update({
          where: { id: generation.id },
          data: { status: "ERROR", errorMessage: err.message || "Generation failed", completedAt: new Date() },
        })
        await prisma.project.update({ where: { id: body.projectId }, data: { status: "ERROR" } })
      })

    return buildSuccessResponse(generation, 202)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function getGenerationHandler(request: NextRequest, generationId: string) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const generation = await prisma.generation.findUnique({ where: { id: generationId } })
    if (!generation) throw new NotFoundError("Generation")
    const project = await prisma.project.findUnique({ where: { id: generation.projectId } })
    if (!project || project.userId !== user.id) throw new NotFoundError("Generation")
    return buildSuccessResponse(generation)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function listGenerationsHandler(request: NextRequest) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const { searchParams } = request.nextUrl
    const projectId = searchParams.get("projectId")
    const where: Record<string, any> = { project: { userId: user.id } }
    if (projectId) where.projectId = projectId
    const generations = await prisma.generation.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 })
    return buildSuccessResponse(generations)
  } catch (error) {
    return handleApiError(error)
  }
}
