import { NextRequest } from "next/server"
import { buildSuccessResponse } from "@/server/config"
import { handleApiError } from "@/middleware/errors"
import { requestLogger } from "@/middleware/logging"
import { resolvePreviewRoute, buildPreviewIframeUrl } from "./preview.service"

export async function servePreviewFileHandler(
  request: NextRequest,
  projectId: string,
  pathSegments: string[],
) {
  try {
    requestLogger(request)
    const filePath = pathSegments.join("/")
    const result = await resolvePreviewRoute(projectId, filePath)

    if (result.routeType === "NOT_FOUND") return new Response("File not found", { status: 404 })
    if (result.routeType === "NOT_READY") return new Response("Generation not complete", { status: 503 })
    if (result.redirectUrl) return Response.redirect(new URL(result.redirectUrl, request.url))

    return new Response(result.content, {
      headers: { "Content-Type": result.contentType || "text/plain", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function getPreviewIframeUrlHandler(request: NextRequest) {
  try {
    requestLogger(request)
    const { searchParams } = request.nextUrl
    const projectId = searchParams.get("projectId")
    const filePath = searchParams.get("filePath") || ""
    if (!projectId) return buildSuccessResponse({ error: "projectId is required" }, 400)
    const url = buildPreviewIframeUrl(projectId, filePath)
    return buildSuccessResponse({ url })
  } catch (error) {
    return handleApiError(error)
  }
}
