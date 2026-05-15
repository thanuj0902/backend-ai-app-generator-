import { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { getAuthUser } from "@/middleware/auth"
import { parseBody } from "@/middleware/validation"
import { handleApiError } from "@/middleware/errors"
import { buildSuccessResponse } from "@/server/config"
import { requestLogger } from "@/middleware/logging"
import { rateLimitMiddleware } from "@/middleware/rate-limit"

export async function getMeHandler(request: NextRequest) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const user = await getAuthUser(request)
    const [projectCount, workflowCount] = await Promise.all([
      prisma.project.count({ where: { userId: user.id } }),
      prisma.workflow.count({ where: { createdById: user.id } }),
    ])
    return buildSuccessResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      stats: { projects: projectCount, workflows: workflowCount },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function webhookHandler(request: NextRequest) {
  try {
    requestLogger(request)
    rateLimitMiddleware(request)
    const payload = await request.json()
    const { type, data } = payload

    switch (type) {
      case "user.created":
      case "user.updated": {
        const email = data.email_addresses?.[0]?.email_address
        if (!email) return Response.json({ error: "No email" }, { status: 400 })
        await prisma.user.upsert({
          where: { clerkId: data.id },
          update: { email, name: data.first_name ? `${data.first_name} ${data.last_name || ""}`.trim() : data.username || null, avatarUrl: data.image_url || null },
          create: { clerkId: data.id, email, name: data.first_name ? `${data.first_name} ${data.last_name || ""}`.trim() : data.username || null, avatarUrl: data.image_url || null },
        })
        break
      }
      case "user.deleted": {
        await prisma.user.deleteMany({ where: { clerkId: data.id } })
        break
      }
      case "organization.created":
      case "organization.updated": {
        await prisma.organization.upsert({ where: { slug: data.slug }, update: { name: data.name }, create: { name: data.name, slug: data.slug } })
        const createdBy = data.created_by || data.public_metadata?.created_by
        if (createdBy) {
          const user = await prisma.user.findUnique({ where: { clerkId: createdBy } })
          const org = await prisma.organization.findUnique({ where: { slug: data.slug } })
          if (user && org) {
            await prisma.organizationMember.upsert({
              where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
              update: { role: "OWNER" }, create: { userId: user.id, organizationId: org.id, role: "OWNER" },
            })
          }
        }
        break
      }
      case "organizationMembership.created": {
        const user = await prisma.user.findUnique({ where: { clerkId: data.userId } })
        const org = await prisma.organization.findUnique({ where: { slug: data.organization?.slug } })
        if (user && org) {
          await prisma.organizationMember.upsert({
            where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
            update: { role: data.role?.toUpperCase() || "MEMBER" },
            create: { userId: user.id, organizationId: org.id, role: data.role?.toUpperCase() || "MEMBER" },
          })
        }
        break
      }
    }
    return Response.json({ received: true })
  } catch (error) {
    return handleApiError(error)
  }
}
