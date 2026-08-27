import React, { useState, useMemo } from "react";
import {
  Layers,
  FileSpreadsheet,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Copy,
  RotateCcw,
  Info,
  ArrowRight,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { useApp, ToolSubTab } from "../context/AppContext";
import { PlanTakeoffWorkspace } from "./PlanTakeoffWorkspace";

export const ToolsHub: React.FC = () => {
  const {
    activeToolTab,
    setActiveToolTab,
    showToast
  } = useApp();

  // -------------------------------------------------------------
  // Tool: Trench Polymeric Cable Cover & Concrete Weight Offset Calculator
  // -------------------------------------------------------------
  const [trenchLengthMeters, setTrenchLengthMeters] = useState<number>(250);
  const [cableVoltage, setCableVoltage] = useState<"LV_240_415" | "HV_11kV" | "HV_22kV_33kV" | "COMMS_FIBRE">("LV_240_415");
  const [trenchWidthMm, setTrenchWidthMm] = useState<number>(300);
  const [concreteThicknessMm, setConcreteThicknessMm] = useState<number>(50);

  const cableCoverCalculations = useMemo(() => {
    // Plasgain polymeric cover specs (AS 4702 compliant)
    // 150mm wide x 5mm thick x 20m roll = ~18 kg/roll
    // 300mm wide x 6mm thick x 20m roll = ~38 kg/roll
    const rollsNeeded150 = Math.ceil((trenchLengthMeters * (trenchWidthMm / 150)) / 20);
    const rollsNeeded300 = Math.ceil(trenchLengthMeters / 20);

    const polymericTotalWeightKg = (trenchWidthMm <= 150 ? rollsNeeded150 * 18 : rollsNeeded300 * 38);

    // Traditional precast concrete slabs (approx 2400 kg/m3)
    // Volume in m3 = length * width * thickness
    const concreteVolumeM3 = trenchLengthMeters * (trenchWidthMm / 1000) * (concreteThicknessMm / 1000);
    const concreteWeightKg = concreteVolumeM3 * 2400;
    const concreteSlabsCount = Math.ceil(trenchLengthMeters / 1.0); // 1m slab units
    const weightSavedKg = concreteWeightKg - polymericTotalWeightKg;
    const weightReductionPercent = Math.round((weightSavedKg / concreteWeightKg) * 100);

    // Embodied CO2 estimate: ~0.15 kg CO2e/kg for concrete vs ~0.08 kg for recycled poly
    const concreteCo2Kg = concreteWeightKg * 0.14;
    const polyCo2Kg = polymericTotalWeightKg * 0.08;
    const co2SavedKg = Math.round(concreteCo2Kg - polyCo2Kg);

    return {
      rollsNeeded150,
      rollsNeeded300,
      polymericTotalWeightKg,
      concreteWeightKg: Math.round(concreteWeightKg),
      concreteSlabsCount,
      weightSavedKg: Math.round(weightSavedKg),
      weightReductionPercent,
      co2SavedKg
    };
  }, [trenchLengthMeters, cableVoltage, trenchWidthMm, concreteThicknessMm]);

  // -------------------------------------------------------------
  // Tool: AS/NZS 1158 Pathway Pole Spacing & Lux Estimator
  // -------------------------------------------------------------
  const [pathwayWidth, setPathwayWidth] = useState<number>(3.0);
  const [subCategory, setSubCategory] = useState<"PR2" | "PR3" | "PR4">("PR3");
  const [poleHeightM, setPoleHeightM] = useState<number>(5.0);
  const [luminaireOutputLm, setLuminaireOutputLm] = useState<number>(4500);

  const spacingCalculations = useMemo(() => {
    // Standard AS/NZS 1158.3.1 PR Category spacing approximation
    let baseSpacing = 30;
    if (subCategory === "PR2") baseSpacing = 24;
    if (subCategory === "PR3") baseSpacing = 32;
    if (subCategory === "PR4") baseSpacing = 40;

    // Height and lumens modifier
    const heightFactor = poleHeightM / 5.0;
    const lumenFactor = luminaireOutputLm / 4000;
    const recommendedSpacing = Math.round(baseSpacing * Math.sqrt(lumenFactor) * (0.8 + 0.2 * heightFactor));
    const polesPerKm = Math.ceil(1000 / recommendedSpacing);

    return {
      recommendedSpacing,
      polesPerKm,
      illuminanceEav: subCategory === "PR2" ? "2.0 Lux" : subCategory === "PR3" ? "1.0 Lux" : "0.5 Lux",
      uniformityUo: "0.20 Min"
    };
  }, [pathwayWidth, subCategory, poleHeightM, luminaireOutputLm]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="border-b border-line pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-meta font-semibold px-2 py-0.5 rounded bg-brand-wash text-brand-deep border border-brand-edge">
            Engineering & Estimating Hub
          </span>
        </div>
        <h1 className="text-2xl font-bold text-body tracking-tight">Technical Estimators & Plan Take-off</h1>
        <p className="text-meta text-ink-dim">
          Engineering drawing deciphering, polymeric mechanical protection sizing, and AS/NZS 1158 pathway spacing estimators.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-2">
        <button
          onClick={() => setActiveToolTab("plan-takeoff" as ToolSubTab)}
          className={`px-4 py-2 text-meta font-bold rounded-edge flex items-center gap-2 transition-colors cursor-pointer ${
            activeToolTab === "plan-takeoff"
              ? "bg-brand-deep text-white shadow-xs"
              : "bg-white text-ink-dim hover:text-body hover:bg-raised border border-line"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Plan Take-off (BOM Schedule)</span>
        </button>

        <button
          onClick={() => setActiveToolTab("cable-cover-calc" as ToolSubTab)}
          className={`px-4 py-2 text-meta font-bold rounded-edge flex items-center gap-2 transition-colors cursor-pointer ${
            activeToolTab === "cable-cover-calc"
              ? "bg-brand-deep text-white shadow-xs"
              : "bg-white text-ink-dim hover:text-body hover:bg-raised border border-line"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Polymeric Cable Cover & Concrete Offset</span>
        </button>

        <button
          onClick={() => setActiveToolTab("pole-spacing-calc" as ToolSubTab)}
          className={`px-4 py-2 text-meta font-bold rounded-edge flex items-center gap-2 transition-colors cursor-pointer ${
            activeToolTab === "pole-spacing-calc"
              ? "bg-brand-deep text-white shadow-xs"
              : "bg-white text-ink-dim hover:text-body hover:bg-raised border border-line"
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>AS/NZS 1158 Pathway Pole Spacing</span>
        </button>
      </div>

      {/* Tab 1: Plan Take-off */}
      {activeToolTab === "plan-takeoff" && (
        <div>
          <PlanTakeoffWorkspace />
        </div>
      )}

      {/* Tab 2: Polymeric Cable Cover & Concrete Weight Offset Calculator */}
      {activeToolTab === "cable-cover-calc" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-5 rounded-panel border border-line shadow-xs space-y-4">
            <h3 className="text-base font-bold text-body flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-deep" />
              Trench & Protection Parameters
            </h3>

            <div>
              <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
                Trench Run Length (Metres)
              </label>
              <input
                type="number"
                min={1}
                value={trenchLengthMeters}
                onChange={(e) => setTrenchLengthMeters(Math.max(1, Number(e.target.value)))}
                className="w-full p-2 border border-line-strong rounded-edge text-meta font-semibold"
              />
            </div>

            <div>
              <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
                Cable / Service Classification
              </label>
              <select
                value={cableVoltage}
                onChange={(e) => setCableVoltage(e.target.value as any)}
                className="w-full p-2 border border-line-strong rounded-edge text-meta font-semibold bg-white"
              >
                <option value="LV_240_415">Low Voltage Electrical (240V / 415V - AS 4702 5mm)</option>
                <option value="HV_11kV">High Voltage (11kV - AS 4702 6mm/10mm)</option>
                <option value="HV_22kV_33kV">High Voltage Transmission (22kV / 33kV - AS 4702 10mm)</option>
                <option value="COMMS_FIBRE">Communications & Fibre Optic (White AS 4702)</option>
              </select>
            </div>

            <div>
              <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
                Trench Width (mm)
              </label>
              <select
                value={trenchWidthMm}
                onChange={(e) => setTrenchWidthMm(Number(e.target.value))}
                className="w-full p-2 border border-line-strong rounded-edge text-meta font-semibold bg-white"
              >
                <option value={150}>150 mm (Single cable / narrow trench)</option>
                <option value={300}>300 mm (Standard electrical / civil trench)</option>
                <option value={450}>450 mm (Wide trench - 3x 150mm or multiple conduits)</option>
                <option value={600}>600 mm (Heavy infrastructure corridor)</option>
              </select>
            </div>

            <div>
              <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
                Equivalent Precast Slab Thickness (mm)
              </label>
              <input
                type="number"
                min={25}
                max={150}
                value={concreteThicknessMm}
                onChange={(e) => setConcreteThicknessMm(Number(e.target.value))}
                className="w-full p-2 border border-line-strong rounded-edge text-meta font-semibold"
              />
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gradient-to-br from-brand-wash to-white p-6 rounded-panel border border-brand-edge shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-spec font-bold text-brand-deep uppercase">AS 4702 Mechanical Protection Output</span>
                  <h2 className="text-xl font-bold text-body">Polymeric Roll Requirement & Weight Comparison</h2>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-brand-deep">
                    {cableCoverCalculations.weightReductionPercent}%
                  </span>
                  <p className="text-[11px] text-ink-dim uppercase font-bold">Manual Handling Weight Reduction</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-white p-3.5 rounded-edge border border-line shadow-2xs">
                  <div className="text-spec font-bold text-ink-dim uppercase">Plasgain Poly Rolls</div>
                  <div className="text-xl font-bold text-body mt-1">
                    {trenchWidthMm <= 150 ? cableCoverCalculations.rollsNeeded150 : cableCoverCalculations.rollsNeeded300} Rolls
                  </div>
                  <div className="text-[11px] text-ink-dim">20m continuous rolls (~{cableCoverCalculations.polymericTotalWeightKg} kg total)</div>
                </div>

                <div className="bg-white p-3.5 rounded-edge border border-line shadow-2xs">
                  <div className="text-spec font-bold text-ink-dim uppercase">Equivalent Concrete Slabs</div>
                  <div className="text-xl font-bold text-urgent mt-1">
                    {cableCoverCalculations.concreteWeightKg.toLocaleString()} kg
                  </div>
                  <div className="text-[11px] text-ink-dim">~{cableCoverCalculations.concreteSlabsCount} individual heavy precast slabs</div>
                </div>

                <div className="bg-white p-3.5 rounded-edge border border-line shadow-2xs">
                  <div className="text-spec font-bold text-ink-dim uppercase">Embodied Carbon Offset</div>
                  <div className="text-xl font-bold text-brand mt-1">
                    {cableCoverCalculations.co2SavedKg.toLocaleString()} kg CO₂e
                  </div>
                  <div className="text-[11px] text-ink-dim">Saved by replacing heavy concrete with recycled polymer</div>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-edge border border-brand-edge text-meta space-y-1">
                <div className="font-bold text-body">Civil Estimating Recommendation:</div>
                <p className="text-ink-dim text-spec">
                  For a <strong>{trenchLengthMeters}m</strong> trench run at <strong>{trenchWidthMm}mm width</strong>, specify{" "}
                  <strong>
                    {trenchWidthMm <= 150 ? cableCoverCalculations.rollsNeeded150 : cableCoverCalculations.rollsNeeded300}x
                    Plasgain Polymeric Cable Cover Rolls (AS 4702 certified)
                  </strong>
                  . Saves <strong>{cableCoverCalculations.weightSavedKg.toLocaleString()} kg</strong> of crane and manual handling weight on site.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: AS/NZS 1158 Pathway Pole Spacing Calculator */}
      {activeToolTab === "pole-spacing-calc" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-5 rounded-panel border border-line shadow-xs space-y-4">
            <h3 className="text-base font-bold text-body flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-deep" />
              Pathway Lighting Parameters
            </h3>

            <div>
              <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
                Pathway Category (AS/NZS 1158.3.1)
              </label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value as any)}
                className="w-full p-2 border border-line-strong rounded-edge text-meta font-semibold bg-white"
              >
                <option value="PR2">PR2 (High Pedestrian Activity / Urban Promenades - 2.0 Lux)</option>
                <option value="PR3">PR3 (Standard Shared Path / Council Cycleway - 1.0 Lux)</option>
                <option value="PR4">PR4 (Low Activity Parks / Rural Pathways - 0.5 Lux)</option>
              </select>
            </div>

            <div>
              <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
                Mounting Height (Metres)
              </label>
              <select
                value={poleHeightM}
                onChange={(e) => setPoleHeightM(Number(e.target.value))}
                className="w-full p-2 border border-line-strong rounded-edge text-meta font-semibold bg-white"
              >
                <option value={4.0}>4.0 Metres (Parkland / Low Glare)</option>
                <option value={5.0}>5.0 Metres (Standard Shared Pathway)</option>
                <option value={6.0}>6.0 Metres (Wide Corridor / Higher Uniformity)</option>
              </select>
            </div>

            <div>
              <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
                Luminaire Nominal Output (Lumens)
              </label>
              <select
                value={luminaireOutputLm}
                onChange={(e) => setLuminaireOutputLm(Number(e.target.value))}
                className="w-full p-2 border border-line-strong rounded-edge text-meta font-semibold bg-white"
              >
                <option value={3000}>3,000 Lumens (Plasgain Slim / Minor Path)</option>
                <option value={4500}>4,500 Lumens (Plasgain Intense 30W/50W Standard)</option>
                <option value={6500}>6,500 Lumens (Plasgain Commercial High-Output)</option>
              </select>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gradient-to-br from-brand-wash to-white p-6 rounded-panel border border-brand-edge shadow-xs space-y-4">
              <div>
                <span className="text-spec font-bold text-brand-deep uppercase">Estimated Engineering Spacing</span>
                <h2 className="text-xl font-bold text-body">AS/NZS 1158 Category {subCategory} Compliance Estimation</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-white p-3.5 rounded-edge border border-line shadow-2xs">
                  <div className="text-spec font-bold text-ink-dim uppercase">Recommended Spacing</div>
                  <div className="text-2xl font-bold text-brand-deep mt-1">
                    ~{spacingCalculations.recommendedSpacing} m
                  </div>
                  <div className="text-[11px] text-ink-dim">Pole-to-pole linear spacing</div>
                </div>

                <div className="bg-white p-3.5 rounded-edge border border-line shadow-2xs">
                  <div className="text-spec font-bold text-ink-dim uppercase">Poles Required Per Km</div>
                  <div className="text-2xl font-bold text-body mt-1">
                    {spacingCalculations.polesPerKm} Units
                  </div>
                  <div className="text-[11px] text-ink-dim">Per 1,000m continuous trail</div>
                </div>

                <div className="bg-white p-3.5 rounded-edge border border-line shadow-2xs">
                  <div className="text-spec font-bold text-ink-dim uppercase">Target Horizontal Illuminance</div>
                  <div className="text-2xl font-bold text-brand mt-1">
                    {spacingCalculations.illuminanceEav}
                  </div>
                  <div className="text-[11px] text-ink-dim">Uniformity (Uo) {spacingCalculations.uniformityUo}</div>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-edge border border-brand-edge text-meta space-y-1">
                <div className="font-bold text-body">Engineering Support Note:</div>
                <p className="text-ink-dim text-spec">
                  This spacing estimate is for preliminary budgeting and product take-off preparation. Final project compliance requires a site-specific Dialux photometric calculation.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
