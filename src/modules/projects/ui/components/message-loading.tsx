import Image from "next/image";
import { useEffect, useState } from "react";

const ShimmerMessages = () => {
  const messages = [
    "Thinking...",
    "Loading...",
    "Generating response...",
    "Analyzing your request...",
    "Building your website...",
    "Crafting components...",
    "Optimizing layout...",
    "Almost final touches...",
    "Almost ready...",
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 2000); // Change message every 2 seconds

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <>
      <span className="text-base text-muted-foreground animate-pulse">{messages[currentMessageIndex]}</span>
    </>
  );
};

export const MessageLoading = () => {
    return (
        <>
            <div className="flex flex-col group px-2 pb-4">
                <div className="flex items-center gap-2 pl-2 mb-2">
                    <Image 
                        src="/cloud_vibe.png"
                        alt="Uside"
                        width={30}
                        height={30}
                        className="shrink-0"
                    />
                    <span className="text-sm font-bold">Uside</span>
                </div>
                <div className="pl-8.5 flex flex-col gap-y-4">
                    <ShimmerMessages />
                </div>
            </div>
        </>        
    )
}
