import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { toast } from "sonner";
import TextareaAutosize from "react-textarea-autosize";
import { useTRPC } from "@/trpc/client";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Form, FormField } from "@/components/ui/form";
import { useState, useRef } from "react";
import { ArrowUpIcon, Loader2Icon, ImageIcon, X } from "lucide-react";
import { Usage } from "./usage";
import { useRouter } from "next/navigation";

interface Props {
  projectId: string;
}

const formSchema = z.object({
  value: z
    .string()
    .min(1, { message: "Message is required" })
    .max(5000, { message: "Message is too long" }),
  imageUrl: z.string().optional(),
});

export const MessageForm = ({ projectId }: Props) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: usage} = useQuery(trpc.usage.status.queryOptions());

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

  const createMessage = useMutation(
    trpc.messages.create.mutationOptions({
      onSuccess: () => {
        form.reset();
        setImagePreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        queryClient.invalidateQueries(
          trpc.messages.getMany.queryOptions({ projectId })
        );

        queryClient.invalidateQueries(
          trpc.usage.status.queryOptions()
        );
      },

      onError: (error) => {
        toast.error(error.message);

        if(error.data?.code === "TOO_MANY_REQUESTS") {
          router.push('/pricing');
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
    await createMessage.mutateAsync({
      value: values.value,
      projectId: projectId,
      imageUrl: values.imageUrl,
    });
  };

  const [isFocused, setIsFocused] = useState(false);
  const showUsage = !!usage; // Placeholder for usage state
  const isPending = createMessage.isPending;
  const isButtonDisabled = isPending || !form.formState.isValid;

  return (
    <>
      <Form {...form}>
        {showUsage && <Usage points={usage.remainingPoints} msBeforeNext={usage.msBeforeNext} />}
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className={cn(
            "relative border p-4 pt-1 rounded-xl bg-sidebar dark:bg-sidebar transition-all",
            isFocused && "shadow-xs",
            showUsage && "rounded-t-none"
          )}
        >
          {/* Image Preview */}
          {imagePreview && (
            <div className="relative mb-2 mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
      </Form>
    </>
  );
};
