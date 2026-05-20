import { NextRequest, NextResponse } from "next/server";
import { deploymentTracker } from "@/deployment/tracking";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deploymentId = searchParams.get("deploymentId");

    if (!deploymentId) {
      return NextResponse.json(
        { error: "Missing deploymentId" },
        { status: 400 }
      );
    }

    const status = await deploymentTracker.getStatus(deploymentId);
    if (!status) {
      return NextResponse.json(
        { error: "Deployment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Failed to check deployment status" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deploymentId, status, url, errorLog } = body;

    if (!deploymentId || !status) {
      return NextResponse.json(
        { error: "Missing required fields: deploymentId, status" },
        { status: 400 }
      );
    }

    await deploymentTracker.trackUpdate(deploymentId, status, {
      url,
      errorLog,
    });

    return NextResponse.json({
      message: "Status updated",
      deploymentId,
      status,
    });
  } catch (error) {
    console.error("Status update error:", error);
    return NextResponse.json(
      { error: "Failed to update deployment status" },
      { status: 500 }
    );
  }
}
