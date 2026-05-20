export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ValidationError"
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = "Unauthorized") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = "Forbidden") {
    super(message)
    this.name = "ForbiddenError"
  }
}

export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`)
    this.name = "NotFoundError"
  }
}

export class RateLimitError extends Error {
  retryAfter?: number

  constructor() {
    super("Too many requests")
    this.name = "RateLimitError"
  }
}

export function handleApiError(error: unknown): Response {
  if (error instanceof ValidationError) return Response.json({ error: error.message }, { status: 400 })
  if (error instanceof UnauthorizedError) return Response.json({ error: error.message }, { status: 401 })
  if (error instanceof ForbiddenError) return Response.json({ error: error.message }, { status: 403 })
  if (error instanceof NotFoundError) return Response.json({ error: error.message }, { status: 404 })
  if (error instanceof RateLimitError) {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (error.retryAfter) headers["Retry-After"] = String(error.retryAfter)
    return Response.json({ error: error.message, retryAfter: error.retryAfter }, { status: 429, headers })
  }
  console.error("Unhandled error:", error)
  return Response.json({ error: "Internal server error" }, { status: 500 })
}
