import { chatCompletion, ChatMessage } from '../llm/client.js';
import { executeTool, getToolDefinitions } from '../tools/registry.js';
import { getHistory, saveMessage } from '../db/schema.js';

const MAX_ITERATIONS = 5;

function buildSystemPrompt(telegramId: number): string {
    return `Eres OpenGravity, un agente de IA personal altamente capaz que se comunica vía Telegram. Eres seguro, conciso y útil.

**CONTEXTO DEL USUARIO ACTUAL:**
- telegram_id: ${telegramId}
- Este es el identificador único del técnico que está hablando contigo AHORA MISMO.

**INSTRUCCIONES CRÍTICAS:**
- Cuando necesites registrar un reporte, usar la herramienta \`create_tech_report\` con \`telegram_id: ${telegramId}\`. NUNCA se lo pidas al usuario, ya lo tienes.
- Cuando necesites verificar si el usuario es técnico, usa \`check_technician\` con \`telegram_id: ${telegramId}\`. NUNCA pidas el ID al usuario.
- Si el técnico menciona una obra y trabajo realizado, extrae las actividades y pendientes del texto y regístralos directamente.
- Habla siempre en español, de forma concisa y natural.`;
}

export async function runAgentLoop(userId: number, userInput: string): Promise<string> {
    // 1. Save user message to history
    await saveMessage(userId, 'user', userInput);
    
    // 2. Retrieve history (last 10 interactions)
    const history = await getHistory(userId, 10);
    
    // 3. Construct messages array with dynamic system prompt
    const messages: ChatMessage[] = [
        { role: 'system', content: buildSystemPrompt(userId) },
        ...history
    ];
    
    const availableTools = getToolDefinitions();
    
    let currentIteration = 0;
    
    while (currentIteration < MAX_ITERATIONS) {
        currentIteration++;
        
        // Call the LLM
        const responseMessage = await chatCompletion(messages, availableTools);
        messages.push(responseMessage);
        
        // Check if LLM wanted to call any tools
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            // Save the assistant's tool call intent to DB
            await saveMessage(userId, 'assistant', responseMessage.content, JSON.stringify(responseMessage.tool_calls));
            
            for (const toolCall of responseMessage.tool_calls) {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
                
                try {
                    console.log(`[Agent] Executing tool ${functionName} with args:`, functionArgs);
                    const result = await executeTool(functionName, functionArgs);
                    
                    const toolMessage: ChatMessage = {
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        name: functionName,
                        content: JSON.stringify(result)
                    };
                    
                    messages.push(toolMessage);
                    // Save tool result to DB
                    await saveMessage(userId, 'tool', JSON.stringify(result), null, toolCall.id);
                    
                } catch (error: any) {
                    console.error(`[Agent] Tool ${functionName} failed:`, error);
                    const errorMessage: ChatMessage = {
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        name: functionName,
                        content: JSON.stringify({ error: error.message || 'Unknown error occurred while executing tool.' })
                    };
                    messages.push(errorMessage);
                    await saveMessage(userId, 'tool', errorMessage.content, null, toolCall.id);
                }
            }
            // Continue the loop so LLM can process tool results
            continue;
        }
        
        // If no tool calls, it's a final response
        await saveMessage(userId, 'assistant', responseMessage.content);
        return responseMessage.content || '';
    }
    
    return "Error: Agent reached maximum iterations without returning a final answer.";
}
