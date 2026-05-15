import { NextRequest } from "next/server"
import { listDeploymentsHandler, createDeploymentHandler } from "@/modules/deployment/deployment.handler"

export async function GET(request: NextRequest) {
  return listDeploymentsHandler(request)
}

export async function POST(request: NextRequest) {
  return createDeploymentHandler(request)
}
