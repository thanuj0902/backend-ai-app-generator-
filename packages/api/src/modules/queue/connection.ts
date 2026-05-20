import { Redis } from "@upstash/redis"

let redis: Redis | null = null
let connectionCheck: Promise<boolean> | null = null

export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    if (!url || !token) {
      throw new Error("Upstash Redis not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.")
    }
    redis = new Redis({ url, token })
  }
  return redis
}

export async function checkConnection(): Promise<boolean> {
  if (connectionCheck) return connectionCheck
  connectionCheck = (async () => {
    try {
      const redis = getRedis()
      await redis.set("healthcheck", "ok", { ex: 10 })
      return true
    } catch {
      return false
    }
  })()
  return connectionCheck
}

export function resetConnection(): void {
  redis = null
  connectionCheck = null
}
