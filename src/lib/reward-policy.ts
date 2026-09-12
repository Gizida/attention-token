export const OFFERWALL_CREDITS_PER_USD = 75;
export const MAX_UNREIMBURSED_EXPOSURE_USD = 250;

export function calculateUnreimbursedExposure(input: {
  confirmedUsd: number; reservedUsd: number; settlementsUsd: number;
}) {
  return Math.max(0, input.confirmedUsd + input.reservedUsd - input.settlementsUsd);
}

export function assessOfferwallConversion(input: {
  localCredits: number; localStatus: string; currencyAmount: number; payoutUsd: number; providerStatus: string;
}) {
  const creditDifference = Math.abs(input.localCredits - input.currencyAmount);
  const expectedCredits = input.payoutUsd * OFFERWALL_CREDITS_PER_USD;
  const rewardShareDifference = Math.abs(Math.abs(input.currencyAmount) - Math.abs(expectedCredits));
  const localStatusMatches = input.localStatus === input.providerStatus;
  return {
    conflict: creditDifference > 0.0001 || rewardShareDifference > 0.02 || !localStatusMatches,
    creditDifference, expectedCredits, rewardShareDifference, localStatusMatches,
  };
}
