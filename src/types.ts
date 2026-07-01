/**
 * Plain lifecycle config: no XState vocabulary leaks to callers.
 * `TState` = union of state names, `TEvent` = union of event names that drive transitions.
 */
export interface LifecycleConfig<TState extends string, TEvent extends string> {
  /** State the machine starts in. */
  initial: TState;
  /** Every declared state maps to the events it accepts and the state each lands on. */
  states: Record<TState, Partial<Record<TEvent, TState>>>;
}

/** Result of asking a lifecycle actor to send an event. */
export interface TransitionResult<TState extends string> {
  /** True when the event was a valid transition out of the state the actor was in. */
  readonly accepted: boolean;
  /** State the actor is in after the send call (unchanged when `accepted` is false). */
  readonly state: TState;
}

/** A ready-to-use entity-lifecycle actor. Thin facade over an XState v5 actor. */
export interface LifecycleActor<TState extends string, TEvent extends string> {
  /** Current state name. */
  readonly state: TState;
  /** Send an event; returns whether it was a valid transition and the resulting state. */
  send(event: TEvent): TransitionResult<TState>;
  /** True when `event` is a valid transition from the current state (no side effect). */
  can(event: TEvent): boolean;
  /** Stop the underlying XState actor. */
  stop(): void;
}
