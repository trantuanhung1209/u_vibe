"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatVnd } from "@/lib/payments/credits";
import { useTRPC } from "@/trpc/client";

type PaymentStatus = "all" | "PENDING" | "PAID" | "CANCELLED" | "EXPIRED" | "FAILED";

const LIMIT = 10;

function formatDate(date: Date | string | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
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

export function PaymentsTable() {
  const api = useTRPC();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<PaymentStatus>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery(
    api.admin.getPayments.queryOptions({
      limit: LIMIT,
      offset: page * LIMIT,
      status,
      search: search || undefined,
    })
  );

  const totalPages = Math.max(Math.ceil((data?.totalCount || 0) / LIMIT), 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          className="max-w-sm"
          placeholder="Search user id or description"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(0);
          }}
        />
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as PaymentStatus);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-full md:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Paid</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.payments.length ? (
              data.payments.map((payment) => {
                const displayName = payment.user
                  ? `${payment.user.firstName} ${payment.user.lastName}`.trim() ||
                    payment.user.email
                  : payment.userId;

                return (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8 rounded-md">
                          <AvatarImage src={payment.user?.imageUrl || undefined} />
                          <AvatarFallback className="rounded-md">
                            {displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{displayName}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {payment.user?.email || payment.userId}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {payment.orderCode}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(payment.status)}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatVnd(payment.amount)}</TableCell>
                    <TableCell>{payment.credits}</TableCell>
                    <TableCell>{formatDate(payment.createdAt)}</TableCell>
                    <TableCell>{formatDate(payment.paidAt)}</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                  No payment logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {page + 1} of {totalPages}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setPage((current) => Math.max(current - 1, 0))}
            disabled={page === 0}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setPage((current) => Math.min(current + 1, totalPages - 1))}
            disabled={page >= totalPages - 1}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
