import { NextRequest } from "next/server"

export type LogLevel = "debug" | "info" | "warn" | "error"

export function requestLogger(request: NextRequest): void {
  const method = request.method
  const url = request.nextUrl.pathname
  const timestamp = new Date().toISOString()
  console.log(JSON.stringify({
    level: "info",
    message: `${method} ${url}`,
    timestamp,
    method,
    path: url,
  }))
}

export function logError(context: string, error: any): void {
  console.error(JSON.stringify({
    level: "error",
    message: error?.message || String(error),
    context,
    stack: error?.stack,
    timestamp: new Date().toISOString(),
  }))
}

export function logWarn(message: string, meta?: Record<string, any>): void {
  console.warn(JSON.stringify({
    level: "warn",
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  }))
}
