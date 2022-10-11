import { expect, it, describe } from '@jest/globals';
import { subtract } from '../src/index';

describe('subtract', () => {
  it('should subtract two numbers', () => {
    const result = subtract(2, 1);
    expect(result).toBe(1);
  });
});
