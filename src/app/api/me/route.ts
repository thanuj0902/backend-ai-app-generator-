import { NextRequest } from "next/server"
import { getMeHandler } from "@/api/auth"

export async function GET(request: NextRequest) {
  return getMeHandler(request)
}
