import { describe, it, expect } from 'vitest';
import {
  LIGHTING_STANDARDS_CATEGORIES,
  getLightingCategory,
  getAllLightingCategories,
  getCategoryProvenanceString,
  DATASET_METADATA
} from '../../data/lightingStandards';
import { COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA, lookupLightingTerm } from '../../data/lightingEncyclopedia';

describe('Authoritative Lighting Standards Dataset & Cross-Module Consistency', () => {
  it('contains versioned metadata with standard reference and dataset revision', () => {
    expect(DATASET_METADATA.revision).toBe('2026.1');
    expect(DATASET_METADATA.standardReference).toContain('AS/NZS 1158.3.1:2020');
    expect(DATASET_METADATA.approvedBy).toBeDefined();
  });

  it('provides unique, authoritative records for all standard Category P and PR categories', () => {
    const categories = getAllLightingCategories();
    expect(categories.length).toBeGreaterThanOrEqual(9);

    const ids = categories.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    // Core categories must exist
    expect(ids).toContain('P1');
    expect(ids).toContain('P2');
    expect(ids).toContain('P3');
    expect(ids).toContain('P4');
    expect(ids).toContain('P5');
    expect(ids).toContain('PR1');
    expect(ids).toContain('PR2');
    expect(ids).toContain('PR3');
    expect(ids).toContain('PR4');
  });

  it('guarantees that Category P4 maintained illuminance is 0.85 lux avg and 0.17 lux min point', () => {
    const p4 = getLightingCategory('P4');
    expect(p4).toBeDefined();
    expect(p4?.maintainedIlluminanceLux).toBe(0.85);
    expect(p4?.minimumIlluminanceLux).toBe(0.17);
    expect(p4?.displayName).toContain('Category P4');
    expect(p4?.standardReference).toBe('AS/NZS 1158.3.1:2020');
  });

  it('guarantees that Category PR2 maintains 3.5 lux avg and never conflicts with P3', () => {
    const pr2 = getLightingCategory('PR2');
    const p3 = getLightingCategory('P3');

    expect(pr2).toBeDefined();
    expect(p3).toBeDefined();

    // PR2 is 3.5 lux, P3 is 1.75 lux
    expect(pr2?.maintainedIlluminanceLux).toBe(3.5);
    expect(p3?.maintainedIlluminanceLux).toBe(1.75);

    // Selected PR2 can never equal P3 in ID, label, or lux
    expect(pr2?.id).not.toBe(p3?.id);
    expect(pr2?.displayName).not.toBe(p3?.displayName);
    expect(pr2?.maintainedIlluminanceLux).not.toBe(p3?.maintainedIlluminanceLux);
  });

  it('guarantees that Lighting Explainer encyclopedia entries cite correct canonical standards values', () => {
    const term1158 = lookupLightingTerm('AS/NZS 1158.3.1');
    expect(term1158).toBeDefined();
    // Must explain P1 (7.0), P2 (3.5), P3 (1.75), P4 (0.85), P5 (0.45)
    expect(term1158?.whyItMattersInSales).toContain('P4 (0.85 lx avg)');
    expect(term1158?.whyItMattersInSales).toContain('P1 (7.0 lx avg)');
    expect(term1158?.practicalExample).toContain('0.85 lux');
  });

  it('generates unambiguous standards provenance string containing dataset version', () => {
    const provP4 = getCategoryProvenanceString('P4');
    expect(provP4).toContain('Category P4');
    expect(provP4).toContain('0.85 lx avg');
    expect(provP4).toContain('0.17 lx min');
    expect(provP4).toContain('Rev 2026.1');

    const provPR2 = getCategoryProvenanceString('PR2');
    expect(provPR2).toContain('Category PR2');
    expect(provPR2).toContain('3.5 lx avg');
    expect(provPR2).toContain('Rev 2026.1');
  });

  it('resolves case-insensitive and prefixed queries (e.g. "Cat P2", "category p4")', () => {
    expect(getLightingCategory('cat p2')?.id).toBe('P2');
    expect(getLightingCategory('Category P4')?.id).toBe('P4');
    expect(getLightingCategory('pr3')?.id).toBe('PR3');
  });
});
