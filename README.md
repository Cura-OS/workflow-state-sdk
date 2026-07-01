# @curaos/workflow-state-sdk

Typed entity-lifecycle state machines on [XState v5](https://stately.ai/docs) (MIT).
Wraps `createMachine`/`createActor` behind a plain `states` + `transitions`
config so any service can model an entity lifecycle (Order
draft->submitted->approved->fulfilled, a clinical encounter's status, a
subscription's active/paused/cancelled, ...) without hand-rolled `switch`
statements or touching XState's API directly.

Scope: standalone runtime helper only. Generating this config FROM a `.tsp`
state/transition annotation is a separate follow-up - no such TypeSpec
decorator convention exists in this codebase yet (checked: only plain `enum`
status fields with prose lifecycle comments, e.g. `PluginStatus`,
`InvoiceStatus`). See `tools/codegen/curaos_generator_evolution_rule.md`.

## Surface

```ts
import { createLifecycle } from '@curaos/workflow-state-sdk';

type OrderState = 'draft' | 'submitted' | 'approved' | 'fulfilled' | 'rejected';
type OrderEvent = 'submit' | 'approve' | 'reject' | 'fulfill';

const order = createLifecycle<OrderState, OrderEvent>({
  initial: 'draft',
  states: {
    draft: { submit: 'submitted' },
    submitted: { approve: 'approved', reject: 'rejected' },
    approved: { fulfill: 'fulfilled' },
    fulfilled: {},
    rejected: {},
  },
});

order.state;              // 'draft'
order.can('submit');      // true
order.send('submit');     // { accepted: true, state: 'submitted' }
order.send('submit');     // { accepted: false, state: 'submitted' } - not declared, rejected
order.stop();
```

Invalid transitions (an event not declared for the current state) are
rejected: the actor stays put and `send()` reports `accepted: false`.
