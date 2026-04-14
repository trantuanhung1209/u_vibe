import {
  openai,
  createAgent,
  createTool,
  createNetwork,
  Tool,
  Message,
  createState,
} from "@inngest/agent-kit";

import { inngest } from "./client";
import { Sandbox } from "@e2b/code-interpreter";
import { getSandbox, lastAssistantTextMessageContent, parseAgentOutput } from "./untils";
import z from "zod";
import { PROMPT, RESPONSE_PROMPT, FRAGMENT_TITLE_PROMPT, DESIGN_TO_CODE_PROMPT, IMAGE_TO_CODE_PROMPT} from "@/promt";
import prisma from "@/lib/db";
import { SANDBOX_TIMEOUT } from "./types";

interface AgentState{
    summary: string;
    files : {[path: string]: string};
}

export const codeAgentFunction = inngest.createFunction(
    { id: "code-agent"},
    {event : "code-agent/run"},
    async({event , step}) => {
        console.log("===== INNGEST RECEIVED =====");
        console.log('Project ID:', event.data.projectId);
        console.log('Message ID:', event.data.messageId);
        console.log('Is Figma Import:', event.data.isFigmaImport);
        console.log('Has Image:', event.data.hasImage);
        console.log('Prompt value:');
        console.log(event.data.value);
        console.log('===== END INNGEST DATA =====');

        const sandboxId = await step.run("get-sandbox-id", async () =>{
            const sandbox = await Sandbox.create("uside-vibe-test-2");
            await sandbox.setTimeout(SANDBOX_TIMEOUT);
            return sandbox.sandboxId;
        })

        const previousMessages = await step.run(
            "get-previous-messages",
            async () => {
                const formattedMessages: Message[] = [];

                const messages = await prisma.message.findMany({
                where: {
                    projectId: event.data.projectId,
                },
                orderBy: {
                    createdAt: "desc",
                },
                take: 5,
                });

                for (const msg of messages) {
                // Handle messages with images for vision API
                if (msg.hasImage && msg.imageUrl) {
                    formattedMessages.push({
                    type: "text",
                    role: msg.role === "USER" ? "user" : "assistant",
                    content: [
                        {
                        type: "text",
                        text: msg.content || "Generate code from this design",
                        },
                        {
                        type: "image_url",
                        image_url: {
                            url: msg.imageUrl,
                        },
                        },
                    ],
                    } as Message);
                } else {
                    formattedMessages.push({
                    type: "text",
                    role: msg.role === "USER" ? "user" : "assistant",
                    content: msg.content,
                    });
                }
                }

                return formattedMessages.reverse();
            }
        );
        const state = createState<AgentState>(
            {
                summary : "",
                files: {},
            },
            {
                messages : previousMessages,
            }
        );

        // Check if any message has an image (already fetched from DB in previousMessages)
        const hasImage = event.data.hasImage;
        
        // Choose prompt based on input type
        let systemPrompt = PROMPT;
        if (event.data.isFigmaImport) {
            systemPrompt = DESIGN_TO_CODE_PROMPT;
        } else if (hasImage) {
            systemPrompt = IMAGE_TO_CODE_PROMPT;
        }

        const codeAgent = createAgent<AgentState>({
            name: "code-agent",
            description:
                "An expert coding agent that can modify code in a sandboxed Next.js environment.",
            system: systemPrompt,
            model: openai({
                model: hasImage ? "gpt-4o" : "gpt-4.1", // Use gpt-4o for vision capabilities
                defaultParameters: { temperature: 0.1 },
            }),
            tools: [
                createTool({
                name: "terminal",
                description: "Use the terminal to run commands in the sandbox.",
                parameters: z.object({
                    command: z.string(),
                }),
                handler: async ({ command }, { step }) => {
                    return await step?.run("terminal", async () => {
                    const buffers = { stdout: "", stderr: "" };
                    try {
                        const sandbox = await getSandbox(sandboxId);
                        const result = await sandbox.commands.run(command, {
                        onStdout(data: string) {
                            buffers.stdout += data;
                        },
                        onStderr(data: string) {
                            buffers.stderr += data;
                        },
                        });
                        return result.stdout;
                    } catch (error) {
                        console.error(`Error running command "${command}":`);
                        return `Error: ${
                        error instanceof Error ? error.message : "Unknown error"
                        }`;
                    }
                    });
                },
                }),

                createTool({
                name: "createOrUpdateFile",
                description:
                    "Create or update a file in the sandbox with the given content.",
                parameters: z.object({
                    files: z.array(
                    z.object({
                        path: z.string(),
                        content: z.string(),
                    })
                    ),
                }),
                handler: async (
                    { files },
                    { step, network }: Tool.Options<AgentState>
                ) => {
                    const newFiles = await step?.run("createOrUpdateFile", async () => {
                    try {
                        const updatedFiles = network.state.data.files || {};
                        const sandbox = await getSandbox(sandboxId);
                        for (const file of files) {
                        await sandbox.files.write(file.path, file.content);
                        updatedFiles[file.path] = file.content;
                        }

                        return updatedFiles;
                    } catch (e) {
                        return "Error" + e;
                    }
                    });

                    if (typeof newFiles === "object") {
                    network.state.data.files = newFiles;
                    }
                },
                }),

                createTool({
                name: "readFiles",
                description: "Read a file from the sandbox.",
                parameters: z.object({
                    files: z.array(z.string()),
                }),
                handler: async ({ files }, { step }) => {
                    return await step?.run("readFiles", async () => {
                    try {
                        const sandbox = await getSandbox(sandboxId);
                        const contents: Array<{ path: string; content: string }> = [];
                        for (const file of files) {
                        const content = await sandbox.files.read(file);
                        contents.push({ path: file, content });
                        }
                        return contents;
                    } catch (e) {
                        return "Error" + e;
                    }
                    });
                },
                }),
            ],
            lifecycle: {
                onResponse: async ({ result, network }) => {
                const lastAssistantMessageText =
                    lastAssistantTextMessageContent(result);

                if (lastAssistantMessageText && network) {
                    if (lastAssistantMessageText.includes("<task_summary>")) {
                    network.state.data.summary = lastAssistantMessageText;
                    }
                }

                return result;
                },
            },
        });

        const network = createNetwork<AgentState>({
            name: "coding-agent-network",
            agents: [codeAgent],
            maxIter: 15,
            defaultState: state,
            router: async ({ network }) => {
                const summary = network.state.data.summary;

                if (summary) {
                return;
                }
                return codeAgent;
            },
        });

        // Get imageUrl from the most recent message if hasImage is true
        let imageUrlFromDb: string | null = null;
            if (hasImage) {
            const latestMessage = await step.run("get-latest-image", async () => {
                const msg = await prisma.message.findFirst({
                where: {
                    projectId: event.data.projectId,
                    hasImage: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
                });
                return msg?.imageUrl || null;
            });
            imageUrlFromDb = latestMessage;
        }

        const result = await network.run(
            hasImage && imageUrlFromDb
                ? [
                    {
                    type: "text",
                    text: event.data.value || "Generate code from this design",
                    },
                    {
                    type: "image_url",
                    image_url: {
                        url: imageUrlFromDb,
                    },
                    },
                ]
                : event.data.value,
            { state }
        );

        const fragmentTitleGenerator = createAgent({
            name: "fragment-title-generator",
            description:
                "Generates a short, descriptive title for a code fragment based on its summary.",
            system: FRAGMENT_TITLE_PROMPT,
            model: openai({
                model: "gpt-4o",
                defaultParameters: { temperature: 0.1 },
            }),
        });

        const responseGenerator = createAgent({
            name: "response-generator",
            description:
                "Generates a short, user-friendly message explaining what was just built, based on the task summary.",
            system: RESPONSE_PROMPT,
            model: openai({
                model: "gpt-4o",
                defaultParameters: { temperature: 0.1 },
            }),
        });

        const {output: fragmentTitleOutput} = await fragmentTitleGenerator.run(
            result.state.data.summary
        );

        const {output: responseOutput} = await responseGenerator.run(
            result.state.data.summary
        );

        const isError =
        !result.state.data.summary ||
        Object.keys(result.state.data.files || {}).length === 0;

        const sandboxUrl = await step.run("get-sandbox-url", async () => {
        const sandbox = await getSandbox(sandboxId);
        const host = sandbox.getHost(3000);
            return `https://${host}`;
        });

        await step.run("save-results", async () => {
            if (isError) {
                return await prisma.message.create({
                data: {
                    content: "Some thing went wrong. Please try again.",
                    role: "ASSISTANT",
                    type: "ERROR",
                    projectId: event.data.projectId,
                },
                });
            }

            return prisma.message.create({
                data: {
                content: parseAgentOutput(responseOutput),
                role: "ASSISTANT",
                type: "RESULT",
                fragment: {
                    create: {
                    sandboxUrl: sandboxUrl,
                    title: parseAgentOutput(fragmentTitleOutput),
                    files: result.state.data.files,
                    },
                },
                projectId: event.data.projectId,
                },
            });
        });

        return {
        url: sandboxUrl,
        title: parseAgentOutput(fragmentTitleOutput),
        files: result.state.data.files,
        summary: result.state.data.summary,
        };
    }
)