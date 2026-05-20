import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/server/db"
import { getAppRoutes } from "./runtime.service"

export interface PreviewRouteResult {
  projectId: string
  path: string
  routeType: string
  content?: string
  contentType?: string
  redirectUrl?: string
}

const PREVIEW_PATTERN = /^\/preview\/([^\/]+)\/(.*)$/

export function parsePreviewPath(pathname: string): { projectId: string; filePath: string } | null {
  const match = pathname.match(PREVIEW_PATTERN)
  if (!match) return null
  return { projectId: match[1], filePath: match[2] }
}

export async function resolvePreviewRoute(projectId: string, filePath: string): Promise<PreviewRouteResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { generations: { orderBy: { createdAt: "desc" }, take: 1 } },
  })
  if (!project) return { projectId, path: filePath, routeType: "NOT_FOUND" }

  const routes = await getAppRoutes(projectId)
  const matchedRoute = routes.find((r) => r.path === `/${filePath}` || r.path === filePath)

  if (matchedRoute?.type === "API") {
    return { projectId, path: filePath, routeType: "API", redirectUrl: `/api/preview/${projectId}/${filePath}` }
  }

  const latestGeneration = project.generations[0]
  if (!latestGeneration || latestGeneration.status !== "COMPLETE") {
    return { projectId, path: filePath, routeType: "NOT_READY" }
  }

  const result = latestGeneration.result as { files?: Array<{ path: string; content: string; language: string }> } | null
  if (!result?.files) return { projectId, path: filePath, routeType: "NOT_FOUND" }

  const matchedFile = result.files.find((f) => f.path === filePath || f.path.endsWith(`/${filePath}`))
  if (!matchedFile) {
    const indexFile = result.files.find((f) =>
      f.path === "index.html" || f.path === "src/App.tsx" || f.path === "src/app/page.tsx" || f.path === "pages/index.tsx",
    )
    if (indexFile) return { projectId, path: indexFile.path, routeType: "PAGE", content: indexFile.content, contentType: getContentType(indexFile.language) }
    return { projectId, path: filePath, routeType: "NOT_FOUND" }
  }

  return {
    projectId, path: matchedFile.path, routeType: matchedRoute?.type || "STATIC",
    content: matchedFile.content, contentType: getContentType(matchedFile.language),
  }
}

export function handlePreviewRequest(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl
  const preview = parsePreviewPath(pathname)
  if (!preview) return null
  const { origin } = request.nextUrl
  const previewUrl = `${origin}/api/preview/${preview.projectId}/${preview.filePath}`
  return NextResponse.rewrite(new URL(previewUrl, request.url))
}

function getContentType(language: string): string {
  const map: Record<string, string> = {
    html: "text/html", css: "text/css", javascript: "application/javascript", js: "application/javascript",
    typescript: "application/javascript", ts: "application/javascript", tsx: "application/javascript", jsx: "application/javascript",
    json: "application/json", svg: "image/svg+xml", png: "image/png", ico: "image/x-icon",
  }
  return map[language] || "text/plain"
}

export function buildPreviewIframeUrl(projectId: string, filePath: string = ""): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
  return `${baseUrl}/preview/${projectId}/${filePath}`
}
