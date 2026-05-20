import { NextRequest } from "next/server"
import { RateLimitError } from "./errors"
import { logWarn } from "./logging"

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

const TIERS: Record<string, RateLimitConfig> = {
  default: { windowMs: 60_000, maxRequests: 60 },
  auth: { windowMs: 60_000, maxRequests: 20 },
  generate: { windowMs: 60_000, maxRequests: 5 },
  webhook: { windowMs: 60_000, maxRequests: 120 },
}

const store = new Map<string, { count: number; resetAt: number }>()

function getTier(path: string): RateLimitConfig {
  if (path.startsWith("/api/generate")) return TIERS.generate
  if (path.startsWith("/api/webhooks")) return TIERS.webhook
  if (path.startsWith("/api/me")) return TIERS.auth
  return TIERS.default
}

function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded?.split(",")[0]?.trim() || "127.0.0.1"
  const clerkId = request.headers.get("x-clerk-user-id") || ""
  return clerkId ? `user:${clerkId}` : `ip:${ip}`
}

export function rateLimitMiddleware(request: NextRequest): void {
  const path = request.nextUrl.pathname
  const tier = getTier(path)
  const clientId = getClientId(request)
  const key = `${clientId}:${path}`
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + tier.windowMs })
    return
  }

  if (entry.count >= tier.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    logWarn("Rate limit exceeded", { clientId, path, retryAfter })
    const err = new RateLimitError()
    err.retryAfter = retryAfter
    throw err
  }

  entry.count++
}
