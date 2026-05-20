import { NextRequest } from "next/server"
import { getDeploymentHandler, checkDeploymentStatusHandler } from "@/modules/deployment/deployment.handler"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const action = request.nextUrl.searchParams.get("action")
  if (action === "check-status") {
    return checkDeploymentStatusHandler(request, id)
  }
  return getDeploymentHandler(request, id)
}
