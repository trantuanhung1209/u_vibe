import { Metadata } from "next";
import { generateMetadata as createMetadata } from "@/lib/metadata";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { projectId } = await params;

  // You can fetch project data here to make dynamic metadata
  // const project = await getProject(projectId);

  return createMetadata({
    title: `Project ${projectId.slice(0, 8)} - Code Editor`,
    description:
      "View and edit your AI-generated code in real-time. Collaborate with AI to build better applications faster.",
    path: `/projects/${projectId}`,
    noIndex: true, // Don't index individual project pages
  });
}
