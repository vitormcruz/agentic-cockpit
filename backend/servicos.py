from __future__ import annotations

import os
import re
import signal
import subprocess
from collections.abc import Iterable

SS_COMMAND = ("ss", "-tlnp")
SS_COMMAND_TIMEOUT_SECONDS = 5
KNOWN_SERVICE_NAMES = {
    5176: "Vite do lab",
    8000: "FastAPI",
}
PROCESS_NAME_PATTERN = re.compile(r'users:\(\("([^"]+)"')


class InventarioServicosError(RuntimeError):
    """Indica que o sistema não conseguiu consultar os sockets de escuta."""


def _extract_port(endpoint: str) -> int | None:
    port_text = endpoint.rsplit(":", maxsplit=1)[-1].rstrip("]")

    try:
        port = int(port_text)
    except ValueError:
        return None

    return port if 0 < port <= 65535 else None


def _extract_process_name(line: str) -> str | None:
    match = PROCESS_NAME_PATTERN.search(line)
    return match.group(1) if match else None


def _iter_service_rows(output: str) -> Iterable[tuple[int, str | None]]:
    for line in output.splitlines():
        columns = line.split()
        if len(columns) < 4 or columns[0].upper() != "LISTEN":
            continue

        port = _extract_port(columns[3])
        if port is not None:
            yield port, _extract_process_name(line)


def parse_ss_output(output: str) -> list[dict[str, int | str]]:
    services_by_port: dict[int, str | None] = {}

    for port, process_name in _iter_service_rows(output):
        services_by_port.setdefault(port, process_name)
        if services_by_port[port] is None and process_name is not None:
            services_by_port[port] = process_name

    services = []
    for port in sorted(services_by_port):
        process_name = services_by_port[port]
        services.append(
            {
                "nome": KNOWN_SERVICE_NAMES.get(port, process_name or f"Serviço na porta {port}"),
                "porta": port,
                "estado": "ativo",
            }
        )

    return services


def _terminate_process_group(process: subprocess.Popen[str]) -> None:
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass


def read_ss_output() -> str:
    process = subprocess.Popen(
        SS_COMMAND,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        start_new_session=True,
    )

    try:
        stdout, stderr = process.communicate(timeout=SS_COMMAND_TIMEOUT_SECONDS)
    except subprocess.TimeoutExpired as error:
        _terminate_process_group(process)
        process.communicate()
        raise InventarioServicosError("A consulta de serviços excedeu o tempo esperado.") from error

    if process.returncode != 0:
        detail = stderr.strip() or "O comando ss retornou um erro."
        raise InventarioServicosError(detail)

    return stdout


def detectar_servicos() -> list[dict[str, int | str]]:
    return parse_ss_output(read_ss_output())
