"use client";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { MessageCard } from "./message-card";
import { MessageForm } from "./message-form";
import { useCallback, useEffect, useRef, useState } from "react";
import { Fragment } from "@/generated/prisma/client";
import { MessageLoading } from "./message-loading";
import { Button } from "@/components/ui/button";
import { Loader2Icon, PlayIcon, SquareIcon } from "lucide-react";
import { toast } from "sonner";

interface Props {
  projectId: string;
  activeFragment: Fragment | null;
  setActiveFragment: (fragment: Fragment | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
}

const SCROLL_BOTTOM_THRESHOLD = 100;

export const MessagesContainer = ({
  projectId,
  activeFragment,
  setActiveFragment,
  setIsGenerating,
}: Props) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessageIdRef = useRef<string | null>(null);
  const isUserNearBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isStopping, setIsStopping] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);

  const { data: messages } = useSuspenseQuery(
    trpc.messages.getMany.queryOptions(
      { projectId },
      {
        refetchInterval: 2000,
      }
    )
  );

  const stopMutation = useMutation(
    trpc.messages.stop.mutationOptions({
      onMutate: () => setIsStopping(true),
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.messages.getMany.queryOptions({ projectId })
        );
      },
      onError: (error) => {
        toast.error(error.message);
      },
      onSettled: () => setIsStopping(false),
    })
  );

  const continueMutation = useMutation(
    trpc.messages.continueGeneration.mutationOptions({
      onMutate: () => setIsContinuing(true),
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.messages.getMany.queryOptions({ projectId })
        );
      },
      onError: (error) => {
        toast.error(error.message);
      },
      onSettled: () => setIsContinuing(false),
    })
  );

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    isUserNearBottomRef.current = distanceFromBottom < SCROLL_BOTTOM_THRESHOLD;
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const messagesList = Array.isArray(messages) ? messages : [];
    const lastAssistantMessage = messagesList.findLast( 
        (message: any) => message.role === "ASSISTANT"
    );

    if (
        lastAssistantMessage?.fragment && 
        lastAssistantMessage.id !== lastAssistantMessageIdRef.current
    ) {
        setActiveFragment(lastAssistantMessage.fragment);
        lastAssistantMessageIdRef.current = lastAssistantMessage.id;
    }
  }, [messages, setActiveFragment]);

  useEffect(() => {
    const messagesList = Array.isArray(messages) ? messages : [];
    const currentCount = messagesList.length;
    const hasNewMessages = currentCount > prevMessageCountRef.current;

    if (hasNewMessages) {
      const lastMsg = messagesList[currentCount - 1];
      const isFromUser = lastMsg?.role === "USER";

      if (isFromUser || isUserNearBottomRef.current) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }

    prevMessageCountRef.current = currentCount;
  }, [messages]);

  const messagesList = Array.isArray(messages) ? messages : [];
  const lastMessage = messagesList[messagesList.length - 1];
  const isLastMessageFromUser = (lastMessage as any)?.role === "USER";
  const isLastMessageStopped =
    lastMessage?.role === "ASSISTANT" &&
    lastMessage?.type === "ERROR" &&
    lastMessage?.content === "Generation stopped by user.";
  const isGeneratingNow = isLastMessageFromUser || isContinuing;

  useEffect(() => {
    setIsGenerating(isGeneratingNow);
  }, [isGeneratingNow, setIsGenerating]);

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0">
        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-auto"
        >
          <div className="pt-2 pr-1">
            {Array.isArray(messages) &&
              messages.map((message) => (
                <MessageCard
                  key={message.id}
                  content={message.content}
                  role={message.role}
                  fragment={message.fragment}
                  createdAt={message.createdAt}
                  isActiveFragment={activeFragment?.id === message.fragment?.id}
                  onFragmentClick={() => setActiveFragment(message.fragment)}
                  type={message.type}
                  hasImage={message.hasImage}
                  imageUrl={message.imageUrl}
                />
              ))}
            {isGeneratingNow && (
              <div className="flex flex-col items-start gap-2">
                <MessageLoading />
                <div className="pl-10 pb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => stopMutation.mutate({ projectId })}
                    disabled={isStopping}
                  >
                    {isStopping ? (
                      <Loader2Icon className="size-4 animate-spin mr-2" />
                    ) : (
                      <SquareIcon className="size-4 mr-2" />
                    )}
                    {isStopping ? "Stopping..." : "Stop"}
                  </Button>
                </div>
              </div>
            )}
            {isLastMessageStopped && !isContinuing && (
              <div className="pl-10 pb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => continueMutation.mutate({ projectId })}
                  disabled={isContinuing}
                >
                  <PlayIcon className="size-4 mr-2" />
                  Continue
                </Button>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
        <div className="relative p-3 pt-1">
          <div className="absolute -top-6 left-0 right-0 bg-linear-to-b from-transparent to-background pointer-events-none"></div>
          <MessageForm projectId={projectId} />
        </div>
      </div>
    </>
  );
};
