import { NextRequest } from "next/server"

export function requestLogger(request: NextRequest): void {
  const method = request.method
  const url = request.nextUrl.pathname
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${method} ${url}`)
}

export function logError(context: string, error: any): void {
  console.error(`[ERROR] [${context}]`, {
    message: error?.message || error,
    stack: error?.stack,
    timestamp: new Date().toISOString(),
  })
}
