"use client";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CREDIT_PACK, formatVnd } from "@/lib/payments/credits";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { CheckIcon, CoinsIcon, CreditCardIcon, Loader2Icon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const Page = () => {
  const { isSignedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const paymentStatus = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return new URLSearchParams(window.location.search).get("payment");
  }, []);

  useEffect(() => {
    if (paymentStatus === "success") {
      toast.success("Payment confirmed. Credits have been added.");
    }

    if (paymentStatus === "pending") {
      toast.info("Payment is pending. Credits will be added after PayOS confirms it.");
    }

    if (paymentStatus === "cancelled") {
      toast.info("Payment cancelled.");
    }
  }, [paymentStatus]);

  const handleCheckout = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/payments/payos/checkout", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok || !data.checkoutUrl) {
        throw new Error(data.error || "Could not create checkout link");
      }

      window.location.href = data.checkoutUrl;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment failed");
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col max-w-4xl mx-auto w-full px-4">
        <section className="space-y-8 pt-[14vh] 2xl:pt-44">
          <div className="flex flex-col items-center">
            <Logo className="hidden md:block" />
          </div>
          <div className="space-y-3 text-center">
            <h1 className="text-2xl md:text-4xl font-bold">Buy credits</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Add credits instantly and keep building without changing your plan.
            </p>
          </div>

          <div className="mx-auto grid w-full max-w-md">
            <Card className="rounded-lg shadow-none">
              <CardHeader className="gap-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <CoinsIcon className="size-5" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {formatVnd(CREDIT_PACK.amount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      One-time payment
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-xl">{CREDIT_PACK.name}</CardTitle>
                  <CardDescription>
                    {CREDIT_PACK.credits} extra generations for your account.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckIcon className="size-4 text-primary" />
                    <span>Credits are added after PayOS confirms payment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="size-4 text-primary" />
                    <span>No subscription or recurring charge</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                {isSignedIn ? (
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <CreditCardIcon className="size-4" />
                    )}
                    Pay with PayOS
                  </Button>
                ) : (
                  <SignInButton mode="modal">
                    <Button className="w-full" size="lg">
                      <CreditCardIcon className="size-4" />
                      Sign in to buy credits
                    </Button>
                  </SignInButton>
                )}
              </CardFooter>
            </Card>
          </div>
        </section>
      </div>
    </>
  );
};

export default Page;
