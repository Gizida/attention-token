import assert from 'node:assert/strict';
import test from 'node:test';

import {
  creditsToLamports,
  creditsToUsd,
  calculateTurnkeyPolicySolCeiling,
  validateWithdrawalCredits,
} from '../src/lib/withdrawal-policy.ts';

test('credits have an exact fixed USD value', () => {
  assert.equal(creditsToUsd(100), 1);
  assert.equal(creditsToUsd(10_000), 100);
});

test('SOL conversion rounds down to whole lamports', () => {
  assert.equal(creditsToLamports(100, 100), 10_000_000n);
  assert.equal(creditsToLamports(101, 137.25), 7_358_834n);
});

test('Turnkey launch ceiling rounds up to the next 0.01 SOL', () => {
  assert.equal(calculateTurnkeyPolicySolCeiling(100), 1.1);
  assert.equal(calculateTurnkeyPolicySolCeiling(137.25), 0.81);
});

test('withdrawal limits require whole credits between $1 and $100', () => {
  assert.equal(validateWithdrawalCredits(100), 100);
  assert.equal(validateWithdrawalCredits(10_000), 10_000);
  assert.throws(() => validateWithdrawalCredits(99));
  assert.throws(() => validateWithdrawalCredits(10_001));
  assert.throws(() => validateWithdrawalCredits(100.5));
});
