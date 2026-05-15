import { prisma } from "@/server/db"
import { generateAppCode } from "@/services/ai"
import { dequeueJob, completeJob, failJob } from "./queue.service"

export async function processAiGenerationJob(): Promise<void> {
  const jobData = await dequeueJob("AI_GENERATION")
  if (!jobData) return

  const { jobId, payload } = jobData

  try {
    const { projectId, generationId, prompt } = payload as {
      projectId: string
      generationId: string
      prompt: string
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "GENERATING" },
    })

    const result = await generateAppCode(prompt)

    await prisma.generation.update({
      where: { id: generationId },
      data: {
        status: "COMPLETE",
        result: result as any,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    })

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "COMPLETE" },
    })

    await completeJob(jobId, { success: true, generationId })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "AI generation failed"

    const { projectId, generationId } = payload as {
      projectId: string
      generationId: string
    }

    await prisma.generation.update({
      where: { id: generationId },
      data: { status: "ERROR", errorMessage, completedAt: new Date() },
    }).catch(() => {})

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "ERROR" },
    }).catch(() => {})

    await failJob(jobId, errorMessage)
  }
}

export async function pollAiGenerationQueue(intervalMs: number = 5000): Promise<void> {
  const poll = async () => {
    try {
      await processAiGenerationJob()
    } catch (error) {
      console.error("[AI Worker] Poll error:", error)
    }
    setTimeout(poll, intervalMs)
  }
  poll()
}
