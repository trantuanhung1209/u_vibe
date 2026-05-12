import { Metadata } from "next";
import { generateMetadata as createMetadata } from "@/lib/metadata";
import prisma from "@/lib/db";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true },
  });

  const title = project?.name || `Project ${projectId.slice(0, 8)}`;

  return createMetadata({
    title: `${title} - Code Editor`,
    description:
      "View and edit your AI-generated code in real-time. Collaborate with AI to build better applications faster.",
    path: `/projects/${projectId}`,
    noIndex: true,
  });
}
