import { NextRequest } from "next/server"
import { getMeHandler } from "@/modules/auth"

export async function GET(request: NextRequest) {
  return getMeHandler(request)
}
