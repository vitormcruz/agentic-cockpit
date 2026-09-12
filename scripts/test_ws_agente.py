#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import json
import os
from typing import Any

import websockets

WS_URL = os.environ.get("AGENTE_WS_URL", "ws://127.0.0.1:8000/ws/agente")
ROUND_TRIP_TIMEOUT_SECONDS = 130


async def receive_response(websocket: Any, text: str) -> list[dict[str, Any]]:
    await websocket.send(json.dumps({"texto": text}, ensure_ascii=False))
    events: list[dict[str, Any]] = []

    async with asyncio.timeout(ROUND_TRIP_TIMEOUT_SECONDS):
        while True:
            event = json.loads(await websocket.recv())
            events.append(event)
            if event.get("type") == "message":
                return events


async def main() -> None:
    async with websockets.connect(WS_URL) as websocket:
        greeting_events = await receive_response(websocket, "Diga apenas olá e não execute comandos.")
        assert greeting_events[0].get("type") == "thinking", greeting_events
        assert greeting_events[-1].get("type") == "message", greeting_events

        service_events = await receive_response(websocket, "Mostre os servidores ativos.")
        assert service_events[0].get("type") == "thinking", service_events
        assert service_events[-1].get("type") == "message", service_events
        assert any(
            event.get("type") == "command"
            and event.get("command", {}).get("name") == "open_panel"
            and event.get("command", {}).get("panel_type") == "servicos"
            for event in service_events
        ), service_events

        print("WS OK: thinking/message e open_panel(servicos) confirmados")


if __name__ == "__main__":
    asyncio.run(main())
