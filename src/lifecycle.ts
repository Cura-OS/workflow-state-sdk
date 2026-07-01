import { createActor, createMachine } from 'xstate';
import type { LifecycleActor, LifecycleConfig, TransitionResult } from './types';

/**
 * Build a ready-to-use entity-lifecycle actor from a plain states+transitions
 * config. Wraps XState v5 createMachine/createActor so a service can model an
 * Order/Encounter/Contract lifecycle without touching XState's API directly.
 *
 * Invalid transitions (event not declared for the current state) are rejected:
 * `send()` checks the config directly (not just before/after state equality,
 * since a declared self-transition is valid but leaves the state unchanged)
 * and only forwards the event to the underlying actor when it is legal.
 */
export function createLifecycle<TState extends string, TEvent extends string>(
  config: LifecycleConfig<TState, TEvent>,
): LifecycleActor<TState, TEvent> {
  const machine = createMachine({
    id: 'lifecycle',
    initial: config.initial,
    states: Object.fromEntries(
      Object.entries(config.states).map(([state, transitions]) => [
        state,
        { on: transitions as Record<string, string> },
      ]),
    ),
  });

  const actor = createActor(machine);
  actor.start();

  const currentState = (): TState => actor.getSnapshot().value as TState;
  const isDeclared = (event: TEvent): boolean =>
    Object.prototype.hasOwnProperty.call(config.states[currentState()], event);

  return {
    get state() {
      return currentState();
    },
    send(event: TEvent): TransitionResult<TState> {
      const accepted = isDeclared(event);
      if (accepted) actor.send({ type: event });
      return { accepted, state: currentState() };
    },
    can: isDeclared,
    stop(): void {
      actor.stop();
    },
  };
}
