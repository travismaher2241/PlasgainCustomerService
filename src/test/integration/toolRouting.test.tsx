import { describe, it, expect } from 'vitest';
import { resolveToolRoute, REGISTERED_TOOL_ROUTES } from '../../utils/toolRegistry';

describe('Tool Registry & Route Resolution (P0-06 to P0-11)', () => {
  it('resolves Analyse Tender shortcut to the new-enquiry workspace (P0-06)', () => {
    const route = resolveToolRoute('tender-analyser');
    expect(route.isSupported).toBe(true);
    expect(route.targetNavTab).toBe('new-enquiry');
    expect(route.definition?.displayName).toContain('Analyse Tender');

    const route2 = resolveToolRoute('analyse-tender');
    expect(route2.isSupported).toBe(true);
    expect(route2.targetNavTab).toBe('new-enquiry');
  });

  it('resolves Solar Sizing shortcut to the solar-autonomy tool tab (P0-07)', () => {
    const route = resolveToolRoute('solar-autonomy');
    expect(route.isSupported).toBe(true);
    expect(route.targetNavTab).toBe('tools');
    expect(route.targetToolSubTab).toBe('solar-autonomy');

    const aliasRoute = resolveToolRoute('solar-sizing');
    expect(aliasRoute.isSupported).toBe(true);
    expect(aliasRoute.targetToolSubTab).toBe('solar-autonomy');
  });

  it('resolves Wind Region and Pole Sizing shortcut to the wind-foundation-calc tool tab (P0-08)', () => {
    const route = resolveToolRoute('wind-pole-sizing');
    expect(route.isSupported).toBe(true);
    expect(route.targetNavTab).toBe('tools');
    expect(route.targetToolSubTab).toBe('wind-foundation-calc');

    const aliasRoute = resolveToolRoute('wind-region');
    expect(aliasRoute.isSupported).toBe(true);
    expect(aliasRoute.targetToolSubTab).toBe('wind-foundation-calc');
  });

  it('resolves Conflict and Spec Resolver shortcut to the conflict-resolver tool tab (P0-09)', () => {
    const route = resolveToolRoute('conflict-resolver');
    expect(route.isSupported).toBe(true);
    expect(route.targetNavTab).toBe('tools');
    expect(route.targetToolSubTab).toBe('conflict-resolver');

    const aliasRoute = resolveToolRoute('spec-resolver');
    expect(aliasRoute.isSupported).toBe(true);
    expect(aliasRoute.targetToolSubTab).toBe('conflict-resolver');
  });

  it('resolves Quote Review shortcut to the CRM pipeline review workflow (P0-10)', () => {
    const route = resolveToolRoute('quote-review');
    expect(route.isSupported).toBe(true);
    expect(route.targetNavTab).toBe('crm');
    expect(route.targetCrmTab).toBe('pipeline');
  });

  it('detects unsupported/invalid tool routes and flags fallback state (P0-11)', () => {
    const unknownRoute = resolveToolRoute('non-existent-tool-xyz');
    expect(unknownRoute.isSupported).toBe(false);
    expect(unknownRoute.targetNavTab).toBe('tools');
    expect(unknownRoute.targetToolSubTab).toBe('unknown');
  });

  it('verifies all registered tool routes have valid destinations and descriptions', () => {
    REGISTERED_TOOL_ROUTES.forEach((r) => {
      expect(r.id).toBeDefined();
      expect(r.displayName).toBeDefined();
      expect(r.description).toBeDefined();
      expect(r.aliases.length).toBeGreaterThan(0);
      expect(['tools', 'workflow', 'crm']).toContain(r.destinationType);
    });
  });
});
