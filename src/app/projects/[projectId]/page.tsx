import { ProjectView } from "@/modules/projects/ui/views/project-view";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";
import { Metadata } from "next";
import { generateMetadata as generateSEOMetadata } from "@/lib/metadata";

interface Props {
  params: Promise<{
    projectId: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params;
  
  return generateSEOMetadata({
    title: `Project ${projectId.slice(0, 8)} - Code Editor`,
    description:
      "View and edit your AI-generated code in real-time. Collaborate with AI to build better applications faster.",
    path: `/projects/${projectId}`,
    noIndex: true,
  });
}

const Page = async ({ params }: Props) => {
  const { projectId } = await params;
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.messages.getMany.queryOptions({ projectId })
  );
  void queryClient.prefetchQuery(
    trpc.projects.getOne.queryOptions({ id: projectId })
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ErrorBoundary fallback={<div>Something went wrong.</div>}>
        <Suspense>
          <ProjectView projectId={projectId} />
        </Suspense>
      </ErrorBoundary>
    </HydrationBoundary>
  );
};

export default Page;
