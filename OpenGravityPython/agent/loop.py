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


def _build_agent_result(reply: str = "", tool_results: list[dict] | None = None) -> dict:
    """Normaliza la salida del loop para que el bot pueda reaccionar a tools."""
    return {
        "reply": reply,
        "tool_results": tool_results or [],
    }


async def run_agent_loop(user_id: int, user_input: str) -> dict:
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
    tool_results: list[dict] = []

    while current_iteration < MAX_ITERATIONS:
        current_iteration += 1
        print(f"[Agent] === Iteration {current_iteration}/{MAX_ITERATIONS} ===")

        # Llamar al LLM con los mensajes y las definiciones de herramientas
        response_message = chat_completion(messages, TOOL_DEFINITIONS)
        messages.append(response_message)

        # Verificar si el LLM quiere ejecutar alguna herramienta
        tool_calls = response_message.get("tool_calls")

        print(f"[Agent] LLM response has tool_calls: {bool(tool_calls)}")
        if response_message.get("content"):
            print(f"[Agent] LLM content: {response_message['content'][:200]}")

        if tool_calls and len(tool_calls) > 0:
            print(f"[Agent] {len(tool_calls)} tool call(s) detected")

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
                    print(f"[Agent] Executing tool: {function_name}")
                    print(f"[Agent] Tool args: {json.dumps(function_args, ensure_ascii=False, default=str)}")
                    result = execute_tool(function_name, function_args)
                    print(f"[Agent] Tool result: {json.dumps(result, ensure_ascii=False, default=str)[:500]}")
                    tool_results.append({
                        "name": function_name,
                        "result": result,
                    })

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
                    print(f"[Agent] Tool {function_name} FAILED: {e}")
                    import traceback
                    traceback.print_exc()
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
        print(f"[Agent] Final response (no tool calls)")
        final_reply = response_message.get("content") or ""
        await save_message(user_id, "assistant", final_reply)
        return _build_agent_result(final_reply, tool_results)

    return _build_agent_result(
        "Error: Agent reached maximum iterations without returning a final answer.",
        tool_results,
    )
