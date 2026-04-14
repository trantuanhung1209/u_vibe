
import { projectsRouter } from "@/modules/projects/server/procedures";
import { createTRPCRouter } from "../init";
import { messagesRouter } from "@/modules/messages/server/procedures";
import { usageRouter } from "@/modules/usage/server/procedures";
import { figmaRouter } from "./figma";
import { adminRouter } from "./admin";

export const appRouter = createTRPCRouter({
  messages: messagesRouter,
  projects: projectsRouter,
  usage: usageRouter,
  figma: figmaRouter,
  admin: adminRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
