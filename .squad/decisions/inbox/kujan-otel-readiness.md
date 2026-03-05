# OTel Readiness Assessment for Phase 3

**Assessor:** Kujan (SDK Expert)  
**Date:** 2026-03-05  
**Scope:** Runtime OTel modules in `packages/squad-sdk/src/runtime/`  
**Outcome:** 🟢 **READY FOR ACTIVATION** — All OTel modules compile and are production-ready.

---

## Executive Summary

All 8 OTel runtime modules are complete, type-safe, and ready for Phase 3 activation. The build passes with zero errors. The activation path is clear: call `initSquadTelemetry()` at startup, wire EventBus if available, and shutdown gracefully on exit. All infrastructure dependencies are already in `package.json` as optional dependencies—OTel overhead is zero for consumers who don't activate it.

---

## Module Assessment

### 1. **otel-init.ts** ✅ READY
**Status:** Complete  
**Compilation:** ✅ Pass  

**What it does:**
- High-level one-call setup for OTel telemetry
- Exports `initSquadTelemetry(options)` and `initAgentModeTelemetry(options)`
- Wires OTel providers + EventBus bridge + TelemetryTransport in one invocation

**Activation path:**
```ts
const telemetry = initSquadTelemetry({ endpoint: 'http://localhost:4318' });
// ... run squad ...
await telemetry.shutdown();
```

**Dependencies:**
- `@opentelemetry/api` (required dependency) ✅
- `otel.js` (low-level OTel)
- `otel-bridge.js` (mid-level bridge)
- `telemetry.js` (TelemetryCollector)

**Readiness:** 🟢 Complete, well-documented, no-op when disabled

---

### 2. **otel-metrics.ts** ✅ READY
**Status:** Complete  
**Compilation:** ✅ Pass  

**What it does:**
- Metrics facade with 4 metric groups (token usage, agent perf, session pool, response latency)
- Lazy-initializes metric instances on first use
- Provides 11 public recording functions for agent/session/response telemetry

**Activation path:**
```ts
import { recordAgentSpawn, recordAgentDuration } from 'squad-sdk/runtime/otel-metrics';
recordAgentSpawn('ralph', 'async');
recordAgentDuration('ralph', 1200, 'success');
```

**Dependencies:**
- `getMeter()` from otel.js ✅

**Readiness:** 🟢 Complete, metrics auto-no-op when OTel not initialized. Test reset function included.

---

### 3. **otel-bridge.ts** ✅ READY
**Status:** Complete  
**Compilation:** ✅ Pass  

**What it does:**
- Mid-level integration: converts TelemetryEvents → OTel spans
- Bridges EventBus events → OTel spans
- Provides `createOTelTransport()` and `bridgeEventBusToOTel()`

**Activation path:**
```ts
import { bridgeEventBusToOTel } from 'squad-sdk/runtime/otel-bridge';
const bus = new EventBus();
const detach = bridgeEventBusToOTel(bus);
// ... events become spans automatically ...
detach();
```

**Dependencies:**
- `@opentelemetry/api` (SpanStatusCode, getTracer) ✅
- `getTracer()` from otel.js ✅
- EventBus (event-bus.js) ✅

**Readiness:** 🟢 Complete, works standalone, no-op overlay approach

---

### 4. **event-bus.ts** ✅ READY
**Status:** Complete  
**Compilation:** ✅ Pass  

**What it does:**
- Cross-session pub/sub event aggregation bus
- Supports type-specific and wildcard subscriptions
- Error isolation: one handler failure doesn't crash others

**Activation path:**
```ts
const bus = new EventBus();
bus.subscribe('session:created', (event) => { ... });
await bus.emit({ type: 'session:created', sessionId: 'abc', ... });
```

**Dependencies:** None (pure TypeScript) ✅

**Readiness:** 🟢 Complete, stable API, comprehensive handler model

---

### 5. **squad-observer.ts** ✅ READY
**Status:** Complete  
**Compilation:** ✅ Pass  

**What it does:**
- File watcher for `.squad/` directory changes
- Auto-classifies files (agent, casting, config, decision, skill, unknown)
- Emits OTel spans and EventBus events on file changes
- Debounce logic prevents spam from rapid updates

**Activation path:**
```ts
const observer = new SquadObserver({
  squadDir: '/path/to/.squad',
  eventBus: myBus,
  debounceMs: 200,
});
observer.start();
// ... later ...
observer.stop();
```

**Dependencies:**
- `fs`, `path` (Node.js stdlib) ✅
- `@opentelemetry/api` (getTracer) ✅
- `EventBus` (event-bus.js) ✅

**Readiness:** 🟢 Complete, lightweight, no-op when no EventBus provided

---

### 6. **cost-tracker.ts** ✅ READY
**Status:** Complete  
**Compilation:** ✅ Pass  

**What it does:**
- Accumulates token/cost data across squad run
- Per-agent and per-session breakdowns
- Can wire to EventBus for live usage events
- Formatters for terminal output

**Activation path:**
```ts
const tracker = new CostTracker();
tracker.recordUsage({ sessionId: 'abc', agentName: 'ralph', ... });
console.log(tracker.formatSummary());
await telemetry.shutdown();
```

**Dependencies:** `EventBus` (optional) ✅

**Readiness:** 🟢 Complete, self-contained, no OTel dependencies

---

### 7. **event-payloads.ts** ✅ READY
**Status:** Complete  
**Compilation:** ✅ Pass  

**What it does:**
- TypeScript payload type map for all SquadEventType values
- Discriminated unions per event type
- Type guards and helper constructors

**Activation path:**
```ts
import { createSquadEvent, isSquadEventOfType } from 'squad-sdk/runtime/event-payloads';
const event = createSquadEvent('session:created', { agentName: 'ralph', priority: 'high' });
if (isSquadEventOfType(event, 'session:created')) { ... }
```

**Dependencies:** `event-bus.js` (SquadEventType, SquadEvent) ✅

**Readiness:** 🟢 Complete, compile-time type safety, helper functions included

---

### 8. **telemetry.ts** ✅ READY
**Status:** Complete  
**Compilation:** ✅ Pass  

**What it does:**
- Privacy-first opt-in TelemetryCollector
- Queues events in memory, flushes on explicit call
- Respects consent flag (disabled by default)
- Pluggable transport for custom backends

**Activation path:**
```ts
import { TelemetryCollector, setTelemetryTransport } from 'squad-sdk/runtime/telemetry';
setTelemetryTransport(createOTelTransport());
const telemetry = new TelemetryCollector({ enabled: true, endpoint: '...' });
telemetry.collectEvent({ name: 'squad.init' });
await telemetry.flush();
```

**Dependencies:** None (pure TypeScript) ✅

**Readiness:** 🟢 Complete, zero overhead when disabled

---

## Dependency Matrix

### Build-Time (package.json)

```json
"dependencies": {
  "@github/copilot-sdk": "^0.1.29",
  "@opentelemetry/api": "^1.9.0"              ← REQUIRED for getTracer, getMeter
},
"optionalDependencies": {
  "@opentelemetry/exporter-trace-otlp-grpc": "^0.57.2",
  "@opentelemetry/exporter-metrics-otlp-grpc": "^0.57.2",
  "@opentelemetry/sdk-node": "^0.57.2",
  "@opentelemetry/sdk-metrics": "^1.30.0",
  "@opentelemetry/sdk-trace-base": "^1.30.0",
  "@opentelemetry/sdk-trace-node": "^1.30.0",
  "@opentelemetry/resources": "^1.30.0",
  "@opentelemetry/semantic-conventions": "^1.28.0",
  "ws": "^8.18.0"                             ← For OTel gRPC transport
}
```

**Status:** ✅ All OTel packages present, SDK packages correctly marked as optional

### Runtime

- **EventBus:** Central aggregation point for all events
- **OTel API:** Low-overhead instrumentation surface
- **OTel SDK (optional):** Only loaded if explicitly initialized
- **Exporter (optional):** Only loaded if endpoint is configured

---

## Compilation Status

```
✅ Build passed: npm run build
✅ TypeScript strict mode: No errors
✅ No dead code warnings
✅ All imports resolve correctly
✅ No missing type definitions
```

---

## Activation Readiness by Phase

### Phase 3 Activation Checklist

- ✅ **Low-level API** (`otel.js`): Tracer/Meter getters, SDK lifecycle
- ✅ **Mid-level API** (`otel-bridge.js`): EventBus → OTel span mapping
- ✅ **High-level API** (`otel-init.ts`): One-call setup with options
- ✅ **Event infrastructure** (`event-bus.ts`, `event-payloads.ts`): Typed, cross-session events
- ✅ **Observer** (`squad-observer.ts`): .squad/ file change detection
- ✅ **Cost tracking** (`cost-tracker.ts`): Token/cost aggregation
- ✅ **Telemetry base** (`telemetry.ts`): Transport-agnostic event collection
- ✅ **Metrics** (`otel-metrics.ts`): 11 metric recording functions
- ✅ **Package exports** (`package.json`): All runtime modules exported

---

## Integration Points for Phase 3

### Recommended activation sequence:

1. **Coordinator startup** (in `coordinator/index.ts`):
   ```ts
   const telemetry = initSquadTelemetry({ eventBus: coordinator.eventBus });
   ```

2. **SquadClientWithPool** (in `client/pool.ts`):
   ```ts
   recordSessionCreated();
   recordAgentSpawn(agentName, mode);
   // ... on completion ...
   recordAgentDuration(agentName, durationMs, status);
   recordSessionClosed();
   ```

3. **Session event dispatch** (in `adapter/session-adapter.ts`):
   ```ts
   await eventBus.emit({ type: 'session:created', sessionId: id, ... });
   ```

4. **Coordinator shutdown** (graceful):
   ```ts
   await telemetry.shutdown();
   ```

---

## Risk Assessment

### 🟢 Low Risk
- All modules compile cleanly
- Zero breaking changes to existing APIs
- Opt-in activation (no impact on non-OTel consumers)
- Optional dependencies prevent bloat
- Type-safe event contracts

### ⚠️ Considerations for Activation
- **OTel exporter endpoints:** Must be configured explicitly or via `OTEL_EXPORTER_OTLP_ENDPOINT` env var
- **Handler isolation:** EventBus handlers can throw; errors are isolated but logged to console if no error handler registered
- **File watcher:** `squad-observer.ts` uses `fs.watch()` which is platform-specific (✅ Windows support included)

---

## Conclusion

All 8 OTel modules are **production-ready** for Phase 3 activation. They compile cleanly, have no missing dependencies, follow Squad SDK patterns, and integrate naturally with EventBus and the existing telemetry pipeline.

**Recommendation:** Proceed with Phase 3 integration. Activate by calling `initSquadTelemetry()` at coordinator startup and call `shutdown()` on graceful exit.
