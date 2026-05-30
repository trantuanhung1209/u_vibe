/**
 * Admin Router
 *
 * Redis được dùng để cache các aggregation queries nặng.
 *
 * Các query như getStats, getProjectsChart, getUserActivity đều:
 * - Gọi Clerk API (external HTTP request)
 * - Chạy COUNT/GROUP BY trên toàn bộ database
 * - Không cần real-time — admin chấp nhận data trễ 5 phút
 *
 * Cache strategy: TTL.LONG (5 phút)
 * Invalidation: tự động hết hạn theo TTL (không cần manual invalidate)
 *
 * Các query có filter/pagination (getProjects, getPayments, getUsers)
 * KHÔNG cache vì input thay đổi liên tục → cache key sẽ bùng nổ.
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import db from "@/lib/db";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/auth";
import { withCache, invalidateCacheByPattern, CACHE_KEYS, TTL } from "@/lib/redis-cache";

export const adminRouter = createTRPCRouter({
  /**
   * Thống kê tổng quan — cache 5 phút.
   *
   * Gọi Clerk API cho từng project → rất chậm nếu không cache.
   * Cache key: "admin:stats"
   */
  getStats: protectedProcedure.query(async () => {
    await requireAdmin();

    return withCache(
      CACHE_KEYS.adminStats(),
      async () => {
        const [totalProjects, totalMessages, totalFragments, recentProjects] =
          await Promise.all([
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
                _count: { select: { messages: true } },
              },
            }),
          ]);

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
              return { ...project, user: null };
            }
          })
        );

        return {
          totalProjects,
          totalMessages,
          totalFragments,
          recentProjects: recentProjectsWithUser,
        };
      },
      { ttl: TTL.LONG } // Cache 5 phút
    );
  }),

  /**
   * Danh sách payments — KHÔNG cache vì có filter/pagination.
   * Mỗi combination của input tạo ra cache key khác nhau → lãng phí memory.
   */
  getPayments: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(25),
        offset: z.number().min(0).default(0),
        status: z
          .enum(["all", "PENDING", "PAID", "CANCELLED", "EXPIRED", "FAILED"])
          .default("all"),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      await requireAdmin();

      const where = {
        ...(input.status !== "all" && { status: input.status }),
        ...(input.search && {
          OR: [
            { userId: { contains: input.search, mode: "insensitive" as const } },
            { description: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [payments, totalCount] = await Promise.all([
        db.creditPayment.findMany({
          where,
          take: input.limit,
          skip: input.offset,
          orderBy: { createdAt: "desc" },
        }),
        db.creditPayment.count({ where }),
      ]);

      const client = await clerkClient();
      const paymentsWithUsers = await Promise.all(
        payments.map(async (payment) => {
          try {
            const user = await client.users.getUser(payment.userId);
            return {
              ...payment,
              orderCode: payment.orderCode.toString(),
              user: {
                id: user.id,
                firstName: user.firstName || "",
                lastName: user.lastName || "",
                imageUrl: user.imageUrl,
                email: user.emailAddresses[0]?.emailAddress || "",
              },
            };
          } catch {
            return { ...payment, orderCode: payment.orderCode.toString(), user: null };
          }
        })
      );

      return { payments: paymentsWithUsers, totalCount };
    }),

  /**
   * Danh sách projects — KHÔNG cache (có filter/pagination/search).
   */
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

      interface ProjectWhereInput {
        name?: { contains: string; mode: "insensitive" };
        userId?: string;
        createdAt?: { gte?: Date; lte?: Date };
      }

      const where: ProjectWhereInput = {};
      if (input.search) where.name = { contains: input.search, mode: "insensitive" };
      if (input.userId) where.userId = input.userId;
      if (input.dateFrom || input.dateTo) {
        where.createdAt = {};
        if (input.dateFrom) where.createdAt.gte = input.dateFrom;
        if (input.dateTo) where.createdAt.lte = input.dateTo;
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
            _count: { select: { messages: true } },
          },
        }),
        db.project.count({ where }),
      ]);

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
            return { ...project, user: null };
          }
        })
      );

      return { projects: projectsWithUser, totalCount };
    }),

  /**
   * Biểu đồ projects theo thời gian — cache 5 phút.
   * Cache key bao gồm số ngày: "admin:chart:{days}"
   */
  getProjectsChart: protectedProcedure
    .input(z.object({ days: z.number().min(7).max(90).default(30) }))
    .query(async ({ input }) => {
      await requireAdmin();

      return withCache(
        CACHE_KEYS.adminChart(input.days),
        async () => {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - input.days);

          const projects = await db.project.groupBy({
            by: ["createdAt"],
            _count: true,
            where: { createdAt: { gte: startDate } },
            orderBy: { createdAt: "asc" },
          });

          interface ChartDataItem { date: string; count: number }

          return projects.reduce((acc: ChartDataItem[], project) => {
            const date = project.createdAt.toISOString().split("T")[0];
            const existing = acc.find((item) => item.date === date);
            if (existing) {
              existing.count += project._count;
            } else {
              acc.push({ date, count: project._count });
            }
            return acc;
          }, []);
        },
        { ttl: TTL.LONG }
      );
    }),

  /**
   * Thống kê messages theo type — cache 5 phút.
   */
  getMessagesStats: protectedProcedure.query(async () => {
    await requireAdmin();

    return withCache(
      CACHE_KEYS.adminMessagesStats(),
      async () => {
        const messagesByType = await db.message.groupBy({
          by: ["type", "role"],
          _count: true,
        });

        return messagesByType.map((item) => ({
          type: item.type,
          role: item.role,
          count: item._count,
        }));
      },
      { ttl: TTL.LONG }
    );
  }),

  /**
   * Danh sách users — KHÔNG cache (có filter/pagination/search).
   */
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

      interface ClerkQueryParams { limit: number; offset: number; query?: string }
      const queryParams: ClerkQueryParams = { limit: 500, offset: 0 };
      if (input.search) queryParams.query = input.search;

      const response = await client.users.getUserList(queryParams);

      let usersWithStats = await Promise.all(
        response.data.map(async (user) => {
          const projectCount = await db.project.count({ where: { userId: user.id } });
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

      if (input.role && input.role !== "all") {
        usersWithStats = usersWithStats.filter((u) => u.role === input.role);
      }
      if (input.dateFrom) {
        usersWithStats = usersWithStats.filter(
          (u) => new Date(u.createdAt) >= input.dateFrom!
        );
      }
      if (input.dateTo) {
        usersWithStats = usersWithStats.filter(
          (u) => new Date(u.createdAt) <= input.dateTo!
        );
      }

      usersWithStats.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const totalCount = usersWithStats.length;
      const paginatedUsers = usersWithStats.slice(input.offset, input.offset + input.limit);

      return { users: paginatedUsers, totalCount };
    }),

  /**
   * Update user role — invalidate admin cache sau khi thay đổi.
   */
  updateUserRole: protectedProcedure
    .input(z.object({ userId: z.string(), role: z.enum(["admin", "user"]) }))
    .mutation(async ({ input }) => {
      await requireAdmin();

      const client = await clerkClient();
      await client.users.updateUserMetadata(input.userId, {
        publicMetadata: { role: input.role },
      });

      // Invalidate tất cả admin cache vì stats có thể thay đổi
      await invalidateCacheByPattern("admin:*");

      return { success: true };
    }),

  /**
   * Delete user — invalidate admin cache sau khi xóa.
   */
  deleteUser: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      await requireAdmin();

      await db.project.deleteMany({ where: { userId: input.userId } });

      const client = await clerkClient();
      await client.users.deleteUser(input.userId);

      // Invalidate tất cả admin cache
      await invalidateCacheByPattern("admin:*");

      return { success: true };
    }),

  /**
   * User activity chart — cache 5 phút.
   * Gọi Clerk API lấy toàn bộ users → rất chậm nếu không cache.
   */
  getUserActivity: protectedProcedure
    .input(z.object({ days: z.number().min(7).max(90).default(30) }))
    .query(async ({ input }) => {
      await requireAdmin();

      return withCache(
        CACHE_KEYS.adminUserActivity(input.days),
        async () => {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - input.days);

          const client = await clerkClient();
          const allUsers = await client.users.getUserList({ limit: 500 });

          interface UserActivityItem { date: string; newUsers: number }

          const usersByDate = allUsers.data.reduce(
            (acc: UserActivityItem[], user) => {
              const date = new Date(user.createdAt).toISOString().split("T")[0];
              const existing = acc.find((item) => item.date === date);
              if (existing) {
                existing.newUsers += 1;
              } else {
                acc.push({ date, newUsers: 1 });
              }
              return acc;
            },
            []
          );

          return usersByDate
            .filter((item) => new Date(item.date) >= startDate)
            .sort((a, b) => a.date.localeCompare(b.date));
        },
        { ttl: TTL.LONG }
      );
    }),
});
