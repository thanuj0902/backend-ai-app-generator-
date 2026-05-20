import { NextRequest } from "next/server"
import { getPreviewIframeUrlHandler } from "@/modules/runtime/preview.handler"

export async function GET(request: NextRequest) {
  return getPreviewIframeUrlHandler(request)
}
