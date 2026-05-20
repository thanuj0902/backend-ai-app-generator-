import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface AppRuntimeConfig {
  appId: string;
  projectId: string;
  environmentVariables: Record<string, string>;
  routes: Array<{
    path: string;
    component: string;
    middleware?: string[];
  }>;
  buildSettings: {
    framework: string;
    installCommand: string;
    buildCommand: string;
    outputDirectory: string;
  };
}

export class RuntimeConfigLoader {
  async load(appId: string): Promise<AppRuntimeConfig | null> {
    const runtimeConfig = await prisma.runtimeConfig.findUnique({
      where: { appId },
    });

    if (!runtimeConfig || !runtimeConfig.active) return null;

    return runtimeConfig.config as unknown as AppRuntimeConfig;
  }

  async save(appId: string, projectId: string, config: AppRuntimeConfig): Promise<void> {
    await prisma.runtimeConfig.upsert({
      where: { appId },
      update: {
        config: config as unknown as Prisma.InputJsonValue,
        projectId,
        active: true,
      },
      create: {
        appId,
        projectId,
        config: config as unknown as Prisma.InputJsonValue,
        active: true,
      },
    });
  }

  async disable(appId: string): Promise<void> {
    await prisma.runtimeConfig.update({
      where: { appId },
      data: { active: false },
    });
  }
}

export const runtimeConfigLoader = new RuntimeConfigLoader();
