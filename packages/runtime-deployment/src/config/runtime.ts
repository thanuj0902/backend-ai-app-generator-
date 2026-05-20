export interface RuntimeConfig {
  domain: string;
  vercel: {
    token: string;
    teamId?: string;
  };
  clerk: {
    publishableKey: string;
    secretKey: string;
  };
  database: {
    url: string;
  };
}

export function loadRuntimeConfig(): RuntimeConfig {
  return {
    domain: process.env.RUNTIME_DOMAIN || "localhost:3000",
    vercel: {
      token: process.env.VERCEL_TOKEN || "",
      teamId: process.env.VERCEL_TEAM_ID,
    },
    clerk: {
      publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "",
      secretKey: process.env.CLERK_SECRET_KEY || "",
    },
    database: {
      url: process.env.DATABASE_URL || "",
    },
  };
}

export interface DeploymentConfig {
  maxRetries: number;
  retryDelayMs: number;
  previewTtlMs: number;
  concurrentBuilds: number;
}

export const defaultDeploymentConfig: DeploymentConfig = {
  maxRetries: 3,
  retryDelayMs: 5000,
  previewTtlMs: 1000 * 60 * 60 * 24,
  concurrentBuilds: 5,
};

export interface BuildConfig {
  installCommand: string;
  buildCommand: string;
  outputDirectory: string;
}

export const defaultBuildConfig: BuildConfig = {
  installCommand: "npm install",
  buildCommand: "npm run build",
  outputDirectory: ".next",
};
