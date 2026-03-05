# Decision: Builder type naming and collision avoidance

**By:** Edie (TypeScript Engineer)
**Date:** 2026-03-05
**Context:** SDK-First Squad Mode (#194 Phase 1)

## What

Builder types live in `packages/squad-sdk/src/builders/types.ts`. The barrel `src/types.ts` re-exports them with one rename: `RoutingRule` → `BuilderRoutingRule` to avoid collision with the existing `RoutingRule` export from `runtime/config.ts`.

## Why

Both `config/schema.ts` and `runtime/config.ts` already export a `RoutingRule` interface with different shapes. Adding a third from builders would be ambiguous. The `Builder` prefix makes the provenance explicit at the import site.

## Impact

- All agents importing builder types should use the `BuilderRoutingRule` name when accessing the builder-specific routing rule
- The `RoutingRule` unqualified import continues to resolve to `runtime/config.ts`'s version (the runtime contract)
- Builder types are all `readonly` — consumers cannot mutate config objects after validation
