"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { MoreHorizontal, Shield, User, Trash2, Search, Filter, CalendarIcon, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type RoleFilter = "all" | "admin" | "user";

export function UsersTable() {
  const api = useTRPC();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const limit = 10;

  const { data, isLoading } = useQuery(
    api.admin.getUsers.queryOptions({
      limit,
      offset: page * limit,
      search: searchQuery || undefined,
      role: roleFilter,
      dateFrom,
      dateTo,
    })
  );

  const updateRoleMutation = useMutation(
    api.admin.updateUserRole.mutationOptions({
      onSuccess: () => {
        toast.success("User role updated successfully");
        queryClient.invalidateQueries(
          api.admin.getUsers.queryOptions({ 
            limit, 
            offset: page * limit,
            search: searchQuery || undefined,
            role: roleFilter,
            dateFrom,
            dateTo,
          })
        );
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const deleteUserMutation = useMutation(
    api.admin.deleteUser.mutationOptions({
      onSuccess: () => {
        toast.success("User deleted successfully");
        setDeleteUserId(null);
        queryClient.invalidateQueries(
          api.admin.getUsers.queryOptions({ 
            limit, 
            offset: page * limit,
            search: searchQuery || undefined,
            role: roleFilter,
            dateFrom,
            dateTo,
          })
        );
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const handleRoleChange = (userId: string, role: "admin" | "user") => {
    updateRoleMutation.mutate({ userId, role });
  };

  const handleDeleteUser = () => {
    if (deleteUserId) {
      deleteUserMutation.mutate({ userId: deleteUserId });
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(0); // Reset về trang đầu khi search
  };

  const handleRoleFilterChange = (value: RoleFilter) => {
    setRoleFilter(value);
    setPage(0);
  };

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    setPage(0);
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    setPage(0);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setRoleFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(0);
  };

  const hasActiveFilters = searchQuery || roleFilter !== "all" || dateFrom || dateTo;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading users...</div>
      </div>
    );
  }

  const totalPages = Math.ceil((data?.totalCount || 0) / limit);

  return (
    <>
      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Role Filter */}
          <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">
                <div className="flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Admin
                </div>
              </SelectItem>
              <SelectItem value="user">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  User
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Date From */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-[200px]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "PP") : "From date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={handleDateFromChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Date To */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-[200px]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "PP") : "To date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={handleDateToChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Active Filters Display & Clear Button */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {searchQuery && (
              <Badge variant="secondary" className="gap-1">
                Search: {searchQuery}
                <X className="h-3 w-3 cursor-pointer" onClick={() => handleSearch("")} />
              </Badge>
            )}
            {roleFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Role: {roleFilter}
                <X className="h-3 w-3 cursor-pointer" onClick={() => handleRoleFilterChange("all")} />
              </Badge>
            )}
            {dateFrom && (
              <Badge variant="secondary" className="gap-1">
                From: {format(dateFrom, "PP")}
                <X className="h-3 w-3 cursor-pointer" onClick={() => handleDateFromChange(undefined)} />
              </Badge>
            )}
            {dateTo && (
              <Badge variant="secondary" className="gap-1">
                To: {format(dateTo, "PP")}
                <X className="h-3 w-3 cursor-pointer" onClick={() => handleDateToChange(undefined)} />
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        )}

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          Found {data?.totalCount || 0} user{(data?.totalCount || 0) !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Projects</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.imageUrl} alt={user.firstName} />
                      <AvatarFallback>
                        {user.firstName?.[0]}
                        {user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {user.firstName} {user.lastName}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge
                    variant={user.role === "admin" ? "default" : "secondary"}
                  >
                    {user.role === "admin" ? (
                      <Shield className="w-3 h-3 mr-1" />
                    ) : (
                      <User className="w-3 h-3 mr-1" />
                    )}
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>{user.projectCount}</TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          handleRoleChange(
                            user.id,
                            user.role === "admin" ? "user" : "admin"
                          )
                        }
                        disabled={updateRoleMutation.isPending}
                      >
                        {user.role === "admin"
                          ? "Make User"
                          : "Make Admin"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteUserId(user.id)}
                        className="text-destructive"
                        disabled={deleteUserMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {page * limit + 1} to{" "}
            {Math.min((page + 1) * limit, data?.totalCount || 0)} of{" "}
            {data?.totalCount} users
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              user and all their projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
