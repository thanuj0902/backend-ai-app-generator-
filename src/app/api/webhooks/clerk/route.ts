import { NextRequest } from "next/server"
import { webhookHandler } from "@/api/auth"

export async function POST(request: NextRequest) {
  return webhookHandler(request)
}
