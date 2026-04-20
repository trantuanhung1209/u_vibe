import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { consumeCredits } from "@/lib/usage";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import z from "zod";

export const messagesRouter = createTRPCRouter({
  getMany: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1, { message: "Project ID is required" }),
      })
    )

    .query(async ({ input, ctx }) => {
      const messages = await prisma.message.findMany({
        where: {
          projectId: input.projectId,
          project: {
            userId: ctx.auth.userId,
          },
        },
        include: {
          fragment: true,
        },
        orderBy: { createdAt: "asc" },
      });
      return messages;
    }),
  create: protectedProcedure
    .input(
      z.object({
        value: z
          .string()
          .min(1, { message: "Message is required" })
          .max(5000, { message: "Message is too long" }),
        projectId: z.string(),
        imageUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existingProject = await prisma.project.findUnique({
        where: { id: input.projectId, userId: ctx.auth.userId },
      });

      if (!existingProject) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      try{
        await consumeCredits();
      } catch (error) {
        if (error instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Something went wrong. Please try again later." + error.message,
          });
        } else {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Usage limit exceeded. Please upgrade your plan.",
          });
        }
      }

      const createdMessage = await prisma.message.create({
        data: {
          content: input.value,
          role: "USER",
          type: "RESULT",
          projectId: existingProject.id,
          imageUrl: input.imageUrl,
          hasImage: !!input.imageUrl,
        },
      });

      // Don't send imageUrl directly to avoid Inngest 256KB limit
      // Inngest will fetch the image from database using messageId
      await inngest.send({
        name: "code-agent/run",
        data: {
          value: input.value,
          projectId: input.projectId,
          messageId: createdMessage.id,
          hasImage: !!input.imageUrl,
        },
      });

      return createdMessage;
    }),
});
