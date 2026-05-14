import { NextRequest } from "next/server"
import { listProjectsHandler, createProjectHandler } from "@/api/projects"

export async function GET(request: NextRequest) {
  return listProjectsHandler(request)
}

export async function POST(request: NextRequest) {
  return createProjectHandler(request)
}
