import { Button } from "@/components/ui/button";
import { formatDuration, intervalToDuration } from "date-fns";
import { CoinsIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

interface Props {
  points: number;
  msBeforeNext: number;
  isPro?: boolean;
  paidCredits?: number;
  freeCredits?: number;
}

export const Usage = ({ points, msBeforeNext, isPro, paidCredits, freeCredits }: Props) => {
  const validFor = useMemo(() => {
    if (isPro || msBeforeNext <= 0) {
      return null;
    }

    const now = new Date();
    return formatDuration(
      intervalToDuration({
        start: now,
        end: new Date(now.getTime() + msBeforeNext),
      }),
      { format: ["months", "days", "hours"] }
    );
  }, [isPro, msBeforeNext]);

  return (
    <>
      <div className="rounded-t-xl bg-background border border-b-0 border-border px-4 py-2">
        <div className="flex items-center gap-x-2">
          <div className="">
            <p className="text-sm font-medium">
              {points} credits remaining
            </p>
            <p className="text-muted-foreground text-xs">
              {isPro
                ? `${paidCredits ?? 0} paid credits do not reset`
                : `Free credits reset in ${validFor}`}
              {isPro && typeof freeCredits === "number"
                ? ` · ${freeCredits} free credits reserved`
                : ""}
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="ml-auto">
            <Link href="/pricing">
              <CoinsIcon /> Buy credits
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
};
