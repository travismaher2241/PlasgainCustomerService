/**
 * Deal Value Validation & Unit/Total Basis Engine
 * 
 * Protects CRM quotation data integrity by identifying order-of-magnitude
 * mistakes (e.g. entering project total in unit price field, or entering unit price in total field).
 */

export type ValueBasis = "TOTAL" | "PER_UNIT";

export interface DealValueValidationResult {
  isValid: boolean;
  isOutlier: boolean;
  severity: "none" | "warning" | "error";
  effectiveTotal: number;
  effectiveUnitPrice: number;
  warningMessage?: string;
  suggestedCorrection?: {
    basis: ValueBasis;
    calculatedTotal: number;
    explanation: string;
  };
  requiresConfirmation: boolean;
}

export interface ValidateDealValueOptions {
  enteredValue: number;
  basis: ValueBasis;
  quantity?: number;
  category?: string;
}

export function validateDealValue(options: ValidateDealValueOptions): DealValueValidationResult {
  const { enteredValue, basis, quantity } = options;
  const quantityProvided = typeof quantity === "number" && Number.isFinite(quantity) && quantity > 0;
  const safeQty = quantityProvided ? Math.max(1, quantity as number) : 1;

  let effectiveTotal = 0;
  let effectiveUnitPrice = 0;

  if (basis === "PER_UNIT") {
    effectiveUnitPrice = Math.max(0, enteredValue);
    effectiveTotal = effectiveUnitPrice * safeQty;
  } else {
    effectiveTotal = Math.max(0, enteredValue);
    effectiveUnitPrice = safeQty > 0 ? effectiveTotal / safeQty : effectiveTotal;
  }

  // 1. Zero Value Warning
  if (effectiveTotal === 0) {
    return {
      isValid: true,
      isOutlier: false,
      severity: "none",
      effectiveTotal: 0,
      effectiveUnitPrice: 0,
      requiresConfirmation: false
    };
  }

  // 2. Per-unit basis with no quantity. The most likely per-unit mistake there
  // is: the deal silently books the unit price as the whole project (a $1,450/ea
  // job for 34 poles saves as $1,450), and nothing on screen says so. Blocked
  // rather than warned, because the value is certain to be wrong.
  if (basis === "PER_UNIT" && !quantityProvided && enteredValue > 0) {
    return {
      isValid: false,
      isOutlier: true,
      severity: "error",
      effectiveTotal,
      effectiveUnitPrice,
      warningMessage: `Quantity required: $${enteredValue.toLocaleString()} is a per-unit price. Enter the number of units, or switch to Project Total if $${enteredValue.toLocaleString()} is the whole job.`,
      suggestedCorrection: {
        basis: "TOTAL",
        calculatedTotal: enteredValue,
        explanation: `Switch to Project Total basis to record $${enteredValue.toLocaleString()} as the full project value.`
      },
      requiresConfirmation: true
    };
  }

  // 3. Unit Price Outlier - High (> $10,000/ea for standard lighting/poles)
  if (effectiveUnitPrice > 10000 && safeQty === 1 && enteredValue > 10000) {
    return {
      isValid: true,
      isOutlier: true,
      severity: "warning",
      effectiveTotal,
      effectiveUnitPrice,
      warningMessage: `High Deal Value Notice: $${effectiveTotal.toLocaleString()} entered for 1 unit. If this is a multi-unit project total, please update the quantity.`,
      requiresConfirmation: true
    };
  }

  if (basis === "TOTAL" && safeQty > 1 && effectiveUnitPrice > 12000) {
    return {
      isValid: true,
      isOutlier: true,
      severity: "warning",
      effectiveTotal,
      effectiveUnitPrice,
      warningMessage: `Unusual High Value Basis: $${effectiveTotal.toLocaleString()} for ${safeQty} units ($${Math.round(effectiveUnitPrice).toLocaleString()}/unit). Please confirm this is the total project scope.`,
      requiresConfirmation: true
    };
  }

  // 3. Low Value Outlier - Likely entered unit price in Project Total field
  // e.g. Rep entered $1,600 in "Project Total" for 30 luminaires ($53/unit)
  if (basis === "TOTAL" && safeQty >= 5 && effectiveUnitPrice < 250) {
    const suggestedTotal = enteredValue * safeQty;
    return {
      isValid: true,
      isOutlier: true,
      severity: "warning",
      effectiveTotal,
      effectiveUnitPrice,
      warningMessage: `Potential Value Basis Error: $${enteredValue.toLocaleString()} for ${safeQty} units equals only $${Math.round(effectiveUnitPrice)}/unit. Did you enter the Per-Unit price ($${enteredValue.toLocaleString()}/ea) instead of Project Total?`,
      suggestedCorrection: {
        basis: "PER_UNIT",
        calculatedTotal: suggestedTotal,
        explanation: `Switch to Per-Unit basis: ${safeQty} units @ $${enteredValue.toLocaleString()}/ea = $${suggestedTotal.toLocaleString()}`
      },
      requiresConfirmation: true
    };
  }

  // 4. Very High Per Unit Price entered in Per-Unit mode
  if (basis === "PER_UNIT" && enteredValue > 15000) {
    return {
      isValid: true,
      isOutlier: true,
      severity: "warning",
      effectiveTotal,
      effectiveUnitPrice,
      warningMessage: `High Unit Price: $${enteredValue.toLocaleString()}/unit exceeds typical luminaire/pole catalog pricing. Please confirm per-unit specification.`,
      requiresConfirmation: true
    };
  }

  return {
    isValid: true,
    isOutlier: false,
    severity: "none",
    effectiveTotal,
    effectiveUnitPrice,
    requiresConfirmation: false
  };
}
