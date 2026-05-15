import { NextRequest } from "next/server"
import { listJobsHandler, createJobHandler, getQueueStatsHandler, processDelayedJobsHandler } from "@/modules/queue/queue.handler"

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action")
  if (action === "stats") return getQueueStatsHandler(request)
  if (action === "process-delayed") return processDelayedJobsHandler(request)
  return listJobsHandler(request)
}

export async function POST(request: NextRequest) {
  return createJobHandler(request)
}
