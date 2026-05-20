import { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { buildSuccessResponse, buildPaginatedResponse, getPagination } from "@/server/config"
import { getAuthUser } from "@/middleware/auth"
import { parseBody, requireFields } from "@/middleware/validation"
import { handleApiError, NotFoundError } from "@/middleware/errors"
import { requestLogger } from "@/middleware/logging"
import { rateLimitMiddleware } from "@/middleware/rate-limit"
import { enqueueJob, getQueueStats, processDelayedJobs } from "./queue.service"

export async function listJobsHandler(request: NextRequest) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const { searchParams } = request.nextUrl
    const status = searchParams.get("status")
    const type = searchParams.get("type")
    const { page, limit } = getPagination(searchParams)

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (type) where.type = type

    const [total, jobs] = await Promise.all([
      prisma.queueJob.count({ where: where as any }),
      prisma.queueJob.findMany({
        where: where as any,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return buildPaginatedResponse(jobs, total, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function createJobHandler(request: NextRequest) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)

    const body = await parseBody<{
      type: "AI_GENERATION" | "DEPLOYMENT" | "DNS_UPDATE" | "WEBHOOK"
      payload: Record<string, unknown>
      maxRetries?: number
      delay?: number
    }>(request)
    requireFields(body, ["type", "payload"])

    const jobId = await enqueueJob({
      type: body.type,
      payload: body.payload,
      maxRetries: body.maxRetries,
      delay: body.delay,
    })

    return buildSuccessResponse({ id: jobId }, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function getJobHandler(request: NextRequest, jobId: string) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)

    const job = await prisma.queueJob.findUnique({ where: { id: jobId } })
    if (!job) throw new NotFoundError("Job")

    return buildSuccessResponse(job)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function retryJobHandler(request: NextRequest, jobId: string) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const job = await prisma.queueJob.findUnique({ where: { id: jobId } })
    if (!job) throw new NotFoundError("Job")
    if (job.status !== "FAILED") {
      return buildSuccessResponse({ error: "Only failed jobs can be retried" }, 400)
    }

    const newJobId = await enqueueJob({
      type: job.type as any,
      payload: job.payload as Record<string, unknown>,
      maxRetries: job.maxRetries,
    })

    return buildSuccessResponse({ id: newJobId, originalId: jobId, retried: true }, 202)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function getQueueStatsHandler(request: NextRequest) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    await getAuthUser(request)
    const stats = await getQueueStats()
    return buildSuccessResponse(stats)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function processDelayedJobsHandler(request: NextRequest) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    await getAuthUser(request)
    const moved = await processDelayedJobs()
    return buildSuccessResponse({ movedToQueue: moved })
  } catch (error) {
    return handleApiError(error)
  }
}
