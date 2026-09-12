import assert from 'node:assert/strict';
import test from 'node:test';

import { assessOfferwallConversion, calculateUnreimbursedExposure, OFFERWALL_CREDITS_PER_USD } from '../src/lib/reward-policy.ts';

test('Offerwall placement awards 75 credits per provider dollar', () => {
  assert.equal(OFFERWALL_CREDITS_PER_USD, 75);
  assert.equal(assessOfferwallConversion({ localCredits: 75, localStatus: 'credited', currencyAmount: 75, payoutUsd: 1, providerStatus: 'credited' }).conflict, false);
});

test('reconciliation flags changed rewards, margins, and states', () => {
  assert.equal(assessOfferwallConversion({ localCredits: 76, localStatus: 'credited', currencyAmount: 75, payoutUsd: 1, providerStatus: 'credited' }).conflict, true);
  assert.equal(assessOfferwallConversion({ localCredits: -75, localStatus: 'reversed', currencyAmount: -75, payoutUsd: -1, providerStatus: 'reversed' }).conflict, false);
});

test('cash settlements reduce exposure and exposure never becomes negative', () => {
  assert.equal(calculateUnreimbursedExposure({ confirmedUsd: 100, reservedUsd: 25, settlementsUsd: 20 }), 105);
  assert.equal(calculateUnreimbursedExposure({ confirmedUsd: 100, reservedUsd: 0, settlementsUsd: 150 }), 0);
});
