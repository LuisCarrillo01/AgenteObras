import { Tool, registerTool } from './registry.js';

export const getCurrentTimeTool: Tool = {
    definition: {
        name: "get_current_time",
        description: "Returns the current local date and time. Use this when the user asks for the time or date.",
        parameters: {
            type: "object",
            properties: {},
            required: []
        }
    },
    handler: async () => {
        const now = new Date();
        return {
            time: now.toLocaleTimeString(),
            date: now.toLocaleDateString(),
            timezoneOffset: now.getTimezoneOffset(),
            iso: now.toISOString()
        };
    }
};

// Auto-register when imported
registerTool(getCurrentTimeTool);
