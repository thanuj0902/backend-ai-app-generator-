import { NextRequest } from "next/server"
import { registerDomainHandler } from "@/modules/deployment/deployment.handler"

export async function POST(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")
  if (!projectId) return Response.json({ error: "projectId required" }, { status: 400 })
  return registerDomainHandler(request, projectId)
}
