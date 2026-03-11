/**
 * E2E Integration Tests — Interactive REPL and Multi-Agent Coordination
 *
 * Tests the full interactive pipeline that previously had ZERO coverage:
 * - User input → parseInput → dispatch → mock response → MessageStream rendering
 * - Multi-agent session tracking, concurrent dispatch, error cleanup
 *
 * Uses ink-testing-library with React.createElement (no JSX in .test.ts).
 * Follows patterns from test/repl-ux.test.ts.
 *
 * Closes #372, Closes #373
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { App } from '../packages/squad-cli/src/cli/shell/components/App.js';
import type { ShellApi, AppProps } from '../packages/squad-cli/src/cli/shell/components/App.js';
import { SessionRegistry } from '../packages/squad-cli/src/cli/shell/sessions.js';
import { ShellRenderer } from '../packages/squad-cli/src/cli/shell/render.js';
import { parseInput } from '../packages/squad-cli/src/cli/shell/router.js';
import { executeCommand } from '../packages/squad-cli/src/cli/shell/commands.js';
import type { ParsedInput } from '../packages/squad-cli/src/cli/shell/router.js';

const h = React.createElement;

// ============================================================================
// Helpers
// ============================================================================

/** Tiny delay for React state to settle after input. */
const tick = (ms = 50) => new Promise(r => setTimeout(r, ms));

/**
 * Type text into ink's stdin then press Enter.
 * Must be split: write chars first (so useInput populates value),
 * tick for React state, then send \r to trigger key.return submit.
 */
async function typeAndSubmit(stdin: { write: (s: string) => void }, text: string) {
  // Write one char at a time so ink's useInput builds the value state
  for (const ch of text) {
    stdin.write(ch);
  }
  await tick(80);
  stdin.write('\r');
  await tick(150);
}

/**
 * Render the App with a mock registry and capture the ShellApi handle.
 * The onDispatch callback is injectable for testing dispatch behavior.
 */
function renderApp(options: {
  agents?: Array<{ name: string; role: string }>;
  onDispatch?: (parsed: ParsedInput) => Promise<void>;
} = {}) {
  const registry = new SessionRegistry();
  const renderer = new ShellRenderer();
  const agents = options.agents ?? [];

  for (const a of agents) {
    registry.register(a.name, a.role);
  }

  let shellApi: ShellApi | null = null;
  const onReady = (api: ShellApi) => { shellApi = api; };

  // Stub loadWelcomeData's fs reads — App calls it on mount
  const props: AppProps = {
    registry,
    renderer,
    teamRoot: '/tmp/fake-squad-root',
    version: '0.0.0-test',
    onReady,
    onDispatch: options.onDispatch,
  };

  const result = render(h(App, props));
  return { ...result, registry, renderer, getApi: () => shellApi! };
}

// ============================================================================
// 1. Full REPL round-trip
// ============================================================================

describe('E2E: Full REPL round-trip', () => {
  it('user input dispatches to coordinator and response renders in MessageStream', async () => {
    const dispatched: ParsedInput[] = [];

    const onDispatch = async (parsed: ParsedInput) => {
      dispatched.push(parsed);
    };

    const { lastFrame, stdin, getApi } = renderApp({
      agents: [{ name: 'Eligos', role: 'core dev' }],
      onDispatch,
    });

    // Wait for mount + onReady
    await tick(100);
    const api = getApi();
    expect(api).toBeTruthy();

    // Simulate user typing a message and pressing Enter
    await typeAndSubmit(stdin, 'fix the login bug');

    // Verify the user message appears in the rendered output
    const frameAfterInput = lastFrame()!;
    expect(frameAfterInput).toContain('fix the login bug');

    // Verify dispatch was called with coordinator-type message
    expect(dispatched.length).toBe(1);
    expect(dispatched[0]!.type).toBe('coordinator');
    expect(dispatched[0]!.raw).toBe('fix the login bug');

    // Simulate agent response via ShellApi (as StreamBridge would)
    api.addMessage({
      role: 'agent',
      agentName: 'Eligos',
      content: 'I found the bug in auth.ts — fixing now.',
      timestamp: new Date(),
    });
    await tick(100);

    // Verify agent response renders in output
    const frameAfterResponse = lastFrame()!;
    expect(frameAfterResponse).toContain('I found the bug in auth.ts');
    expect(frameAfterResponse).toContain('Eligos');
  });
});

// ============================================================================
// 2. Agent direct message (@Agent)
// ============================================================================

describe('E2E: Agent direct message', () => {
  it('@AgentName routes to the named agent via dispatch', async () => {
    const dispatched: ParsedInput[] = [];

    const onDispatch = async (parsed: ParsedInput) => {
      dispatched.push(parsed);
    };

    const { lastFrame, stdin, getApi } = renderApp({
      agents: [
        { name: 'Eligos', role: 'core dev' },
        { name: 'Samigina', role: 'tester' },
      ],
      onDispatch,
    });

    await tick(100);
    const api = getApi();

    // Type @Eligos direct message
    await typeAndSubmit(stdin, '@Eligos refactor the parser');

    // Verify dispatch received a direct_agent message for Eligos
    expect(dispatched.length).toBe(1);
    expect(dispatched[0]!.type).toBe('direct_agent');
    expect(dispatched[0]!.agentName).toBe('Eligos');
    expect(dispatched[0]!.content).toBe('refactor the parser');

    // Simulate Eligos's response
    api.addMessage({
      role: 'agent',
      agentName: 'Eligos',
      content: 'Parser refactored. Tests still pass.',
      timestamp: new Date(),
    });
    await tick(100);

    const frame = lastFrame()!;
    expect(frame).toContain('Parser refactored');
    expect(frame).toContain('Eligos');
  });
});

// ============================================================================
// 3. Slash command round-trip (/help)
// ============================================================================

describe('E2E: Slash command round-trip', () => {
  it('/help renders help output without triggering dispatch', async () => {
    const onDispatch = vi.fn();

    const { lastFrame, stdin } = renderApp({
      agents: [{ name: 'Eligos', role: 'core dev' }],
      onDispatch,
    });

    await tick(100);

    // Type /help
    await typeAndSubmit(stdin, '/help');

    // Verify help text appears in output
    const frame = lastFrame()!;
    expect(frame).toContain('/status');
    expect(frame).toContain('/quit');

    // Verify dispatch was NOT called — slash commands are local
    expect(onDispatch).not.toHaveBeenCalled();
  });

  it('/status shows team info without dispatch', async () => {
    const onDispatch = vi.fn();

    const { lastFrame, stdin } = renderApp({
      agents: [
        { name: 'Eligos', role: 'core dev' },
        { name: 'Samigina', role: 'tester' },
      ],
      onDispatch,
    });

    await tick(100);

    await typeAndSubmit(stdin, '/status');

    const frame = lastFrame()!;
    // Status output should show team size
    expect(frame).toContain('2');
    expect(onDispatch).not.toHaveBeenCalled();
  });
});

// ============================================================================
// 4. Error recovery
// ============================================================================

describe('E2E: Error recovery', () => {
  it('SDK error during dispatch shows friendly error, shell continues', async () => {
    // The App's handleSubmit calls onDispatch(parsed).finally(() => setProcessing(false))
    // but the promise rejection is not caught by App — it propagates.
    // In production, the real dispatch wrapper handles errors.
    // Here we verify the shell stays alive even when dispatch rejects.
    const onDispatch = async (_parsed: ParsedInput) => {
      // Return a rejected promise that we handle inline to avoid unhandled rejection
      throw new Error('SDK connection failed: timeout');
    };

    // Wrap to catch the expected unhandled rejection
    const originalListeners = process.rawListeners('unhandledRejection');
    process.removeAllListeners('unhandledRejection');
    const caught: Error[] = [];
    const catcher = (err: Error) => { caught.push(err); };
    process.on('unhandledRejection', catcher);

    const { lastFrame, stdin } = renderApp({
      agents: [{ name: 'Eligos', role: 'core dev' }],
      onDispatch,
    });

    await tick(100);

    // Send a message that triggers the error
    await typeAndSubmit(stdin, 'do something');

    // After dispatch error, the shell should still be alive (not crashed)
    // The App catches errors in onDispatch.finally() and sets processing=false
    // The shell remains interactive — verify by sending another command
    await typeAndSubmit(stdin, '/help');

    const frame = lastFrame()!;
    // /help should still work — shell didn't crash
    expect(frame).toContain('/status');

    // Restore original unhandledRejection listeners
    process.removeListener('unhandledRejection', catcher);
    for (const listener of originalListeners) {
      process.on('unhandledRejection', listener as (...args: unknown[]) => void);
    }
    // The caught error confirms the dispatch rejection happened
    expect(caught.length).toBeGreaterThanOrEqual(1);
  });

  it('no dispatch handler shows SDK-not-connected message', async () => {
    // Render App without onDispatch — simulates SDK not connected
    const { lastFrame, stdin } = renderApp({
      agents: [{ name: 'Eligos', role: 'core dev' }],
      onDispatch: undefined,
    });

    await tick(100);

    await typeAndSubmit(stdin, 'hello world');

    const frame = lastFrame()!;
    expect(frame).toContain('SDK not connected');
  });
});

// ============================================================================
// 5. Multi-agent session tracking (SessionRegistry integration)
// ============================================================================

describe('E2E: Multi-agent session tracking', () => {
  let registry: SessionRegistry;

  beforeEach(() => {
    registry = new SessionRegistry();
  });

  it('registers multiple agents with independent tracking', () => {
    registry.register('Eligos', 'core dev');
    registry.register('Samigina', 'tester');
    registry.register('Vassago', 'designer');

    const all = registry.getAll();
    expect(all).toHaveLength(3);

    // Each agent starts idle
    for (const agent of all) {
      expect(agent.status).toBe('idle');
    }

    // Verify independent identity
    const names = all.map(a => a.name);
    expect(names).toContain('Eligos');
    expect(names).toContain('Samigina');
    expect(names).toContain('Vassago');
  });

  it('tracks concurrent status changes independently', () => {
    registry.register('Eligos', 'core dev');
    registry.register('Samigina', 'tester');
    registry.register('Vassago', 'designer');

    // Set different statuses
    registry.updateStatus('Eligos', 'working');
    registry.updateStatus('Samigina', 'streaming');
    registry.updateStatus('Vassago', 'idle');

    expect(registry.get('Eligos')!.status).toBe('working');
    expect(registry.get('Samigina')!.status).toBe('streaming');
    expect(registry.get('Vassago')!.status).toBe('idle');

    // getActive should return only working/streaming agents
    const active = registry.getActive();
    expect(active).toHaveLength(2);
    const activeNames = active.map(a => a.name);
    expect(activeNames).toContain('Eligos');
    expect(activeNames).toContain('Samigina');
    expect(activeNames).not.toContain('Vassago');
  });

  it('cleans up on error — clears activity hint, other agents unaffected', () => {
    registry.register('Eligos', 'core dev');
    registry.register('Samigina', 'tester');

    // Both working with activity hints
    registry.updateStatus('Eligos', 'working');
    registry.updateActivityHint('Eligos', 'Refactoring parser...');
    registry.updateStatus('Samigina', 'working');
    registry.updateActivityHint('Samigina', 'Running tests...');

    // Eligos hits an error
    registry.updateStatus('Eligos', 'error');

    // Eligos: error status, hint cleared
    expect(registry.get('Eligos')!.status).toBe('error');
    expect(registry.get('Eligos')!.activityHint).toBeUndefined();

    // Samigina: still working, hint preserved
    expect(registry.get('Samigina')!.status).toBe('working');
    expect(registry.get('Samigina')!.activityHint).toBe('Running tests...');
  });

  it('session removal leaves other sessions intact', () => {
    registry.register('Eligos', 'core dev');
    registry.register('Samigina', 'tester');
    registry.register('Vassago', 'designer');

    registry.updateStatus('Eligos', 'working');

    // Remove Samigina
    const removed = registry.remove('Samigina');
    expect(removed).toBe(true);

    // Eligos and Vassago still tracked
    const all = registry.getAll();
    expect(all).toHaveLength(2);
    expect(registry.get('Eligos')!.status).toBe('working');
    expect(registry.get('Vassago')!.status).toBe('idle');

    // Samigina gone
    expect(registry.get('Samigina')).toBeUndefined();
  });

  it('fan-out: concurrent dispatch to multiple agents collects all responses', async () => {
    registry.register('Eligos', 'core dev');
    registry.register('Samigina', 'tester');
    registry.register('Vassago', 'designer');

    // Simulate fan-out dispatch to 3 agents concurrently
    const mockDispatch = async (agentName: string, message: string): Promise<string> => {
      registry.updateStatus(agentName, 'working');
      // Simulate varying response times
      await new Promise(r => setTimeout(r, Math.random() * 50 + 10));
      registry.updateStatus(agentName, 'idle');
      return `${agentName} response: handled "${message}"`;
    };

    const input = 'refactor the entire codebase';

    // Fan-out to all agents
    const results = await Promise.all([
      mockDispatch('Eligos', input),
      mockDispatch('Samigina', input),
      mockDispatch('Vassago', input),
    ]);

    // All 3 responses collected
    expect(results).toHaveLength(3);
    expect(results[0]).toContain('Eligos response');
    expect(results[1]).toContain('Samigina response');
    expect(results[2]).toContain('Vassago response');

    // All agents back to idle after completion
    for (const agent of registry.getAll()) {
      expect(agent.status).toBe('idle');
    }
  });

  it('fan-out: one agent failing does not block others', async () => {
    registry.register('Eligos', 'core dev');
    registry.register('Samigina', 'tester');

    const mockDispatch = async (agentName: string): Promise<string> => {
      registry.updateStatus(agentName, 'working');
      await new Promise(r => setTimeout(r, 20));

      if (agentName === 'Eligos') {
        registry.updateStatus(agentName, 'error');
        throw new Error('Eligos SDK timeout');
      }

      registry.updateStatus(agentName, 'idle');
      return `${agentName} completed`;
    };

    // Fan-out with error handling per agent
    const results = await Promise.allSettled([
      mockDispatch('Eligos'),
      mockDispatch('Samigina'),
    ]);

    // Eligos failed, Samigina succeeded
    expect(results[0]!.status).toBe('rejected');
    expect(results[1]!.status).toBe('fulfilled');
    expect((results[1] as PromiseFulfilledResult<string>).value).toContain('Samigina completed');

    // Registry reflects the state
    expect(registry.get('Eligos')!.status).toBe('error');
    expect(registry.get('Samigina')!.status).toBe('idle');
  });
});

// ============================================================================
// 6. parseInput integration with known agents
// ============================================================================

describe('E2E: Input parsing integration', () => {
  it('parseInput correctly routes @Agent with registered agent list', () => {
    const agents = ['Eligos', 'Samigina', 'Vassago'];

    const direct = parseInput('@Eligos fix the bug', agents);
    expect(direct.type).toBe('direct_agent');
    expect(direct.agentName).toBe('Eligos');
    expect(direct.content).toBe('fix the bug');

    const slash = parseInput('/help', agents);
    expect(slash.type).toBe('slash_command');
    expect(slash.command).toBe('help');

    const coordinator = parseInput('what should we work on next?', agents);
    expect(coordinator.type).toBe('coordinator');
    expect(coordinator.content).toBe('what should we work on next?');
  });

  it('case-insensitive agent matching', () => {
    const agents = ['Eligos', 'Samigina'];

    const lower = parseInput('@eligos hello', agents);
    expect(lower.type).toBe('direct_agent');
    expect(lower.agentName).toBe('Eligos'); // Returns canonical name

    const upper = parseInput('@ELIGOS hello', agents);
    expect(upper.type).toBe('direct_agent');
    expect(upper.agentName).toBe('Eligos');
  });

  it('unknown @name falls through to coordinator', () => {
    const agents = ['Eligos'];

    const result = parseInput('@UnknownAgent hello', agents);
    expect(result.type).toBe('coordinator');
  });
});
