"use client";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MessageCard } from "./message-card";
import { MessageForm } from "./message-form";
import { useEffect, useRef } from "react";
import { Fragment } from "@/generated/prisma/client";
import { MessageLoading } from "./message-loading";

interface Props {
  projectId: string;
  activeFragment: Fragment | null;
  setActiveFragment: (fragment: Fragment | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
}

export const MessagesContainer = ({
  projectId,
  activeFragment,
  setActiveFragment,
  setIsGenerating,
}: Props) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessageIdRef = useRef<string | null>(null);

  const trpc = useTRPC();
  const { data: messages } = useSuspenseQuery(
    trpc.messages.getMany.queryOptions(
      { projectId },
      {
        refetchInterval: 2000,
      }
    )
  );

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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const messagesList = Array.isArray(messages) ? messages : [];
  const lastMessage = messagesList[messagesList.length - 1];
  const isLastMessageFromUser = (lastMessage as any)?.role === "USER";

  useEffect(() => {
    setIsGenerating(isLastMessageFromUser);
  }, [isLastMessageFromUser, setIsGenerating]);

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-auto">
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
            {isLastMessageFromUser && <MessageLoading />}
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
