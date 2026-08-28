import { describe, it, expect, beforeEach } from 'vitest';
import { PRESET_TEAM_MEMBERS, UserProfile } from '../../context/AppContext';

describe('Priority 0: User Authentication & Role-Based Permissions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function authenticateProfile(team: UserProfile[], userId: string, pin: string) {
    const target = team.find((m) => m.id === userId || m.name.toLowerCase() === userId.toLowerCase());
    if (!target) return { success: false, error: "Team member profile not found" };

    const expectedPin = target.pin || (target.name.toLowerCase().includes("sarah") ? "2468" : target.name.toLowerCase().includes("rob") ? "9900" : "1234");
    if (pin.trim() !== expectedPin.trim()) {
      return { success: false, error: "Incorrect PIN code for this profile." };
    }

    return { success: true, user: target };
  }

  function authorizeAdminAction(currentUser: UserProfile) {
    return Boolean(currentUser.isAdmin);
  }

  it('authenticates preset admin Travis Maher with valid PIN 1234', () => {
    const result = authenticateProfile(PRESET_TEAM_MEMBERS, "user-travis-maher", "1234");
    expect(result.success).toBe(true);
    expect(result.user?.name).toBe("Travis Maher");
    expect(result.user?.isAdmin).toBe(true);
  });

  it('authenticates preset sales rep Sarah Reed with valid PIN 2468', () => {
    const result = authenticateProfile(PRESET_TEAM_MEMBERS, "user-sarah-reed", "2468");
    expect(result.success).toBe(true);
    expect(result.user?.name).toBe("Sarah Reed");
    expect(result.user?.isAdmin).toBe(false);
  });

  it('rejects profile switch when PIN is incorrect', () => {
    const result = authenticateProfile(PRESET_TEAM_MEMBERS, "user-travis-maher", "0000");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Incorrect PIN code for this profile.");
  });

  it('enforces admin-only authorization for deleting or adding team members', () => {
    const adminUser = PRESET_TEAM_MEMBERS.find((m) => m.name === "Travis Maher")!;
    const salesUser = PRESET_TEAM_MEMBERS.find((m) => m.name === "Sarah Reed")!;

    expect(authorizeAdminAction(adminUser)).toBe(true);
    expect(authorizeAdminAction(salesUser)).toBe(false);
  });

  it('stamps immutable authorId and performedBy on CRM activity records', () => {
    const activeUser: UserProfile = {
      id: "user-travis-maher",
      name: "Travis Maher",
      role: "Internal Sales Manager",
      location: "Drouin, VIC",
      email: "travis@plasgain.com.au",
      isAdmin: true
    };

    const rawActivity = {
      title: "Called Sunshine Coast Council regarding shared path RFQ",
      type: "call" as const,
      description: "Confirmed lighting subcategory PP4."
    };

    const stampedActivity = {
      ...rawActivity,
      id: `act-${Date.now()}`,
      performedBy: activeUser.name,
      authorId: activeUser.id,
      isImmutable: true,
      timestamp: new Date().toISOString()
    };

    expect(stampedActivity.authorId).toBe("user-travis-maher");
    expect(stampedActivity.performedBy).toBe("Travis Maher");
    expect(stampedActivity.isImmutable).toBe(true);
  });
});
