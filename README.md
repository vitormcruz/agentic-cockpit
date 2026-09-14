# agentic-cockpit

Cockpit pessoal com workspace de docking persistente onde um agente LLM
molda a tela: abre painéis e cards, gera conteúdo e percebe as mudanças
que o usuário faz no layout.

## Stack

- Frontend: React + Dockview (workspace docking persistente)
- Backend: FastAPI + WebSocket
- Protocolo do agente: AG-UI (eventos) + DSL de docking própria (domínio)
- Agente: deepseek-v4-flash via `opencode run` (opencode-go)

## Origem

Este repo nasce do experimento `painel-dinamico-lab` (5 spikes
aprovados, histórico preservado) e da pesquisa do ecossistema agentic
UI (AG-UI, A2UI, Morph, CopilotKit/OpenGenUI) documentada em
[docs/pesquisa-agentic-ui.md](docs/pesquisa-agentic-ui.md).

O planejamento da primeira versão vive em [docs/plano.md](docs/plano.md).
