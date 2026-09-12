from __future__ import annotations

import asyncio
import json
import os
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import PlainTextResponse, StreamingResponse
from starlette.websockets import WebSocketState

from .agente import AgenteError, process_agent_message, send_thinking_heartbeat
from .servicos import InventarioServicosError, detectar_servicos

CONFIG_REPO_ENV = "OPENCODE_CONFIG_REPO"
DEFAULT_CONFIG_REPO = Path(__file__).resolve().parents[2] / "opencode-global-config"
PIPELINE_STEP_COUNT = 4
STREAM_INTERVAL_SECONDS = 1

app = FastAPI(title="Painel Dinâmico Lab")


def config_repo_path() -> Path:
    configured_path = os.environ.get(CONFIG_REPO_ENV)
    if configured_path:
        return Path(configured_path).expanduser()
    return DEFAULT_CONFIG_REPO


def count_directories(directory: Path) -> int:
    if not directory.is_dir():
        raise FileNotFoundError(f"Diretório não encontrado: {directory}")
    return sum(1 for entry in directory.iterdir() if entry.is_dir())


def count_files(directory: Path, pattern: str, *, recursive: bool = False) -> int:
    if not directory.is_dir():
        raise FileNotFoundError(f"Diretório não encontrado: {directory}")

    entries = directory.rglob(pattern) if recursive else directory.glob(pattern)
    return sum(1 for entry in entries if entry.is_file())


def read_state() -> dict[str, int]:
    repo_path = config_repo_path()
    return {
        "skills": count_directories(repo_path / "harness-conf" / "skills"),
        "agents": count_files(repo_path / "harness-conf" / "agents", "*.md"),
        "commands": count_files(repo_path / "harness-conf" / "commands", "*.md"),
        "testes": count_files(repo_path / "tests", "test_*.py", recursive=True),
    }


def state_summary(state: dict[str, int]) -> str:
    return (
        f"{state['skills']} skills, {state['agents']} agents, "
        f"{state['commands']} comandos e {state['testes']} testes"
    )


def current_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def raise_backend_error(error: OSError) -> HTTPException:
    return HTTPException(status_code=500, detail=str(error))


@app.get("/api/estado")
def get_state() -> dict[str, int]:
    try:
        return read_state()
    except OSError as error:
        raise raise_backend_error(error) from error


@app.get("/api/markdown", response_class=PlainTextResponse)
def get_markdown() -> str:
    markdown_path = config_repo_path() / "README.md"

    try:
        return markdown_path.read_text(encoding="utf-8")
    except OSError as error:
        raise raise_backend_error(error) from error


@app.get("/api/servicos")
async def get_services() -> list[dict[str, int | str]]:
    try:
        return await asyncio.to_thread(detectar_servicos)
    except (InventarioServicosError, OSError) as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


def create_stream_payload(passo: int, state: dict[str, int]) -> dict[str, object]:
    return {
        "timestamp": current_timestamp(),
        "resumo": state_summary(state),
        "estado": state,
        "passo": passo,
    }


async def event_stream() -> AsyncIterator[str]:
    event_loop = asyncio.get_running_loop()
    passo = 1
    pending_state: asyncio.Task[dict[str, int]] | None = asyncio.create_task(
        asyncio.to_thread(read_state)
    )
    next_emit_at: float | None = None

    try:
        while True:
            state = await pending_state
            if next_emit_at is None:
                next_emit_at = event_loop.time()

            payload = json.dumps(create_stream_payload(passo, state), ensure_ascii=False)
            yield f"data: {payload}\n\n"
            passo = passo % PIPELINE_STEP_COUNT + 1
            next_emit_at += STREAM_INTERVAL_SECONDS
            pending_state = asyncio.create_task(asyncio.to_thread(read_state))
            delay = max(0, next_emit_at - event_loop.time())
            await asyncio.sleep(delay)
    finally:
        if pending_state is not None and not pending_state.done():
            pending_state.cancel()


@app.get("/api/stream")
async def stream_state() -> StreamingResponse:
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


async def _send_agent_event(websocket: WebSocket, event: dict[str, object]) -> bool:
    if (
        websocket.client_state != WebSocketState.CONNECTED
        or websocket.application_state != WebSocketState.CONNECTED
    ):
        return False

    try:
        await websocket.send_json(event)
    except (RuntimeError, WebSocketDisconnect):
        return False
    return True


async def _watch_agent_connection(
    websocket: WebSocket,
    pending_messages: asyncio.Queue[dict[str, object]],
    disconnected: asyncio.Event,
) -> None:
    try:
        while True:
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                return
            await pending_messages.put(message)
    except WebSocketDisconnect:
        return
    finally:
        disconnected.set()


async def _handle_agent_message(websocket: WebSocket, text: str) -> None:
    if not await _send_agent_event(websocket, {"type": "thinking"}):
        return

    heartbeat_task = asyncio.create_task(
        send_thinking_heartbeat(lambda event: _send_agent_event(websocket, event))
    )

    try:
        response = await process_agent_message(text)
        for command in response.commands:
            if not await _send_agent_event(websocket, {"type": "command", "command": command}):
                return
        await _send_agent_event(websocket, {"type": "message", "text": response.message})
    except AgenteError as error:
        await _send_agent_event(websocket, {"type": "message", "text": str(error)})
    except Exception:
        await _send_agent_event(
            websocket,
            {"type": "message", "text": "O agente encontrou um erro inesperado. Tente novamente."},
        )
    finally:
        heartbeat_task.cancel()
        await asyncio.gather(heartbeat_task, return_exceptions=True)


@app.websocket("/ws/agente")
async def agent_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    pending_messages: asyncio.Queue[dict[str, object]] = asyncio.Queue()
    disconnected = asyncio.Event()
    connection_task = asyncio.create_task(
        _watch_agent_connection(websocket, pending_messages, disconnected)
    )
    disconnect_task = asyncio.create_task(disconnected.wait())

    try:
        while True:
            receive_task = asyncio.create_task(pending_messages.get())
            done, _ = await asyncio.wait(
                {receive_task, disconnect_task},
                return_when=asyncio.FIRST_COMPLETED,
            )
            if disconnect_task in done:
                receive_task.cancel()
                await asyncio.gather(receive_task, return_exceptions=True)
                return

            message = receive_task.result()
            try:
                raw_payload = message.get("text")
                if not isinstance(raw_payload, str):
                    raise ValueError
                payload = json.loads(raw_payload)
            except (TypeError, ValueError):
                await _send_agent_event(
                    websocket,
                    {"type": "message", "text": "Envie um objeto JSON com o campo texto."},
                )
                continue

            if not isinstance(payload, dict) or not isinstance(payload.get("texto"), str):
                await _send_agent_event(
                    websocket,
                    {"type": "message", "text": "Envie um objeto JSON com o campo texto."},
                )
                continue

            processing_task = asyncio.create_task(_handle_agent_message(websocket, payload["texto"]))
            done, _ = await asyncio.wait(
                {processing_task, disconnect_task},
                return_when=asyncio.FIRST_COMPLETED,
            )
            if disconnect_task in done:
                processing_task.cancel()
                await asyncio.gather(processing_task, return_exceptions=True)
                return

            await processing_task
    finally:
        if not disconnect_task.done():
            disconnect_task.cancel()
        if not connection_task.done():
            connection_task.cancel()
        await asyncio.gather(disconnect_task, connection_task, return_exceptions=True)
