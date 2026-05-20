import { prisma } from "@/lib/prisma";

export interface DeploymentStatus {
  deploymentId: string;
  status: string;
  url?: string;
  errorLog?: string;
  retryCount: number;
  lastRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class DeploymentTracker {
  async trackUpdate(
    deploymentId: string,
    status: string,
    extra?: { url?: string; errorLog?: string }
  ): Promise<void> {
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status,
        ...(extra?.url && { url: extra.url }),
        ...(extra?.errorLog && { errorLog: extra.errorLog }),
      },
    });

    await prisma.deploymentLog.create({
      data: {
        deploymentId,
        level: status === "error" ? "error" : "info",
        message: `Deployment status updated to: ${status}`,
      },
    });
  }

  async getStatus(deploymentId: string): Promise<DeploymentStatus | null> {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        retries: {
          orderBy: { attempt: "desc" },
          take: 1,
        },
      },
    });

    if (!deployment) return null;

    return {
      deploymentId: deployment.id,
      status: deployment.status,
      url: deployment.url || undefined,
      errorLog: deployment.errorLog || undefined,
      retryCount: deployment.retries.length,
      lastRetryAt: deployment.retries[0]?.createdAt,
      createdAt: deployment.createdAt,
      updatedAt: deployment.updatedAt,
    };
  }

  async log(deploymentId: string, level: string, message: string): Promise<void> {
    await prisma.deploymentLog.create({
      data: { deploymentId, level, message },
    });
  }

  async getLogs(deploymentId: string, limit = 100) {
    return prisma.deploymentLog.findMany({
      where: { deploymentId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}

export const deploymentTracker = new DeploymentTracker();
