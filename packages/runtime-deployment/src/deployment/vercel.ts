import { loadRuntimeConfig, defaultBuildConfig } from "@/config/runtime";

interface VercelDeployResponse {
  id: string;
  url: string;
  status: string;
  readyState: string;
}

export class VercelDeployer {
  private token: string;
  private teamId?: string;

  constructor() {
    const config = loadRuntimeConfig();
    this.token = config.vercel.token;
    this.teamId = config.vercel.teamId;
  }

  private get baseUrl(): string {
    const teamParam = this.teamId ? `?teamId=${this.teamId}` : "";
    return `https://api.vercel.com${teamParam}`;
  }

  async createProject(name: string, framework: string = "nextjs"): Promise<string> {
    const res = await fetch(`${this.baseUrl}/v9/projects`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        framework,
        gitRepository: null,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Vercel project creation failed: ${err}`);
    }

    const data = await res.json();
    return data.id;
  }

  async createDeployment(
    projectId: string,
    files: Record<string, string>,
    envVars: Record<string, string> = {}
  ): Promise<VercelDeployResponse> {
    const res = await fetch(`${this.baseUrl}/v13/deployments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId,
        target: "production",
        files: Object.entries(files).map(([file, data]) => ({
          file,
          data,
        })),
        projectSettings: {
          buildCommand: defaultBuildConfig.buildCommand,
          installCommand: defaultBuildConfig.installCommand,
          outputDirectory: defaultBuildConfig.outputDirectory,
          framework: "nextjs",
        },
        env: Object.entries(envVars).map(([key, value]) => ({
          key,
          value,
          target: ["production", "preview"],
        })),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Vercel deployment failed: ${err}`);
    }

    return res.json();
  }

  async getDeploymentStatus(deploymentId: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/v13/deployments/${deploymentId}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!res.ok) return "unknown";
    const data = await res.json();
    return data.readyState || data.status;
  }

  async assignDomain(projectId: string, domain: string): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/v9/projects/${projectId}/domains`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: domain }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Domain assignment failed: ${err}`);
    }
  }
}

export const vercelDeployer = new VercelDeployer();
