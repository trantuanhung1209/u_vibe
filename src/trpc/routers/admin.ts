import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import db from "@/lib/db";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/auth";

export const adminRouter = createTRPCRouter({
  // Lấy thống kê tổng quan
  getStats: protectedProcedure.query(async () => {
    await requireAdmin();

    const [
      totalProjects,
      totalMessages,
      totalFragments,
      recentProjects,
    ] = await Promise.all([
      db.project.count(),
      db.message.count(),
      db.fragment.count(),
      db.project.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          userId: true,
          createdAt: true,
          _count: {
            select: { messages: true },
          },
        },
      }),
    ]);

    // Lấy thông tin user từ Clerk cho mỗi project
    const client = await clerkClient();
    const recentProjectsWithUser = await Promise.all(
      recentProjects.map(async (project) => {
        try {
          const user = await client.users.getUser(project.userId);
          return {
            ...project,
            user: {
              id: user.id,
              firstName: user.firstName || "",
              lastName: user.lastName || "",
              imageUrl: user.imageUrl,
              email: user.emailAddresses[0]?.emailAddress || "",
            },
          };
        } catch {
          // Nếu không lấy được user, trả về null
          return {
            ...project,
            user: null,
          };
        }
      })
    );

    return {
      totalProjects,
      totalMessages,
      totalFragments,
      recentProjects: recentProjectsWithUser,
    };
  }),

  // Lấy danh sách projects với filter và pagination
  getProjects: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
        search: z.string().optional(),
        userId: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      await requireAdmin();

      // Build where clause
      interface ProjectWhereInput {
        name?: {
          contains: string;
          mode: "insensitive";
        };
        userId?: string;
        createdAt?: {
          gte?: Date;
          lte?: Date;
        };
      }
      
      const where: ProjectWhereInput = {};

      if (input.search) {
        where.name = {
          contains: input.search,
          mode: "insensitive",
        };
      }

      if (input.userId) {
        where.userId = input.userId;
      }

      if (input.dateFrom || input.dateTo) {
        where.createdAt = {};
        if (input.dateFrom) {
          where.createdAt.gte = input.dateFrom;
        }
        if (input.dateTo) {
          where.createdAt.lte = input.dateTo;
        }
      }

      const [projects, totalCount] = await Promise.all([
        db.project.findMany({
          where,
          take: input.limit,
          skip: input.offset,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            userId: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: { messages: true },
            },
          },
        }),
        db.project.count({ where }),
      ]);

      // Lấy thông tin user từ Clerk cho mỗi project
      const client = await clerkClient();
      const projectsWithUser = await Promise.all(
        projects.map(async (project) => {
          try {
            const user = await client.users.getUser(project.userId);
            return {
              ...project,
              user: {
                id: user.id,
                firstName: user.firstName || "",
                lastName: user.lastName || "",
                imageUrl: user.imageUrl,
                email: user.emailAddresses[0]?.emailAddress || "",
              },
            };
          } catch {
            return {
              ...project,
              user: null,
            };
          }
        })
      );

      return {
        projects: projectsWithUser,
        totalCount,
      };
    }),

  // Lấy dữ liệu biểu đồ projects theo thời gian
  getProjectsChart: protectedProcedure
    .input(
      z.object({
        days: z.number().min(7).max(90).default(30),
      })
    )
    .query(async ({ input }) => {
      await requireAdmin();

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const projects = await db.project.groupBy({
        by: ["createdAt"],
        _count: true,
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      // Group by date
      interface ChartDataItem {
        date: string;
        count: number;
      }
      
      const chartData = projects.reduce((acc: ChartDataItem[], project) => {
        const date = project.createdAt.toISOString().split("T")[0];
        const existing = acc.find((item) => item.date === date);

        if (existing) {
          existing.count += project._count;
        } else {
          acc.push({
            date,
            count: project._count,
          });
        }

        return acc;
      }, []);

      return chartData;
    }),

  // Lấy thống kê messages theo type
  getMessagesStats: protectedProcedure.query(async () => {
    await requireAdmin();

    const messagesByType = await db.message.groupBy({
      by: ["type", "role"],
      _count: true,
    });

    return messagesByType.map((item) => ({
      type: item.type,
      role: item.role,
      count: item._count,
    }));
  }),

  // Lấy danh sách users từ Clerk
  getUsers: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
        search: z.string().optional(),
        role: z.enum(["admin", "user", "all"]).optional().default("all"),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      await requireAdmin();

      const client = await clerkClient();
      
      // Build query params for Clerk
      interface ClerkQueryParams {
        limit: number;
        offset: number;
        query?: string;
      }
      
      const queryParams: ClerkQueryParams = {
        limit: 500, // Lấy nhiều để filter phía server
        offset: 0,
      };

      // Nếu có search query, thêm vào params
      if (input.search) {
        queryParams.query = input.search;
      }

      const response = await client.users.getUserList(queryParams);

      // Lấy thống kê projects cho mỗi user
      let usersWithStats = await Promise.all(
        response.data.map(async (user) => {
          const projectCount = await db.project.count({
            where: { userId: user.id },
          });

          return {
            id: user.id,
            email: user.emailAddresses[0]?.emailAddress || "",
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            imageUrl: user.imageUrl,
            role: (user.publicMetadata?.role as string) || "user",
            createdAt: user.createdAt,
            projectCount,
          };
        })
      );

      // Filter by role
      if (input.role && input.role !== "all") {
        usersWithStats = usersWithStats.filter(user => user.role === input.role);
      }

      // Filter by date range
      if (input.dateFrom) {
        usersWithStats = usersWithStats.filter(
          user => new Date(user.createdAt) >= input.dateFrom!
        );
      }
      if (input.dateTo) {
        usersWithStats = usersWithStats.filter(
          user => new Date(user.createdAt) <= input.dateTo!
        );
      }

      // Sort by creation date (newest first)
      usersWithStats.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Apply pagination after filtering
      const totalCount = usersWithStats.length;
      const paginatedUsers = usersWithStats.slice(
        input.offset,
        input.offset + input.limit
      );

      return {
        users: paginatedUsers,
        totalCount,
      };
    }),

  // Update user role
  updateUserRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["admin", "user"]),
      })
    )
    .mutation(async ({ input }) => {
      await requireAdmin();

      const client = await clerkClient();
      await client.users.updateUserMetadata(input.userId, {
        publicMetadata: {
          role: input.role,
        },
      });

      return { success: true };
    }),

  // Delete user
  deleteUser: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await requireAdmin();

      // Xóa tất cả projects của user
      await db.project.deleteMany({
        where: { userId: input.userId },
      });

      // Xóa user trong Clerk
      const client = await clerkClient();
      await client.users.deleteUser(input.userId);

      return { success: true };
    }),

  // Lấy user activity (projects created over time)
  getUserActivity: protectedProcedure
    .input(
      z.object({
        days: z.number().min(7).max(90).default(30),
      })
    )
    .query(async ({ input }) => {
      await requireAdmin();

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // Lấy số lượng users mới theo ngày (từ Clerk)
      const client = await clerkClient();
      const allUsers = await client.users.getUserList({
        limit: 500,
      });

      interface UserActivityItem {
        date: string;
        newUsers: number;
      }

      const usersByDate = allUsers.data.reduce((acc: UserActivityItem[], user) => {
        const date = new Date(user.createdAt).toISOString().split("T")[0];
        const existing = acc.find((item) => item.date === date);

        if (existing) {
          existing.newUsers += 1;
        } else {
          acc.push({
            date,
            newUsers: 1,
          });
        }

        return acc;
      }, []);

      // Filter by date range and sort
      return usersByDate
        .filter((item) => new Date(item.date) >= startDate)
        .sort((a, b) => a.date.localeCompare(b.date));
    }),
});
