import { describe, expect, it } from 'vitest';

describe('@spex/shared smoke', () => {
  it('test pipeline is wired up', () => {
    expect(1 + 1).toBe(2);
  });
});
