export type McpToolDescriptor = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  requiredCapabilities: string[];
};

export const projectFlareMcpTools: McpToolDescriptor[] = [
  {
    name: "projectflare.projects.list",
    description: "List projects visible in a workspace.",
    requiredCapabilities: ["projects:read"],
    inputSchema: {
      type: "object",
      properties: {
        workspaceId: { type: "string" },
      },
      required: ["workspaceId"],
    },
  },
  {
    name: "projectflare.tasks.list",
    description: "List tasks for a project, including hierarchy and taxonomy metadata.",
    requiredCapabilities: ["tasks:read"],
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "projectflare.tasks.create",
    description: "Create a task in a project.",
    requiredCapabilities: ["tasks:write"],
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        title: { type: "string" },
        parentTaskId: { type: "string" },
        priority: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["projectId", "title"],
    },
  },
  {
    name: "projectflare.notifications.send",
    description: "Send a project notification through configured notification channels.",
    requiredCapabilities: ["notifications:write"],
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        title: { type: "string" },
        body: { type: "string" },
        source: { type: "string" },
      },
      required: ["projectId", "title", "body"],
    },
  },
];
