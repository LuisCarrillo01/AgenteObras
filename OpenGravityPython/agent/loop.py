"""
Bucle principal del agente — Equivalente a src/agent/loop.ts

Este módulo implementa el ciclo iterativo de llamada a herramientas (tool-calling).
El agente recibe un mensaje del usuario, consulta al LLM, ejecuta herramientas
si es necesario, y repite hasta obtener una respuesta final (máximo 5 iteraciones).
"""

import json
from db.schema import save_message, get_history
from llm.client import chat_completion
from tools.registry import TOOL_DEFINITIONS, execute_tool
from agent.prompts import build_system_prompt

# Número máximo de iteraciones del bucle agente→herramienta→agente
MAX_ITERATIONS = 5


async def run_agent_loop(user_id: int, user_input: str) -> str:
    """
    Bucle principal del agente. Replica exactamente la versión de TypeScript:
    1. Guardar el mensaje del usuario en Firestore
    2. Obtener el historial reciente (últimos 10 mensajes)
    3. Construir el arreglo de mensajes con el prompt del sistema
    4. Iterar: llamada al LLM → ejecución de herramientas → repetir (máx 5)
    5. Retornar la respuesta final en texto
    """

    # 1. Guardar el mensaje del usuario en el historial de Firestore
    await save_message(user_id, "user", user_input)

    # 2. Obtener las últimas 10 interacciones del historial
    history = await get_history(user_id, 10)

    # 3. Construir el arreglo de mensajes incluyendo el prompt del sistema
    messages: list[dict] = [
        {"role": "system", "content": build_system_prompt(user_id)},
        *history,
    ]

    current_iteration = 0

    while current_iteration < MAX_ITERATIONS:
        current_iteration += 1

        # Llamar al LLM con los mensajes y las definiciones de herramientas
        response_message = chat_completion(messages, TOOL_DEFINITIONS)
        messages.append(response_message)

        # Verificar si el LLM quiere ejecutar alguna herramienta
        tool_calls = response_message.get("tool_calls")

        if tool_calls and len(tool_calls) > 0:
            # Guardar la intención de llamada a herramientas del asistente en Firestore
            await save_message(
                user_id,
                "assistant",
                response_message.get("content"),
                json.dumps(tool_calls),
            )

            for tool_call in tool_calls:
                function_name = tool_call["function"]["name"]
                function_args = json.loads(tool_call["function"].get("arguments", "{}"))

                try:
                    print(f"[Agent] Executing tool {function_name} with args: {function_args}")
                    result = execute_tool(function_name, function_args)

                    # Crear el mensaje de resultado de la herramienta
                    tool_message = {
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "name": function_name,
                        "content": json.dumps(result, default=str),
                    }

                    messages.append(tool_message)

                    # Guardar el resultado de la herramienta en Firestore
                    await save_message(
                        user_id,
                        "tool",
                        json.dumps(result, default=str),
                        None,
                        tool_call["id"],
                    )

                except Exception as e:
                    print(f"[Agent] Tool {function_name} failed: {e}")
                    error_content = json.dumps({"error": str(e)})

                    # Crear mensaje de error para que el LLM sepa que la herramienta falló
                    error_message = {
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "name": function_name,
                        "content": error_content,
                    }
                    messages.append(error_message)

                    await save_message(
                        user_id,
                        "tool",
                        error_content,
                        None,
                        tool_call["id"],
                    )

            # Continuar el bucle para que el LLM procese los resultados
            continue

        # Si no hay llamadas a herramientas, es la respuesta final del agente
        await save_message(user_id, "assistant", response_message.get("content"))
        return response_message.get("content") or ""

    return "Error: Agent reached maximum iterations without returning a final answer."
