import { NextRequest } from "next/server"
import { servePreviewFileHandler } from "@/modules/runtime/preview.handler"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; path: string[] }> },
) {
  const { projectId, path } = await params
  return servePreviewFileHandler(request, projectId, path)
}
