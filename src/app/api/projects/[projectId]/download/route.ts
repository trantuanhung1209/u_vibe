import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { createProjectZip } from "@/lib/download-utils";
import { auth } from "@clerk/nextjs/server";
import fs from "fs/promises";
import path from "path";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await context.params;

    // Get the project and verify ownership
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        userId,
      },
      include: {
        messages: {
          where: {
            type: "RESULT",
            fragment: {
              isNot: null,
            },
          },
          include: {
            fragment: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get the latest fragment
    const latestFragment = project.messages[0]?.fragment;
    if (!latestFragment || !latestFragment.files) {
      return NextResponse.json(
        { error: "No code available to download" },
        { status: 404 }
      );
    }

    // Create ZIP file
    const files = latestFragment.files as { [path: string]: string };
    
    // Read all UI components from the project
    const uiComponentsPath = path.join(process.cwd(), "src", "components", "ui");
    const uiComponents: { [path: string]: string } = {};
    
    try {
      const componentFiles = await fs.readdir(uiComponentsPath);
      for (const file of componentFiles) {
        if (file.endsWith(".tsx") || file.endsWith(".ts") || file.endsWith(".css")) {
          const filePath = path.join(uiComponentsPath, file);
          const content = await fs.readFile(filePath, "utf-8");
          uiComponents[file] = content;
        }
      }
    } catch (error) {
      console.error("Error reading UI components:", error);
    }
    
    const zipBlob = await createProjectZip(files, uiComponents);

    // Convert Blob to Buffer for NextResponse
    const buffer = Buffer.from(await zipBlob.arrayBuffer());

    // Return ZIP file
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${project.name || "project"}.zip"`,
      },
    });
  } catch (error) {
    console.error("Error generating project ZIP:", error);
    return NextResponse.json(
      { error: "Failed to generate project ZIP" },
      { status: 500 }
    );
  }
}
