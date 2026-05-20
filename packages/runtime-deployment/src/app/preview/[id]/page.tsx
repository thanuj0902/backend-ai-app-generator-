import { prisma } from "@/lib/prisma";

interface PreviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { id } = await params;

  const deployment = await prisma.deployment.findFirst({
    where: {
      OR: [{ id }, { appId: id }],
      previewUrl: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!deployment || !deployment.previewUrl) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h1>Preview Not Available</h1>
        <p>This preview is no longer available or has expired.</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <iframe
        src={deployment.previewUrl}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
        }}
        title="App Preview"
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </div>
  );
}
