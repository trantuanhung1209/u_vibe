import { Hint } from "@/components/hint";
import { Button } from "@/components/ui/button";
import { Fragment } from "@/generated/prisma/client";
import { ExternalLinkIcon, RefreshCcw } from "lucide-react";
import { useState } from "react";

interface Props {
  data: Fragment;
}

const FragementWeb = ({ data }: Props) => {
  const [fragmentKey, setFragmentKey] = useState(0);

  const onRefresh = () => {
    setFragmentKey((prev) => prev + 1);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(data.sandboxUrl || "");
  };

  const { sandboxUrl, title } = data;
  return (
    <>
      <div className="flex flex-col w-full h-full">
        <div className="p-2 border-b bg-sidebar flex items-center gap-x-2">
          <Button size="sm" variant="outline" onClick={onRefresh}>
            <RefreshCcw className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 justify-start text-start font-normal"
            disabled={!sandboxUrl}
            onClick={handleCopy}
          >
            <span className="truncate">{sandboxUrl}</span>
          </Button>
          <Hint text="Open in a new tab" side="bottom" align="start">
            <Button
              size="sm"
              variant="outline"
              disabled={!sandboxUrl}
              onClick={() => {
                if (!sandboxUrl) {
                  return;
                }
                window.open(sandboxUrl, "_blank");
              }}
            >
              <ExternalLinkIcon className="size-4" />
            </Button>
          </Hint>
        </div>
        <iframe
          key={fragmentKey}
          src={sandboxUrl}
          title={title}
          className="flex-1 w-full h-full border-0"
          sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-modals allow-pointer-lock"
          loading="lazy"
        />
      </div>
    </>
  );
};

export default FragementWeb;
