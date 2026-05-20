import { NextRequest } from "next/server"
import { getJobHandler, retryJobHandler } from "@/modules/queue/queue.handler"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return getJobHandler(request, id)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const action = request.nextUrl.searchParams.get("action")
  if (action === "retry") return retryJobHandler(request, id)
  return Response.json({ error: "Unknown action" }, { status: 400 })
}
