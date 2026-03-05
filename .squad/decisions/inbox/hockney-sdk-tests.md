# Decision: SDK builder tests use contract-first stubs

**By:** Hockney (Tester)
**Date:** 2026-07-18
**Context:** Issue #194 Phase 1

## Decision

Builder function tests (`test/builders.test.ts`) and build command tests (`test/build-command.test.ts`) use **inline stubs** that implement the PRD contract for `defineTeam()`, `defineAgent()`, `defineRouting()`, `defineCeremony()`, `defineHooks()`, `defineCasting()`, `defineTelemetry()`, and the build pipeline.

## Why

Edie (builders) and Fenster (build command) are implementing in parallel. Writing tests first with stubs means:
1. Tests are green today and serve as acceptance criteria
2. When real implementations land, swap the import and tests become integration tests
3. The PRD contract (generated header, protected files, exit codes) is codified in executable form

## Action Required

When Edie ships `packages/squad-sdk/src/builders/index.ts` and Fenster ships `packages/squad-cli/src/cli/commands/build.ts`:
- Replace inline stubs in both test files with real imports (comments mark exact locations)
- Any test failures indicate the implementation doesn't match the PRD contract
