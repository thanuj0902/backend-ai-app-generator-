import { NextRequest } from "next/server"
import { getGenerationHandler } from "@/api/generation"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return getGenerationHandler(request, (await params).id)
}
