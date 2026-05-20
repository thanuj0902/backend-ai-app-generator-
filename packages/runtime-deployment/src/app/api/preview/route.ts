import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const appId = searchParams.get("appId");
    const deploymentId = searchParams.get("deploymentId");

    if (appId) {
      const deployment = await prisma.deployment.findFirst({
        where: { appId, status: "preview" },
        orderBy: { createdAt: "desc" },
      });

      if (!deployment || !deployment.previewUrl) {
        return NextResponse.json(
          { error: "No preview available" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        appId,
        deploymentId: deployment.id,
        previewUrl: deployment.previewUrl,
        subdomain: deployment.subdomain,
        status: deployment.status,
      });
    }

    if (deploymentId) {
      const deployment = await prisma.deployment.findUnique({
        where: { id: deploymentId },
      });

      if (!deployment || !deployment.previewUrl) {
        return NextResponse.json(
          { error: "No preview available" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        deploymentId,
        previewUrl: deployment.previewUrl,
        subdomain: deployment.subdomain,
        status: deployment.status,
      });
    }

    return NextResponse.json(
      { error: "Provide appId or deploymentId" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json(
      { error: "Failed to fetch preview" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deploymentId, previewUrl } = body;

    if (!deploymentId || !previewUrl) {
      return NextResponse.json(
        { error: "Missing required fields: deploymentId, previewUrl" },
        { status: 400 }
      );
    }

    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { previewUrl, status: "preview" },
    });

    return NextResponse.json({
      message: "Preview activated",
      deploymentId,
      previewUrl,
    });
  } catch (error) {
    console.error("Preview create error:", error);
    return NextResponse.json(
      { error: "Failed to create preview" },
      { status: 500 }
    );
  }
}
