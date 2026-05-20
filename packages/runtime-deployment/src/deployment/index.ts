import { prisma } from "@/lib/prisma";

export interface DeployOptions {
  projectId: string;
  appId: string;
  sourceDir: string;
  subdomain?: string;
  environmentVariables?: Record<string, string>;
}

export interface DeployResult {
  deploymentId: string;
  status: string;
  url?: string;
  previewUrl?: string;
}

export class DeploymentManager {
  async deploy(options: DeployOptions): Promise<DeployResult> {
    const deployment = await prisma.deployment.create({
      data: {
        projectId: options.projectId,
        appId: options.appId,
        subdomain: options.subdomain,
        status: "building",
        metadata: {
          sourceDir: options.sourceDir,
          envCount: Object.keys(options.environmentVariables || {}).length,
        },
      },
    });

    return {
      deploymentId: deployment.id,
      status: "building",
    };
  }

  async getDeployment(deploymentId: string) {
    return prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        retries: { orderBy: { attempt: "desc" } },
        logs: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });
  }

  async listDeployments(projectId: string) {
    return prisma.deployment.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }
}

export const deploymentManager = new DeploymentManager();
