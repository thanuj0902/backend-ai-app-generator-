import { NextRequest } from "next/server"
import { updateAppRouteHandler, deleteAppRouteHandler } from "@/modules/runtime/runtime.handler"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = request.nextUrl.searchParams.get("projectId")
  if (!projectId) return Response.json({ error: "projectId required" }, { status: 400 })
  return updateAppRouteHandler(request, projectId, id)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = request.nextUrl.searchParams.get("projectId")
  if (!projectId) return Response.json({ error: "projectId required" }, { status: 400 })
  return deleteAppRouteHandler(request, projectId, id)
}
