# Routing Rules — Role-Driven Angelic Roster

## Work Type → Agent

| Work Type | Agent | Examples |
|-----------|-------|---------|
| Cross-agent leadership & delegation | Team Director "Metatron" 👑 | Team-wide delegation strategy, owner alignment, escalation handling, dependency unblocking |
| External intelligence synthesis | Team Director "Metatron" 👑 | Internet research orchestration, database query planning, evidence synthesis for specialists |
| Core runtime | Core Runtime Engineer "Uriel" 🔧 | CopilotClient, adapter, session pool, tools module, spawn orchestration |
| Prompt architecture | Prompt Architect "Raziel" 🧠 | Agent charters, spawn templates, coordinator logic, response tier selection |
| Type system | TypeScript Engineer "Jophiel" 👩‍💻 | Discriminated unions, generics, tsconfig, strict mode enforcement, declaration files |
| SDK integration | SDK Integration Specialist "Zadkiel" 🕵️ | @github/copilot-sdk usage, CopilotSession lifecycle, event handling, platform patterns |
| Runtime performance | Node Runtime Engineer "Michael" ⚡ | Streaming, event loop health, session management, async iterators, memory profiling |
| Tests & quality | Quality Test Engineer "Gabriel" 🧪 | Test coverage, Vitest, edge cases, CI/CD, quality gates, adversarial testing, PR blocking |
| Docs & messaging | Developer Relations Lead "Raphael" 📣 | README, API docs, getting-started, demos, tone review, contributor recognition |
| Architecture & review | Team Director "Metatron" 🏗️ | Product direction, architectural decisions, code review, scope/trade-offs |
| Distribution | Distribution Engineer "Sachiel" 📦 | npm packaging, esbuild config, global install, marketplace prep |
| Release management | Release Manager "Camael" 🚢 | Semantic versioning, GitHub Releases, changelogs, dev→main merges, release gating |
| Security & PII | Security Compliance Engineer "Cassiel" 🔒 | Hook design (file-write guards, PII filters), security review, compliance, secret management |
| CLI UX & visual design | CLI UX Designer "Remiel" + Visual Design Lead "Haniel" 🎨 | Interaction design, copy, spacing, affordances, UX gates, logo, brand, design system |
| Aspire & observability | Observability Engineer "Tzaphkiel" 🔭 | Aspire dashboard, OTLP integration, Playwright E2E, Docker telemetry |
| VS Code integration | VS Code Extension Engineer "Raguel" 🔌 | VS Code Extension API, runSubagent compatibility, editor integration |
| REPL & shell | REPL & Shell Engineer "Sariel" 🖥️ | Interactive shell, session dispatch, streaming pipeline, event wiring |
| TUI implementation | TUI Engineer "Sandalphon" 🖥️ | Terminal components, layout, input handling, focus management, rendering perf |
| Terminal E2E tests | E2E Test Engineer "Jeremiel" 🧪 | node-pty harness, Gherkin features, frame snapshots, UX gate test suite |
| Accessibility | Accessibility Reviewer "Phanuel" ♿ | Keyboard nav, color contrast, error guidance, shortcut discoverability |
| Hostile QA | Product Dogfooder "Anael" 🧨 | Adversarial testing, edge cases, regression scenarios |
| SDK usability | SDK Integration Specialist "Zadkiel" 📖 | JSDoc, LLM discoverability, API surface clarity, legacy cleanup, migration guides |

## Module Ownership

| Module | Primary | Secondary |
|--------|---------|-----------|
| `src/adapter/` | Core Runtime Engineer "Uriel" 🔧 | SDK Integration Specialist "Zadkiel" 🕵️ |
| `src/agents/` | Prompt Architect "Raziel" 🧠 | Core Runtime Engineer "Uriel" 🔧 |
| `src/build/` | TypeScript Engineer "Jophiel" 👩‍💻 | Distribution Engineer "Sachiel" 📦 |
| `src/casting/` | Core Runtime Engineer "Uriel" 🔧 | Prompt Architect "Raziel" 🧠 |
| `src/cli/` | Core Runtime Engineer "Uriel" 🔧 | Distribution Engineer "Sachiel" 📦 |
| `src/client/` | SDK Integration Specialist "Zadkiel" 🕵️ | Core Runtime Engineer "Uriel" 🔧 |
| `src/config/` | TypeScript Engineer "Jophiel" 👩‍💻 | Core Runtime Engineer "Uriel" 🔧 |
| `src/coordinator/` | Prompt Architect "Raziel" 🧠 | Team Director "Metatron" 🏗️ |
| `src/hooks/` | Security Compliance Engineer "Cassiel" 🔒 | Core Runtime Engineer "Uriel" 🔧 |
| `src/marketplace/` | Distribution Engineer "Sachiel" 📦 | Core Runtime Engineer "Uriel" 🔧 |
| `src/ralph/` | Core Runtime Engineer "Uriel" 🔧 | — |
| `src/runtime/` | Node Runtime Engineer "Michael" ⚡ | Core Runtime Engineer "Uriel" 🔧 |
| `src/sharing/` | Core Runtime Engineer "Uriel" 🔧 | Distribution Engineer "Sachiel" 📦 |
| `src/skills/` | Prompt Architect "Raziel" 🧠 | — |
| `src/tools/` | Core Runtime Engineer "Uriel" 🔧 | SDK Integration Specialist "Zadkiel" 🕵️ |
| `src/cli/shell/` | REPL & Shell Engineer "Sariel" 🖥️ | TUI Engineer "Sandalphon" 🖥️ |
| `src/cli/shell/components/` | TUI Engineer "Sandalphon" 🖥️ | REPL & Shell Engineer "Sariel" 🖥️ |
| `tests/acceptance/` | E2E Test Engineer "Jeremiel" 🧪 | Quality Test Engineer "Gabriel" 🧪 |
| `src/index.ts` | TypeScript Engineer "Jophiel" 👩‍💻 | Team Director "Metatron" 🏗️ |

## Routing Principles

1. **Eager by default** — spawn agents who could usefully start work, including anticipatory downstream work.
2. **Scribe always runs** after substantial work, always as `mode: "background"`. Never blocks.
3. **Quick facts → coordinator answers directly.** Don't spawn for trivial questions.
4. **Two agents could handle it** → pick the one whose domain is the primary concern.
5. **"Team, ..." → fan-out.** Spawn all relevant agents in parallel as `mode: "background"`.
6. **Anticipate downstream.** Feature being built? Spawn tester for test cases from requirements simultaneously.
7. **Doc-impact check → Developer Relations Lead.** Any PR touching user-facing code or behavior should involve doc-impact review.
