from __future__ import annotations

import asyncio
import json
import os
import shutil
import signal
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from json import JSONDecodeError, JSONDecoder
from typing import Any

from .servicos import InventarioServicosError, detectar_servicos

OPENCODE_MODEL = "opencode-go/deepseek-v4-flash"
LLM_TOTAL_TIMEOUT_SECONDS = 110
LLM_IDLE_TIMEOUT_SECONDS = 45
LLM_RETRY_COUNT = 1
MAX_USER_MESSAGE_LENGTH = 4000
MAX_COMMAND_TEXT_LENGTH = 2000
MAX_PANEL_TITLE_LENGTH = 120
AVAILABLE_PANEL_TYPES = (
    "doc",
    "estado",
    "html",
    "imagem",
    "live",
    "markdown",
    "mermaid",
    "svg",
    "texto",
    "workflowFlow",
    "workflowSvg",
    "agente",
    "servicos",
)
ALLOWED_COMMANDS = frozenset(
    {"open_panel", "close_panel", "notify", "message", "update_servicos"}
)
NOTIFY_LEVELS = frozenset({"info", "success", "warning", "error"})

SYSTEM_PROMPT = """
Você é o agente de controle da interface do Painel Dinâmico Lab.
Responda SOMENTE com um objeto JSON válido, sem markdown, sem cercas de código
e sem texto antes ou depois do JSON.

Schema obrigatório:
{
  "commands": [
    {
      "name": "open_panel | close_panel | notify | message | update_servicos",
      "panel_type": "tipo do painel, quando aplicável",
      "title": "título opcional",
      "floating": false,
      "panel_id": "id opcional",
      "text": "texto, quando aplicável",
      "level": "info | success | warning | error",
      "services": [{"nome": "...", "porta": 1234, "estado": "ativo"}]
    }
  ],
  "message": "resposta curta para o histórico do chat"
}

Use apenas os cinco nomes de comando declarados. Não execute ações fora deles.
Para um pedido sobre servidores ou serviços ativos, inclua open_panel com
panel_type "servicos" e, quando útil, update_servicos com o contexto recebido.
Para fechar painéis sem id conhecido, close_panel pode usar panel_type.
""".strip()


class AgenteError(RuntimeError):
    """Erro esperado ao processar uma mensagem do agente."""


class RespostaAgenteInvalida(AgenteError):
    """A saída do LLM não respeitou o contrato JSON do agente."""


class AgenteTimeoutError(AgenteError):
    """O processo do LLM ficou sem progresso ou excedeu o limite total."""


@dataclass(frozen=True)
class RespostaAgente:
    commands: list[dict[str, Any]]
    message: str


def _kill_process_group(process: asyncio.subprocess.Process) -> None:
    if process.returncode is not None:
        return

    try:
        os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass


async def _consume_output(
    stream: asyncio.StreamReader,
    chunks: list[bytes],
    register_activity: Callable[[], None],
) -> None:
    while chunk := await stream.read(4096):
        chunks.append(chunk)
        register_activity()


async def _run_opencode(prompt: str) -> str:
    environment = os.environ.copy()
    binary = shutil.which("opencode", path=environment.get("PATH"))
    if binary is None:
        raise AgenteError("O comando opencode não está disponível no PATH do backend.")

    try:
        process = await asyncio.create_subprocess_exec(
            binary,
            "run",
            "-m",
            OPENCODE_MODEL,
            prompt,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=environment,
            start_new_session=True,
        )
    except OSError as error:
        raise AgenteError("Não foi possível iniciar o processo do agente.") from error

    stdout_chunks: list[bytes] = []
    stderr_chunks: list[bytes] = []
    last_activity = time.monotonic()
    first_output_received = False

    def register_activity() -> None:
        nonlocal first_output_received, last_activity
        first_output_received = True
        last_activity = time.monotonic()

    reader_tasks = [
        asyncio.create_task(_consume_output(process.stdout, stdout_chunks, register_activity)),
        asyncio.create_task(_consume_output(process.stderr, stderr_chunks, register_activity)),
    ]
    process_wait_task = asyncio.create_task(process.wait())
    started_at = time.monotonic()

    try:
        while not process_wait_task.done():
            now = time.monotonic()
            total_remaining = LLM_TOTAL_TIMEOUT_SECONDS - (now - started_at)
            idle_remaining = (
                LLM_IDLE_TIMEOUT_SECONDS - (now - last_activity)
                if not first_output_received
                else total_remaining
            )
            wait_for = min(total_remaining, idle_remaining)

            if total_remaining <= 0:
                raise AgenteTimeoutError("O agente excedeu o tempo total de resposta.")
            if idle_remaining <= 0:
                raise AgenteTimeoutError("O agente parou de emitir progresso.")

            try:
                await asyncio.wait_for(asyncio.shield(process_wait_task), timeout=wait_for)
            except asyncio.TimeoutError as error:
                now = time.monotonic()
                if now - started_at >= LLM_TOTAL_TIMEOUT_SECONDS:
                    raise AgenteTimeoutError("O agente excedeu o tempo total de resposta.") from error
                if not first_output_received and now - last_activity >= LLM_IDLE_TIMEOUT_SECONDS:
                    raise AgenteTimeoutError("O agente parou de emitir progresso.") from error

        await asyncio.gather(*reader_tasks)
        if process.returncode != 0:
            raise AgenteError("O processo do agente terminou com erro.")

        return b"".join(stdout_chunks).decode("utf-8", errors="replace")
    finally:
        if process.returncode is None:
            _kill_process_group(process)
        await process.wait()
        await asyncio.gather(*reader_tasks, return_exceptions=True)
        if not process_wait_task.done():
            process_wait_task.cancel()
            await asyncio.gather(process_wait_task, return_exceptions=True)


def _extract_first_json(output: str) -> Any:
    decoder = JSONDecoder()

    for index, character in enumerate(output):
        if character not in "[{":
            continue

        try:
            value, _ = decoder.raw_decode(output[index:])
        except JSONDecodeError:
            continue

        return value

    raise RespostaAgenteInvalida("O agente não retornou um JSON válido.")


def _bounded_text(value: object, field_name: str, maximum: int = MAX_COMMAND_TEXT_LENGTH) -> str:
    if not isinstance(value, str):
        raise RespostaAgenteInvalida(f"O campo {field_name} precisa ser texto.")

    text = value.strip()
    if not text or len(text) > maximum:
        raise RespostaAgenteInvalida(f"O campo {field_name} está vazio ou excede o limite.")

    return text


def _validate_services(value: object) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        raise RespostaAgenteInvalida("O campo services precisa ser uma lista.")

    services: list[dict[str, Any]] = []
    for service in value:
        if not isinstance(service, dict):
            raise RespostaAgenteInvalida("Cada serviço precisa ser um objeto.")

        name = _bounded_text(service.get("nome"), "nome", 120)
        port = service.get("porta")
        state = _bounded_text(service.get("estado"), "estado", 40)
        if not isinstance(port, int) or not 0 < port <= 65535:
            raise RespostaAgenteInvalida("A porta do serviço é inválida.")

        services.append({"nome": name, "porta": port, "estado": state})

    return services


def _validate_command(value: object) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise RespostaAgenteInvalida("Cada comando precisa ser um objeto.")

    name = value.get("name")
    if name not in ALLOWED_COMMANDS:
        raise RespostaAgenteInvalida("O agente retornou um comando fora da whitelist.")

    if name == "open_panel":
        panel_type = value.get("panel_type")
        if panel_type not in AVAILABLE_PANEL_TYPES:
            raise RespostaAgenteInvalida("O tipo de painel solicitado não existe.")

        command: dict[str, Any] = {"name": name, "panel_type": panel_type}
        title = value.get("title")
        if title is not None:
            command["title"] = _bounded_text(title, "title", MAX_PANEL_TITLE_LENGTH)
        if value.get("floating", False) is not False and not isinstance(value.get("floating"), bool):
            raise RespostaAgenteInvalida("O campo floating precisa ser booleano.")
        command["floating"] = value.get("floating", False)
        params = value.get("params", {})
        if not isinstance(params, dict):
            raise RespostaAgenteInvalida("O campo params precisa ser um objeto.")
        command["params"] = params
        return command

    if name == "close_panel":
        panel_id = value.get("panel_id")
        panel_type = value.get("panel_type")
        if panel_id is None and panel_type is None:
            raise RespostaAgenteInvalida("close_panel precisa de panel_id ou panel_type.")

        command = {"name": name}
        if panel_id is not None:
            command["panel_id"] = _bounded_text(panel_id, "panel_id", 160)
        if panel_type is not None:
            if panel_type not in AVAILABLE_PANEL_TYPES:
                raise RespostaAgenteInvalida("O tipo de painel para fechar não existe.")
            command["panel_type"] = panel_type
        return command

    if name in {"notify", "message"}:
        command = {"name": name, "text": _bounded_text(value.get("text"), "text")}
        if name == "notify":
            level = value.get("level", "info")
            if level not in NOTIFY_LEVELS:
                raise RespostaAgenteInvalida("O nível da notificação é inválido.")
            command["level"] = level
        return command

    return {"name": name, "services": _validate_services(value.get("services", []))}


def parse_agent_response(output: str) -> RespostaAgente:
    payload = _extract_first_json(output)
    if isinstance(payload, list):
        raw_commands = payload
        message = "Ação concluída."
    elif isinstance(payload, dict):
        raw_commands = payload.get("commands", [])
        message_value = payload.get("message", "Ação concluída.")
        message = _bounded_text(message_value, "message")
    else:
        raise RespostaAgenteInvalida("A raiz da resposta do agente precisa ser um objeto JSON.")

    if not isinstance(raw_commands, list):
        raise RespostaAgenteInvalida("O campo commands precisa ser uma lista.")

    commands = [_validate_command(command) for command in raw_commands]
    return RespostaAgente(commands=commands, message=message)


def _services_context() -> list[dict[str, Any]]:
    try:
        return detectar_servicos()
    except (InventarioServicosError, OSError):
        return []


def build_agent_prompt(user_text: str, services: list[dict[str, Any]]) -> str:
    context = json.dumps(
        {
            "tipos_de_painel": list(AVAILABLE_PANEL_TYPES),
            "servicos_ativos": services,
        },
        ensure_ascii=False,
    )
    return (
        f"{SYSTEM_PROMPT}\n\n"
        f"CONTEXTO ATUAL DA INTERFACE (não invente dados):\n{context}\n\n"
        f"MENSAGEM DO USUÁRIO:\n{user_text}\n\n"
        "Retorne agora somente o JSON do schema."
    )


async def process_agent_message(user_text: str) -> RespostaAgente:
    normalized_text = user_text.strip()
    if not normalized_text or len(normalized_text) > MAX_USER_MESSAGE_LENGTH:
        raise AgenteError("A mensagem precisa ter entre 1 e 4000 caracteres.")

    prompt = build_agent_prompt(normalized_text, await asyncio.to_thread(_services_context))
    last_error: RespostaAgenteInvalida | None = None

    for attempt in range(LLM_RETRY_COUNT + 1):
        current_prompt = prompt
        if attempt > 0:
            current_prompt += (
                "\nA resposta anterior não era válida. Corrija o formato e retorne "
                "somente um JSON conforme o schema."
            )

        output = await _run_opencode(current_prompt)
        try:
            return parse_agent_response(output)
        except RespostaAgenteInvalida as error:
            last_error = error

    raise AgenteError("O agente não conseguiu gerar uma resposta válida. Tente novamente.") from last_error


async def send_thinking_heartbeat(
    send_event: Callable[[dict[str, Any]], Awaitable[bool]],
) -> None:
    started_at = time.monotonic()
    while True:
        await asyncio.sleep(15)
        should_continue = await send_event(
            {
                "type": "thinking",
                "elapsed_seconds": round(time.monotonic() - started_at),
            }
        )
        if not should_continue:
            return
