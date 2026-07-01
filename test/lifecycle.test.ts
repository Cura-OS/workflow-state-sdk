import { describe, expect, test } from 'bun:test';
import { createLifecycle } from '../src';

/** Order lifecycle: draft -> submitted -> approved -> fulfilled, with a reject branch. */
type OrderState = 'draft' | 'submitted' | 'approved' | 'fulfilled' | 'rejected';
type OrderEvent = 'submit' | 'approve' | 'reject' | 'fulfill';

function orderLifecycle() {
  return createLifecycle<OrderState, OrderEvent>({
    initial: 'draft',
    states: {
      draft: { submit: 'submitted' },
      submitted: { approve: 'approved', reject: 'rejected' },
      approved: { fulfill: 'fulfilled' },
      fulfilled: {},
      rejected: {},
    },
  });
}

describe('createLifecycle', () => {
  test('starts in the configured initial state', () => {
    const order = orderLifecycle();
    expect(order.state).toBe('draft');
  });

  test('valid transitions move the machine through the full path', () => {
    const order = orderLifecycle();

    expect(order.send('submit')).toEqual({ accepted: true, state: 'submitted' });
    expect(order.state).toBe('submitted');

    expect(order.send('approve')).toEqual({ accepted: true, state: 'approved' });
    expect(order.state).toBe('approved');

    expect(order.send('fulfill')).toEqual({ accepted: true, state: 'fulfilled' });
    expect(order.state).toBe('fulfilled');
  });

  test('invalid transitions are rejected, not silently allowed', () => {
    const order = orderLifecycle();

    // approve/fulfill/reject are not declared for 'draft' - must be refused.
    expect(order.send('approve')).toEqual({ accepted: false, state: 'draft' });
    expect(order.send('fulfill')).toEqual({ accepted: false, state: 'draft' });
    expect(order.state).toBe('draft');

    order.send('submit');
    // 'submit' again is not declared for 'submitted'.
    expect(order.send('submit')).toEqual({ accepted: false, state: 'submitted' });
    expect(order.state).toBe('submitted');
  });

  test('a terminal state accepts no further events', () => {
    const order = orderLifecycle();
    order.send('submit');
    order.send('reject');
    expect(order.state).toBe('rejected');
    expect(order.send('approve')).toEqual({ accepted: false, state: 'rejected' });
    expect(order.send('fulfill')).toEqual({ accepted: false, state: 'rejected' });
  });

  test('can() reports transition legality without mutating state', () => {
    const order = orderLifecycle();
    expect(order.can('submit')).toBe(true);
    expect(order.can('approve')).toBe(false);
    expect(order.state).toBe('draft'); // can() must not move the machine

    order.send('submit');
    expect(order.can('approve')).toBe(true);
    expect(order.can('reject')).toBe(true);
    expect(order.can('fulfill')).toBe(false);
  });

  test('stop() tears down the underlying actor without throwing', () => {
    const order = orderLifecycle();
    expect(() => order.stop()).not.toThrow();
  });
});
