import { NextRequest, NextResponse } from "next/server";
import { deploymentManager } from "@/deployment";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, appId, sourceDir, subdomain, environmentVariables } = body;

    if (!projectId || !appId || !sourceDir) {
      return NextResponse.json(
        { error: "Missing required fields: projectId, appId, sourceDir" },
        { status: 400 }
      );
    }

    const result = await deploymentManager.deploy({
      projectId,
      appId,
      sourceDir,
      subdomain,
      environmentVariables,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Deploy error:", error);
    return NextResponse.json(
      { error: "Deployment failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const deploymentId = searchParams.get("deploymentId");

    if (deploymentId) {
      const deployment = await deploymentManager.getDeployment(deploymentId);
      if (!deployment) {
        return NextResponse.json(
          { error: "Deployment not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(deployment);
    }

    if (projectId) {
      const deployments = await deploymentManager.listDeployments(projectId);
      return NextResponse.json(deployments);
    }

    return NextResponse.json(
      { error: "Provide projectId or deploymentId" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Get deployment error:", error);
    return NextResponse.json(
      { error: "Failed to fetch deployment" },
      { status: 500 }
    );
  }
}
