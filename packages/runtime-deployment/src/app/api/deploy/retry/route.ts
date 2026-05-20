import { NextRequest, NextResponse } from "next/server";
import { deploymentRetryHandler } from "@/deployment/retry";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deploymentId } = body;

    if (!deploymentId) {
      return NextResponse.json(
        { error: "Missing deploymentId" },
        { status: 400 }
      );
    }

    const canRetry = await deploymentRetryHandler.shouldRetry(deploymentId);
    if (!canRetry) {
      return NextResponse.json(
        { error: "Max retries exceeded or deployment not found" },
        { status: 400 }
      );
    }

    await deploymentRetryHandler.executeRetry(deploymentId);
    const history = await deploymentRetryHandler.getRetryHistory(deploymentId);

    return NextResponse.json({
      message: "Retry initiated",
      deploymentId,
      retryCount: history.length,
      history,
    });
  } catch (error) {
    console.error("Retry error:", error);
    return NextResponse.json(
      { error: "Retry failed" },
      { status: 500 }
    );
  }
}

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

    const history = await deploymentRetryHandler.getRetryHistory(deploymentId);
    return NextResponse.json({ deploymentId, retries: history });
  } catch (error) {
    console.error("Get retry history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch retry history" },
      { status: 500 }
    );
  }
}
