"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/admin/stats-card";
import { ProjectsChart } from "@/components/admin/projects-chart";
import { UserActivityChart } from "@/components/admin/user-activity-chart";
import { UsersTable } from "@/components/admin/users-table";
import { ProjectsTable } from "@/components/admin/projects-table";
import {
  FolderKanban,
  MessageSquare,
  Code2,
  Users,
  TrendingUp,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const api = useTRPC();
  const { data: stats, isLoading: statsLoading } = useQuery(
    api.admin.getStats.queryOptions()
  );
  const { data: projectsChartData, isLoading: projectsChartLoading } = useQuery(
    api.admin.getProjectsChart.queryOptions({ days: 30 })
  );
  const { data: userActivity, isLoading: userActivityLoading } = useQuery(
    api.admin.getUserActivity.queryOptions({ days: 30 })
  );

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-[80px]" />
                  <Skeleton className="h-3 w-[120px] mt-2" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatsCard
              title="Total Projects"
              value={stats?.totalProjects || 0}
              description="All projects created"
              icon={FolderKanban}
            />
            <StatsCard
              title="Total Messages"
              value={stats?.totalMessages || 0}
              description="Messages exchanged"
              icon={MessageSquare}
            />
            <StatsCard
              title="Total Fragments"
              value={stats?.totalFragments || 0}
              description="Code fragments generated"
              icon={Code2}
            />
            <StatsCard
              title="Recent Projects"
              value={stats?.recentProjects.length || 0}
              description="Last 10 projects"
              icon={TrendingUp}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {projectsChartLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[200px]" />
              <Skeleton className="h-4 w-[150px] mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[350px] w-full" />
            </CardContent>
          </Card>
        ) : (
          <ProjectsChart data={projectsChartData || []} />
        )}

        {userActivityLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[200px]" />
              <Skeleton className="h-4 w-[150px] mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[350px] w-full" />
            </CardContent>
          </Card>
        ) : (
          <UserActivityChart data={userActivity || []} />
        )}
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="recent">
            <FolderKanban className="w-4 h-4 mr-2" />
            Recent Projects
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              <UsersTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectsTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
