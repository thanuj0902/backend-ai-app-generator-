import { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { UnauthorizedError } from "./errors"

export interface AuthUser {
  id: string
  clerkId: string
  email: string
  name: string | null
  avatarUrl: string | null
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser> {
  const authHeader = request.headers.get("authorization")
  const clerkId = request.headers.get("x-clerk-user-id")

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7)
    const decoded = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString())
    const user = await prisma.user.findUnique({
      where: { clerkId: decoded.sub || decoded.user_id },
    })
    if (!user) throw new UnauthorizedError("User not found")
    return user
  }

  if (clerkId) {
    const user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) throw new UnauthorizedError("User not found")
    return user
  }

  throw new UnauthorizedError("No authentication provided")
}
