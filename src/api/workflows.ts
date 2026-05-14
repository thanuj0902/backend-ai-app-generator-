import { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { buildPaginatedResponse, buildSuccessResponse, getPagination } from "@/server/config"
import { getAuthUser } from "@/middleware/auth"
import { parseBody, requireFields } from "@/middleware/validation"
import { handleApiError, NotFoundError, ForbiddenError } from "@/middleware/errors"
import { requestLogger } from "@/middleware/logging"
import { rateLimitMiddleware } from "@/middleware/rate-limit"
import type { WorkflowTrigger } from "@prisma/client"

async function getOwnedWorkflow(workflowId: string, userId: string) {
  const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } })
  if (!workflow) throw new NotFoundError("Workflow")
  if (workflow.createdById !== userId) throw new ForbiddenError()
  return workflow
}

export async function listWorkflowsHandler(request: NextRequest) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const { searchParams } = request.nextUrl
    const { page, limit, skip } = getPagination(searchParams)
    const projectId = searchParams.get("projectId")
    const where: Record<string, any> = { createdById: user.id }
    if (projectId) where.projectId = projectId
    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.workflow.count({ where }),
    ])
    return buildPaginatedResponse(workflows, total, page, limit)
  } catch (error) { return handleApiError(error) }
}

export async function createWorkflowHandler(request: NextRequest) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const body = await parseBody<{ projectId: string; name: string; trigger?: string; steps: any }>(request)
    requireFields(body, ["projectId", "name", "steps"])
    const workflow = await prisma.workflow.create({
      data: {
        projectId: body.projectId,
        name: body.name,
        trigger: (body.trigger as WorkflowTrigger) || "MANUAL" as WorkflowTrigger,
        steps: body.steps,
        createdById: user.id,
      },
    })
    return buildSuccessResponse(workflow, 201)
  } catch (error) { return handleApiError(error) }
}

export async function getWorkflowHandler(request: NextRequest, workflowId: string) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const workflow = await getOwnedWorkflow(workflowId, user.id)
    return buildSuccessResponse(workflow)
  } catch (error) { return handleApiError(error) }
}

export async function updateWorkflowHandler(request: NextRequest, workflowId: string) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    await getOwnedWorkflow(workflowId, user.id)
    const body = await parseBody<{ name?: string; trigger?: string; steps?: any; status?: string }>(request)
    const updateData: Record<string, any> = {}
    if (body.name) updateData.name = body.name
    if (body.trigger) updateData.trigger = body.trigger as WorkflowTrigger
    if (body.steps) updateData.steps = body.steps
    if (body.status) updateData.status = body.status
    const workflow = await prisma.workflow.update({ where: { id: workflowId }, data: updateData })
    return buildSuccessResponse(workflow)
  } catch (error) { return handleApiError(error) }
}

export async function deleteWorkflowHandler(request: NextRequest, workflowId: string) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    await getOwnedWorkflow(workflowId, user.id)
    await prisma.workflow.delete({ where: { id: workflowId } })
    return buildSuccessResponse({ deleted: true })
  } catch (error) { return handleApiError(error) }
}
