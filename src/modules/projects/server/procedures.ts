import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import z from "zod";
import { generateSlug } from "random-word-slugs";
import { TRPCError } from "@trpc/server";
import { consumeCredits } from "@/lib/usage";

export const projectsRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, { message: "Project ID is required" }),
      })
    )
    .query(async ({ input, ctx }) => {
      const project = await prisma.project.findUnique({
        where: { id: input.id, userId: ctx.auth.userId },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      return project;
    }),

  getMany: protectedProcedure.query(async ({ ctx }) => {
    const projects = await prisma.project.findMany({
      where: { userId: ctx.auth.userId },
      orderBy: { updatedAt: "desc" },
    });
    return projects;
  }),
  create: protectedProcedure
    .input(
      z.object({
        value: z
          .string()
          .min(1, { message: "Message is required" })
          .max(5000, { message: "Message is too long" }),
        imageUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await consumeCredits();
      } catch (error) {
        if (error instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Something went wrong. Please try again later." + error.message,
          });
        } else {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Usage limit exceeded. Please upgrade your plan.",
          });
        }
      }

      const createdProject = await prisma.project.create({
        data: {
          userId: ctx.auth.userId,
          name: generateSlug(2, {
            format: "kebab",
          }),
          messages: {
            create: {
              content: input.value,
              role: "USER",
              type: "RESULT",
              imageUrl: input.imageUrl,
              hasImage: !!input.imageUrl,
            },
          },
        },
      });

      // Don't send imageUrl directly to avoid Inngest 256KB limit
      // Inngest will fetch the image from database using the message
      await inngest.send({
        name: "code-agent/run",
        data: {
          value: input?.value,
          projectId: createdProject.id,
          hasImage: !!input.imageUrl,
        },
      });

      return createdProject;
    }),
});
