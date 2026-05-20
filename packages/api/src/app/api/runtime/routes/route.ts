import { NextRequest } from "next/server"
import { listAppRoutesHandler, createAppRouteHandler, syncRoutesFromGenerationHandler } from "@/modules/runtime/runtime.handler"

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")
  if (!projectId) return Response.json({ error: "projectId required" }, { status: 400 })
  return listAppRoutesHandler(request, projectId)
}

export async function POST(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")
  if (!projectId) return Response.json({ error: "projectId required" }, { status: 400 })
  const clone = request.clone()
  const body = await clone.json()
  if (body.action === "sync-from-generation") {
    return syncRoutesFromGenerationHandler(request, projectId)
  }
  return createAppRouteHandler(request, projectId)
}
