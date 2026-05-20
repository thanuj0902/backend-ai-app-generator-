import { NextRequest } from "next/server"
import { getRuntimeConfigHandler, upsertRuntimeConfigHandler } from "@/modules/runtime/runtime.handler"

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")
  if (!projectId) return Response.json({ error: "projectId required" }, { status: 400 })
  return getRuntimeConfigHandler(request, projectId)
}

export async function POST(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")
  if (!projectId) return Response.json({ error: "projectId required" }, { status: 400 })
  return upsertRuntimeConfigHandler(request, projectId)
}
