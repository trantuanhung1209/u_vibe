import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { toast } from "sonner";
import TextareaAutosize from "react-textarea-autosize";
import { useTRPC } from "@/trpc/client";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, FormField } from "@/components/ui/form";
import { useState, useRef } from "react";
import { ArrowUpIcon, Loader2Icon, ImageIcon, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { PROJECT_TEMPLATES } from "../constants";
import { Button } from "@/components/ui/button";
import { ProjectList } from "./project-list";
import { useClerk } from "@clerk/nextjs";

const formSchema = z.object({
  value: z
    .string()
    .min(1, { message: "Message is required" })
    .max(5000, { message: "Message is too long" }),
  imageUrl: z.string().optional(),
});

export const ProjectForm = () => {
  const router = useRouter();
  const trpc = useTRPC();
  const clerk = useClerk();
  const queryClient = useQueryClient();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      value: "",
      imageUrl: undefined,
    },
  });

  const createProject = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (data) => {
        form.reset();
        setImagePreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
        router.push(`/projects/${data.id}`);

        queryClient.invalidateQueries(trpc.usage.status.queryOptions());
      },

      onError: (error) => {
        toast.error(error.message);

        if (error.data?.code === "UNAUTHORIZED") {
          clerk.openSignIn();
          return;
        }

        if (error.data?.code === "TOO_MANY_REQUESTS") {
          router.push("/pricing");
        }
      },
    })
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setImagePreview(data.imageUrl);
        form.setValue("imageUrl", data.imageUrl);
        toast.success("Image uploaded successfully");
      } else {
        toast.error(data.error || "Failed to upload image");
      }
    } catch (error) {
      toast.error("Failed to upload image" + (error instanceof Error ? `: ${error.message}` : ""));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    form.setValue("imageUrl", undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await createProject.mutateAsync({
      value: values.value,
      imageUrl: values.imageUrl,
    } as any);
  };

  const onSelect = (value: string) => {
    form.setValue("value", value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const [isFocused, setIsFocused] = useState(false);
  const isPending = createProject.isPending;
  const isButtonDisabled = isPending || !form.formState.isValid;

  return (
    <>
      <Form {...form}>
        <section className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
            }}
            className={cn(
              "relative border p-4 pt-1 rounded-xl bg-sidebar dark:bg-sidebar transition-all",
              isFocused && "shadow-xs"
            )}
          >
            {/* Image Preview */}
            {imagePreview && (
              <div className="relative mb-2 mt-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-40 rounded-lg border object-contain"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1 bg-destructive rounded-full hover:bg-destructive/90 transition-colors"
                  title="Remove image"
                >
                  <X className="w-4 h-4 text-destructive-foreground" />
                </button>
              </div>
            )}

            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <TextareaAutosize
                  {...field}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  minRows={2}
                  maxRows={8}
                  className="pt-4 resize-none border-none w-full outline-none bg-transparent"
                  placeholder="What would you like to build"
                />
              )}
            />

            <div className="flex gap-x-2 items-end justify-between pt-2">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage || isPending}
                  className="p-2 hover:bg-accent rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Upload image"
                >
                  {isUploadingImage ? (
                    <Loader2Icon className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="text-[10px] text-muted-foreground font-mono">
                  <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    <span>↵</span>
                  </kbd>
                  &nbsp;for new line
                </div>
              </div>
              <button
                type="button"
                disabled={isButtonDisabled}
                onClick={() => form.handleSubmit(onSubmit)()}
                className={cn(
                  "size-8 rounded-full flex items-center justify-center transition-colors",
                  isButtonDisabled
                    ? "opacity-50 cursor-not-allowed bg-primary/50 text-primary-foreground"
                    : "hover:bg-primary/80 bg-primary text-primary-foreground"
                )}
              >
                {isPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <ArrowUpIcon />
                )}
              </button>
            </div>
          </form>
          <div className="flex-wrap justify-center gap-2 hidden md:flex max-w-3xl">
            {PROJECT_TEMPLATES.map((template) => (
              <Button
                key={template.title}
                size="sm"
                variant="outline"
                onClick={() => onSelect(template.prompt)}
                className="flex items-center gap-2 rounded-full border border-muted px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                <span>{template.emoji}</span>
                <span>{template.title}</span>
              </Button>
            ))}
          </div>

          <ProjectList />
        </section>
      </Form>
    </>
  );
};
