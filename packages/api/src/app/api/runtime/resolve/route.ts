import { NextRequest } from "next/server"
import { resolveSubdomainHandler } from "@/modules/runtime/runtime.handler"

export async function GET(request: NextRequest) {
  return resolveSubdomainHandler(request)
}
