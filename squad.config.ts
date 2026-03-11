import {
  defineSquad,
  defineTeam,
  defineAgent,
  defineRouting,
  defineCasting,
} from '@bradygaster/squad-sdk';

/**
 * Squad Configuration — squad-sdk
 *
 * Converted from .squad/ markdown to SDK-first builder syntax.
 * Run `squad build` to regenerate .squad/*.md from this file.
 */
export default defineSquad({
  version: '1.0.0',

  team: defineTeam({
    name: 'squad-sdk',
    description: 'The programmable multi-agent runtime for GitHub Copilot.',
    projectContext:
      '- **Owner:** Brady\n' +
      '- **Stack:** TypeScript (strict mode, ESM-only), Node.js ≥20, @github/copilot-sdk, Vitest, esbuild\n' +
      '- **Description:** The programmable multi-agent runtime for GitHub Copilot — v1 replatform of Squad beta\n' +
      '- **Distribution:** npm (`npm install -g @bradygaster/squad-cli` for CLI, `npm install @bradygaster/squad-sdk` for SDK)\n' +
      '- **Created:** 2026-02-21',
    members: [
      'team-director', 'prompt-architect', 'core-runtime-engineer', 'quality-test-engineer', 'developer-relations-lead',
      'sdk-integration-specialist', 'typescript-engineer', 'release-manager', 'node-runtime-engineer',
      'distribution-engineer', 'security-compliance-engineer', 'visual-design-lead', 'vscode-extension-engineer',
      'observability-engineer', 'repl-shell-engineer', 'cli-ux-designer', 'tui-engineer', 'e2e-test-engineer',
      'accessibility-reviewer', 'product-dogfooder',
    ],
  }),

  agents: [
    defineAgent({ name: 'team-director', role: 'Team Director', description: 'Nickname: Metatron. Architects scope, delegation, and cross-agent execution.', status: 'active' }),
    defineAgent({ name: 'prompt-architect', role: 'Prompt Architect', description: 'Nickname: Raziel. Designs prompts, charters, and coordinator logic.', status: 'active' }),
    defineAgent({ name: 'core-runtime-engineer', role: 'Core Runtime Engineer', description: 'Nickname: Uriel. Implements and hardens runtime internals.', status: 'active' }),
    defineAgent({ name: 'quality-test-engineer', role: 'Quality Test Engineer', description: 'Nickname: Gabriel. Owns quality gates and test reliability.', status: 'active' }),
    defineAgent({ name: 'developer-relations-lead', role: 'Developer Relations Lead', description: 'Nickname: Raphael. Drives docs, messaging, and developer experience.', status: 'active' }),
    defineAgent({ name: 'sdk-integration-specialist', role: 'SDK Integration Specialist', description: 'Nickname: Zadkiel. Owns Copilot SDK integration patterns.', status: 'active' }),
    defineAgent({ name: 'typescript-engineer', role: 'TypeScript Engineer', description: 'Nickname: Jophiel. Enforces strong types and compiler health.', status: 'active' }),
    defineAgent({ name: 'release-manager', role: 'Release Manager', description: 'Nickname: Camael. Manages releases, versioning, and branch protection.', status: 'active' }),
    defineAgent({ name: 'node-runtime-engineer', role: 'Node.js Runtime Engineer', description: 'Nickname: Michael. Optimizes streaming, event loop, and async runtime behavior.', status: 'active' }),
    defineAgent({ name: 'distribution-engineer', role: 'Distribution Engineer', description: 'Nickname: Sachiel. Handles npm packaging and delivery flows.', status: 'active' }),
    defineAgent({ name: 'security-compliance-engineer', role: 'Security Compliance Engineer', description: 'Nickname: Cassiel. Owns hooks, PII controls, and compliance guardrails.', status: 'active' }),
    defineAgent({ name: 'visual-design-lead', role: 'Visual Design Lead', description: 'Nickname: Haniel. Owns logos, iconography, and visual design systems.', status: 'active' }),
    defineAgent({ name: 'vscode-extension-engineer', role: 'VS Code Extension Engineer', description: 'Nickname: Raguel. Builds extension APIs and editor integrations.', status: 'active' }),
    defineAgent({ name: 'observability-engineer', role: 'Observability Engineer', description: 'Nickname: Tzaphkiel. Leads telemetry, OTLP, and dashboard instrumentation.', status: 'active' }),
    defineAgent({ name: 'repl-shell-engineer', role: 'REPL & Shell Engineer', description: 'Nickname: Sariel. Builds interactive shell and session dispatch features.', status: 'active' }),
    defineAgent({ name: 'cli-ux-designer', role: 'CLI UX Designer', description: 'Nickname: Remiel. Designs command-line flows, copy, and affordances.', status: 'active' }),
    defineAgent({ name: 'tui-engineer', role: 'TUI Engineer', description: 'Nickname: Sandalphon. Implements terminal UI layout, input, and rendering.', status: 'active' }),
    defineAgent({ name: 'e2e-test-engineer', role: 'E2E Test Engineer', description: 'Nickname: Jeremiel. Owns end-to-end terminal harnesses and UX gate tests.', status: 'active' }),
    defineAgent({ name: 'accessibility-reviewer', role: 'Accessibility Reviewer', description: 'Nickname: Phanuel. Reviews keyboard UX, contrast, and discoverability.', status: 'active' }),
    defineAgent({ name: 'product-dogfooder', role: 'Product Dogfooder', description: 'Nickname: Anael. Stress-tests scenarios and finds edge-case regressions.', status: 'active' }),
  ],

  routing: defineRouting({
    rules: [
      { pattern: 'cross-agent-leadership', agents: ['@team-director'], description: 'Team-wide delegation strategy, owner alignment, escalation handling, dependency unblocking' },
      { pattern: 'external-intelligence', agents: ['@team-director'], description: 'Internet research orchestration, database query planning, evidence synthesis for specialists' },
      { pattern: 'core-runtime', agents: ['@core-runtime-engineer'], description: 'CopilotClient, adapter, session pool, tools module, spawn orchestration' },
      { pattern: 'prompt-architecture', agents: ['@prompt-architect'], description: 'Agent charters, spawn templates, coordinator logic, response tier selection' },
      { pattern: 'type-system', agents: ['@typescript-engineer'], description: 'Discriminated unions, generics, tsconfig, strict mode, declaration files' },
      { pattern: 'sdk-integration', agents: ['@sdk-integration-specialist'], description: '@github/copilot-sdk usage, CopilotSession lifecycle, event handling' },
      { pattern: 'runtime-performance', agents: ['@node-runtime-engineer'], description: 'Streaming, event loop health, session management, async iterators' },
      { pattern: 'testing', agents: ['@quality-test-engineer'], description: 'Test coverage, Vitest, edge cases, CI/CD, quality gates' },
      { pattern: 'documentation', agents: ['@developer-relations-lead'], description: 'README, API docs, getting-started, demos, tone review' },
      { pattern: 'architecture', agents: ['@team-director'], description: 'Product direction, architectural decisions, code review, scope' },
      { pattern: 'distribution', agents: ['@distribution-engineer'], description: 'npm packaging, esbuild config, global install, marketplace prep' },
      { pattern: 'git-releases', agents: ['@release-manager'], description: 'Semantic versioning, GitHub Releases, CI/CD, branch protection' },
      { pattern: 'security', agents: ['@security-compliance-engineer'], description: 'Hook design, PII filters, security review, compliance' },
      { pattern: 'visual-identity', agents: ['@visual-design-lead'], description: 'Logo, icons, brand assets, design system' },
      { pattern: 'observability', agents: ['@observability-engineer'], description: 'Aspire dashboard, OTLP integration, Playwright E2E, Docker telemetry' },
      { pattern: 'vscode-integration', agents: ['@vscode-extension-engineer'], description: 'VS Code Extension API, runSubagent compatibility' },
      { pattern: 'repl-shell', agents: ['@repl-shell-engineer'], description: 'Interactive shell, Ink components, session dispatch' },
      { pattern: 'cli-ux', agents: ['@cli-ux-designer'], description: 'Interaction design, copy, spacing, affordances, UX gates' },
      { pattern: 'tui', agents: ['@tui-engineer'], description: 'Ink components, layout, input handling, focus management' },
      { pattern: 'e2e-tests', agents: ['@e2e-test-engineer'], description: 'node-pty harness, Gherkin features, frame snapshots' },
      { pattern: 'accessibility', agents: ['@accessibility-reviewer'], description: 'Keyboard nav, color contrast, error guidance' },
      { pattern: 'hostile-qa', agents: ['@product-dogfooder'], description: 'Adversarial testing, edge cases, regression scenarios' },
    ],
    defaultAgent: '@team-director',
    fallback: 'coordinator',
  }),

  casting: defineCasting({
    allowlistUniverses: ['The Solomonic Demonology', 'Breaking Bad', 'The Wire', 'Firefly'],
    overflowStrategy: 'generic',
  }),
});
