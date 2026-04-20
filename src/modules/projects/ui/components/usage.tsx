import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/nextjs";
import { formatDuration, intervalToDuration } from "date-fns";
import { CrownIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

interface Props {
  points: number;
  msBeforeNext: number;
}

export const Usage = ({ points, msBeforeNext }: Props) => {
  const { has } = useAuth();
  const hasProAccess = has?.({ plan: "pro" });

  const resetTime = useMemo(() => {
    const now = new Date();
    return formatDuration(
      intervalToDuration({
        start: now,
        end: new Date(now.getTime() + msBeforeNext),
      }),
      { format: ["months", "days", "hours"] }
    );
  }, [msBeforeNext]);

  return (
    <>
      <div className="rounded-t-xl bg-background border border-b-0 border-border px-4 py-2">
        <div className="flex items-center gap-x-2">
          <div className="">
            <p className="text-sm font-medium">
              {points} {hasProAccess ? "" : "free"} credits remaining
            </p>
            <p className="text-muted-foreground text-xs">
              Resets in {resetTime}
            </p>
          </div>
          {!hasProAccess && (
            <Button asChild size="sm" variant="outline" className="ml-auto">
              <Link href="/pricing">
                <CrownIcon /> Upgrade
              </Link>
            </Button>
          )}
        </div>
      </div>
    </>
  );
};
