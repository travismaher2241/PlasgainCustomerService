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

  it('resolves Plan Take-off shortcut to the plan-takeoff tool tab', () => {
    const route = resolveToolRoute('takeoff');
    expect(route.isSupported).toBe(true);
    expect(route.targetNavTab).toBe('tools');
    expect(route.targetToolSubTab).toBe('plan-takeoff');

    const aliasRoute = resolveToolRoute('take-off');
    expect(aliasRoute.isSupported).toBe(true);
    expect(aliasRoute.targetToolSubTab).toBe('plan-takeoff');
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
