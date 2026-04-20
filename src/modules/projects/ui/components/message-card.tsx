import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Fragment, MessageRole, MessageType } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { ChevronRight, Code2Icon } from "lucide-react";
import { Logo } from "@/components/logo";

interface UserMessageProps {
  content: string;
  hasImage?: boolean;
  imageUrl?: string | null;
}

const UserMessage = ({ content, hasImage, imageUrl }: UserMessageProps) => {
  return (
    <>
      <div className="flex justify-end pb-4 pr-2 pl-10">
        <Card className="rounded-lg bg-muted p-3 shadow-none border-none max-w-[80%] wrap-break-word">
          {hasImage && imageUrl && (
            <img
              src={imageUrl}
              alt="Uploaded design"
              className="max-w-full max-h-60 rounded-lg border mb-2 object-contain"
            />
          )}
          {content}
        </Card>
      </div>
    </>
  );
};

interface FragmentCardProps {
  fragment: Fragment;
  isActive: boolean;
  onFragmentClick: (fragment: Fragment) => void;
}

const FragmentCard = ({
  fragment,
  isActive,
  onFragmentClick,
}: FragmentCardProps) => {
  return (
    <>
      <div className="flex flex-col gap-2 w-full">
        <button
          className={cn(
            "flex items-start text-start gap-2 border rounded-lg bg-muted w-fit p-3 hover:bg-secondary transition-colors",
            isActive &&
              "bg-primary text-primary-foreground border-primary hover:bg-primary"
          )}
          onClick={() => onFragmentClick(fragment)}
        >
          <Code2Icon className="size-4 mt-0.5" />
          <div className="flex flex-col flex-1">
            <span className="text-sm font-medium line-clamp-1">
              {fragment.title}
            </span>
            <span className="text-sm text-muted-foreground">Preview</span>
          </div>
          <div className="flex items-center justify-center mt-0.5">
            <ChevronRight className="size-4" />
          </div>
        </button>
      </div>
    </>
  );
};

interface AssistantMessageProps {
  content: string;
  fragment: Fragment | null;
  createdAt: Date;
  isActiveFragment: boolean;
  onFragmentClick: (fragment: Fragment) => void;
  type: MessageType;
}

const AssistantMessage = ({
  content,
  fragment,
  createdAt,
  isActiveFragment,
  onFragmentClick,
  type,
}: AssistantMessageProps) => {
  return (
    <>
      <div className={cn("flex flex-col group px-2 pb-4")}>
        <div className="flex items-center gap-2 pl-2 mb-1">
          <Logo withGlow />
          <span className="text-sm font-medium">Uside</span>
          <span className="text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            {format(createdAt, "HH:mm 'on' MMM dd, yyyy")}
          </span>
        </div>
        <div className="pl-8.5 flex flex-col gap-y-4">
          <Card
            className={cn(
              "rounded-lg p-3 shadow-none border-none max-w-[80%] wrap-break-word",
              type == "ERROR" && "text-red-500 dark:text-red-400"
            )}
          >
            {content}
          </Card>
          {fragment && type === "RESULT" && (
            <FragmentCard
              fragment={fragment}
              isActive={isActiveFragment}
              onFragmentClick={onFragmentClick}
            />
          )}
        </div>
      </div>
    </>
  );
};

interface MessageCardProps {
  content: string;
  role: MessageRole;
  fragment: Fragment | null;
  createdAt: Date;
  isActiveFragment: boolean;
  onFragmentClick: (fragment: Fragment) => void;
  type: MessageType;
  hasImage?: boolean;
  imageUrl?: string | null;
}

export const MessageCard = ({
  content,
  role,
  fragment,
  createdAt,
  isActiveFragment,
  onFragmentClick,
  type,
  hasImage,
  imageUrl,
}: MessageCardProps) => {
  if (role === "USER") {
    return (
      <>
        <UserMessage content={content} hasImage={hasImage} imageUrl={imageUrl} />
      </>
    );
  }
  if (role === "ASSISTANT") {
    return (
      <>
        <AssistantMessage
          content={content}
          fragment={fragment}
          createdAt={createdAt}
          isActiveFragment={isActiveFragment}
          onFragmentClick={onFragmentClick}
          type={type}
        />
      </>
    );
  }

  return null;
};
