/**
 * Human Journey E2E Test — "I want to talk to a specific agent"
 *
 * Covers the full user journey of directing messages to individual agents:
 * 1. @agentname routing
 * 2. Tab completion for agent names
 * 3. Unknown @agent feedback
 * 4. Multi-agent @mentions
 * 5. Agent response labeling
 * 6. /status shows active agent
 *
 * @see https://github.com/bradygaster/squad-pr/issues/394
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { rm } from 'node:fs/promises';
import React from 'react';
import { render, type RenderResponse } from 'ink-testing-library';
import { SessionRegistry } from '../packages/squad-cli/src/cli/shell/sessions.js';
import { ShellRenderer } from '../packages/squad-cli/src/cli/shell/render.js';
import { App, type ShellApi } from '../packages/squad-cli/src/cli/shell/components/App.js';
import { parseDispatchTargets, type ParsedInput } from '../packages/squad-cli/src/cli/shell/router.js';
import { createCompleter } from '../packages/squad-cli/src/cli/shell/autocomplete.js';

const h = React.createElement;

// ─── Test infrastructure (mirrors e2e-shell.test.ts) ────────────────────────

const TICK = 80;

function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

function tick(ms = TICK): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function scaffoldSquadDir(root: string): void {
  const squadDir = join(root, '.squad');
  const agentsDir = join(squadDir, 'agents');
  const identityDir = join(squadDir, 'identity');
  mkdirSync(agentsDir, { recursive: true });
  mkdirSync(identityDir, { recursive: true });

  writeFileSync(join(squadDir, 'team.md'), `# Squad Team — Journey Test

> A journey test project for agent routing.

## Members

| Name | Role | Charter | Status |
|------|------|---------|--------|
| Bael | Lead | \`.squad/agents/bael/charter.md\` | ✅ Active |
| Vassago | Core Dev | \`.squad/agents/vassago/charter.md\` | ✅ Active |
| Samigina | Designer | \`.squad/agents/samigina/charter.md\` | ✅ Active |
`);

  writeFileSync(join(identityDir, 'now.md'), `---
updated_at: 2025-01-01T00:00:00.000Z
focus_area: Journey testing
active_issues: []
---

# What We're Focused On

Journey testing for agent routing.
`);
}

interface ShellHarness {
  ink: RenderResponse;
  api: () => ShellApi;
  type: (text: string) => Promise<void>;
  submit: (text: string) => Promise<void>;
  frame: () => string;
  waitFor: (text: string, timeoutMs?: number) => Promise<void>;
  hasText: (text: string) => boolean;
  raw: (bytes: string) => void;
  dispatched: ReturnType<typeof vi.fn>;
  cancelled: ReturnType<typeof vi.fn>;
  registry: SessionRegistry;
  cleanup: () => Promise<void>;
}

async function createShellHarness(opts?: {
  agents?: Array<{ name: string; role: string }>;
  withSquadDir?: boolean;
  version?: string;
}): Promise<ShellHarness> {
  const {
    agents = [
      { name: 'Bael', role: 'Lead' },
      { name: 'Vassago', role: 'Core Dev' },
      { name: 'Samigina', role: 'Designer' },
    ],
    withSquadDir = true,
    version = '0.0.0-test',
  } = opts ?? {};

  const tempDir = mkdtempSync(join(tmpdir(), 'squad-journey-'));
  if (withSquadDir) scaffoldSquadDir(tempDir);

  const registry = new SessionRegistry();
  for (const a of agents) registry.register(a.name, a.role);

  const renderer = new ShellRenderer();
  const dispatched = vi.fn<(parsed: ParsedInput) => Promise<void>>().mockResolvedValue(undefined);
  const cancelled = vi.fn();

  let shellApi: ShellApi | undefined;
  const onReady = (api: ShellApi) => { shellApi = api; };

  const ink = render(
    h(App, {
      registry,
      renderer,
      teamRoot: tempDir,
      version,
      onReady,
      onDispatch: dispatched,
      onCancel: cancelled,
    })
  );

  await tick(120);

  const harness: ShellHarness = {
    ink,
    api: () => {
      if (!shellApi) throw new Error('ShellApi not ready — did the App mount?');
      return shellApi;
    },
    async type(text: string) {
      for (const ch of text) {
        ink.stdin.write(ch);
        await tick();
      }
    },
    async submit(text: string) {
      await harness.type(text);
      ink.stdin.write('\r');
      await tick(120);
    },
    frame() {
      return stripAnsi(ink.lastFrame() ?? '');
    },
    async waitFor(text: string, timeoutMs = 3000) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        if (harness.frame().includes(text)) return;
        await tick(50);
      }
      throw new Error(`Timed out waiting for "${text}" in frame:\n${harness.frame()}`);
    },
    hasText(text: string) {
      return harness.frame().includes(text);
    },
    raw(bytes: string) {
      ink.stdin.write(bytes);
    },
    dispatched,
    cancelled,
    registry,
    async cleanup() {
      ink.unmount();
      await rm(tempDir, { recursive: true, force: true });
    },
  };

  return harness;
}

// ═══════════════════════════════════════════════════════════════════════════
// Journey: "I want to talk to a specific agent"
// ═══════════════════════════════════════════════════════════════════════════

describe('Journey: Talk to a specific agent', () => {

  // ─── 1. @agentname routing ─────────────────────────────────────────────

  describe('@agent routing dispatches to the correct agent', () => {
    let shell: ShellHarness;

    beforeEach(async () => {
      vi.stubEnv('NO_COLOR', '1');
      Object.defineProperty(process.stdout, 'columns', { value: 120, configurable: true });
      shell = await createShellHarness();
    });

    afterEach(async () => {
      vi.unstubAllEnvs();
      await shell.cleanup();
    });

    it('@Bael message dispatches as direct_agent to Bael', async () => {
      await shell.submit('@Bael please review the PR');
      expect(shell.dispatched).toHaveBeenCalledTimes(1);
      const parsed = shell.dispatched.mock.calls[0]![0] as ParsedInput;
      expect(parsed.type).toBe('direct_agent');
      expect(parsed.agentName).toBe('Bael');
      expect(parsed.content).toBe('please review the PR');
    });

    it('@Vassago message dispatches as direct_agent to Vassago', async () => {
      await shell.submit('@Vassago write unit tests');
      expect(shell.dispatched).toHaveBeenCalledTimes(1);
      const parsed = shell.dispatched.mock.calls[0]![0] as ParsedInput;
      expect(parsed.type).toBe('direct_agent');
      expect(parsed.agentName).toBe('Vassago');
      expect(parsed.content).toBe('write unit tests');
    });

    it('@agent routing is case-insensitive', async () => {
      await shell.submit('@bael fix the build');
      expect(shell.dispatched).toHaveBeenCalledTimes(1);
      const parsed = shell.dispatched.mock.calls[0]![0] as ParsedInput;
      expect(parsed.type).toBe('direct_agent');
      expect(parsed.agentName).toBe('Bael');
    });

    it('@agent message appears in conversation history', async () => {
      await shell.submit('@Samigina design the landing page');
      expect(shell.hasText('@Samigina design the landing page')).toBe(true);
    });
  });

  // ─── 2. Tab completion suggests agent names ────────────────────────────

  describe('Tab completion suggests agent names after @', () => {
    it('completer returns matching agents for @B prefix', () => {
      const completer = createCompleter(['Bael', 'Vassago', 'Samigina']);
      const [matches] = completer('@B');
      expect(matches).toContain('@Bael ');
      expect(matches).not.toContain('@Vassago ');
    });

    it('completer returns all agents for bare @', () => {
      const completer = createCompleter(['Bael', 'Vassago', 'Samigina']);
      const [matches] = completer('@');
      expect(matches).toHaveLength(3);
      expect(matches).toContain('@Bael ');
      expect(matches).toContain('@Vassago ');
      expect(matches).toContain('@Samigina ');
    });

    it('completer is case-insensitive', () => {
      const completer = createCompleter(['Bael', 'Vassago']);
      const [matches] = completer('@v');
      expect(matches).toContain('@Vassago ');
    });

    it('completer returns empty for no match', () => {
      const completer = createCompleter(['Bael', 'Vassago']);
      const [matches] = completer('@Z');
      expect(matches).toHaveLength(0);
    });

    it('Tab key in shell replaces input with completed agent name', async () => {
      vi.stubEnv('NO_COLOR', '1');
      Object.defineProperty(process.stdout, 'columns', { value: 120, configurable: true });
      const shell = await createShellHarness();
      try {
        await shell.type('@B');
        // Send Tab key
        shell.raw('\t');
        await tick(120);
        expect(shell.hasText('@Bael')).toBe(true);
      } finally {
        vi.unstubAllEnvs();
        await shell.cleanup();
      }
    });
  });

  // ─── 3. Unknown @agent feedback ───────────────────────────────────────

  describe('Unknown @agent routes to coordinator', () => {
    let shell: ShellHarness;

    beforeEach(async () => {
      vi.stubEnv('NO_COLOR', '1');
      Object.defineProperty(process.stdout, 'columns', { value: 120, configurable: true });
      shell = await createShellHarness();
    });

    afterEach(async () => {
      vi.unstubAllEnvs();
      await shell.cleanup();
    });

    it('unknown @agent falls through to coordinator routing', async () => {
      await shell.submit('@Nobody do something');
      expect(shell.dispatched).toHaveBeenCalledTimes(1);
      const parsed = shell.dispatched.mock.calls[0]![0] as ParsedInput;
      expect(parsed.type).toBe('coordinator');
      expect(parsed.content).toBe('@Nobody do something');
    });

    it('message with unknown @agent still appears in conversation', async () => {
      await shell.submit('@Ghost help me');
      expect(shell.hasText('@Ghost help me')).toBe(true);
    });
  });

  // ─── 4. Multi-agent @mentions ──────────────────────────────────────────

  describe('Multi-agent @mentions via parseDispatchTargets', () => {
    const knownAgents = ['Bael', 'Vassago', 'Samigina'];

    it('extracts multiple known agents from message', () => {
      const result = parseDispatchTargets('@Vassago @Samigina fix and test', knownAgents);
      expect(result.agents).toEqual(['Vassago', 'Samigina']);
      expect(result.content).toBe('fix and test');
    });

    it('deduplicates repeated @mentions', () => {
      const result = parseDispatchTargets('@Bael @bael do it', knownAgents);
      expect(result.agents).toEqual(['Bael']);
      expect(result.content).toBe('do it');
    });

    it('ignores unknown agents in multi-mention', () => {
      const result = parseDispatchTargets('@Bael @Unknown @Vassago collaborate', knownAgents);
      expect(result.agents).toEqual(['Bael', 'Vassago']);
      expect(result.content).toBe('collaborate');
    });

    it('returns empty agents array for plain message', () => {
      const result = parseDispatchTargets('just a regular message', knownAgents);
      expect(result.agents).toEqual([]);
      expect(result.content).toBe('just a regular message');
    });

    it('handles all three agents mentioned', () => {
      const result = parseDispatchTargets('@Bael @Vassago @Samigina ship it', knownAgents);
      expect(result.agents).toEqual(['Bael', 'Vassago', 'Samigina']);
      expect(result.content).toBe('ship it');
    });
  });

  // ─── 5. Agent response is labeled with agent name ──────────────────────

  describe('Agent response is labeled with the agent name', () => {
    let shell: ShellHarness;

    beforeEach(async () => {
      vi.stubEnv('NO_COLOR', '1');
      Object.defineProperty(process.stdout, 'columns', { value: 120, configurable: true });
      shell = await createShellHarness();
    });

    afterEach(async () => {
      vi.unstubAllEnvs();
      await shell.cleanup();
    });

    it('agent response shows agent name label', async () => {
      await shell.submit('@Bael fix the build');
      shell.api().addMessage({
        role: 'agent',
        agentName: 'Bael',
        content: 'Build fixed! All tests passing.',
        timestamp: new Date(),
      });
      await tick(120);
      expect(shell.hasText('Bael:')).toBe(true);
      expect(shell.hasText('Build fixed! All tests passing.')).toBe(true);
    });

    it('different agents have distinct labels', async () => {
      shell.api().addMessage({
        role: 'agent',
        agentName: 'Bael',
        content: 'I reviewed the code.',
        timestamp: new Date(),
      });
      await tick(120);
      shell.api().addMessage({
        role: 'agent',
        agentName: 'Vassago',
        content: 'Tests are written.',
        timestamp: new Date(),
      });
      await tick(120);
      expect(shell.hasText('Bael:')).toBe(true);
      expect(shell.hasText('Vassago:')).toBe(true);
    });

    it('streaming content shows agent name', async () => {
      shell.api().setStreamingContent({
        agentName: 'Samigina',
        content: 'Working on the design...',
      });
      await tick(120);
      expect(shell.hasText('Samigina:')).toBe(true);
      expect(shell.hasText('Working on the design...')).toBe(true);
    });
  });

  // ─── 6. /status shows which agent is currently working ─────────────────

  describe('/status shows active agent', () => {
    let shell: ShellHarness;

    beforeEach(async () => {
      vi.stubEnv('NO_COLOR', '1');
      Object.defineProperty(process.stdout, 'columns', { value: 120, configurable: true });
      shell = await createShellHarness();
    });

    afterEach(async () => {
      vi.unstubAllEnvs();
      await shell.cleanup();
    });

    it('/status shows idle state when no agent is working', async () => {
      await shell.submit('/status');
      expect(shell.hasText('0 active')).toBe(true);
    });

    it('/status shows working agent after setting status', async () => {
      shell.registry.updateStatus('Bael', 'working');
      await shell.submit('/status');
      expect(shell.hasText('Working')).toBe(true);
      expect(shell.hasText('Bael')).toBe(true);
    });

    it('/status shows agent activity hint', async () => {
      shell.registry.updateStatus('Vassago', 'working');
      shell.registry.updateActivityHint('Vassago', 'writing tests');
      await shell.submit('/status');
      expect(shell.hasText('Vassago')).toBe(true);
      expect(shell.hasText('writing tests')).toBe(true);
    });

    it('/status reflects multiple active agents', async () => {
      shell.registry.updateStatus('Bael', 'working');
      shell.registry.updateStatus('Vassago', 'streaming');
      await shell.submit('/status');
      expect(shell.hasText('2 active')).toBe(true);
    });
  });
});
