import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SUBDOMAIN_PATTERN = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subdomain = searchParams.get("subdomain");
    const appId = searchParams.get("appId");

    if (subdomain) {
      const deployment = await prisma.deployment.findFirst({
        where: { subdomain },
        orderBy: { createdAt: "desc" },
      });

      if (!deployment) {
        return NextResponse.json(
          { available: true, subdomain },
          { status: 200 }
        );
      }

      return NextResponse.json({
        available: false,
        subdomain,
        deploymentId: deployment.id,
        appId: deployment.appId,
      });
    }

    if (appId) {
      const deployment = await prisma.deployment.findFirst({
        where: { appId, subdomain: { not: null } },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({
        subdomain: deployment?.subdomain || null,
        appId,
      });
    }

    return NextResponse.json(
      { error: "Provide subdomain or appId" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Subdomain lookup error:", error);
    return NextResponse.json(
      { error: "Failed to resolve subdomain" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appId, projectId, subdomain } = body;

    if (!appId || !subdomain) {
      return NextResponse.json(
        { error: "Missing required fields: appId, subdomain" },
        { status: 400 }
      );
    }

    if (!SUBDOMAIN_PATTERN.test(subdomain)) {
      return NextResponse.json(
        {
          error:
            "Invalid subdomain format. Use lowercase alphanumeric and hyphens only.",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.deployment.findFirst({
      where: { subdomain },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Subdomain already taken" },
        { status: 409 }
      );
    }

    const deployment = await prisma.deployment.findFirst({
      where: { appId },
      orderBy: { createdAt: "desc" },
    });

    if (!deployment) {
      return NextResponse.json(
        { error: "No deployment found for this app" },
        { status: 404 }
      );
    }

    await prisma.deployment.update({
      where: { id: deployment.id },
      data: { subdomain },
    });

    return NextResponse.json({
      message: "Subdomain assigned",
      appId,
      subdomain,
      deploymentId: deployment.id,
    });
  } catch (error) {
    console.error("Subdomain assign error:", error);
    return NextResponse.json(
      { error: "Failed to assign subdomain" },
      { status: 500 }
    );
  }
}
