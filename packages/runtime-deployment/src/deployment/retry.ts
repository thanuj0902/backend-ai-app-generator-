import { defaultDeploymentConfig } from "@/config/runtime";
import { deploymentTracker } from "./tracking";
import { prisma } from "@/lib/prisma";

export class DeploymentRetryHandler {
  async shouldRetry(deploymentId: string): Promise<boolean> {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        retries: { orderBy: { attempt: "desc" } },
      },
    });

    if (!deployment) return false;

    const retryCount = deployment.retries.length;
    return retryCount < defaultDeploymentConfig.maxRetries;
  }

  async executeRetry(deploymentId: string): Promise<void> {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
    });

    if (!deployment) throw new Error(`Deployment ${deploymentId} not found`);

    const retryCount = await prisma.deploymentRetry.count({
      where: { deploymentId },
    });

    if (retryCount >= defaultDeploymentConfig.maxRetries) {
      await deploymentTracker.trackUpdate(deploymentId, "failed", {
        errorLog: "Max retries exceeded",
      });
      return;
    }

    await prisma.deploymentRetry.create({
      data: {
        deploymentId,
        attempt: retryCount + 1,
        status: "retrying",
      },
    });

    await deploymentTracker.trackUpdate(deploymentId, "retrying");
    await deploymentTracker.log(deploymentId, "warn", `Retry attempt ${retryCount + 1}/${defaultDeploymentConfig.maxRetries}`);
  }

  async getRetryHistory(deploymentId: string) {
    return prisma.deploymentRetry.findMany({
      where: { deploymentId },
      orderBy: { attempt: "asc" },
    });
  }
}

export const deploymentRetryHandler = new DeploymentRetryHandler();
