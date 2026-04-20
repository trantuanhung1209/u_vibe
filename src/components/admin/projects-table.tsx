"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Search, Filter, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

export function ProjectsTable() {
  const api = useTRPC();
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const limit = 10;

  const { data, isLoading } = useQuery(
    api.admin.getProjects.queryOptions({
      limit,
      offset: page * limit,
      search: searchQuery || undefined,
      userId: userFilter !== "all" ? userFilter : undefined,
      dateFrom,
      dateTo,
    })
  );

  // Get unique users for filter
  const { data: usersData } = useQuery(
    api.admin.getUsers.queryOptions({
      limit: 100,
      offset: 0,
      role: "all",
    })
  );

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(0);
  };

  const handleUserFilterChange = (value: string) => {
    setUserFilter(value);
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
    setUserFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(0);
  };

  const hasActiveFilters = searchQuery || userFilter !== "all" || dateFrom || dateTo;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading projects...</div>
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
              placeholder="Search projects by name..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* User Filter */}
          <Select value={userFilter} onValueChange={handleUserFilterChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {usersData?.users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date From */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-[180px]">
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
              <Button variant="outline" className="w-full sm:w-[180px]">
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

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {searchQuery && (
              <Badge variant="secondary" className="gap-1">
                Search: {searchQuery}
                <X className="h-3 w-3 cursor-pointer" onClick={() => handleSearch("")} />
              </Badge>
            )}
            {userFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                User: {usersData?.users.find(u => u.id === userFilter)?.firstName}
                <X className="h-3 w-3 cursor-pointer" onClick={() => handleUserFilterChange("all")} />
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
          Found {data?.totalCount || 0} project{(data?.totalCount || 0) !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project Name</TableHead>
              <TableHead>Messages</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No projects found
                </TableCell>
              </TableRow>
            ) : (
              data?.projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <Link 
                      href={`/projects/${project.id}`}
                      className="font-medium hover:underline"
                    >
                      {project.name}
                    </Link>
                  </TableCell>
                  <TableCell>{project._count.messages}</TableCell>
                  <TableCell>
                    {project.user ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={project.user.imageUrl} alt={project.user.firstName} />
                          <AvatarFallback>
                            {project.user.firstName?.[0]}
                            {project.user.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">
                            {project.user.firstName} {project.user.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {project.user.email}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {project.userId.slice(0, 8)}...
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(project.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {page * limit + 1} to{" "}
            {Math.min((page + 1) * limit, data?.totalCount || 0)} of{" "}
            {data?.totalCount} projects
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
            <div className="flex items-center gap-1">
              <span className="text-sm">
                Page {page + 1} of {totalPages}
              </span>
            </div>
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
    </>
  );
}
