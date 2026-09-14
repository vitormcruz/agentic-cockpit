# Plano: agentic-cockpit — primeira versão

> STATUS: esboço (triagem em andamento). Objetivo deste plano:
> implementar a PRIMEIRA VERSÃO USÁVEL do cockpit. As funcionalidades
> da v1 ainda não foram decididas — decidi-las é parte deste
> planejamento (ver Open Questions).

## Overview

Cockpit pessoal: workspace de docking persistente (estilo IDE) onde um
agente LLM molda a tela. O usuário conversa/age; o agente abre painéis
e cards, gera conteúdo e PERCEBE as mudanças que o usuário faz no
layout (estado compartilhado).

## Contexto (a jornada até aqui)

1. **Experimento validado** — repo `painel-dinamico-lab` (histórico
   preservado neste repo), 5 spikes com executor + revisor independente
   + validação humana:
   - docking IDE-style com Dockview; 13 tipos de painel (texto, MD,
     mermaid, SVG, imagem, HTML sandbox, estado, doc, live, workflows,
     agente, serviços); persistência de layout (localStorage);
   - FAB + floating card refinado (R1-R3: header título+X, sempre
     flutuante, tooltip por hover) com som;
   - backend FastAPI real (SSE 1s, `/api/servicos` real);
   - agente LLM (deepseek-v4-flash via `opencode run`, opencode-go)
     dirigindo a UI por WebSocket: `open_panel`/`open_card` com
     conteúdo GERADO pelo modelo (whitelist + limite 8KB no backend).
2. **Pesquisa do ecossistema** (2026-09, relatório em
   `docs/pesquisa-agentic-ui.md`): o espaço "agentic UI" é quente mas
   chat-first (CopilotKit/AG-UI) ou dashboard efêmero por prompt.
   Nada combina cockpit persistente + docking + agente moldando a tela
   — este é o diferencial do projeto.
3. **Decisão:** construir o cockpit real transplantando o experimento
   (feito: histórico completo preservado) com arquitetura consolidada
   abaixo.

## Architecture Decisions (já tomadas)

- **D1 — Stack:** React + Dockview + FastAPI + WebSocket (núcleo
  validado no experimento, transplantado com histórico).
- **D2 — AG-UI como dependência real:** os eventos do agente passam a
  usar o protocolo AG-UI (SDKs TS/Python) como envelope/transporte
  padrão. A DSL de docking (`open_panel`, `open_card`, `close_panel`,
  `notify`, `update_*`) CONTINUA existindo como payload de domínio por
  cima do AG-UI — o protocolo não conhece workspace.
- **D3 — Padrões Morph em código próprio (inspiração, não
  dependência):** camada de estado compartilhado no backend com
  journal da superfície, receipts (agente recebe de volta o que foi
  aplicado) e human commits (usuário arrasta/fecha painel → evento que
  o agente percebe). Nota: é memória do ESTADO DA TELA, distinta da
  memória conversacional de longo prazo (ver Open Questions).
- **D4 — Sandbox para HTML gerado:** padrões OpenGenUI/MCP Apps
  (iframe sandbox, bridge Zod-validada, auto-size) para conteúdo HTML
  produzido pelo agente.
- **D5 — A2UI adiado com gatilhos:** entra como novo tipo de painel
  ("a2ui", renderer embutido) somente se: (a) agentes externos
  A2UI-only precisarem desenhar conteúdo; ou (b) composição rica de UI
  dentro de painel sem renderers pré-definidos fizer falta.
- **D6 — LLM:** deepseek-v4-flash via `opencode run` (provider
  opencode-go), subprocess com timeout total 110s e idle só até o
  primeiro output (validado no experimento).
- **D7 — Repo/nome:** `agentic-cockpit`, público, experimento
  transplantado com histórico completo.
- **D8 — Execução (reuso das escolhas do experimento):** executor =
  worker (gpt-5.6-luna, esforço max, provider opencode-go); revisor =
  revisor (glm-5.3). Ciclos: worker → revisor independente → validação
  humana. Push autorizado neste repo.

## Open Questions (decisões abertas — a triagem da v1)

1. **Escopo funcional da v1:** o que o cockpit monitora/gerencia de
   verdade? (contexto dev: projetos, git, testes, agentes/skills do
   opencode; trabalho geral: tarefas/notas; híbrido expansível?)
2. **Funcionalidades da primeira versão e ordem:** candidatas herdadas
   do experimento (painéis, agente, persistência) + novas a definir
   (ex.: integrações, memória de longo prazo, comandos do agente).
   Parte do planejamento: priorizar e cortar escopo da v1.
3. **Onde roda:** só local (localhost) ou acessível de outros
   dispositivos (exige autenticação/deployment)?
4. **Papel e memória do agente:** reativo a pedidos (como hoje) ou com
   iniciativa? Memória conversacional de longo prazo existe? Onde?
5. **Layout inicial do cockpit:** qual a tela padrão ao abrir (painéis
   fixos + espaço livre para o agente)?

## Task List

(A preencher após a triagem das Open Questions 1-5. Fases prováveis:
fundação AG-UI sobre o código transplantado → estado compartilhado
morph-like → funcionalidades da v1 → revisão/validação.)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Latência do LLM via `opencode run` (~10-15s) | Médio | estado "pensando"; avaliar API direta no futuro |
| Spec A2UI draft instável (se adotada) | Baixo | adiada por gatilhos (D5) |
| Escopo da v1 inflar | Médio | triagem explícita antes das tasks |
|Seletores internos `dv-*` do Dockview frágeis | Baixo | já escopados; testar em upgrades |

## Referências

- Relatório de pesquisa: `docs/pesquisa-agentic-ui.md` (neste repo)
- Experimento: histórico git deste repo + issues/docs do
  `painel-dinamico-lab`
- AG-UI: https://docs.ag-ui.com/introduction
- Morph: https://github.com/eumemic/morph
- MCP Apps: https://blog.modelcontextprotocol.io/posts/2025-11-21-mcp-apps/
