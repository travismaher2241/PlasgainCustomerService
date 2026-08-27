import { describe, it, expect } from 'vitest';
import {
  LIGHTING_STANDARDS_CATEGORIES,
  DATASET_METADATA,
  getLightingCategory,
  getCategoryProvenanceString
} from '../../data/lightingStandards';
import { resolveToolRoute, REGISTERED_TOOL_ROUTES } from '../../utils/toolRegistry';
import {
  resolveSingleProduct,
  preflightProductPackage
} from '../../utils/productResolver';
import { validateDealValue } from '../../utils/dealValueValidator';
import { COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA } from '../../data/lightingEncyclopedia';

describe('FINAL PRIORITY 0 ACCEPTANCE AUDIT', () => {

  // --- SECTION 1: STANDARDS PROVENANCE & REGRESSION TESTS (P0-01 - P0-05) ---
  describe('1. Standards Provenance & PR2 Independence (P0-01 to P0-05)', () => {
    it('provides single versioned dataset with authoritative standard citations (P0-01)', () => {
      expect(DATASET_METADATA.standardReference).toContain('AS/NZS 1158.3.1:2020');
      expect(DATASET_METADATA.revision).toBe('2026.1');
      expect(DATASET_METADATA.lastVerified).toBe('2026-08-28');

      const p4 = getLightingCategory('P4');
      expect(p4).toBeDefined();
      expect(p4?.maintainedIlluminanceLux).toBe(0.85);
      expect(p4?.minimumIlluminanceLux).toBe(0.17);
    });

    it('verifies PR2 category values and prevents P3 regression (P0-04)', () => {
      const pr2 = getLightingCategory('PR2');
      expect(pr2).toBeDefined();
      expect(pr2?.category).toBe('PR2');
      expect(pr2?.displayName).toContain('Category PR2');
      expect(pr2?.maintainedIlluminanceLux).toBe(3.5);
      expect(pr2?.minimumIlluminanceLux).toBe(0.7);

      // Must NOT be equal to P3 (1.75 lx)
      const p3 = getLightingCategory('P3');
      expect(pr2?.maintainedIlluminanceLux).not.toBe(p3?.maintainedIlluminanceLux);
      expect(pr2?.category).not.toBe('P3');
    });

    it('confirms Lighting Encyclopedia Category P descriptions match canonical dataset (P0-03)', () => {
      const as1158SubEntry = COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA['as/nzs 1158.3.1'];
      expect(as1158SubEntry?.whyItMattersInSales).toContain('P1 (7.0 lx avg)');
      expect(as1158SubEntry?.whyItMattersInSales).toContain('P2 (3.5 lx avg)');
      expect(as1158SubEntry?.whyItMattersInSales).toContain('P3 (1.75 lx avg)');
      expect(as1158SubEntry?.whyItMattersInSales).toContain('P4 (0.85 lx avg)');
      expect(as1158SubEntry?.whyItMattersInSales).toContain('P5 (0.45 lx avg)');

      const as1158Entry = COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA['as/nzs 1158'];
      expect(as1158Entry?.practicalExample).toContain('0.85 lux average, 0.17 lux point minimum');
    });

    it('generates provenance string for customer audit compliance', () => {
      const prov = getCategoryProvenanceString('P4');
      expect(prov).toContain('AS/NZS 1158.3.1:2020');
      expect(prov).toContain('0.85 lx');
      expect(prov).toContain('0.17 lx');
    });
  });

  // --- SECTION 2: TOOL ROUTING & FALLBACK SYSTEM (P0-06 - P0-11) ---
  describe('2. Tool Routing & Unavailable Route Fallback (P0-06 to P0-11)', () => {
    it('verifies Analyse Tender routes to real tender analysis workspace (P0-06)', () => {
      const route = resolveToolRoute('tender-analyser');
      expect(route.isSupported).toBe(true);
      expect(route.targetNavTab).toBe('new-enquiry');
      expect(route.definition?.category).toBe('AI Workflow');
      expect(route.definition?.description).toContain('tender documents');
    });

    it('verifies Solar Autonomy calculation route (P0-07)', () => {
      const route = resolveToolRoute('solar-autonomy');
      expect(route.isSupported).toBe(true);
      expect(route.targetNavTab).toBe('tools');
      expect(route.targetToolSubTab).toBe('solar-autonomy');
    });

    it('verifies Wind Region AS 1170.2 route (P0-08)', () => {
      const route = resolveToolRoute('wind-pole-sizing');
      expect(route.isSupported).toBe(true);
      expect(route.targetNavTab).toBe('tools');
      expect(route.targetToolSubTab).toBe('wind-foundation-calc');
    });

    it('verifies Conflict Resolver route (P0-09)', () => {
      const route = resolveToolRoute('conflict-resolver');
      expect(route.isSupported).toBe(true);
      expect(route.targetNavTab).toBe('tools');
      expect(route.targetToolSubTab).toBe('conflict-resolver');
    });

    it('verifies Quote Review routes to CRM deal review (P0-10)', () => {
      const route = resolveToolRoute('quote-review');
      expect(route.isSupported).toBe(true);
      expect(route.targetNavTab).toBe('crm');
      expect(route.targetCrmTab).toBe('pipeline');
    });

    it('verifies unsupported tool fallback is flagged for controlled UI display (P0-11)', () => {
      const unknownRoute = resolveToolRoute('invalid-custom-tool');
      expect(unknownRoute.isSupported).toBe(false);
      expect(unknownRoute.targetNavTab).toBe('tools');
      expect(unknownRoute.targetToolSubTab).toBe('unknown');
    });
  });

  // --- SECTION 3: PRODUCT RESOLUTION SAFETY & PREFLIGHT (P0-12 - P0-14) ---
  describe('3. Product Resolution Safety & Tender Preflight (P0-12 to P0-14)', () => {
    it('strictly separates canonical exact match from ambiguous queries (P0-12)', () => {
      const exactMatch = resolveSingleProduct('50W-INTENSE');
      expect(exactMatch.status).toBe('EXACT_MATCH');
      expect(exactMatch.confidence).toBe(1.0);
      expect(exactMatch.product?.id).toBe('prod-intense-50w');

      const aliasMatch = resolveSingleProduct('Pro Blade Solar 75W Area Luminaire');
      expect(['EXACT_MATCH', 'ALIAS_MATCH']).toContain(aliasMatch.status);
      expect(aliasMatch.product?.id).toBe('prod-pro-blade');
    });

    it('does NOT silently auto-match ambiguous/generic text fragments (P0-14)', () => {
      const ambiguous1 = resolveSingleProduct('Pole');
      expect(ambiguous1.status).toBe('UNMATCHED');
      expect(ambiguous1.product).toBeUndefined();
      expect(ambiguous1.suggestedMatches.length).toBeGreaterThan(0);

      const ambiguous2 = resolveSingleProduct('Custom Solar Light Fitting 24V');
      expect(ambiguous2.status).toBe('UNMATCHED');
      expect(ambiguous2.product).toBeUndefined();
    });

    it('blocks tender package export until ambiguous line items are explicitly mapped (P0-14)', () => {
      const unverifiedItems = [
        '50W-INTENSE',
        'Custom 24V Solar Post Top'
      ];

      const preflight = preflightProductPackage(unverifiedItems);
      expect(preflight.matchedCount).toBe(1);
      expect(preflight.unmatchedCount).toBe(1);
      expect(preflight.allResolved).toBe(false);

      // Rep maps the ambiguous line item manually
      const preflightResolved = preflightProductPackage(unverifiedItems, {
        'Custom 24V Solar Post Top': 'prod-intense-50w'
      });

      expect(preflightResolved.matchedCount).toBe(2);
      expect(preflightResolved.unmatchedCount).toBe(0);
      expect(preflightResolved.allResolved).toBe(true);
      expect(preflightResolved.items[1].status).toBe('MANUALLY_MAPPED');
    });
  });

  // --- SECTION 4: DEAL VALUE VALIDATION & VALUE BASIS (P0-18 - P0-19) ---
  describe('4. Deal Value Outlier Detection & Value Basis (P0-18, P0-19)', () => {
    it('correctly calculates total from per-unit basis (P0-19)', () => {
      const res = validateDealValue({
        enteredValue: 1750,
        basis: 'PER_UNIT',
        quantity: 20
      });

      expect(res.effectiveTotal).toBe(35000);
      expect(res.effectiveUnitPrice).toBe(1750);
      expect(res.isOutlier).toBe(false);
    });

    it('flags outlier when unit price is mistakenly entered in project total field (P0-18)', () => {
      // Rep typed $1,750 as total for 20 units ($87.50/unit)
      const res = validateDealValue({
        enteredValue: 1750,
        basis: 'TOTAL',
        quantity: 20
      });

      expect(res.isOutlier).toBe(true);
      expect(res.severity).toBe('warning');
      expect(res.warningMessage).toContain('Potential Value Basis Error');
      expect(res.suggestedCorrection?.calculatedTotal).toBe(35000);
    });

    it('flags outlier when large total is assigned to a single unit (P0-18)', () => {
      const res = validateDealValue({
        enteredValue: 75000,
        basis: 'TOTAL',
        quantity: 1
      });

      expect(res.isOutlier).toBe(true);
      expect(res.warningMessage).toContain('High Deal Value Notice');
    });
  });
});
