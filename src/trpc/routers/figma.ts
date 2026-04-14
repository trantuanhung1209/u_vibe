import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, createTRPCRouter } from '../init';
import { getFigmaDesignFromUrl } from '@/lib/figma-client';
import { normalizeDesignToSchema, generateDesignDescription } from '@/lib/design-normalizer';
import { uiSchemaToPrompt, createLightMetadata } from '@/lib/schema-to-prompt';
import prisma from '@/lib/db';
import { inngest } from '@/inngest/client';

/**
 * Figma integration router
 * Handles Figma URL → Design Schema → Code generation flow
 */
export const figmaRouter = createTRPCRouter({
  /**
   * Generate code from Figma design URL
   */
  generateFromFigma: protectedProcedure
    .input(
      z.object({
        figmaUrl: z.string().url('Invalid Figma URL'),
        projectId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { figmaUrl, projectId } = input;
      const userId = ctx.auth.userId;

      try {
        // Step 1: Verify project ownership
        const project = await prisma.project.findUnique({
          where: { id: projectId, userId },
        });

        if (!project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found or access denied',
          });
        }

        // Step 2: Fetch design from Figma
        console.log(`[Figma] Fetching design from URL: ${figmaUrl}`);
        const figmaNode = await getFigmaDesignFromUrl(figmaUrl);

        // Step 3: Normalize to UI Schema
        console.log(`[Figma] Normalizing design to UI Schema`);
        const uiSchema = normalizeDesignToSchema(figmaNode);

        console.log(`[Figma] Design normalized:`, {
          name: uiSchema.name,
          dimensions: uiSchema.metadata.dimensions,
          childrenCount: uiSchema.children?.length || 0,
        });
        
        console.log('===== UI SCHEMA =====');
        console.log(JSON.stringify(uiSchema, null, 2));
        console.log('===== END UI SCHEMA =====');

        // Step 4: Convert schema to optimized prompt
        const designPrompt = uiSchemaToPrompt(uiSchema);
        
        console.log('===== DESIGN PROMPT =====');
        console.log(designPrompt);
        console.log('===== END DESIGN PROMPT =====');
        
        // Step 5: Create a user message with lightweight metadata
        const userMessage = await prisma.message.create({
          data: {
            content: `Import from Figma: ${uiSchema.name}\n\nURL: ${figmaUrl}`,
            role: 'USER',
            type: 'RESULT',
            projectId,
            metadata: createLightMetadata(uiSchema, figmaUrl),
          },
        });

        // Step 6: Trigger Inngest workflow to generate code
        console.log(`[Figma] Triggering code generation for message ${userMessage.id}`);
        
        // Send detailed prompt with design information
        const fullPrompt = `${designPrompt}

---

Generate a complete, production-ready Next.js component based on the design above.
Follow the layout, styling, and component structure exactly as specified.`;
        
        console.log('===== FULL PROMPT SENT TO AI =====');
        console.log(fullPrompt);
        console.log('===== END FULL PROMPT =====');
        
        await inngest.send({
          name: 'code-agent/run',
          data: {
            value: fullPrompt,
            projectId,
            messageId: userMessage.id,
            isFigmaImport: true,
          },
        });

        return {
          success: true,
          messageId: userMessage.id,
          message: 'Figma design is being processed. Code generation started.',
          preview: {
            name: uiSchema.name,
            dimensions: uiSchema.metadata.dimensions,
            componentsCount: uiSchema.children?.length || 0,
          },
        };
      } catch (error) {
        console.error('[Figma] Error:', error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to process Figma design',
        });
      }
    }),

  /**
   * Parse Figma URL to extract file key and node ID
   */
  parseFigmaUrl: protectedProcedure
    .input(
      z.object({
        figmaUrl: z.string().url('Invalid URL'),
      })
    )
    .query(async ({ input }) => {
      try {
        const { parseFigmaUrl } = await import('@/lib/figma-client');
        const result = parseFigmaUrl(input.figmaUrl);
        
        return {
          success: true,
          fileKey: result.fileKey,
          nodeId: result.nodeId,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error instanceof Error ? error.message : 'Invalid Figma URL format',
        });
      }
    }),

  /**
   * Preview Figma design without generating code
   * Useful for validation before triggering generation
   */
  previewDesign: protectedProcedure
    .input(
      z.object({
        figmaUrl: z.string().url('Invalid Figma URL'),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Fetch and normalize design
        const figmaNode = await getFigmaDesignFromUrl(input.figmaUrl);
        const uiSchema = normalizeDesignToSchema(figmaNode);
        const description = generateDesignDescription(uiSchema);

        return {
          success: true,
          design: {
            name: uiSchema.name,
            dimensions: uiSchema.metadata.dimensions,
            layout: uiSchema.layout.direction,
            componentsCount: uiSchema.children?.length || 0,
            description,
            suggestedComponents: uiSchema.children
              ?.filter((child) => child.suggestedComponent !== undefined)
              .map((child) => ({
                name: child.name,
                type: child.suggestedComponent!,
              })) || [],
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to preview Figma design',
        });
      }
    }),
});
