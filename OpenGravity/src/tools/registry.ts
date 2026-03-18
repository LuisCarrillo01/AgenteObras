export interface ToolDefinition {
    name: string;
    description: string;
    parameters: any; // JSON schema for parameters
}

export interface Tool {
    definition: ToolDefinition;
    handler: (args: any) => Promise<any> | any;
}

const tools = new Map<string, Tool>();

export function registerTool(tool: Tool) {
    tools.set(tool.definition.name, tool);
    console.log(`[Tools] Registered tool: ${tool.definition.name}`);
}

export function getToolDefinitions() {
    return Array.from(tools.values()).map(t => t.definition);
}

export async function executeTool(name: string, args: any) {
    const tool = tools.get(name);
    if (!tool) {
        throw new Error(`Tool not found: ${name}`);
    }
    return await tool.handler(args);
}
