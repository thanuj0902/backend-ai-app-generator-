import { NextRequest } from "next/server"
import { getProjectHandler, updateProjectHandler, deleteProjectHandler } from "@/api/projects"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return getProjectHandler(request, (await params).id)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return updateProjectHandler(request, (await params).id)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return deleteProjectHandler(request, (await params).id)
}
