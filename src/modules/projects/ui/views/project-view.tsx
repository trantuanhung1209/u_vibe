"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { MessagesContainer } from "../components/messages-container";
import { Suspense, useState } from "react";
import { Fragment } from "@/generated/prisma/client";
import { ProjectHeader } from "../components/project-header";
import FragementWeb from "../components/fragment-web";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeIcon, CrownIcon, DownloadIcon, EyeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { FileExplorer } from "@/components/file-explorer";
import { UserControl } from "@/components/user-control";
import { useAuth } from "@clerk/nextjs";
import { ErrorBoundary } from "react-error-boundary";

interface Props {
  projectId: string;
}

export const ProjectView = ({ projectId }: Props) => {
  const { has } = useAuth();
  const hasProAccess = has?.({ plan: "pro" }) ?? false;

  const [activeFragment, setActiveFragment] = useState<Fragment | null>(null);
  const [tabState, setTabState] = useState<"preview" | "code">("preview");
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!activeFragment) {
      toast.error("No code available to download");
      return;
    }

    setIsDownloading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/download`);
      
      if (!response.ok) {
        throw new Error("Failed to download project");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `project-${projectId}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Project downloaded successfully!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download project");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <div className="h-screen">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel
            minSize={20}
            defaultSize={35}
            className="flex flex-col min-h-0"
          >
            <ErrorBoundary fallback={<div>Something went wrong loading the header.</div>}>
              <Suspense fallback={<div>Loading header...</div>}>
                <ProjectHeader projectId={projectId} />
              </Suspense>
            </ErrorBoundary>

    
            <ErrorBoundary fallback={<div>Something went wrong loading the messages.</div>}>
              <Suspense fallback={<div>Loading messages...</div>}>
                <MessagesContainer
                  projectId={projectId}
                  activeFragment={activeFragment}
                  setActiveFragment={setActiveFragment}
                />
              </Suspense>
            </ErrorBoundary>
          </ResizablePanel>

          <ResizableHandle className="hover:bg-primary transition-colors" />

          <ResizablePanel
            minSize={50}
            defaultSize={65}
            className="flex flex-col border-l min-h-0"
          >
            {/* Fragment viewer can be implemented here */}
            <Tabs
              className="h-full gap-y-0"
              defaultValue="preview"
              value={tabState}
              onValueChange={(value) =>
                setTabState(value as "preview" | "code")
              }
            >
              <div className="w-full flex items-center p-2 border-b gap-x-2">
                <TabsList className="h-8 p-0 border rounded-md">
                  <TabsTrigger value="preview" className="rounded-md">
                    <EyeIcon className="size-4 mr-2" /> <span>Demo</span>
                  </TabsTrigger>
                  <TabsTrigger value="code" className="rounded-md">
                    <CodeIcon className="size-4 mr-2" /> <span>Code</span>
                  </TabsTrigger>
                </TabsList>
                <div className="ml-auto  flex items-center gap-x-2">
                  {activeFragment && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownload}
                      disabled={isDownloading}
                    >
                      <DownloadIcon className="size-4 mr-2" />
                      {isDownloading ? "Downloading..." : "Download"}
                    </Button>
                  )}
                  {!hasProAccess && (
                    <Button asChild size="sm" variant="default">
                      <Link href="/pricing">
                        <CrownIcon /> Upgrade
                      </Link>
                    </Button>
                  )}
                  <UserControl />
                </div>
              </div>
              <TabsContent value="preview">
                {!!activeFragment && <FragementWeb data={activeFragment} />}
              </TabsContent>
              <TabsContent value="code" className="min-h-0">
                {!!activeFragment?.files && (
                  <FileExplorer
                    files={activeFragment.files as { [path: string]: string }}
                  />
                )}
              </TabsContent>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </>
  );
};
