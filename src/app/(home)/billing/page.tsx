"use client";

import { useQuery } from "@tanstack/react-query";
import { CreditCardIcon, MailIcon, ReceiptTextIcon, UserIcon, WalletCardsIcon } from "lucide-react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatVnd } from "@/lib/payments/credits";
import { useTRPC } from "@/trpc/client";

function formatDate(date: Date | string | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function statusVariant(status: string) {
  if (status === "PAID") {
    return "default" as const;
  }

  if (status === "FAILED" || status === "CANCELLED" || status === "EXPIRED") {
    return "destructive" as const;
  }

  return "secondary" as const;
}

export default function BillingPage() {
  const api = useTRPC();
  const { user } = useUser();
  const { data, isLoading } = useQuery(api.billing.summary.queryOptions());
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
  }, [paymentStatus]);

  const paidPayments = data?.payments.filter((payment) => payment.status === "PAID") ?? [];
  const totalPaid = paidPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalCredits = paidPayments.reduce((sum, payment) => sum + payment.credits, 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-28 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold md:text-4xl">Billing</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Your account, credits, and PayOS payment history.
          </p>
        </div>
        <Button asChild>
          <Link href="/pricing">
            <CreditCardIcon className="size-4" />
            Buy credits
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserIcon className="size-4" />
              Account
            </CardTitle>
            <CardDescription>Signed-in billing identity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="font-medium">
              {user?.fullName || user?.username || "Current user"}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MailIcon className="size-4" />
              <span className="truncate">
                {user?.primaryEmailAddress?.emailAddress || "-"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <WalletCardsIcon className="size-4" />
              Credits
            </CardTitle>
            <CardDescription>Available usage for generations</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-28" />
            ) : (
              <div className="text-3xl font-bold">
                {data?.usage.remainingPoints ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptTextIcon className="size-4" />
              Paid
            </CardTitle>
            <CardDescription>Completed PayOS purchases</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-32" />
            ) : (
              <div className="space-y-1">
                <div className="text-3xl font-bold">{formatVnd(totalPaid)}</div>
                <div className="text-xs text-muted-foreground">
                  {totalCredits} credits purchased
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg shadow-none">
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
          <CardDescription>PayOS orders created from this account</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : data?.payments.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-xs">
                      {payment.orderCode}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(payment.status)}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{payment.credits}</TableCell>
                    <TableCell>{formatVnd(payment.amount)}</TableCell>
                    <TableCell>{formatDate(payment.createdAt)}</TableCell>
                    <TableCell>{formatDate(payment.paidAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex min-h-32 flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-muted-foreground">No payment history yet.</p>
              <Button asChild variant="outline">
                <Link href="/pricing">Buy your first credit pack</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
