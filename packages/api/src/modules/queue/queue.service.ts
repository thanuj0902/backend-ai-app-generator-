import { prisma } from "@/server/db"
import { getRedis } from "./connection"

export type JobType = "AI_GENERATION" | "DEPLOYMENT" | "DNS_UPDATE" | "WEBHOOK"

export interface EnqueueOptions {
  type: JobType
  payload: Record<string, unknown>
  maxRetries?: number
  delay?: number
}

interface QueueJobData {
  jobId: string
  type: JobType
  payload: Record<string, unknown>
  retryCount: number
  maxRetries: number
}

const QUEUE_PREFIX = "queue:"
const DELAYED_SET = "queue:delayed"

function queueKey(type: JobType): string {
  return `${QUEUE_PREFIX}${type.toLowerCase()}`
}

function calculateBackoff(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs)
  const jitter = delay * 0.1 * (Math.random() * 2 - 1)
  return Math.round(delay + jitter)
}

export async function enqueueJob(options: EnqueueOptions): Promise<string> {
  const { type, payload, maxRetries = 3, delay = 0 } = options

  const job = await prisma.queueJob.create({
    data: {
      type,
      status: "QUEUED",
      payload: payload as any,
      maxRetries,
      scheduledAt: delay > 0 ? new Date(Date.now() + delay) : new Date(),
    },
  })

  const redis = getRedis()
  const jobData = JSON.stringify({ jobId: job.id, type, payload, retryCount: 0, maxRetries })

  if (delay > 0) {
    await redis.zadd(DELAYED_SET, { score: Date.now() + delay, member: jobData })
  } else {
    await redis.lpush(queueKey(type), jobData)
  }

  return job.id
}

export async function dequeueJob(type: JobType): Promise<QueueJobData | null> {
  const redis = getRedis()
  const raw = await redis.rpop(queueKey(type))
  if (!raw) return null

  const jobData: QueueJobData = JSON.parse(raw as string)

  await prisma.queueJob.update({
    where: { id: jobData.jobId },
    data: { status: "PROCESSING", startedAt: new Date() },
  })

  return jobData
}

export async function completeJob(
  jobId: string,
  result?: Record<string, unknown>,
): Promise<void> {
  await prisma.queueJob.update({
    where: { id: jobId },
    data: { status: "COMPLETED", result: result as any, completedAt: new Date() },
  })
}

export async function failJob(jobId: string, error: string): Promise<void> {
  const job = await prisma.queueJob.findUnique({ where: { id: jobId } })
  if (!job) return

  const nextRetry = job.retryCount + 1

  if (nextRetry < job.maxRetries) {
    const delayMs = calculateBackoff(job.retryCount, 1000, 30000)
    const redis = getRedis()

    await prisma.queueJob.update({
      where: { id: jobId },
      data: {
        status: "QUEUED",
        retryCount: nextRetry,
        errorMessage: error,
        scheduledAt: new Date(Date.now() + delayMs),
      },
    })

    const jobData = JSON.stringify({
      jobId: job.id,
      type: job.type,
      payload: job.payload,
      retryCount: nextRetry,
      maxRetries: job.maxRetries,
    })
    await redis.zadd(DELAYED_SET, { score: Date.now() + delayMs, member: jobData })
  } else {
    await prisma.queueJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        errorMessage: error,
        completedAt: new Date(),
      },
    })
  }
}

export async function processDelayedJobs(): Promise<number> {
  const redis = getRedis()
  const now = Date.now()
  const delayed = await redis.zrange(DELAYED_SET, 0, now, { byScore: true })
  let moved = 0

  for (const item of delayed) {
    const removed = await redis.zrem(DELAYED_SET, item)
    if (removed) {
      const jobData: QueueJobData = JSON.parse(item as string)
      const key = queueKey(jobData.type)
      await redis.lpush(key, item)
      moved++
    }
  }

  return moved
}

export async function getQueueStats(): Promise<{
  queued: number
  processing: number
  completed: number
  failed: number
}> {
  const [queued, processing, completed, failed] = await Promise.all([
    prisma.queueJob.count({ where: { status: "QUEUED" } }),
    prisma.queueJob.count({ where: { status: "PROCESSING" } }),
    prisma.queueJob.count({ where: { status: "COMPLETED" } }),
    prisma.queueJob.count({ where: { status: "FAILED" } }),
  ])
  return { queued, processing, completed, failed }
}

export interface RetryOptions {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  onRetry?: (attempt: number, error: Error, delayMs: number) => void
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs, onRetry } = options
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt >= maxRetries) break
      const delayMs = calculateBackoff(attempt, baseDelayMs, maxDelayMs)
      onRetry?.(attempt + 1, lastError, delayMs)
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  throw lastError || new Error("Retry failed")
}

export const DEFAULT_RETRY: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
}
