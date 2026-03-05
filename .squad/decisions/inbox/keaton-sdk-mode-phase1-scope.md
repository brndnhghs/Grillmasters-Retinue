# Decision: SDK-First Squad Mode — Phase 1 Scope for v0.8.21

**Author:** Keaton (Lead)
**Date:** 2026-03-05
**Issue:** #194
**Requested by:** Brady

## Context

Issue #194 is a 4-phase PRD for "SDK-First Squad Mode" — TypeScript-based team definitions with telemetry, type safety, and programmatic routing. Brady wants Phase 1 in tonight's v0.8.21 release. Brady's comment on the issue adds critical constraints:

1. **Markdown stays the source of truth** — the TS layer reads FROM markdown, not the other way around
2. **Users should never have to run `squad build`** — build must be transparent/automatic
3. **`--preserve-markdown` is wrong framing** — markdown IS the source, TS is a facade
4. **Agent TS should be a programmatic interface** — instances backed by markdown on disk

These constraints reshape the PRD significantly. The original PRD envisions TS → markdown generation. Brady wants markdown → TS facade. This is an inversion: the bridge reads markdown, not writes it.

## What Already Exists

### In `packages/squad-sdk/src/config/schema.ts`:
- `SquadConfig` interface (team, routing, models, agents, hooks, ceremonies, plugins)
- `defineConfig(config: Partial<SquadConfig>): SquadConfig` — shallow merge with defaults
- `validateConfig(config: unknown): config is SquadConfig` — basic runtime validation
- Types: `TeamConfig`, `AgentConfig`, `RoutingConfig`, `RoutingRule`, `ModelConfig`, `HooksConfig`, `CeremonyConfig`

### In `packages/squad-sdk/src/runtime/config.ts`:
- **Different, richer** `SquadConfig` interface (models, routing, casting, agentSources, mcp, platforms)
- `loadConfig()` — async config loader that finds and imports `squad.config.ts/js/json`
- `discoverConfigFile()` — walks directory tree for config files
- `validateConfig()` — more thorough validation
- Types: `ModelSelectionConfig`, `RoutingRule` (with workType, not pattern), `CastingPolicy`, `PlatformOverrides`

### In `squad.config.ts` (project root):
- Uses `SquadConfig` from `@bradygaster/squad` (the runtime/config.ts version)
- Already has routing rules, model fallback chains, casting, platform overrides
- Proves the pattern works for project-level config

### In `packages/squad-sdk/src/runtime/`:
- `otel-init.ts`, `otel-metrics.ts`, `otel-bridge.ts` — dead code in markdown mode
- `event-bus.ts` — fully typed pub/sub with lifecycle events
- `squad-observer.ts`, `cost-tracker.ts` — ready but unactivated

### Type Divergence Problem:
There are **two competing `SquadConfig` types** — `config/schema.ts` (simpler, PRD-style) and `runtime/config.ts` (richer, battle-tested). The runtime version is what `squad.config.ts` actually uses. Phase 1 must reconcile, not add a third.

## Phase 1: What's Achievable Tonight (v0.8.21)

### Minimum Viable Deliverables

**1. Builder functions in `squad-sdk`** (new file: `packages/squad-sdk/src/builders/index.ts`)

Create ergonomic builder wrappers that delegate to existing types:

```typescript
export function defineTeam(config: TeamConfig): TeamConfig
export function defineAgent(config: AgentConfig): AgentConfig
export function defineRouting(config: RoutingConfig): RoutingConfig
export function defineCeremony(config: CeremonyConfig): CeremonyConfig
export function defineHooks(config: HooksConfig): HooksConfig
```

These are identity functions with validation — they exist for type safety at the call site and to enable future middleware (telemetry hooks, build-time transforms). They are NOT the same as `defineConfig()` which already exists for top-level config.

Implementation note: Use the `runtime/config.ts` types (the richer set), NOT the `config/schema.ts` types. The schema.ts types are a simpler, older design that doesn't match what `squad.config.ts` actually uses.

**2. `squad build` CLI command** (in `packages/squad-cli/src/cli-entry.ts`)

Add `build` to the CLI command router. Phase 1 scope:

- `squad build` — validates `squad.config.ts` by loading it, runs type checking, reports errors
- `squad build --check` — validation only, no file writes (CI mode)
- `squad build --dry-run` — show what would be generated without writing

Phase 1 does NOT generate markdown from TS. Per Brady's directive, markdown is the source of truth. Phase 1 `squad build` validates that the typed config is consistent with existing `.squad/` markdown. This is the "check" direction, not the "generate" direction.

**3. Export builders from SDK public API**

Add builders to `packages/squad-sdk/src/index.ts` barrel exports so `squad.config.ts` can use them:

```typescript
export { defineTeam, defineAgent, defineRouting, defineCeremony, defineHooks } from './builders/index.js';
```

**4. Reconcile `SquadConfig` types**

Deprecate `config/schema.ts`'s `SquadConfig` in favor of `runtime/config.ts`'s version. Add `@deprecated` JSDoc to schema.ts types. Don't delete — just mark and redirect.

### Stretch Goal (if time permits)

**5. `squad build` markdown generation** — generate `.squad/team.md` and `.squad/routing.md` from typed config, with `<!-- generated by squad build -->` headers. But ONLY for files that don't already exist as hand-written markdown. Respects Brady's "markdown is source of truth" rule: if markdown exists, build validates against it; if markdown is missing, build can generate starter files.

## What We Explicitly Do NOT Ship Tonight

### Phase 2 (defer): `squad init --sdk`
- Scaffolding `squad/` directory with `.ts` files
- Template system (minimal, full, monorepo)
- `tsconfig.json` generation
- Reason: Can't scaffold well until we've validated the builder API works in practice

### Phase 3 (defer): `squad run` with SDK runtime
- Telemetry activation via SDK-owned runtime loop
- EventBus integration with `SquadObserver`
- OTel pipeline activation
- Reason: This is the biggest architectural change — SDK owning the runtime instead of Copilot CLI. Needs a spike first. The runtime modules exist but have never been activated. Risk is high.

### Phase 4 (defer): `squad migrate --to-sdk`
- Markdown → TypeScript conversion
- Round-trip fidelity validation
- Reason: Depends on Phase 1-2 being stable

### Also Deferring:
- Zod schemas (PRD mentions Zod validation — we don't use Zod today, adding it is scope creep)
- `--watch` mode for `squad build` (nice-to-have, not v0.8.21)
- Coordinator prompt changes for SDK mode detection (Verbal already filed a decision for this — let it land separately)
- Per-agent cost tracking in UI (Brady loves this idea but it's Phase 3 telemetry work)

## Architectural Guidance

### Brady's "Markdown as Source of Truth" Principle

The PRD envisions TS → markdown (generate). Brady wants markdown → TS facade (read). These are not contradictory — they're two directions of the same bridge:

- **Tonight (Phase 1):** TS config validates against markdown. `squad build --check` ensures consistency.
- **Later (Phase 2+):** For NEW projects, TS can generate initial markdown. For EXISTING projects, TS reads from markdown. The `squad build` bridge is bidirectional — but markdown always wins conflicts.

### Type Unification Strategy

1. `runtime/config.ts` `SquadConfig` is the canonical type (it's what `squad.config.ts` uses today)
2. `config/schema.ts` `SquadConfig` gets deprecated with `@deprecated` and a pointer to runtime/config.ts
3. Builder functions use runtime/config.ts types
4. Future: merge the two files once all consumers are migrated

### Builder Function Design

Builders should be:
- **Pure functions** — no side effects, no file I/O
- **Validation-included** — throw on invalid input with clear error messages
- **Composable** — `defineTeam()` output feeds into `defineConfig()`
- **Future-proof** — accept options object for forward-compatible extension

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Two SquadConfig types cause confusion | High | Medium | Deprecation + clear JSDoc |
| `squad build` scope creeps into generation | Medium | High | Hard boundary: Phase 1 is validation only |
| Builder functions feel trivial | Low | Low | They're the foundation — middleware comes in Phase 2 |
| Runtime config types are too complex for builders | Medium | Medium | Builders wrap subsets, not the full config |

## Success Criteria for v0.8.21

1. ✅ `defineTeam()`, `defineAgent()`, `defineRouting()`, `defineCeremony()`, `defineHooks()` exported from `@bradygaster/squad-sdk`
2. ✅ `squad build --check` validates config and reports errors
3. ✅ All existing tests pass (no regressions)
4. ✅ `squad.config.ts` at project root can use builder functions
5. ✅ Schema.ts types marked deprecated with migration path documented

## Verdict

Ship builder functions + `squad build --check` tonight. This is the foundation that makes Phase 2-4 possible without rework. The builder API is the contract — get it right now, build on it later.
