import { NextRequest } from "next/server"
import { getWorkflowHandler, updateWorkflowHandler, deleteWorkflowHandler } from "@/api/workflows"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return getWorkflowHandler(request, (await params).id)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return updateWorkflowHandler(request, (await params).id)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return deleteWorkflowHandler(request, (await params).id)
}
