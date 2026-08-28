import { describe, it, expect } from 'vitest';

describe('Priority 0: Solar Sizing & LiFePO4 Autonomy Calculation (AS/NZS 4509)', () => {
  const standardPackages = [
    {
      sku: "INTENSE-50W-3K",
      name: "Plasgain Intense Light 50W Solar (896Wh LiFePO4 / 130W PV)",
      nominalWatts: 50,
      batteryWh: 896,
      pvWatts: 130,
      unitPrice: 1850
    },
    {
      sku: "PBS-75W-SOLAR",
      name: "Plasgain Pro Blade Solar 75W (1024Wh LiFePO4 / 150W PV)",
      nominalWatts: 75,
      batteryWh: 1024,
      pvWatts: 150,
      unitPrice: 1950
    },
    {
      sku: "PBS-100W-SOLAR",
      name: "Plasgain Pro Blade Solar 100W (1280Wh LiFePO4 / 180W PV)",
      nominalWatts: 100,
      batteryWh: 1280,
      pvWatts: 180,
      unitPrice: 2200
    },
    {
      sku: "PBS-125W-SOLAR",
      name: "Plasgain Pro Blade Solar 125W (1536Wh LiFePO4 / 200W PV)",
      nominalWatts: 125,
      batteryWh: 1536,
      pvWatts: 200,
      unitPrice: 2450
    }
  ];

  function calculateSolarAutonomy(params: {
    solarWatts: number;
    solarProfile: "DUSK_DAWN_12H" | "PIR_PROFILE_SMART";
    solarAutonomyDays: number;
    psh: number;
  }) {
    const effectiveHours = params.solarProfile === "DUSK_DAWN_12H" ? 12.0 : 6.0 * 1.0 + 6.0 * 0.3; // 7.8 hours
    const dailyWattHours = Math.round(params.solarWatts * effectiveHours);
    const minBatteryStorageWh = Math.round((dailyWattHours * params.solarAutonomyDays) / 0.85); // 85% DoD
    const minPvWatts = Math.round((dailyWattHours * 1.35) / params.psh);

    const matchingWattageSKU = standardPackages.find((p) => p.nominalWatts === params.solarWatts);
    const compliantSKUs = standardPackages.filter(
      (p) => p.nominalWatts === params.solarWatts && p.batteryWh >= minBatteryStorageWh && p.pvWatts >= minPvWatts
    );

    const isCompliant = compliantSKUs.length > 0;
    const nonComplianceReasons: string[] = [];

    if (!isCompliant && matchingWattageSKU) {
      if (matchingWattageSKU.batteryWh < minBatteryStorageWh) {
        nonComplianceReasons.push(
          `Standard ${params.solarWatts}W package battery (${matchingWattageSKU.batteryWh} Wh) is undersized for required ${minBatteryStorageWh} Wh. Shortfall: ${minBatteryStorageWh - matchingWattageSKU.batteryWh} Wh.`
        );
      }
      if (matchingWattageSKU.pvWatts < minPvWatts) {
        nonComplianceReasons.push(`Standard ${params.solarWatts}W package PV panel is undersized.`);
      }
    }

    return {
      dailyWattHours,
      minBatteryStorageWh,
      minPvWatts,
      isCompliant,
      matchedSKU: compliantSKUs[0] || matchingWattageSKU,
      nonComplianceReasons
    };
  }

  it('correctly calculates 2294 Wh battery requirement for 50W smart profile with 5 days autonomy', () => {
    const calc = calculateSolarAutonomy({
      solarWatts: 50,
      solarProfile: "PIR_PROFILE_SMART",
      solarAutonomyDays: 5,
      psh: 3.6 // VIC/TAS
    });

    // 50W * 7.8h = 390 Wh/day
    expect(calc.dailyWattHours).toBe(390);
    // (390 * 5) / 0.85 = 2294 Wh
    expect(calc.minBatteryStorageWh).toBe(2294);
    // (390 * 1.35) / 3.6 = 146 Wp
    expect(calc.minPvWatts).toBe(146);
  });

  it('identifies non-compliance when standard 50W SKU battery (896 Wh) has a 1398 Wh shortfall', () => {
    const calc = calculateSolarAutonomy({
      solarWatts: 50,
      solarProfile: "PIR_PROFILE_SMART",
      solarAutonomyDays: 5,
      psh: 3.6
    });

    expect(calc.isCompliant).toBe(false);
    expect(calc.nonComplianceReasons.length).toBeGreaterThan(0);
    expect(calc.nonComplianceReasons[0]).toContain("Shortfall: 1398 Wh");
  });

  it('does NOT arbitrarily substitute an undersized 125W package (1536 Wh) when 2294 Wh is required', () => {
    const calc = calculateSolarAutonomy({
      solarWatts: 50,
      solarProfile: "PIR_PROFILE_SMART",
      solarAutonomyDays: 5,
      psh: 3.6
    });

    expect(calc.isCompliant).toBe(false);
    // Matched SKU retains requested 50W nominal load reference rather than misleading customer with a 125W fixture
    expect(calc.matchedSKU?.nominalWatts).toBe(50);
  });

  it('returns compliant when solar sizing requirement is within physical SKU battery parameters', () => {
    const calc = calculateSolarAutonomy({
      solarWatts: 50,
      solarProfile: "PIR_PROFILE_SMART",
      solarAutonomyDays: 1,
      psh: 5.8 // WA/SA
    });

    // 50W * 7.8h * 1 / 0.85 = 459 Wh -> INTENSE-50W has 896 Wh
    expect(calc.minBatteryStorageWh).toBe(459);
    expect(calc.isCompliant).toBe(true);
    expect(calc.matchedSKU?.sku).toBe("INTENSE-50W-3K");
  });
});
