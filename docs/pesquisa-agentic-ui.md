# Pesquisa para o agentic cockpit

- **Data:** 2026-09-13
- **Escopo:** AG-UI, A2UI v0.9 e v0.9.1, Morph, CopilotKit Open Generative UI e MCP Apps.
- **Contexto:** sucessor do `painel-dinamico-lab`, cuja DSL atual usa
  `open_panel`, `close_panel`, `notify`, `message`, `update_servicos` e `open_card`
  sobre WebSocket.
- **Método:** duas consultas amplas em `websearch`, aprofundamento em páginas oficiais
  com `webfetch` e leitura de código em quatro clones rasos.
- **Clones lidos:**
  `ag-ui@747933694b05676203da7d5bb8d8e50432e59b75`,
  `morph@ad4d2dcabd0db075b8757f9b34bbb36fecf9481b`,
  `OpenGenerativeUI@457e60cdf7f63fb78004486e1dc7ba753194696d` e
  `generative-ui@12aa81e3deeb9c6c15c7863b67a3f8f63144e383`.

Os caminhos de código citados abaixo são relativos a `/tmp/opencode/research/`,
salvo indicação contrária. Claims de adoção são separados de evidência de código.

## Resumo executivo

O cockpit não deve trocar a DSL própria por um protocolo externo em uma única etapa.
A recomendação é separar três camadas: AG-UI para a conversa entre agente e aplicação,
um modelo interno de superfície estável para docking, e formatos de UI opcionais
para o conteúdo de cada painel.

- **Adotar AG-UI como adapter de transporte e eventos.** `STATE_SNAPSHOT`/
  `STATE_DELTA`, `ACTIVITY_SNAPSHOT`/
  `ACTIVITY_DELTA`, tool calls e `CUSTOM` cobrem o canal sem obrigar o cockpit a
  virar uma tela de chat. O protocolo traz SDKs, middleware e integrações suficientes
  para reduzir o custo de uma evolução futura. Fontes: `ag-ui/README.md`,
  `ag-ui/docs/concepts/events.mdx`, `ag-ui/sdks/typescript/packages/core/src/events.ts`.
- **Adaptar A2UI, não adotá-lo como modelo de docking.** A2UI v0.9.1 é a versão de
  produção atual. O formato flat, o catálogo e o data model servem para cards, forms
  e widgets dentro de um painel. A spec não define receipts, journal, drag-and-drop,
  lock, await gates ou política de motion. Fontes: [A2UI v0.9.1][a2ui091],
  `morph/docs/MOTION.md` e `morph/SPEC.md` §§8-11.
- **Adotar Morph como referência de estado compartilhado.** Stable IDs, data separado,
  diff classificável, receipts com `lint` e `peers`, journal atribuído e commits
  humanos resolvem o problema específico do docking. O código de demonstração não
  deve ser copiado inteiro: o relay é local, não autenticado, usa last-write-wins e
  não tem CRDT. Fontes: `morph/SPEC.md`, `morph/morphspec.py`, `morph/server.py`.
- **Usar sandboxed UI em uma zona de extensão.** O pipeline CSS, HTML, funções e
  expressões permite progressão visual. Websandbox, Zod, CSP, allowlist e
  `ResizeObserver` formam um bom padrão para painéis descartáveis ou de plugin.
  HTML gerado não deve controlar a estrutura persistente do cockpit. Fontes:
  `opengenerativeui/docs/generative-ui.md`,
  `opengenerativeui/apps/app/src/components/generative-ui/open-generative-ui/renderer.tsx`.
- **Usar MCP Apps para UI pertencente a servidores externos.** O modelo de recurso
  `ui://` e iframe sandboxed é adequado para Excalidraw, charts ou ferramentas
  remotas. Ele perde controle de branding, portabilidade e layout do host. O painel
  deve tratar MCP App como uma folha embutida, nunca como autoridade sobre o docking.
  Fontes: [MCP Apps blog][mcp-blog], [CopilotKit MCP Apps][ck-mcp].

Arquitetura recomendada:

```text
agente
  -> adapter AG-UI
     -> journal e fold de uma Surface própria
        -> stager de stable IDs
           -> docking renderer
              -> conteúdo controlado, A2UI, ou iframe MCP App
```

## F1. AG-UI e A2UI como formato de comandos

### F1.1 Estado atual e maturidade

AG-UI se apresenta como protocolo aberto, leve e orientado a eventos para conectar
agentes a aplicações voltadas ao usuário. A documentação o posiciona entre MCP,
que conecta ferramentas e dados, e A2A, que conecta agentes. Fonte: [AG-UI overview][agui-intro].

O repositório lista suporte de primeira parte para Microsoft Agent Framework, Google
ADK, AWS Strands Agents, Mastra, Pydantic AI, Agno, LlamaIndex e AG2, além de
integrações com LangGraph e CrewAI. A lista também traz Amazon Bedrock AgentCore e
clientes como CopilotKit, React Native e plataformas de chat. Essa é uma matriz de
integrações mantida pelo projeto, não uma auditoria de uso em produção. Fonte:
`ag-ui/README.md` §§81-173.

Uma pesquisa independente consultada relata integração de primeira parte com
Microsoft, Google e AWS, mas também alerta que métricas de stars, installs e clientes
são reportadas pelo fornecedor. O mesmo texto aponta governança concentrada na
CopilotKit e possível lock-in no produto acima do protocolo. Esses pontos são
contexto externo, não confirmação independente de produção. Fonte:
[Ry Walker Research][ry-agui].

A documentação chama o núcleo de aproximadamente 16 tipos de evento, enquanto o
enum atual do SDK inclui famílias adicionais de reasoning, subagents e eventos
legados `THINKING_*`. O código marca os eventos legados para remoção em 1.0. Isso
indica uma superfície ativa, com compatibilidade em evolução, não um contrato imóvel.
Fontes: `ag-ui/docs/concepts/architecture.mdx`,
`ag-ui/sdks/typescript/packages/core/src/events.ts` linhas 13-65,
`ag-ui/sdks/typescript/packages/client/src/agent/agent.ts` linhas 116-135.

A própria documentação marca meta events e extensões de lifecycle como draft. Para o
cockpit, a consequência é simples: fixe a versão dos pacotes e mantenha um adapter
local que possa traduzir mudanças de evento. Fonte: `ag-ui/docs/concepts/events.mdx`
linhas 699-929.

Como evidência pública de adoção, AG-UI aparece conectado a frameworks de Microsoft,
Google e AWS na matriz oficial. A2UI aparece em integrações de CopilotKit, AG2,
Oracle Agent Spec, Vercel `json-renderer` e em demos de Flutter de Rebel App Studio,
Codemate e Very Good Ventures. As fontes descrevem integrações e demos abertas; elas
não provam uso operacional de clientes finais. Fontes: `ag-ui/README.md` §§99-145,
[Google A2UI blog][google-a2ui] e [CopilotKit A2UI blog][ck-a2ui-blog].

### F1.2 Como AG-UI funciona por dentro

O contrato básico é um stream de eventos tipados. Um run começa com `RUN_STARTED` e
termina com `RUN_FINISHED` ou `RUN_ERROR`; steps são opcionais. Mensagens e tool calls
usam sequências start, chunks e end. Fonte: [AG-UI events][agui-events].

O evento base carrega `type`, `timestamp`, `rawEvent` e `metadata`. A implementação
TypeScript também valida os objetos com Zod. O campo `metadata` permite transportar
trace id, uso de tokens ou finish reason sem criar um tipo novo. Fontes:
`ag-ui/sdks/typescript/packages/core/src/events.ts` linhas 67-77,
`ag-ui/docs/concepts/events.mdx` linhas 27-54.

O estado usa snapshot e delta. `STATE_SNAPSHOT` substitui o documento inteiro.
`STATE_DELTA` carrega operações de JSON Patch em sequência. `MESSAGES_SNAPSHOT`
sincroniza o histórico de mensagens. Essa combinação é a parte mais diretamente
reutilizável no layout persistente. Fontes: `ag-ui/docs/concepts/state.mdx` linhas
31-143 e `ag-ui/sdks/typescript/packages/core/src/events.ts` linhas 205-220.

Activities oferecem um canal estruturado separado da transcrição. Um
`ACTIVITY_SNAPSHOT` cria ou substitui uma activity por `messageId`; um
`ACTIVITY_DELTA` aplica patch ao conteúdo anterior. O cliente remove activities do
input enviado de volta ao agente. Fontes: `ag-ui/docs/concepts/events.mdx` linhas
514-555 e `ag-ui/sdks/typescript/packages/client/src/agent/agent.ts` linhas 404-415.

Tool calls podem ser definidos pelo backend ou pelo cliente. Os tools do cliente
entram em `RunAgentInput.tools`, com nome, descrição e JSON Schema. Isso permite
expor ao agente uma ação de docking, uma aprovação ou um commit humano sem deixar o
agente executar código de UI diretamente. Fontes: `ag-ui/docs/concepts/tools.mdx`
linhas 13-18 e 56-105; `ag-ui/sdks/typescript/packages/core/src/types.ts` linhas
203-208 e 236-251.

O SDK fornece middleware funcional e baseado em classe para transformar, filtrar,
medir e enriquecer eventos. A ordem forma uma cadeia. Um detalhe operacional importa:
`FilterToolCallsMiddleware` filtra eventos emitidos, mas não impede a execução do tool
no runtime upstream. Fonte: `ag-ui/docs/concepts/middleware.mdx` linhas 12-38 e
108-133.

O `HttpAgent` envia `POST` com `RunAgentInput`, define `Accept: text/event-stream`
e transforma o stream HTTP em eventos. A documentação também permite WebSocket,
webhook e outros transports por meio do desenho agnóstico. O `HttpAgent` concreto
não deve ser confundido com uma implementação nativa de todos esses transports.
Fontes: `ag-ui/sdks/typescript/packages/client/src/agent/http.ts` linhas 40-93,
`ag-ui/docs/concepts/architecture.mdx` linhas 24-37 e 118-134.

### F1.3 Como A2UI funciona por dentro

A2UI é formato de UI, não o canal geral de interação. A página oficial atual marca
v0.9.1 como produção, v0.9 como versão estável anterior e v1.0 como candidate.
A referência ao "v0.9 draft" no briefing precisa ser atualizada para a família v0.9,
com pin em v0.9.1 para produção. Fonte: [A2UI home][a2ui-home].

O v0.9 mudou de structured output para um modelo prompt-first. O agente recebe schema
e exemplos no prompt, gera JSON, passa por validação e corrige erros antes do cliente.
A vantagem é um schema mais expressivo. A perda é a necessidade de um loop de
validação e recuperação mais elaborado. Fonte: [A2UI v0.9][a2ui09].

O envelope v0.9.1 define quatro operações: `createSurface`, `updateComponents`,
`updateDataModel` e `deleteSurface`. Componentes são uma lista flat, ligados por IDs.
O cliente mantém um mapa e reconstrói a árvore para renderizar. A surface precisa de
um componente `root`; referências que chegam antes dos alvos podem ser tratadas de
forma progressiva. Fonte: [A2UI v0.9.1][a2ui091].

`createSurface` fixa `surfaceId` e `catalogId`. `updateComponents` envia estrutura.
`updateDataModel` altera um caminho JSON Pointer sem reenviar a estrutura. A spec
também define `sendDataModel`, que faz o cliente enviar o data model junto das ações,
por meio do mecanismo de metadata do transport. Fontes: [A2UI v0.9.1][a2ui091] e
[A2UI data flow][a2ui-flow].

A2UI separa o catálogo da mensagem. Um catálogo próprio pode mapear componentes
existentes do host. O catálogo precisa manter referências tipadas de componentes para
que validadores detectem filhos inexistentes. Fonte: [A2UI v0.9][a2ui09].

A2UI pode viajar sobre AG-UI. A integração descrita pela CopilotKit coloca A2UI como
payload de UI e AG-UI como transporte, streaming, state sync e tool calls. A2UI não
substitui o AG-UI, nem o AG-UI define o catálogo A2UI. Fonte:
[CopilotKit A2UI][ck-a2ui] e [A2UI comparison][a2ui-compare].

### F1.4 Mapeamento da DSL atual

| DSL atual | AG-UI recomendado | A2UI possível | Decisão para o cockpit |
|---|---|---|---|
| `open_panel` | `CUSTOM`/`ACTIVITY_SNAPSHOT` com ID | `createSurface` + `updateComponents` | Docking próprio. |
| `close_panel` | `CUSTOM` ou delta | `deleteSurface` | Operação própria para distinguir surface de painel. |
| `notify` | `ACTIVITY_SNAPSHOT` curto ou texto | Não é responsabilidade A2UI | Ticker/notification fora da árvore. |
| `message` | `TEXT_MESSAGE_*` ou activity | Texto em `Text` | Não obrigar o cockpit a renderizar transcript. |
| `update_servicos` | `STATE_DELTA` em `/servicos` | `updateDataModel` | Estado persistente do app, não UI gerada. |
| `open_card` | activity/custom com ID | `updateComponents` em catálogo próprio | A2UI serve ao conteúdo do card. |

O melhor envelope interno é uma `Surface` com `root`, `components`, `data` e
`props`, como em Morph. O adapter pode emitir `STATE_DELTA` para layout e dados,
`ACTIVITY_*` para progressos e `CUSTOM` para comandos de docking. O agente recebe
um receipt por mutação em um tool result ou evento customizado. Essa última parte é
extensão do cockpit, não recurso nativo do AG-UI. Fontes para os elementos de
superfície: `morph/SPEC.md` §§1-3 e `morph/web/js/protocol.js` linhas 14-38.

### F1.5 Ganhos, perdas e esforço

**Ganhos de AG-UI:**

- Interoperabilidade de eventos, tools, state sync e activities entre frontends e
  frameworks. Fonte: `ag-ui/README.md` linhas 38-79.
- SDK TypeScript com `AbstractAgent`, `HttpAgent`, verificação de eventos e middleware.
  Fontes: `ag-ui/sdks/typescript/packages/client/src/agent/agent.ts` e
  `ag-ui/sdks/typescript/packages/client/src/agent/http.ts`.
- Integração natural com A2UI, MCP Apps e ferramentas de frontend. Fontes:
  `ag-ui/middlewares/a2ui-middleware/src/index.ts`,
  `ag-ui/middlewares/mcp-apps-middleware/README.md`.

**Perdas e riscos de AG-UI:**

- O contrato não conhece docking, z-order, split panes, drag, receipts ou journal.
  O campo `CUSTOM` aceita extensão, mas a semântica continua privada. Fonte:
  `ag-ui/sdks/typescript/packages/core/src/events.ts` linhas 239-251.
- A superfície ainda evolui. Há eventos deprecated, draft e classes de backward
  compatibility. Fontes: `ag-ui/sdks/typescript/packages/core/src/events.ts` linhas
  24-42 e `ag-ui/sdks/typescript/packages/client/src/agent/agent.ts` linhas 116-135.
- A governança é concentrada na CopilotKit segundo a análise externa consultada.
  O protocolo ser MIT reduz o risco de licença, mas não elimina risco de direção.
  Fonte: [Ry Walker Research][ry-agui].

**Esforço relativo:**

- **Baixo:** criar um adapter que converta os comandos atuais do WebSocket em
  `CUSTOM`, `STATE_DELTA` e `ACTIVITY_*`, mantendo o renderer atual.
- **Médio:** implementar `RunAgentInput`, tool results, reconexão, snapshots e
  version pin no backend e no frontend.
- **Alto:** usar A2UI como fonte de verdade do docking. Isso exige catálogo próprio,
  lifecycle de surfaces, actions, reconciliação e uma camada nova para motion,
  journal e receipts. A2UI não fornece essas últimas políticas. Fonte:
  `morph/docs/MOTION.md` §§1-2 e `morph/SPEC.md` §§8-11.

**Recomendação F1:** adotar AG-UI como compatibilidade externa, manter um contrato
de surface próprio para o docking e adotar A2UI v0.9.1 somente para conteúdo
declarativo dentro de painéis. Começar por catálogo fixo, não por schema dinâmico.

## F2. Morph, a referência conceitual mais próxima

O projeto é publicado por `eumemic` e se apresenta como runtime declarativo de
agent-UI, com dashboard vivo no lugar de transcript. O clone contém uma demo
scripted, um agente Claude opcional e bridge AIOS. Não encontrei, nas fontes
consultadas, evidência externa de adoção em produção ou benchmark independente.
Fonte: `morph/README.md` linhas 1-25 e 140-202.

### F2.1 O modelo flat e o fold

Morph define uma `Surface` como `root`, mapa flat `id -> node`, `data` separado e
`props`. Pais referenciam filhos por IDs. O ID estável é a base para distinguir
movimento de substituição. Fonte: `morph/SPEC.md` §§1-3.

O wire protocol tem `createSurface`, `updateComponents`, `updateDataModel`,
`setSurfaceProps` e `narrate`. `action`, `input` e `ping` são mensagens do cliente
ou de controle. O servidor registra todas, mas somente as mutações de superfície
alteram o fold. Fonte: `morph/SPEC.md` §§2-2.2 e `morph/web/js/protocol.js`.

Bindings usam JSON Pointer. Um `$bind` lê um valor do data model; `$tpl` compõe texto.
Um patch de `updateDataModel` muda dados sem reconstruir componentes. `tween: true`
marca números que podem ser interpolados. Fontes: `morph/SPEC.md` §3,
`morph/web/js/protocol.js` linhas 126-229.

O catálogo básico contém `surface`, grids, rows, stacks, cards, métricas, charts,
lists, boards, inputs e outros tipos. O agente envia dados que nomeiam componentes
permitidos, não código executável. Fonte: `morph/SPEC.md` §4 e
`morph/morphspec.py` linhas 36-58.

### F2.2 Diff e motion derivado

`stager.js` indexa a árvore renderizada e classifica cada ID em `entered`, `exited`,
`moved` ou `morphed`. O classificador também produz `valueTweens`. A mudança de tipo
vence a mudança de posição, por isso um spinner que vira card é `morphed`. Fonte:
`morph/web/js/stager.js` linhas 33-55 e 109-153.

Se a lista de filhos de um container muda, siblings persistentes também entram em
`moved` para que o reflow tenha FLIP, em vez de mover apenas o item inserido. Isso é
útil para uma lista de painéis em que um novo painel desloca todos os seguintes.
Fonte: `morph/web/js/stager.js` linhas 124-153 e `morph/docs/MOTION.md` §§2-2.1.

Motion não vai no wire. O renderer deriva a política a partir do diff. A proposta
define `MAX_NAMED = 50`, prioridade `morph > move > exit > enter`, root crossfade
quando há excesso, e contagem de mudanças descartadas em `capped`. Fonte:
`morph/web/js/stager.js` linhas 17-30 e 170-193; `morph/docs/MOTION.md` §§3-4.

Valores numéricos não usam View Transition. O renderer anima o número com JavaScript
depois do transition estrutural. Se o browser não suporta a API ou o usuário pede
reduced motion, o DOM troca diretamente e os tweens vão ao valor final. Fontes:
`morph/docs/MOTION.md` §§2.1, 3 e 5; `morph/web/js/renderer.js` linhas 54-117.

O renderer reconstrói a árvore em cada apply, mas preserva a identidade lógica em
`data-mid`, nomeia somente os IDs no plano e restaura foco de campos usando o ID do
componente. Para o cockpit React, o conceito deve virar renderização keyed e não uma
reconstrução integral do subtree. Fontes: `morph/web/js/renderer.js` linhas 1-8,
119-166 e 168-251.

### F2.3 Receipts, lint e read-back

O servidor Python replica o fold e o classificador JavaScript. `build_receipt` devolve:

- `applied`, com seq e tipo de cada mensagem;
- `lint`, com problemas estruturais e de binding;
- `transition`, com IDs que entraram, saíram, moveram ou sofreram morph;
- `surface.digest`, com uma impressão compacta da superfície;
- `peers`, com commits humanos posteriores ao último seq conhecido;
- `seq`, usado como watermark do próximo emit.

Fonte: `morph/SPEC.md` §9 e `morph/morphspec.py` linhas 588-654.

Os testes verificam paridade entre Python e JavaScript usando fixtures comuns. Eles
pinam movimento entre colunas, reflow, morph, tween, cap e fold. Essa técnica merece
ser copiada: o cockpit deve testar o fold e o receipt contra os mesmos vetores que o
renderer usa. Fontes: `morph/tests/parity.test.mjs` e
`morph/tests/test_morphspec.py` linhas 1-13 e 349-424.

### F2.4 Journal, blame e persistência

`Hub.commit()` é o mutator único. Sob um lock, o servidor cria `meta.seq`, timestamp,
actor e cause, aplica o fold, grava journal, faz fan-out SSE e acorda long-pollers.
Isso garante ordem entre o journal e os clientes. Fonte: `morph/server.py` linhas
137-223.

O journal é append-only. Quando passa de `LOG_CAP`, o prefixo vira um
`createSurface` sintético com `cause.kind = compaction`; o replay compactado converge
para o mesmo estado. `GET /journal`, `/surface`, `/commits` e `/blame/<id>` expõem
histórico, digest, peers e autoria. Fontes: `morph/SPEC.md` §§8.1-8.5 e
`morph/server.py` linhas 230-256 e 617-657.

`meta.actor` distingue `agent`, `human` e `system`. `cause.kind` diferencia `move`,
`dismiss`, `input-edit`, `point`, `annotate`, `widget` e compaction. O renderer marca
componentes com `data-author`, e o endpoint de blame identifica quem tocou um ID.
Fonte: `morph/SPEC.md` §10.

### F2.5 Human commits, lock e awaitCommit

Drag-and-drop é decidido contra a Surface, não contra o DOM. `gestures.js` valida
tipo de container, locks, ancestralidade e ciclos. `computeMove` preserva o ID e
atualiza os containers de origem e destino. Fonte: `morph/web/js/gestures.js` linhas
173-242.

O mesmo policy core permite point, edit-in-place, dismiss e annotate. Bindings de
string ou número optam o valor para edição. Inputs de duas vias fazem optimistic
commit com `cid`, e o runtime suprime o echo idêntico do servidor. Fontes:
`morph/web/js/gestures.js` linhas 268-361,
`morph/web/js/runtime.js` linhas 75-103 e 167-204.

As interações chegam ao agente como commits estruturados. `server.py` inclui no
contexto da ação o node, a ancestry e os props resolvidos. O agente recebe uma
intenção sem depender de uma descrição textual vaga. Fonte: `morph/server.py` linhas
757-811 e `morph/SPEC.md` §10.

`lock: true` congela o subtree. Um array pode bloquear somente `move`, `edit`,
`dismiss`, `point` ou `annotate`. A enforcement é client-side; um `POST /commit`
direto ainda pode escrever um node locked. Isso é aceitável para uma demo local,
mas não é autorização de segurança. Fonte: `morph/SPEC.md` §1 e
`morph/web/js/gestures.js` linhas 44-57 e 135-199.

`awaitCommit` transforma uma sequência linear em uma sequência reativa. O player
espera um commit humano que combine actor, type, cause, component, pointer ou destino.
Um watermark global consome o commit uma única vez. Timeout continua a sequência em
vez de travar o demo. Fonte: `morph/SPEC.md` §§11-11.1 e `morph/server.py` linhas
927-1046.

### F2.6 AIOS e a importância do ack

No bridge AIOS, a ferramenta customizada `present` termina o turno até receber
`tool-results`. O bridge aplica a Surface, envia o receipt como resultado e acorda o
agente. Sem esse ack, o runtime pode reabrir o turno em um estado inválido. O receipt
é simultaneamente ack de transporte e read-back de UI. Fonte: `morph/docs/AIOS.md`
linhas 13-67 e `morph/aios_bridge.py`.

Essa ideia é aplicável ao cockpit mesmo sem AIOS: cada mutação do agente precisa de
um resultado estruturado com seq, digest, lint, transition e peers. Não basta retornar
`ok`.

### F2.7 O que adotar e o que não adotar

| Elemento de Morph | Decisão | Aplicação no cockpit |
|---|---|---|
| Surface flat com IDs | Adotar | Painéis, tabs, splitters e cards têm IDs persistentes. |
| `data` separado | Adotar | Serviços, progresso e filtros usam patches pequenos. |
| Diff entered/exited/moved/morphed | Adotar | Derivar motion do estado, sem comandos `animate`. |
| Receipt com digest/lint/peers | Adotar | O agente confirma o estado efetivamente aplicado. |
| Journal atribuído | Adotar | Auditoria e replay do layout pessoal. |
| Drag, edit, dismiss e annotate | Adaptar | Gestos escrevem commits humanos e não são revertidos silenciosamente. |
| `lock` | Adaptar | UX e integridade local, nunca ACL. |
| `awaitCommit` | Adaptar | Gates para aprovação, drag ou alteração de filtro. |
| Relay stdlib sem autenticação | Descartar | Integrar ao backend existente e proteger a sessão. |
| Last-write-wins sem CRDT | Adaptar | Serve para usuário único; declarar o limite. |
| Rebuild integral do DOM | Descartar | Usar keyed rendering e preservar input/foco. |
| Catalogo Morph fixo | Adaptar | Substituir por catálogo do cockpit e componentes existentes. |

O adapter A2UI de Morph confirma a compatibilidade conceitual: ele transforma
componentes A2UI em nodes Morph, converte `{ path }` em `$bind`, mantém IDs e degrada
tipos desconhecidos para placeholders. `deleteSurface` não é mapeável nesse adapter.
Fonte: `morph/web/js/a2ui.js` linhas 1-43, 113-153 e 192-231.

**Recomendação F2:** fazer de Morph a referência de contrato de estado, receipts e
human-in-the-loop. Não fazer de Morph a dependência de runtime. A implementação deve
preservar a DSL existente durante a migração e adicionar operações internas de
`surface`, `layout`, `receipt` e `human_commit`.

## F3. CopilotKit, sandbox e open generative UI

### F3.1 O espectro de controle

O clone `generative-ui` organiza três padrões:

1. **Controlled:** o app possui componentes React, o agente escolhe o componente e
   fornece dados. O host controla layout, estilo e interação.
2. **Declarative:** o agente envia uma descrição estruturada e o host compõe com um
   catálogo. A2UI fica aqui.
3. **Open-ended:** o agente ou um MCP server fornece uma superfície mais livre,
   normalmente HTML em iframe sandboxed.

Fonte: `generative-ui/README.md` §§53-71 e 75-135.

O mesmo README informa que o repositório foi consolidado no monorepo principal do
CopilotKit. Ele é útil como material conceitual e exemplos, mas não deve ser tratado
como a linha principal de manutenção. Fonte: `generative-ui/README.md` linhas 415-417.

### F3.2 `generateSandboxedUi` e streaming ordenado

O runtime ativa `openGenerativeUI` e injeta `generateSandboxedUi`. O middleware
transforma o tool call em activity `open-generative-ui`. O contrato canônico recebe
parâmetros nesta ordem:

1. `initialHeight`;
2. `placeholderMessages`;
3. `css`;
4. `html`;
5. `jsFunctions`;
6. `jsExpressions`.

CSS chega antes do markup para evitar preview sem estilo. HTML aparece em partes.
Funções entram antes das expressões. Cada expressão é executada em ordem para mostrar
progressão comportamental. Fontes: `opengenerativeui/README.md` linhas 125-142,
`opengenerativeui/docs/generative-ui.md` linhas 46-56 e
`opengenerativeui/apps/agent/skills/advanced-visualization/SKILL.md` linhas 15-42.

O schema local confirma que cada campo chega com flags de completude: `cssComplete`,
`htmlComplete`, `jsFunctionsComplete`, `jsExpressionsComplete` e `generating`.
Fonte: `opengenerativeui/apps/app/src/components/generative-ui/open-generative-ui/schema.ts`.

O renderer externo faz throttle de 1.000 ms, mas libera imediatamente quando CSS
termina, HTML fecha, functions aparecem ou novas expressions chegam. Isso reduz
re-render em streams de tokens sem atrasar marcos visíveis. Fonte:
`opengenerativeui/apps/app/src/components/generative-ui/open-generative-ui/renderer.tsx`
linhas 20-122.

Antes de `cssComplete`, o renderer não cria preview sandboxed. Quando há HTML parcial,
`processPartialHtml` remove tags incompletas, blocos de style/script/head e entidades
parciais. A preview usa Idiomorph para atualizar o body sem flicker e marca nodes novos
com `morph-enter`. Fontes:
`opengenerativeui/apps/app/src/components/generative-ui/open-generative-ui/renderer.tsx`
linhas 160-245,
`opengenerativeui/apps/app/src/components/generative-ui/open-generative-ui/process-partial-html.ts`
e `opengenerativeui/apps/app/src/components/generative-ui/open-generative-ui/frame-content.ts`
linhas 81-114.

Quando o HTML termina, o preview é destruído e um Websandbox final é criado. O
renderer injeta CSP, importmap, design system, CSS gerado e HTML nessa ordem. Em
seguida injeta `jsFunctions` uma vez e executa somente as novas `jsExpressions`,
aguardando cada chamada. Fonte:
`opengenerativeui/apps/app/src/components/generative-ui/open-generative-ui/renderer.tsx`
linhas 247-375 e `frame-content.ts` linhas 17-65.

O projeto aumenta o limite de tokens para 64.000 porque o default de 4.096 truncava
tool args antes de `jsFunctions` e `jsExpressions`. Esse detalhe mostra que open UI
tem custo de geração muito maior que um catálogo declarativo. Fonte:
`opengenerativeui/apps/agent/src/model.py` linhas 8-28.

### F3.3 Bridge host e sandbox

O host expõe funções como `sendPrompt` e `openLink` via `Websandbox.connection.remote`.
Cada função tem schema Zod e o handler valida novamente com `safeParse`. O bridge do
clone limita texto a 4.000 caracteres, aceita apenas URLs HTTPS, permite allowlist de
origins e abre links com `noopener,noreferrer`. Fontes:
`opengenerativeui/apps/app/src/lib/sandbox/sandbox-functions.ts` linhas 11-79 e
`opengenerativeui/apps/app/src/lib/sandbox/__tests__/sandbox-functions.test.ts`.

O renderer só aceita resize vindo da janela do iframe atual. O valor precisa ser
finito e fica entre 50 e 4.000 pixels. O iframe informa altura por `postMessage`, e o
script interno usa `ResizeObserver`, evento de resize e polling curto. Fontes:
`opengenerativeui/apps/app/src/components/generative-ui/open-generative-ui/renderer.tsx`
linhas 26-32 e 265-325; `frame-content.ts` linhas 117-145.

O CSP do clone permite `unsafe-inline`, `unsafe-eval` e quatro CDNs. Isso restringe
origens, mas não equivale a eliminar o risco de código gerado. Para o cockpit, a
allowlist de bibliotecas precisa ser menor e configurável por capability do painel.
Fonte: `opengenerativeui/apps/app/src/components/generative-ui/open-generative-ui/frame-content.ts`
linhas 17-38.

O design system injeta tokens de tema, classes SVG, estilos de forms e um importmap.
O skill instrui o agente a usar variáveis de tema, não cores hardcoded. Fontes:
`opengenerativeui/packages/design-system/src/index.ts` linhas 432-474 e
`opengenerativeui/apps/agent/skills/advanced-visualization/SKILL.md` linhas 44-107.

### F3.4 Skills como progressive disclosure

O agente usa `create_deep_agent` com `skills` apontando para `apps/agent/skills`.
Instruções de visualização são carregadas sob demanda, em vez de inflar todo o
system prompt. Fonte: `opengenerativeui/apps/agent/main.py` linhas 27-35 e
`opengenerativeui/README.md` linhas 112-123.

O MCP server do clone expõe skills como resources `skills://list` e
`skills://{name}`, prompts pré-compostos e `assemble_document`. Esse padrão permite
separar catálogo, instruções e execução. Fonte: `opengenerativeui/apps/mcp/src/server.ts`
linhas 12-106.

### F3.5 MCP Apps e o padrão iframe

MCP Apps define resources `ui://` pré-declarados e os liga a tools por
`_meta["ui/resourceUri"]`. O host pode buscar e revisar o template antes da execução,
separando apresentação estática de dados dinâmicos. A comunicação usa JSON-RPC MCP
por `postMessage` dentro do iframe. Fontes: [MCP Apps blog][mcp-blog].

A proposta oficial começa com HTML em iframe sandboxed, declara defesa em profundidade
com template pré-declarado, mensagens auditáveis e consentimento para tool calls.
Também exige fallback textual para hosts sem suporte. Fonte: [MCP Apps blog][mcp-blog].

No middleware AG-UI, o servidor pode ser HTTP ou SSE. O middleware descobre tools com
`_meta.ui.resourceUri`, executa a chamada, emite activity com `resourceUri` e oferece
proxy para o iframe buscar a resource. `serverId` estável evita quebrar referências
persistidas quando a URL muda. Fonte: `ag-ui/middlewares/mcp-apps-middleware/README.md`
linhas 31-105.

CopilotKit registra o renderer de MCP Apps automaticamente, restaura activity em
threads e recomenda `serverId` em produção. Fontes: [CopilotKit MCP Apps][ck-mcp].

MCP Apps e Open Generative UI ocupam lugares diferentes:

| Padrão | Quem possui UI | Isolamento | Uso no cockpit |
|---|---|---|---|
| `useComponent` | Host | React do host | Cards estáveis e ações críticas. |
| A2UI fixed | Host via catálogo | Renderer do host | Conteúdo declarativo com muitas variantes. |
| Open Generative UI | Agente, em iframe | Websandbox/CSP | Visualização temporária ou plugin confiável. |
| MCP Apps | MCP server, em iframe | Sandbox e proxy MCP | Ferramenta externa com UI própria. |

As diferenças de controle, segurança e portabilidade são descritas pelo próprio
ecossistema e pela comparação oficial A2UI. Fontes: `generative-ui/README.md` §§75-135,
`opengenerativeui/README.md` linhas 9-18 e [A2UI comparison][a2ui-compare].

### F3.6 Aplicação ao cockpit docking

**Adotar:**

- O pipeline ordenado para um painel de extensão: placeholder, tema, HTML, funções e
  expressões. O painel aparece enquanto o agente ainda produz conteúdo.
- Websandbox com bridge mínimo. Expor `notify`, `open_panel`, `open_link` e leitura
  de dados somente por functions nomeadas, cada uma com schema e autorização.
- `ResizeObserver` com min/max e validação de `event.source` para que o painel ajuste
  sua altura sem poder redimensionar outro painel.
- Tokens CSS do host como contrato de tema. O agente recebe nomes de tokens, não
  valores arbitrários.
- Skills em `SKILL.md` para progressive disclosure de componentes e regras visuais.

**Adaptar:**

- Renderizar open UI em uma célula de painel com ID persistente, não em uma mensagem
  de chat. O lifecycle da activity precisa ser foldado no journal do cockpit.
- Usar Idiomorph somente no preview do HTML parcial. O layout do docking deve usar o
  stager de stable IDs, porque um iframe não conhece a posição dos irmãos.
- Mapear sandbox functions para tool calls AG-UI e registrar receipts. O resultado
  de uma ação precisa conter `panelId`, `seq` e `digest`.
- Para MCP Apps, guardar `serverId`, `resourceUri` e permissões no estado do painel.
  A URL do servidor não pode ser a identidade única.

**Descartar:**

- HTML gerado como caminho padrão para alterar splitters, ordem, visibilidade ou
  persistência dos painéis.
- Bridge genérico que permita `fetch`, navegação arbitrária, acesso a storage ou
  execução de função escolhida pelo agente.
- Suposição de que `unsafe-eval` e CDN allowlist tornam código gerado confiável.
- MCP App como autoridade para tema, foco, keyboard navigation ou lifecycle do host.

**Recomendação F3:** usar open generative UI como um sandbox de conteúdo dentro de um
contrato de docking controlado. Usar MCP Apps para integrações externas. Para forms,
ações destrutivas e layout persistente, preferir componentes do host ou A2UI fixed.

## Decisão consolidada para o agentic cockpit

### Contrato de estado proposto

```json
{
  "root": "cockpit",
  "components": {
    "cockpit": {
      "id": "cockpit",
      "type": "surface",
      "children": ["dock-main", "dock-side"]
    },
    "dock-main": {
      "id": "dock-main",
      "type": "dock",
      "children": ["panel-servicos"]
    },
    "panel-servicos": {
      "id": "panel-servicos",
      "type": "panel",
      "props": {"title": "Serviços", "contentKind": "native"}
    }
  },
  "data": {
    "servicos": {},
    "layout": {}
  },
  "props": {"theme": "system"}
}
```

O exemplo é uma adaptação recomendada, não uma especificação já existente. O agente
deve poder alterar dados e conteúdo, mas o host continua dono de `dock`, `panel`,
splitter, foco, persistência e permissões.

### Ordem de adoção

1. **Preservar o WebSocket atual.** Introduzir `Surface`, IDs estáveis, fold imutável
   e `meta.seq/actor/cause` sem mudar o wire público.
2. **Adicionar receipts e journal.** Cada comando do agente devolve digest, lint,
   transition e peers. Cada drag ou edição produz um human commit.
3. **Criar o adapter AG-UI.** Emitir state snapshot/delta, activities e custom events.
   Manter o WebSocket como transport interno durante a migração.
4. **Adicionar catálogo A2UI fixed.** Usar apenas para conteúdo de painel que precisa
   de várias combinações declarativas. Fixar `catalogId` e versão v0.9.1.
5. **Adicionar sandbox e MCP Apps por capability.** Cada painel declara se aceita
   native, A2UI, Open Generative UI ou MCP App. O default continua native.

### Três conclusões principais

**1. AG-UI resolve o canal, não o cockpit.**

AG-UI fornece eventos, state sync, tools, middleware e transports. A integração com
A2UI e MCP Apps reduz o custo de interoperabilidade. Ele não define docking, stable-ID
diff, motion, journal ou receipts. A adoção correta é um adapter de interação, com
contrato de superfície preservado no domínio do cockpit.

**2. Morph tem a abstração certa para a superfície compartilhada.**

Flat stable IDs, data separado, receipts simétricos ao motion e commits humanos
fecham o loop agente-usuário. `awaitCommit` dá ao agente um ponto explícito para
esperar uma decisão humana. O relay e a política local de segurança não são
reutilizáveis sem adaptação, principalmente por ausência de autenticação e CRDT.

**3. Sandbox e MCP Apps devem ficar na borda.**

CopilotKit mostra como transmitir CSS, HTML e JavaScript em ordem, aplicar Idiomorph,
usar Websandbox, bridge Zod e auto-size. O padrão é bom para conteúdo variável, mas
tem custo, dependência de modelo e superfície de segurança maior. O docking persistente
deve continuar sob componentes host, catálogo fixo e journal próprio.

## Limitações da pesquisa

- As matrizes de adoção de AG-UI e A2UI são publicadas pelos próprios projetos. Não
  encontrei auditoria independente de uso em produção durante as consultas.
- Não encontrei recepção externa relevante e verificável sobre Morph além do próprio
  repositório. A avaliação de Morph usa código, testes e documentação do clone.
- O clone Morph é uma demo de usuário único: `server.py` declara relay localhost sem
  autenticação, last-write-wins e ausência de CRDT. Isso limita extrapolações para
  multiusuário.
- O clone OpenGenerativeUI é showcase e exige modelo forte. O próprio README alerta
  para layouts quebrados com modelos menores. Não foi feita medição de latência ou
  custo.
- O caminho antigo da especificação A2UI v0.9 retornou HTTP 404. A pesquisa usou o
  caminho publicado atualmente e a versão de produção `v0.9.1`.
- Não foram executados os apps clonados. A evidência de implementação veio da leitura
  de arquivos e testes versionados, conforme o método solicitado.

## Links consultados

### F1, AG-UI e A2UI

- [AG-UI overview][agui-intro]
- [AG-UI events][agui-events]
- [Repositório AG-UI](https://github.com/ag-ui-protocol/ag-ui)
- [A2UI home][a2ui-home]
- [A2UI v0.9][a2ui09]
- [A2UI v0.9.1][a2ui091]
- [A2UI data flow][a2ui-flow]
- [Comparação de A2UI com AG-UI e MCP Apps][a2ui-compare]
- [Google Developers Blog sobre A2UI v0.9][google-a2ui]
- [CopilotKit sobre as mudanças do A2UI v0.9][ck-a2ui-blog]
- [CopilotKit sobre o estado de Agentic UI][ck-state]
- [InfoQ sobre A2UI v0.9][infoq-a2ui]
- [Análise externa de AG-UI][ry-agui]

### F2, Morph

- [Repositório Morph](https://github.com/eumemic/morph)

O restante da evidência F2 está nos arquivos do clone citados nas seções F1 e F2.

### F3, CopilotKit, Open Generative UI e MCP Apps

- [Repositório OpenGenerativeUI](https://github.com/CopilotKit/OpenGenerativeUI)
- [Repositório Generative UI](https://github.com/CopilotKit/generative-ui)
- [CopilotKit Open Generative UI][ck-open]
- [CopilotKit MCP Apps][ck-mcp]
- [CopilotKit generative UI overview][ck-genui]
- [MCP Apps Extension proposal][mcp-blog]

## Referências de links

[agui-intro]: https://docs.ag-ui.com/introduction
[agui-events]: https://docs.ag-ui.com/concepts/events
[a2ui-home]: https://a2ui.org/
[a2ui09]: https://a2ui.org/specification/v0.9-a2ui/
[a2ui091]: https://a2ui.org/specification/v0.9.1-a2ui/
[a2ui-flow]: https://a2ui.org/concepts/data-flow/
[a2ui-compare]: https://a2ui.org/introduction/agent-ui-ecosystem/
[google-a2ui]: https://developers.googleblog.com/a2ui-v0-9-generative-ui/
[ck-a2ui]: https://docs.copilotkit.ai/agent-spec/generative-ui/a2ui
[ck-a2ui-blog]: https://www.copilotkit.ai/blog/a2ui-whats-new-in-google-generative-ui-spec
[ck-state]: https://www.copilotkit.ai/blog/the-state-of-agentic-ui-comparing-ag-ui-mcp-ui-and-a2a-protocols
[ry-agui]: https://rywalker.com/research/ag-ui
[infoq-a2ui]: https://www.infoq.com/news/2026/07/google-a2ui-genui/
[ck-open]: https://docs.copilotkit.ai/generative-ui/open-generative-ui
[ck-mcp]: https://docs.copilotkit.ai/generative-ui/mcp-apps
[ck-genui]: https://docs.copilotkit.ai/generative-ui
[mcp-blog]: https://blog.modelcontextprotocol.io/posts/2025-11-21-mcp-apps/
