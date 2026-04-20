"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2Icon, FigmaIcon, SparklesIcon, CheckCircle2Icon } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  projectId?: string; // Make it optional for use in home page
  children?: React.ReactNode;
}

interface PreviewData {
  name: string;
  dimensions: { width: number; height: number };
  layout: string;
  componentsCount: number;
  description: string;
  suggestedComponents: Array<{ name: string; type: string }>;
}

const figmaUrlSchema = z.object({
  figmaUrl: z.string().url("Please enter a valid Figma URL"),
});

type FigmaUrlForm = z.infer<typeof figmaUrlSchema>;

export const FigmaImportDialog = ({ projectId, children }: Props) => {
  const [open, setOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  const form = useForm<FigmaUrlForm>({
    resolver: zodResolver(figmaUrlSchema),
    defaultValues: {
      figmaUrl: "",
    },
  });

  // Preview design mutation
  const previewMutation = useMutation(
    trpc.figma.previewDesign.mutationOptions({
      onSuccess: (data) => {
        console.log('Preview success:', data);
        setPreviewData(data.design);
        toast.success("Design preview loaded!");
      },
      onError: (error) => {
        console.error('Preview error:', error);
        
        // Better error messaging for rate limits
        const errorMessage = error.message || "Failed to preview design";
        if (errorMessage.includes('rate limit')) {
          toast.error(errorMessage, {
            duration: 5000,
          });
        } else {
          toast.error(errorMessage);
        }
        
        setPreviewData(null);
      },
    })
  );

  // Preview design before generation
  const previewDesign = async (figmaUrl: string) => {
    setIsPreviewLoading(true);
    setPreviewData(null);
    
    try {
      await previewMutation.mutateAsync({ figmaUrl });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Generate code from Figma
  const generateFromFigma = useMutation(
    trpc.figma.generateFromFigma.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message);
        form.reset();
        setOpen(false);
        setPreviewData(null);
        
        // Invalidate messages to show the new fragment
        if (projectId) {
          queryClient.invalidateQueries(
            trpc.messages.getMany.queryOptions({ projectId })
          );
        }
      },
      onError: (error) => {
        toast.error(error.message || "Failed to generate from Figma");
      },
    })
  );
  
  // Create new project from Figma
  const createProjectFromFigma = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: async (data) => {
        // Now generate code for this new project
        await generateFromFigma.mutateAsync({
          figmaUrl: form.getValues("figmaUrl"),
          projectId: data.id,
        });
        
        // Navigate to the new project
        router.push(`/projects/${data.id}`);
        
        queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create project");
      },
    })
  );

  const onSubmit = async (values: FigmaUrlForm) => {
    if (!previewData) {
      // Preview first
      await previewDesign(values.figmaUrl);
    } else {
      // Generate code
      if (projectId) {
        // Existing project - add to it
        await generateFromFigma.mutateAsync({
          figmaUrl: values.figmaUrl,
          projectId,
        });
      } else {
        // No project - create new one
        await createProjectFromFigma.mutateAsync({
          value: `Figma Design: ${previewData.name}`,
        });
      }
    }
  };

  const handleUrlChange = () => {
    // Reset preview when URL changes
    setPreviewData(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <FigmaIcon className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FigmaIcon className="size-5 text-purple-500" />
            Import from Figma
          </DialogTitle>
          <DialogDescription>
            Paste a Figma design URL to automatically generate production-ready code
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="figmaUrl">Figma URL</Label>
            <Input
              id="figmaUrl"
              placeholder="https://www.figma.com/file/..."
              {...form.register("figmaUrl")}
              onChange={(e) => {
                form.setValue("figmaUrl", e.target.value, {
                  shouldValidate: true,
                  shouldDirty: true,
                  shouldTouch: true,
                });
                handleUrlChange();
              }}
              disabled={generateFromFigma.isPending}
            />
            {form.formState.errors.figmaUrl && (
              <p className="text-sm text-destructive">
                {form.formState.errors.figmaUrl.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Supports full file URLs or specific node URLs (with ?node-id=...)
            </p>
          </div>

          {/* Preview Section */}
          {isPreviewLoading && (
            <div className="border rounded-lg p-6 flex items-center justify-center">
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Analyzing design...
              </span>
            </div>
          )}

          {previewData && !isPreviewLoading && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <CheckCircle2Icon className="size-4 text-green-500" />
                    {previewData.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {previewData.dimensions.width} × {previewData.dimensions.height} px
                  </p>
                </div>
                <Badge variant="secondary">
                  {previewData.componentsCount} components
                </Badge>
              </div>

              {previewData.suggestedComponents.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2">Detected Components:</p>
                  <div className="flex flex-wrap gap-1">
                    {previewData.suggestedComponents.map((comp, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {comp.type}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground border-t pt-2">
                <p className="whitespace-pre-wrap">{previewData.description}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                form.reset();
                setPreviewData(null);
              }}
              disabled={generateFromFigma.isPending}
            >
              Cancel
            </Button>
            
            {!previewData ? (
              <Button
                type="submit"
                disabled={!form.formState.isValid || isPreviewLoading}
              >
                {isPreviewLoading ? (
                  <>
                    <Loader2Icon className="size-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Preview Design
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={generateFromFigma.isPending || createProjectFromFigma.isPending}
              >
                {(generateFromFigma.isPending || createProjectFromFigma.isPending) ? (
                  <>
                    <Loader2Icon className="size-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="size-4 mr-2" />
                    Generate Code
                  </>
                )}
              </Button>
            )}
          </div>
        </form>

        {/* Info Section */}
        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> Make sure your Figma file is set to &quot;Anyone with the link can view&quot; 
            or add the access token with proper permissions.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
