/**
 * Conditional Pre-Quote Readiness Gate (P2-08)
 *
 * Implements typed conditional quotation readiness rules based on:
 * - Product family (Solar vs Mains vs Poles vs Civil)
 * - Power source & installation constraints
 * - Quote Type: "budget" | "indicative" | "firm"
 *
 * Primary output is explicit BLOCKERS, WARNINGS, and CONFIRMED items.
 * A firm quote cannot be prepared if blocking rules fail.
 */

export type QuoteType = "budget" | "indicative" | "firm";

export interface QuoteContext {
  quoteType: QuoteType;
  productFamily?: string;
  isSolar?: boolean;
  isMains?: boolean;
  isPolePackage?: boolean;
  isCivilCableCover?: boolean;

  // Parameters
  customerCompany?: string;
  projectName?: string;
  productCode?: string;
  quantity?: number;
  mountingHeightM?: number | string;
  mountingHeight?: number | string;
  windRegion?: string;
  lightingCategory?: string;
  solarAutonomyDays?: number;
  autonomyDays?: number;
  supplyVoltage?: string;
  soilFoundationConfirmed?: boolean;
  deliveryLocation?: string;
  commercialPricingApproved?: boolean;
  operatingProfileConfirmed?: boolean;
  unitPrice?: number;
}

export interface ReadinessRuleResult {
  id: string;
  field: string;
  label: string;
  severity: "blocking" | "warning";
  passed: boolean;
  reason: string;
}

export interface QuoteReadinessReport {
  quoteType: QuoteType;
  isReadyForQuoteType: boolean;
  isReadyForFirmQuote: boolean;
  readinessPercentage: number;
  blockers: ReadinessRuleResult[];
  warnings: ReadinessRuleResult[];
  confirmed: ReadinessRuleResult[];
}

export interface ReadinessRule {
  id: string;
  field: string;
  label: string;
  severity: "blocking" | "warning";
  quoteTypes: QuoteType[];
  appliesWhen: (ctx: QuoteContext) => boolean;
  evaluate: (ctx: QuoteContext) => { pass: boolean; reason: string };
}

export const READINESS_RULES: ReadinessRule[] = [
  // 1. Customer & Project Identity
  {
    id: "rule-customer",
    field: "customerCompany",
    label: "Customer / Account Identity",
    severity: "blocking",
    quoteTypes: ["budget", "indicative", "firm"],
    appliesWhen: () => true,
    evaluate: (ctx) => ({
      pass: Boolean(ctx.customerCompany && ctx.customerCompany.trim().length > 1),
      reason: ctx.customerCompany ? `Confirmed customer: ${ctx.customerCompany}` : "Customer organisation not identified"
    })
  },
  {
    id: "rule-project",
    field: "projectName",
    label: "Project Scope & Name",
    severity: "blocking",
    quoteTypes: ["budget", "indicative", "firm"],
    appliesWhen: () => true,
    evaluate: (ctx) => ({
      pass: Boolean(ctx.projectName && ctx.projectName.trim().length > 1),
      reason: ctx.projectName ? `Project title: ${ctx.projectName}` : "Project scope name missing"
    })
  },

  // 2. Product & Quantity
  {
    id: "rule-product-code",
    field: "productCode",
    label: "Product Model Selection",
    severity: "blocking",
    quoteTypes: ["indicative", "firm"],
    appliesWhen: () => true,
    evaluate: (ctx) => ({
      pass: Boolean(ctx.productCode && ctx.productCode.trim().length > 1),
      reason: ctx.productCode ? `Selected model: ${ctx.productCode}` : "Specific product model not selected"
    })
  },
  {
    id: "rule-quantity",
    field: "quantity",
    label: "Confirmed Bill of Quantities",
    severity: "blocking",
    quoteTypes: ["indicative", "firm"],
    appliesWhen: () => true,
    evaluate: (ctx) => ({
      pass: Boolean(ctx.quantity && ctx.quantity > 0),
      reason: ctx.quantity ? `Quantity: ${ctx.quantity} units` : "Bill of quantities not specified"
    })
  },

  // 3. Technical & Standard Compliance
  {
    id: "rule-lighting-cat",
    field: "lightingCategory",
    label: "AS/NZS 1158 Lighting Subcategory",
    severity: "blocking",
    quoteTypes: ["firm"],
    appliesWhen: (ctx) => Boolean(!ctx.isCivilCableCover && (ctx.lightingCategory !== undefined || ctx.quoteType === "firm")),
    evaluate: (ctx) => ({
      pass: Boolean(ctx.lightingCategory && ctx.lightingCategory.trim().length > 0),
      reason: ctx.lightingCategory ? `Lighting category: ${ctx.lightingCategory}` : "AS/NZS 1158 lighting category (e.g. P4, V3) not confirmed"
    })
  },

  // 4. Solar-specific rules
  {
    id: "rule-solar-autonomy",
    field: "solarAutonomyDays",
    label: "Solar Battery Autonomy (Days of Backup)",
    severity: "blocking",
    quoteTypes: ["firm"],
    appliesWhen: (ctx) => Boolean(ctx.isSolar || ctx.productCode?.toLowerCase().includes("solar") || ctx.productFamily?.toLowerCase().includes("solar")),
    evaluate: (ctx) => {
      const autonomy = ctx.solarAutonomyDays || ctx.autonomyDays;
      const pass = Boolean(autonomy && autonomy >= 3);
      return {
        pass,
        reason: pass
          ? `Solar autonomy: ${autonomy} continuous backup days`
          : "Minimum 3–5 days solar autonomy sizing not confirmed for winter solar radiation"
      };
    }
  },

  // 5. Mains-specific rules
  {
    id: "rule-mains-voltage",
    field: "supplyVoltage",
    label: "Mains Electrical Supply & Control",
    severity: "warning",
    quoteTypes: ["firm"],
    appliesWhen: (ctx) => Boolean(ctx.isMains || ctx.productFamily?.toLowerCase().includes("mains") || ctx.productCode?.toLowerCase().includes("mains")),
    evaluate: (ctx) => ({
      pass: Boolean(ctx.supplyVoltage && ctx.supplyVoltage.trim().length > 0),
      reason: ctx.supplyVoltage ? `Electrical supply: ${ctx.supplyVoltage}` : "Mains feed voltage & DALI/NEMA photocell spec not confirmed"
    })
  },

  // 6. Pole & Wind Region rules
  {
    id: "rule-wind-region",
    field: "windRegion",
    label: "AS/NZS 1170.2 Wind Region & Topography",
    severity: "blocking",
    quoteTypes: ["firm"],
    appliesWhen: (ctx) => Boolean(ctx.isPolePackage || ctx.productFamily?.toLowerCase().includes("pole") || ctx.mountingHeightM),
    evaluate: (ctx) => ({
      pass: Boolean(ctx.windRegion && ctx.windRegion.trim().length > 0),
      reason: ctx.windRegion ? `Wind region: ${ctx.windRegion}` : "AS/NZS 1170.2 Wind Region (A/B/C/D) not confirmed for pole structural design"
    })
  },
  {
    id: "rule-mounting-height",
    field: "mountingHeightM",
    label: "Mounting Height & Outreach",
    severity: "blocking",
    quoteTypes: ["indicative", "firm"],
    appliesWhen: (ctx) => Boolean(ctx.isPolePackage || !ctx.isCivilCableCover),
    evaluate: (ctx) => {
      const heightVal = ctx.mountingHeightM || ctx.mountingHeight;
      const pass = Boolean(heightVal && (typeof heightVal === "string" ? heightVal.trim().length > 0 : heightVal > 0));
      return {
        pass,
        reason: heightVal ? `Mounting height: ${heightVal}` : "Mounting height not specified"
      };
    }
  },

  // 7. Foundation & Soil Confirmation
  {
    id: "rule-soil-foundation",
    field: "soilFoundationConfirmed",
    label: "Foundation Type & Geotechnical Soil Class",
    severity: "warning",
    quoteTypes: ["firm"],
    appliesWhen: (ctx) => Boolean(ctx.isPolePackage || ctx.productFamily?.toLowerCase().includes("pole")),
    evaluate: (ctx) => ({
      pass: Boolean(ctx.soilFoundationConfirmed),
      reason: ctx.soilFoundationConfirmed ? "Direct bury / baseplate footing spec confirmed" : "Geotechnical soil class unconfirmed (default standard soil assumed)"
    })
  },

  // 8. Commercial Pricing Approval
  {
    id: "rule-commercial-pricing",
    field: "commercialPricingApproved",
    label: "Approved Commercial Pricing",
    severity: "blocking",
    quoteTypes: ["firm"],
    appliesWhen: () => true,
    evaluate: (ctx) => {
      const pass = Boolean(ctx.commercialPricingApproved || (ctx.unitPrice && ctx.unitPrice > 0));
      return {
        pass,
        reason: pass
          ? (ctx.unitPrice ? `Approved pricing: $${ctx.unitPrice.toLocaleString()}/unit` : "Commercial pricing schedule approved")
          : "Approved commercial price schedule missing (Commercial Pricing Request required)"
      };
    }
  },

  // 9. Delivery Location
  {
    id: "rule-delivery-site",
    field: "deliveryLocation",
    label: "Delivery Site & Logistics Access",
    severity: "warning",
    quoteTypes: ["firm"],
    appliesWhen: () => true,
    evaluate: (ctx) => ({
      pass: Boolean(ctx.deliveryLocation && ctx.deliveryLocation.trim().length > 1),
      reason: ctx.deliveryLocation ? `Site delivery location: ${ctx.deliveryLocation}` : "Delivery site address not specified (freight estimate indicative)"
    })
  }
];

export function evaluateQuoteReadiness(ctx: QuoteContext): QuoteReadinessReport {
  const quoteType = ctx.quoteType || "firm";
  const applicableRules = READINESS_RULES.filter((rule) => rule.appliesWhen(ctx));

  const blockers: ReadinessRuleResult[] = [];
  const warnings: ReadinessRuleResult[] = [];
  const confirmed: ReadinessRuleResult[] = [];

  let totalPassed = 0;
  let relevantRuleCount = 0;

  for (const rule of applicableRules) {
    const isRelevantToQuoteType = rule.quoteTypes.includes(quoteType);
    const { pass, reason } = rule.evaluate(ctx);

    if (pass) {
      confirmed.push({
        id: rule.id,
        field: rule.field,
        label: rule.label,
        severity: rule.severity,
        passed: true,
        reason
      });
      if (isRelevantToQuoteType) totalPassed++;
    } else {
      if (isRelevantToQuoteType && rule.severity === "blocking") {
        blockers.push({
          id: rule.id,
          field: rule.field,
          label: rule.label,
          severity: "blocking",
          passed: false,
          reason
        });
      } else {
        warnings.push({
          id: rule.id,
          field: rule.field,
          label: rule.label,
          severity: "warning",
          passed: false,
          reason
        });
      }
    }

    if (isRelevantToQuoteType) relevantRuleCount++;
  }

  const isReadyForQuoteType = blockers.length === 0;

  // Evaluate firm quote status specifically
  const firmBlockers = applicableRules
    .filter((r) => r.quoteTypes.includes("firm") && r.severity === "blocking")
    .map((r) => ({ ...r.evaluate(ctx), rule: r }))
    .filter((res) => !res.pass);

  const isReadyForFirmQuote = firmBlockers.length === 0;

  const score = relevantRuleCount > 0 ? Math.round((totalPassed / relevantRuleCount) * 100) : 100;

  return {
    quoteType,
    isReadyForQuoteType,
    isReadyForFirmQuote,
    readinessPercentage: score,
    blockers,
    warnings,
    confirmed
  };
}
