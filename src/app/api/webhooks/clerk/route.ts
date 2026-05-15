import { NextRequest } from "next/server"
import { webhookHandler } from "@/modules/auth"

export async function POST(request: NextRequest) {
  return webhookHandler(request)
}
