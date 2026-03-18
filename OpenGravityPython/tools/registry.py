"""
Registro de herramientas — Equivalente a src/tools/registry.ts

Este módulo centraliza todas las herramientas (tools) disponibles para el agente.
Cada herramienta tiene:
- Una definición JSON-schema que se envía al LLM
- Una función handler que se ejecuta cuando el LLM la invoca
"""

from tools.time_tool import (
    TOOL_DEFINITION as TIME_DEF,
    handler as time_handler,
)
from tools.technician_tool import (
    CHECK_TECHNICIAN_DEF,
    check_technician_handler,
    CHECK_CONSTRUCTION_DEF,
    check_construction_handler,
)
from tools.report_tool import (
    TOOL_DEFINITION as REPORT_DEF,
    handler as report_handler,
)

# Mapa de nombre de herramienta → función que la ejecuta
_HANDLERS: dict = {
    "get_current_time": time_handler,
    "check_technician": check_technician_handler,
    "check_construction_status": check_construction_handler,
    "create_tech_report": report_handler,
}

# Lista de todas las definiciones JSON-schema de herramientas (se envían al LLM)
TOOL_DEFINITIONS: list[dict] = [
    TIME_DEF,
    CHECK_TECHNICIAN_DEF,
    CHECK_CONSTRUCTION_DEF,
    REPORT_DEF,
]


def execute_tool(name: str, args: dict) -> dict:
    """Ejecuta una herramienta registrada por nombre. Lanza error si no existe."""
    handler = _HANDLERS.get(name)
    if handler is None:
        raise ValueError(f"Tool not found: {name}")
    return handler(args)


# Imprimir las herramientas registradas al momento de importar el módulo
for td in TOOL_DEFINITIONS:
    print(f"[Tools] Registered tool: {td['name']}")
