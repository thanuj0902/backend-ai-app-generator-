import { NextRequest } from "next/server"
import { RateLimitError } from "./errors"

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 60
const rateStore = new Map<string, { count: number; resetAt: number }>()

export function rateLimitMiddleware(request: NextRequest): void {
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded?.split(",")[0]?.trim() || "127.0.0.1"
  const key = `${ip}:${request.nextUrl.pathname}`
  const now = Date.now()
  const entry = rateStore.get(key)

  if (!entry || now > entry.resetAt) {
    rateStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    throw new RateLimitError()
  }

  entry.count++
}
