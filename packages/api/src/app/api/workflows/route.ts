import { NextRequest } from "next/server"
import { listWorkflowsHandler, createWorkflowHandler } from "@/modules/workflows"

export async function GET(request: NextRequest) {
  return listWorkflowsHandler(request)
}

export async function POST(request: NextRequest) {
  return createWorkflowHandler(request)
}
