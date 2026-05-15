import { NextRequest } from "next/server"
import { startGenerationHandler, listGenerationsHandler } from "@/modules/generation"

export async function POST(request: NextRequest) {
  return startGenerationHandler(request)
}

export async function GET(request: NextRequest) {
  return listGenerationsHandler(request)
}
