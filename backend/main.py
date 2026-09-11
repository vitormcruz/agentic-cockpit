from __future__ import annotations

import asyncio
import json
import os
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import PlainTextResponse, StreamingResponse

CONFIG_REPO_ENV = "OPENCODE_CONFIG_REPO"
DEFAULT_CONFIG_REPO = Path(__file__).resolve().parents[2] / "opencode-global-config"

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


def create_stream_payload() -> dict[str, object]:
    state = read_state()
    return {
        "timestamp": current_timestamp(),
        "resumo": state_summary(state),
        "estado": state,
    }


async def event_stream() -> AsyncIterator[str]:
    while True:
        payload = json.dumps(create_stream_payload(), ensure_ascii=False)
        yield f"data: {payload}\n\n"
        await asyncio.sleep(2)


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
