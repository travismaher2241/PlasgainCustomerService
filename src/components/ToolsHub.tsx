import React, { useState, useMemo } from "react";
import {
  Sparkles,
  ShieldCheck,
  Layers,
  AlertTriangle,
  FileText,
  ClipboardCheck,
  Scale,
  CheckCircle2,
  Copy,
  RotateCcw,
  Search,
  Zap,
  Sun,
  Wind,
  Compass,
  MapPin,
  Check,
  Info,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Clock,
  Send,
  AlertCircle
} from "lucide-react";
import { useApp, ToolSubTab } from "../context/AppContext";
import { CONFLICT_REGISTER_DATA } from "../data/knowledgeBaseRaw";

export const ToolsHub: React.FC = () => {
  const {
    activeToolTab,
    setActiveToolTab,
    opportunities,
    selectedOpportunityId,
    setSelectedOpportunityId,
    products,
    showToast
  } = useApp();

  // -------------------------------------------------------------
  // Tool 1: Solar Autonomy & Battery Sizing Calculator State
  // -------------------------------------------------------------
  const [solarLocation, setSolarLocation] = useState("melbourne");
  const [customPsh, setCustomPsh] = useState(2.1);
  const [luminaireWatts, setLuminaireWatts] = useState<number>(50);
  const [operatingProfile, setOperatingProfile] = useState<"dusk_dawn" | "smart_dimming" | "pir_sensor" | "timed_6h">("smart_dimming");
  const [autonomyDays, setAutonomyDays] = useState<number>(4);
  const [batteryVoltage, setBatteryVoltage] = useState<12.8 | 25.6>(12.8);

  const LOCATION_PSH_DATA: Record<string, { label: string; psh: number; state: string; note: string }> = {
    melbourne: { label: "Melbourne / Southern VIC", psh: 2.1, state: "VIC", note: "Winter solstice worst-case insolation (June)" },
    ballarat: { label: "Ballarat / Central Highlands", psh: 2.0, state: "VIC", note: "Elevated regional overcast winter zone" },
    sydney: { label: "Sydney / NSW Coastal", psh: 3.2, state: "NSW", note: "Coastal winter insolation with moderate cloud" },
    brisbane: { label: "Brisbane / South-East QLD", psh: 4.2, state: "QLD", note: "Subtropical high winter sun clearance" },
    townsville: { label: "Townsville / North QLD", psh: 4.8, state: "QLD", note: "Tropical dry winter solstice solar zone" },
    perth: { label: "Perth / Coastal WA", psh: 3.4, state: "WA", note: "Consistent Mediterranean winter sunlight" },
    adelaide: { label: "Adelaide / SA", psh: 2.7, state: "SA", note: "Southern mainland winter solar profile" },
    hobart: { label: "Hobart / Southern TAS", psh: 1.7, state: "TAS", note: "Highest winter latitude in Australia (requires oversized PV)" },
    darwin: { label: "Darwin / NT Top End", psh: 5.2, state: "NT", note: "Dry season maximum winter solar irradiation" },
    custom: { label: "Custom Solar Insolation", psh: customPsh, state: "AU", note: "User defined Peak Sun Hours" }
  };

  const activePsh = solarLocation === "custom" ? customPsh : (LOCATION_PSH_DATA[solarLocation]?.psh || 2.5);

  const effectiveFLH = useMemo(() => {
    switch (operatingProfile) {
      case "dusk_dawn":
        return 14.0; // 14 hours full load in winter
      case "smart_dimming":
        return 7.4;  // 4h @ 100% + 6h @ 30% + 4h @ 60% = 7.4h FLH
      case "pir_sensor":
        return 4.8;  // 14h @ 20% base + 40 motion triggers @ 100% = 4.8h FLH
      case "timed_6h":
        return 6.0;  // 6h @ 100% then off
      default:
        return 8.0;
    }
  }, [operatingProfile]);

  const solarCalculations = useMemo(() => {
    // Daily energy consumed by luminaire in Wh/night
    const dailyWh = luminaireWatts * effectiveFLH;
    // Required usable energy
    const usableWhRequired = dailyWh * autonomyDays;
    // Total nominal capacity needed for LiFePO4 at 80% DOD (Depth of Discharge)
    const nominalBatteryWh = usableWhRequired / 0.80;
    // Battery Ah at selected voltage
    const batteryAh = nominalBatteryWh / batteryVoltage;
    // Minimum solar PV collector wattage required to recharge 1 full night's consumption within 1 winter day
    const systemEfficiency = 0.82; // Derating factor for temperature, dust, wiring, MPPT
    const minPvWatts = dailyWh / (activePsh * systemEfficiency);
    // Array-to-load ratio in winter
    const alr = (minPvWatts * activePsh * systemEfficiency) / dailyWh;

    // Plasgain luminaire matching
    const matchingProducts = [
      {
        name: "Plasgain Intense 50W Solar",
        pv: 130,
        batteryWh: 896,
        lumens: "8,500 lm",
        status: (896 >= nominalBatteryWh && 130 >= minPvWatts) ? "Excellent Match" : "Capacity Limited in this Location"
      },
      {
        name: "Plasgain Pro Blade 75",
        pv: 75,
        batteryWh: 460.8,
        lumens: "6,000 lm",
        status: (460.8 >= nominalBatteryWh && 75 >= minPvWatts) ? "Recommended Match" : "Requires Smart Dimming"
      },
      {
        name: "Plasgain Pro Blade 125",
        pv: 125,
        batteryWh: 921.6,
        lumens: "12,000 lm",
        status: (921.6 >= nominalBatteryWh && 125 >= minPvWatts) ? "High Autonomy Match" : "Sufficient for most profiles"
      },
      {
        name: "Plasgain Superlux 120W",
        pv: 180,
        batteryWh: 1152,
        lumens: "19,200 lm",
        status: (1152 >= nominalBatteryWh && 180 >= minPvWatts) ? "Commercial Highway Grade" : "Exceeds standard requirement"
      }
    ];

    return {
      dailyWh: Math.round(dailyWh),
      usableWhRequired: Math.round(usableWhRequired),
      nominalBatteryWh: Math.round(nominalBatteryWh),
      batteryAh: Number(batteryAh.toFixed(1)),
      minPvWatts: Math.round(minPvWatts),
      alr: Number(alr.toFixed(2)),
      matchingProducts
    };
  }, [luminaireWatts, effectiveFLH, autonomyDays, batteryVoltage, activePsh]);

  // -------------------------------------------------------------
  // Tool 2: Wind Region & Pole Sizing Selector State (AS/NZS 1158 & AS 1170.2)
  // -------------------------------------------------------------
  const [windRegion, setWindRegion] = useState<"A" | "B" | "C" | "D">("A");
  const [terrainCategory, setTerrainCategory] = useState<"TC1" | "TC2" | "TC3" | "TC4">("TC2");
  const [poleHeight, setPoleHeight] = useState<number>(6.0);
  const [poleMaterial, setPoleMaterial] = useState<"composite" | "steel" | "safepole">("composite");
  const [headEpa, setHeadEpa] = useState<number>(0.32); // m2
  const [foundationType, setFoundationType] = useState<"direct_burial" | "baseplate">("direct_burial");

  const WIND_REGION_INFO = {
    A: { name: "Region A: Normal / Inland", speed: 45, speedKmh: 162, desc: "Melbourne, Sydney inland, Adelaide, Canberra, Regional VIC/NSW" },
    B: { name: "Region B: Intermediate / Coastal", speed: 52, speedKmh: 187, desc: "Coastal NSW, Coastal VIC, South East QLD (Brisbane/Gold Coast)" },
    C: { name: "Region C: Cyclonic", speed: 64, speedKmh: 230, desc: "Rockhampton, Mackay, Townsville, Cairns, Broome" },
    D: { name: "Region D: Severe Cyclonic", speed: 79, speedKmh: 284, desc: "Pilbara Coast, Karratha, Port Hedland, Dampier" }
  };

  const TERRAIN_FACTORS = {
    TC1: { label: "TC 1: Open water, exposed foreshores", factor: 1.05 },
    TC2: { label: "TC 2: Open terrain, grasslands, parklands", factor: 0.95 },
    TC3: { label: "TC 3: Suburban, industrial estates, wooded", factor: 0.83 },
    TC4: { label: "TC 4: Dense urban, city center with tall structures", factor: 0.75 }
  };

  const windCalculations = useMemo(() => {
    const vr = WIND_REGION_INFO[windRegion].speed;
    const mz = TERRAIN_FACTORS[terrainCategory].factor;
    const vdes = vr * mz; // m/s
    const vdesKmh = Math.round(vdes * 3.6);
    // Dynamic wind pressure qz = 0.6 * Vdes^2 (Pa)
    const qz = 0.6 * Math.pow(vdes, 2);
    // Total drag force on luminaire/panel head (N)
    const cd = 1.2; // Aerodynamic drag coefficient for solar panel
    const headDragForce = qz * headEpa * cd; // N
    // Average pole diameter
    const poleAvgDiam = 0.14; // 140mm average
    const poleArea = poleAvgDiam * poleHeight;
    const poleDragForce = qz * poleArea * 0.7; // N
    const totalBaseMoment = (headDragForce * poleHeight) + (poleDragForce * (poleHeight / 2)); // N*m
    const totalBaseMomentKNm = Number((totalBaseMoment / 1000).toFixed(2));

    // Direct burial depth calculation: AS/NZS rule of thumb ~ H/6 + 0.2m (min 1.0m)
    const directBurialDepth = Number(Math.max(1.0, (poleHeight / 6) + 0.2).toFixed(2));
    
    // Baseplate PCD and bolt spec
    let ragboltSpec = "4x M20 Grade 8.8 on 250mm PCD";
    let concreteVolumeM3 = 0.45;
    if (poleHeight >= 8.0 || windRegion === "C" || windRegion === "D") {
      ragboltSpec = "4x M24 Grade 8.8 on 300mm PCD (600mm J-Bolts)";
      concreteVolumeM3 = 0.85;
    }
    if (poleHeight >= 10.0 || (windRegion === "D" && poleHeight >= 6.0)) {
      ragboltSpec = "4x M30 Grade 8.8 on 350mm PCD (800mm J-Bolts)";
      concreteVolumeM3 = 1.35;
    }

    // Material weight
    let poleWeightKg = 28;
    let materialBenefit = "Non-conductive, Class 1 corrosion resistance, 70% recycled polymer core";
    if (poleMaterial === "steel") {
      poleWeightKg = Math.round(poleHeight * 14.5);
      materialBenefit = "Hot-dip galvanised to AS/NZS 4680, high structural mass, requires conductive earthing";
    } else if (poleMaterial === "safepole") {
      poleWeightKg = Math.round(poleHeight * 11.0);
      materialBenefit = "Passively safe crash-absorbing slip base tested to AS/NZS 3845";
    } else {
      poleWeightKg = Math.round(poleHeight * 4.8);
    }

    return {
      vdes: Number(vdes.toFixed(1)),
      vdesKmh,
      qz: Math.round(qz),
      headDragForce: Math.round(headDragForce),
      totalBaseMomentKNm,
      directBurialDepth,
      ragboltSpec,
      concreteVolumeM3,
      poleWeightKg,
      materialBenefit
    };
  }, [windRegion, terrainCategory, poleHeight, poleMaterial, headEpa]);

  // -------------------------------------------------------------
  // Tool 3: Polymeric Cable Cover & Trenching Protection Calculator
  // -------------------------------------------------------------
  const [trenchLengthM, setTrenchLengthM] = useState<number>(150);
  const [conduitParallelCount, setConduitParallelCount] = useState<number>(1);
  const [coverSlabWidthMm, setCoverSlabWidthMm] = useState<number>(200);
  const [burialDepthMm, setBurialDepthMm] = useState<number>(750);
  const [cableVoltageType, setCableVoltageType] = useState<string>("LV");

  const cableCoverCalculations = useMemo(() => {
    // 1 Plasgain polymeric slab = 1000mm (1.0m) nominal length
    const slabCountPerRun = Math.ceil(trenchLengthM);
    const totalSlabsRequired = slabCountPerRun * conduitParallelCount;
    
    // Weight comparison
    const polymericSlabWeightKg = 3.4; // kg per 1.0m slab
    const concreteSlabWeightKg = 26.5; // kg per 1.0m precast concrete slab
    
    const totalPolymericWeightKg = totalSlabsRequired * polymericSlabWeightKg;
    const totalConcreteWeightKg = totalSlabsRequired * concreteSlabWeightKg;
    const weightAvoidedKg = totalConcreteWeightKg - totalPolymericWeightKg;
    const weightAvoidedTonnes = Number((weightAvoidedKg / 1000).toFixed(2));

    // Logistics / Transport efficiency
    const slabsPerPolymerPallet = 150;
    const slabsPerConcretePallet = 32;
    const polymerPallets = Math.ceil(totalSlabsRequired / slabsPerPolymerPallet);
    const concretePallets = Math.ceil(totalSlabsRequired / slabsPerConcretePallet);

    // Warning tape length (m)
    const warningTapeMeters = trenchLengthM * conduitParallelCount;

    // AS/NZS 3000 & AS 4702 compliance check
    const isDepthCompliant = burialDepthMm >= (cableVoltageType === "HV" ? 750 : 500);

    return {
      totalSlabsRequired,
      totalPolymericWeightKg: Math.round(totalPolymericWeightKg),
      totalConcreteWeightKg: Math.round(totalConcreteWeightKg),
      weightAvoidedKg: Math.round(weightAvoidedKg),
      weightAvoidedTonnes,
      polymerPallets,
      concretePallets,
      warningTapeMeters,
      isDepthCompliant
    };
  }, [trenchLengthM, conduitParallelCount, coverSlabWidthMm, burialDepthMm, cableVoltageType]);

  // -------------------------------------------------------------
  // Tool 4: Conflict & Specification Resolver State
  // -------------------------------------------------------------
  const [conflictSearch, setConflictSearch] = useState("");
  const [selectedConflictId, setSelectedConflictId] = useState<string>("cr-deltalux");

  const filteredConflicts = useMemo(() => {
    return CONFLICT_REGISTER_DATA.filter(
      (c) =>
        c.product.toLowerCase().includes(conflictSearch.toLowerCase()) ||
        c.nature.toLowerCase().includes(conflictSearch.toLowerCase()) ||
        c.details.toLowerCase().includes(conflictSearch.toLowerCase())
    );
  }, [conflictSearch]);

  const activeConflict = useMemo(() => {
    return CONFLICT_REGISTER_DATA.find((c) => c.id === selectedConflictId) || CONFLICT_REGISTER_DATA[0];
  }, [selectedConflictId]);

  // -------------------------------------------------------------
  // Legacy Helper Tools State (Tender, Quote, Compare)
  // -------------------------------------------------------------
  const [tenderText, setTenderText] = useState(
    "Ballarat City Council Shared Path Upgrade — Section 4.3 Lighting Specification: Supply and installation of approx 32x standalone solar LED pathway luminaires along 1.2km path. Minimum 6m mounting height, powder-coated heritage green. Category P4 compliance to AS/NZS 1158.3.1. Minimum battery autonomy 4 nights. CCT 3000K maximum to protect wildlife. Tender closes 28th October."
  );

  const [quoteEnquiryText, setQuoteEnquiryText] = useState(
    "Customer requested 24x 3000K solar pathway luminaires on 6m poles with 4 nights autonomy for Ballarat shared path."
  );
  const [quoteItemsText, setQuoteItemsText] = useState(
    "Item 1: 24x Plasgain Pro Blade 75W Solar Luminaire (4000K Cool White standard)\nItem 2: 24x 6m Galvanised Steel Direct-Burial Poles\nItem 3: Delivery to Ballarat depot"
  );

  const [product1, setProduct1] = useState("Pro Blade 75W");
  const [product2, setProduct2] = useState("Solaris 80W");

  const subTools: { id: ToolSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "solar-autonomy", label: "Solar Autonomy & Battery Sizing", icon: Sparkles },
    { id: "wind-pole-sizing", label: "Wind Region & Pole Sizing", icon: ShieldCheck },
    { id: "cable-cover-calc", label: "Polymeric Cable Cover (AS 4702)", icon: Layers },
    { id: "conflict-resolver", label: "Conflict & Spec Resolver", icon: AlertTriangle },
    { id: "tender-analyser", label: "Tender / RFQ Analyser", icon: FileText },
    { id: "quote-review", label: "Quote Reviewer", icon: ClipboardCheck },
    { id: "product-comparison", label: "Product Comparison", icon: Scale }
  ];

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`, "success");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-body">Engineering &amp; Sales Calculators</h1>
            <span className="text-spec font-bold px-2 py-0.5 rounded bg-brand-wash text-brand-deep border border-brand-edge">
              AU Standards AS/NZS 1158 • AS 1170.2 • AS 4702
            </span>
          </div>
          <p className="text-meta text-ink-dim mt-0.5">
            Grounded Australian solar engineering sizing, wind structural selectors, civil cable cover calculations, and specification conflict resolution.
          </p>
        </div>
      </div>

      {/* Sub-tool navigation pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-meta scrollbar-none border-b border-line">
        {subTools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeToolTab === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveToolTab(tool.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-t-panel font-medium whitespace-nowrap transition-all cursor-pointer border-t border-x ${
                isActive
                  ? "bg-white text-brand-deep font-bold border-line shadow-xs -mb-px bg-white z-10"
                  : "bg-raised hover:bg-paper text-ink-dim border-transparent"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-brand-deep" : "text-ink-faint"}`} />
              <span>{tool.label}</span>
            </button>
          );
        })}
      </div>

      {/* TOOL 1: Solar Autonomy & Battery Sizing Calculator */}
      {activeToolTab === "solar-autonomy" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Input Controls */}
            <div className="lg:col-span-5 bg-white p-5 rounded-panel border border-line space-y-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <span className="text-meta font-bold text-body flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-brand-deep" />
                  Site &amp; Electrical Parameters
                </span>
                <span className="text-spec text-ink-faint">LiFePO4 Grade-A @ 80% DOD</span>
              </div>

              {/* Location Selector */}
              <div>
                <label className="block text-spec font-bold uppercase tracking-wider text-ink-dim mb-1">
                  Australian Location / Winter Insolation
                </label>
                <select
                  value={solarLocation}
                  onChange={(e) => setSolarLocation(e.target.value)}
                  className="w-full p-2.5 bg-paper text-meta rounded-edge border border-line focus:outline-none focus:ring-2 focus:ring-brand font-medium"
                >
                  {Object.entries(LOCATION_PSH_DATA).map(([key, data]) => (
                    <option key={key} value={key}>
                      {data.label} ({data.psh} PSH Winter)
                    </option>
                  ))}
                </select>
                <p className="text-spec text-ink-faint mt-1">
                  {LOCATION_PSH_DATA[solarLocation]?.note}
                </p>
              </div>

              {/* Luminaire Wattage */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-spec font-bold uppercase tracking-wider text-ink-dim">
                    Luminaire LED Load (Watts)
                  </label>
                  <span className="text-meta font-bold text-brand-deep">{luminaireWatts}W</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="150"
                  step="5"
                  value={luminaireWatts}
                  onChange={(e) => setLuminaireWatts(Number(e.target.value))}
                  className="w-full accent-brand-deep cursor-pointer"
                />
                <div className="flex justify-between text-spec text-ink-faint mt-1">
                  <span>10W (Pathway)</span>
                  <span>50W (Standard P-Cat)</span>
                  <span>120W+ (V-Cat Roadway)</span>
                </div>
              </div>

              {/* Operating Profile */}
              <div>
                <label className="block text-spec font-bold uppercase tracking-wider text-ink-dim mb-1.5">
                  Lighting Schedule / Operating Profile
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOperatingProfile("smart_dimming")}
                    className={`p-2.5 rounded-edge border text-left cursor-pointer transition-all ${
                      operatingProfile === "smart_dimming"
                        ? "bg-brand-wash border-brand text-brand-deep font-bold"
                        : "bg-paper border-line text-meta hover:bg-raised"
                    }`}
                  >
                    <div className="text-spec uppercase font-bold">Smart Dimming</div>
                    <div className="text-spec text-ink-dim mt-0.5">4h 100% + 6h 30% + 4h 60% (7.4h FLH)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOperatingProfile("pir_sensor")}
                    className={`p-2.5 rounded-edge border text-left cursor-pointer transition-all ${
                      operatingProfile === "pir_sensor"
                        ? "bg-brand-wash border-brand text-brand-deep font-bold"
                        : "bg-paper border-line text-meta hover:bg-raised"
                    }`}
                  >
                    <div className="text-spec uppercase font-bold">PIR Sensor Motion</div>
                    <div className="text-spec text-ink-dim mt-0.5">20% Dim + 40 Motion Triggers (4.8h FLH)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOperatingProfile("dusk_dawn")}
                    className={`p-2.5 rounded-edge border text-left cursor-pointer transition-all ${
                      operatingProfile === "dusk_dawn"
                        ? "bg-brand-wash border-brand text-brand-deep font-bold"
                        : "bg-paper border-line text-meta hover:bg-raised"
                    }`}
                  >
                    <div className="text-spec uppercase font-bold">Dusk-to-Dawn 100%</div>
                    <div className="text-spec text-ink-dim mt-0.5">14h Full Power (14.0h FLH)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOperatingProfile("timed_6h")}
                    className={`p-2.5 rounded-edge border text-left cursor-pointer transition-all ${
                      operatingProfile === "timed_6h"
                        ? "bg-brand-wash border-brand text-brand-deep font-bold"
                        : "bg-paper border-line text-meta hover:bg-raised"
                    }`}
                  >
                    <div className="text-spec uppercase font-bold">Timed 6-Hour</div>
                    <div className="text-spec text-ink-dim mt-0.5">6h @ 100% then Off (6.0h FLH)</div>
                  </button>
                </div>
              </div>

              {/* Autonomy Target */}
              <div>
                <label className="block text-spec font-bold uppercase tracking-wider text-ink-dim mb-1">
                  Required Autonomy (Nights without Sun)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 4, 5, 7].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setAutonomyDays(days)}
                      className={`py-2 rounded-edge border text-center font-bold text-meta cursor-pointer transition-colors ${
                        autonomyDays === days
                          ? "bg-brand-deep text-white border-brand-deep shadow-xs"
                          : "bg-paper text-body border-line hover:bg-raised"
                      }`}
                    >
                      {days} Nights
                    </button>
                  ))}
                </div>
                <p className="text-spec text-ink-faint mt-1">
                  AS/NZS 4509 recommends min 4 nights for public pathway safety in SE Australia.
                </p>
              </div>

              {/* System Voltage */}
              <div>
                <label className="block text-spec font-bold uppercase tracking-wider text-ink-dim mb-1">
                  Battery System Voltage
                </label>
                <div className="flex gap-3">
                  {[12.8, 25.6].map((v) => (
                    <label key={v} className="flex items-center gap-2 text-meta font-medium cursor-pointer">
                      <input
                        type="radio"
                        name="voltage"
                        checked={batteryVoltage === v}
                        onChange={() => setBatteryVoltage(v as 12.8 | 25.6)}
                        className="accent-brand-deep"
                      />
                      <span>{v}V LiFePO4 Nominal</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Engineering Sizing Output */}
            <div className="lg:col-span-7 space-y-4">
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-panel border border-line shadow-2xs">
                  <span className="text-spec font-bold text-ink-dim uppercase tracking-wider block">Daily Energy Demand</span>
                  <div className="text-2xl font-black text-body mt-1">
                    {solarCalculations.dailyWh} <span className="text-meta font-normal text-ink-dim">Wh/night</span>
                  </div>
                  <span className="text-spec text-ink-faint mt-0.5 block">{effectiveFLH}h effective full-load</span>
                </div>

                <div className="bg-white p-4 rounded-panel border border-line shadow-2xs">
                  <span className="text-spec font-bold text-ink-dim uppercase tracking-wider block">Nominal Battery Size</span>
                  <div className="text-2xl font-black text-brand-deep mt-1">
                    {solarCalculations.nominalBatteryWh} <span className="text-meta font-normal text-ink-dim">Wh</span>
                  </div>
                  <span className="text-spec text-ink-faint mt-0.5 block">
                    {solarCalculations.batteryAh}Ah @ {batteryVoltage}V (80% DOD)
                  </span>
                </div>

                <div className="bg-white p-4 rounded-panel border border-line shadow-2xs col-span-2 sm:col-span-1">
                  <span className="text-spec font-bold text-ink-dim uppercase tracking-wider block">Min Solar PV Array</span>
                  <div className="text-2xl font-black text-soon mt-1">
                    {solarCalculations.minPvWatts} <span className="text-meta font-normal text-ink-dim">Wp</span>
                  </div>
                  <span className="text-spec text-ink-faint mt-0.5 block">
                    For {activePsh} PSH winter solstice
                  </span>
                </div>
              </div>

              {/* Recommended Plasgain Matching */}
              <div className="bg-white p-5 rounded-panel border border-line shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <h3 className="font-bold text-meta text-body flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-brand-deep" />
                    Plasgain Standard Luminaire Compatibility Check
                  </h3>
                  <button
                    onClick={() =>
                      handleCopyText(
                        `Solar Sizing Summary: Location: ${LOCATION_PSH_DATA[solarLocation]?.label} (${activePsh} PSH)\nDaily Demand: ${solarCalculations.dailyWh} Wh/night (${luminaireWatts}W @ ${effectiveFLH} FLH)\nAutonomy: ${autonomyDays} Nights\nRequired Battery: ${solarCalculations.nominalBatteryWh} Wh (${solarCalculations.batteryAh}Ah @ ${batteryVoltage}V)\nMin PV: ${solarCalculations.minPvWatts} Wp`,
                        "Solar Sizing Specification"
                      )
                    }
                    className="text-spec font-bold text-brand-deep hover:bg-brand-wash px-2.5 py-1 rounded-edge border border-brand-edge flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    Copy Spec Clause
                  </button>
                </div>

                <div className="space-y-2">
                  {solarCalculations.matchingProducts.map((prod, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-edge border border-line hover:border-line-strong transition-colors gap-2"
                    >
                      <div>
                        <div className="font-bold text-meta text-body">{prod.name}</div>
                        <div className="text-spec text-ink-dim">
                          {prod.pv}W Monocrystalline PV • {prod.batteryWh}Wh LiFePO4 • {prod.lumens} Output
                        </div>
                      </div>
                      <span
                        className={`text-spec font-bold px-2.5 py-1 rounded-full text-center whitespace-nowrap self-start sm:self-auto ${
                          prod.status.includes("Match") || prod.status.includes("High") || prod.status.includes("Exceeds")
                            ? "bg-brand-wash text-brand-deep border border-brand-edge"
                            : "bg-urgent-wash text-urgent border border-urgent-edge"
                        }`}
                      >
                        {prod.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Engineering Advice Banner */}
              <div className="p-3.5 rounded-panel bg-raised border border-line text-meta text-ink-dim space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-body">
                  <Info className="w-4 h-4 text-brand-deep" />
                  Engineering Rule of Thumb for Victorian/Southern Installations:
                </div>
                <p className="text-spec leading-relaxed">
                  In Southern Victoria, Tasmania, and elevated regions (Ballarat/Dandenongs), winter insolation drops to ~2.0 PSH. Always specify smart dimming profiles or oversized solar collectors (e.g. Pro Blade 125 or Intense 50W) to prevent low-voltage battery disconnects during prolonged June/July overcast spans.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TOOL 2: Wind Region & Pole Sizing Selector */}
      {activeToolTab === "wind-pole-sizing" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Input Parameters */}
            <div className="lg:col-span-5 bg-white p-5 rounded-panel border border-line space-y-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <span className="text-meta font-bold text-body flex items-center gap-1.5">
                  <Wind className="w-4 h-4 text-brand-deep" />
                  AS 1170.2 Structural Wind Criteria
                </span>
                <span className="text-spec font-bold text-brand-deep">AS/NZS 1158</span>
              </div>

              {/* Wind Region */}
              <div>
                <label className="block text-spec font-bold uppercase tracking-wider text-ink-dim mb-1">
                  Australian Wind Region (AS/NZS 1170.2)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["A", "B", "C", "D"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setWindRegion(r)}
                      className={`p-2.5 rounded-edge border text-left cursor-pointer transition-all ${
                        windRegion === r
                          ? "bg-brand-wash border-brand text-brand-deep font-bold"
                          : "bg-paper border-line text-meta hover:bg-raised"
                      }`}
                    >
                      <div className="text-meta font-bold">Region {r}</div>
                      <div className="text-spec text-ink-dim">{WIND_REGION_INFO[r].speed} m/s ({WIND_REGION_INFO[r].speedKmh} km/h)</div>
                    </button>
                  ))}
                </div>
                <p className="text-spec text-ink-faint mt-1">
                  {WIND_REGION_INFO[windRegion].desc}
                </p>
              </div>

              {/* Terrain Category */}
              <div>
                <label className="block text-spec font-bold uppercase tracking-wider text-ink-dim mb-1">
                  Terrain Category (Surrounding Exposure)
                </label>
                <select
                  value={terrainCategory}
                  onChange={(e) => setTerrainCategory(e.target.value as any)}
                  className="w-full p-2.5 bg-paper text-meta rounded-edge border border-line focus:outline-none focus:ring-2 focus:ring-brand font-medium"
                >
                  {Object.entries(TERRAIN_FACTORS).map(([tc, info]) => (
                    <option key={tc} value={tc}>
                      {info.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pole Height */}
              <div>
                <label className="block text-spec font-bold uppercase tracking-wider text-ink-dim mb-1">
                  Pole Mounting Height
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[4.5, 6.0, 8.0, 10.0].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setPoleHeight(h)}
                      className={`py-2 rounded-edge border text-center font-bold text-meta cursor-pointer transition-colors ${
                        poleHeight === h
                          ? "bg-brand-deep text-white border-brand-deep shadow-xs"
                          : "bg-paper text-body border-line hover:bg-raised"
                      }`}
                    >
                      {h} Metres
                    </button>
                  ))}
                </div>
              </div>

              {/* Pole Material */}
              <div>
                <label className="block text-spec font-bold uppercase tracking-wider text-ink-dim mb-1.5">
                  Pole Material / Technology
                </label>
                <div className="space-y-2">
                  {[
                    { id: "composite", name: "Plaspole Recycled Composite", sub: "Class 1 corrosion proof, zero maintenance, non-conductive" },
                    { id: "steel", name: "Galvanised Mild Steel (AS/NZS 4680)", sub: "High structural mass, standard council specification" },
                    { id: "safepole", name: "SafePole Crash-Absorbing Slip-Base", sub: "Tested to AS/NZS 3845 for high-speed arterial verges" }
                  ].map((mat) => (
                    <label
                      key={mat.id}
                      onClick={() => setPoleMaterial(mat.id as any)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-edge border cursor-pointer transition-colors ${
                        poleMaterial === mat.id
                          ? "bg-brand-wash border-brand"
                          : "bg-paper border-line hover:bg-raised"
                      }`}
                    >
                      <input
                        type="radio"
                        name="material"
                        checked={poleMaterial === mat.id}
                        onChange={() => {}}
                        className="mt-0.5 accent-brand-deep"
                      />
                      <div>
                        <div className="text-meta font-bold text-body">{mat.name}</div>
                        <div className="text-spec text-ink-dim">{mat.sub}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Head EPA */}
              <div>
                <label className="block text-spec font-bold uppercase tracking-wider text-ink-dim mb-1">
                  Top Solar / Luminaire EPA (Projected Area)
                </label>
                <select
                  value={headEpa}
                  onChange={(e) => setHeadEpa(Number(e.target.value))}
                  className="w-full p-2.5 bg-paper text-meta rounded-edge border border-line focus:outline-none focus:ring-2 focus:ring-brand font-medium"
                >
                  <option value={0.12}>Standard LED Luminaire only (EPA ~0.12 m²)</option>
                  <option value={0.32}>Integrated All-in-One Solar Luminaire (EPA ~0.32 m²)</option>
                  <option value={0.65}>Split Solar Panel Array + Luminaire (EPA ~0.65 m²)</option>
                  <option value={1.10}>Dual Solar Collector + CCTV Array (EPA ~1.10 m²)</option>
                </select>
              </div>

            </div>

            {/* Calculated Structural Output */}
            <div className="lg:col-span-7 space-y-4">
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-panel border border-line shadow-2xs">
                  <span className="text-spec font-bold text-ink-dim uppercase tracking-wider block">Design Wind Speed</span>
                  <div className="text-2xl font-black text-body mt-1">
                    {windCalculations.vdesKmh} <span className="text-meta font-normal text-ink-dim">km/h</span>
                  </div>
                  <span className="text-spec text-ink-faint mt-0.5 block">{windCalculations.vdes} m/s ultimate</span>
                </div>

                <div className="bg-white p-4 rounded-panel border border-line shadow-2xs">
                  <span className="text-spec font-bold text-ink-dim uppercase tracking-wider block">Base Overturning Moment</span>
                  <div className="text-2xl font-black text-brand-deep mt-1">
                    {windCalculations.totalBaseMomentKNm} <span className="text-meta font-normal text-ink-dim">kNm</span>
                  </div>
                  <span className="text-spec text-ink-faint mt-0.5 block">Dynamic wind drag</span>
                </div>

                <div className="bg-white p-4 rounded-panel border border-line shadow-2xs col-span-2 sm:col-span-1">
                  <span className="text-spec font-bold text-ink-dim uppercase tracking-wider block">Pole Weight</span>
                  <div className="text-2xl font-black text-soon mt-1">
                    {windCalculations.poleWeightKg} <span className="text-meta font-normal text-ink-dim">kg</span>
                  </div>
                  <span className="text-spec text-ink-faint mt-0.5 block">Manual handling rating</span>
                </div>
              </div>

              {/* Foundation & Mounting Recommendation */}
              <div className="bg-white p-5 rounded-panel border border-line shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <h3 className="font-bold text-meta text-body flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-brand-deep" />
                    Foundation &amp; Engineering Specification
                  </h3>
                  <button
                    onClick={() =>
                      handleCopyText(
                        `Structural Pole Specification (AS 1170.2 / AS/NZS 1158):\nHeight: ${poleHeight}m | Region: ${windRegion} (${windCalculations.vdesKmh} km/h)\nDirect Burial Depth: ${windCalculations.directBurialDepth}m in standard soil\nRagbolt Spec: ${windCalculations.ragboltSpec}\nFooting Concrete Volume: ${windCalculations.concreteVolumeM3} m³\nMaterial: ${poleMaterial === "composite" ? "Plaspole Recycled Composite" : "Galvanised Steel"}`,
                        "Structural Pole Specification"
                      )
                    }
                    className="text-spec font-bold text-brand-deep hover:bg-brand-wash px-2.5 py-1 rounded-edge border border-brand-edge flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    Copy Engineering Spec
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3.5 rounded-edge bg-paper border border-line space-y-1">
                    <span className="text-spec font-bold text-ink-dim uppercase tracking-wider block">
                      Option A: Direct Burial (In-Ground Root)
                    </span>
                    <div className="text-lg font-black text-body">
                      {windCalculations.directBurialDepth} Metres Planting Depth
                    </div>
                    <p className="text-spec text-ink-dim">
                      Standard compacted granular / stabilized backfill with cable entry aperture at 500mm depth.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-edge bg-paper border border-line space-y-1">
                    <span className="text-spec font-bold text-ink-dim uppercase tracking-wider block">
                      Option B: Ragbolt Baseplate &amp; Footing
                    </span>
                    <div className="text-meta font-bold text-body">
                      {windCalculations.ragboltSpec}
                    </div>
                    <p className="text-spec text-ink-dim">
                      Minimum concrete footing block: ~{windCalculations.concreteVolumeM3} m³ (N25 / 25MPa concrete).
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-edge bg-brand-wash border border-brand-edge space-y-1">
                  <div className="text-spec font-bold text-brand-deep uppercase tracking-wider flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Material Specific Advantage:
                  </div>
                  <p className="text-meta text-body font-medium">
                    {windCalculations.materialBenefit}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TOOL 3: Polymeric Cable Cover & Trenching Calculator */}
      {activeToolTab === "cable-cover-calc" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Input Controls */}
            <div className="lg:col-span-5 bg-white p-5 rounded-panel border border-line space-y-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <span className="text-meta font-bold text-body flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-brand-deep" />
                  Trenching &amp; Cable Parameters
                </span>
                <span className="text-spec font-bold text-brand-deep">AS 4702 &amp; AS/NZS 3000</span>
              </div>

              {/* Service Type */}
              <div>
                <label className="block text-spec font-bold uppercase tracking-wider text-ink-dim mb-1">
                  Underground Service / Voltage Class
                </label>
                <select
                  value={cableVoltageType}
                  onChange={(e) => setCableVoltageType(e.target.value)}
                  className="w-full p-2.5 bg-paper text-meta rounded-edge border border-line focus:outline-none focus:ring-2 focus:ring-brand font-medium"
                >
                  <option value="LV">Low Voltage Electrical (240V / 415V URD)</option>
                  <option value="HV">High Voltage Feeder (11kV / 22kV / 33kV Network)</option>
                  <option value="SOLAR">Solar Farm DC / MV Collector Trench</option>
                  <option value="TELECOM">Telecommunications &amp; NBN Fibre Conduits</option>
                  <option value="RAIL">Rail Signalling &amp; Traction Power</option>
                </select>
              </div>

              {/* Trench Length */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-spec font-bold uppercase tracking-wider text-ink-dim">
                    Total Trench Length (Metres)
                  </label>
                  <span className="text-meta font-bold text-brand-deep">{trenchLengthM}m</span>
                </div>
                <input
                  type="number"
                  min="10"
                  max="10000"
                  step="10"
                  value={trenchLengthM}
                  onChange={(e) => setTrenchLengthM(Number(e.target.value))}
                  className="w-full p-2 bg-paper text-meta rounded-edge border border-line focus:outline-none focus:ring-2 focus:ring-brand font-bold"
                />
              </div>

              {/* Parallel Conduits */}
              <div>
                <label className="block text-spec font-bold uppercase tracking-wider text-ink-dim mb-1">
                  Parallel Conduit Rows / Width Runs
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setConduitParallelCount(count)}
                      className={`py-2 rounded-edge border text-center font-bold text-meta cursor-pointer transition-colors ${
                        conduitParallelCount === count
                          ? "bg-brand-deep text-white border-brand-deep shadow-xs"
                          : "bg-paper text-body border-line hover:bg-raised"
                      }`}
                    >
                      {count} {count === 1 ? "Row" : "Rows"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cover Slab Width */}
              <div>
                <label className="block text-spec font-bold uppercase tracking-wider text-ink-dim mb-1">
                  Slab Width (mm)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[150, 200, 300].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setCoverSlabWidthMm(w)}
                      className={`py-2 rounded-edge border text-center font-bold text-meta cursor-pointer transition-colors ${
                        coverSlabWidthMm === w
                          ? "bg-brand-wash border-brand text-brand-deep"
                          : "bg-paper text-body border-line hover:bg-raised"
                      }`}
                    >
                      {w}mm Wide
                    </button>
                  ))}
                </div>
              </div>

              {/* Burial Depth */}
              <div>
                <label className="block text-spec font-bold uppercase tracking-wider text-ink-dim mb-1">
                  Trench Depth to Base (mm)
                </label>
                <select
                  value={burialDepthMm}
                  onChange={(e) => setBurialDepthMm(Number(e.target.value))}
                  className="w-full p-2.5 bg-paper text-meta rounded-edge border border-line focus:outline-none focus:ring-2 focus:ring-brand font-medium"
                >
                  <option value={500}>500mm (Standard LV in non-vehicular turf)</option>
                  <option value={600}>600mm (Standard Road Verge LV)</option>
                  <option value={750}>750mm (High Voltage / Road Crossing AS/NZS 3000)</option>
                  <option value={1000}>1000mm (Deep Infrastructure / Heavy Transport Road)</option>
                </select>
              </div>
            </div>

            {/* Calculations & Commercial Benefits Output */}
            <div className="lg:col-span-7 space-y-4">
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-panel border border-line shadow-2xs">
                  <span className="text-spec font-bold text-ink-dim uppercase tracking-wider block">Plasgain Slabs Required</span>
                  <div className="text-2xl font-black text-body mt-1">
                    {cableCoverCalculations.totalSlabsRequired} <span className="text-meta font-normal text-ink-dim">units</span>
                  </div>
                  <span className="text-spec text-ink-faint mt-0.5 block">1000mm interlocking slabs</span>
                </div>

                <div className="bg-white p-4 rounded-panel border border-line shadow-2xs">
                  <span className="text-spec font-bold text-ink-dim uppercase tracking-wider block">Weight Avoided (WHS)</span>
                  <div className="text-2xl font-black text-brand-deep mt-1">
                    {cableCoverCalculations.weightAvoidedTonnes} <span className="text-meta font-normal text-ink-dim">Tonnes</span>
                  </div>
                  <span className="text-spec text-ink-faint mt-0.5 block">Manual lifting saved vs concrete</span>
                </div>

                <div className="bg-white p-4 rounded-panel border border-line shadow-2xs col-span-2 sm:col-span-1">
                  <span className="text-spec font-bold text-ink-dim uppercase tracking-wider block">Transport Pallets</span>
                  <div className="text-2xl font-black text-soon mt-1">
                    {cableCoverCalculations.polymerPallets} <span className="text-meta font-normal text-ink-dim">Pallets</span>
                  </div>
                  <span className="text-spec text-ink-faint mt-0.5 block">vs {cableCoverCalculations.concretePallets} concrete pallets</span>
                </div>
              </div>

              {/* Civil Tender Comparison Box */}
              <div className="bg-white p-5 rounded-panel border border-line shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <h3 className="font-bold text-meta text-body flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-brand-deep" />
                    Civil &amp; Electrical Protection Bill of Materials
                  </h3>
                  <button
                    onClick={() =>
                      handleCopyText(
                        `Civil Protection Schedule (AS 4702 / AS/NZS 3000):\nTrench Length: ${trenchLengthM}m (${conduitParallelCount} runs)\nPlasgain Polymeric Cover Slabs (1000x${coverSlabWidthMm}mm): ${cableCoverCalculations.totalSlabsRequired} units\nTotal Material Weight: ${cableCoverCalculations.totalPolymericWeightKg} kg (${cableCoverCalculations.polymerPallets} pallets)\nWarning Tape Required: ${cableCoverCalculations.warningTapeMeters}m\nWHS Manual Handling Reduction: ${cableCoverCalculations.weightAvoidedTonnes} Tonnes avoided vs concrete`,
                        "Cable Cover Bill of Materials"
                      )
                    }
                    className="text-spec font-bold text-brand-deep hover:bg-brand-wash px-2.5 py-1 rounded-edge border border-brand-edge flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    Copy BOM Schedule
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-meta">
                    <thead>
                      <tr className="border-b border-line text-spec font-bold text-ink-dim uppercase">
                        <th className="text-left py-2">Item Description</th>
                        <th className="text-left py-2">Plasgain Polymeric Slabs</th>
                        <th className="text-left py-2">Traditional Precast Concrete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      <tr>
                        <td className="py-2 font-medium">Unit Weight</td>
                        <td className="py-2 text-brand-deep font-bold">~3.4 kg (1 Person Safe Lift)</td>
                        <td className="py-2 text-urgent font-medium">~26.5 kg (2 Person / Crane)</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium">Total Project Weight</td>
                        <td className="py-2 text-brand-deep font-bold">{cableCoverCalculations.totalPolymericWeightKg} kg</td>
                        <td className="py-2 text-urgent font-medium">{cableCoverCalculations.totalConcreteWeightKg} kg</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium">Freight Pallet Count</td>
                        <td className="py-2 text-brand-deep font-bold">{cableCoverCalculations.polymerPallets} Pallets</td>
                        <td className="py-2 text-ink-dim">{cableCoverCalculations.concretePallets} Heavy Pallets (5x Volume)</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium">Warning Tape</td>
                        <td className="py-2 font-medium" colSpan={2}>
                          {cableCoverCalculations.warningTapeMeters}m AS/NZS 2648.1 Underground Warning Tape
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-3 rounded-edge bg-brand-wash border border-brand-edge text-spec text-brand-deep leading-relaxed">
                  <strong>Civil Specifier Note:</strong> Plasgain polymeric cable cover slabs are molded from high-impact resistant, recycled polymer meeting AS 4702 Category 1 mechanical strike protection standards. Fully compliant with AS/NZS 3000 Clause 3.11 for all Australian network utility distribution trenches.
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TOOL 4: Conflict & Specification Resolver */}
      {activeToolTab === "conflict-resolver" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Conflict Directory */}
            <div className="lg:col-span-5 bg-white p-5 rounded-panel border border-line space-y-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <span className="text-meta font-bold text-body flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-urgent" />
                  Registered Specification Discrepancies
                </span>
                <span className="text-spec font-bold px-2 py-0.5 rounded bg-urgent-wash text-urgent">
                  {CONFLICT_REGISTER_DATA.length} Registered
                </span>
              </div>

              {/* Search filter */}
              <div className="relative">
                <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={conflictSearch}
                  onChange={(e) => setConflictSearch(e.target.value)}
                  placeholder="Filter conflicts by product or specification..."
                  className="w-full pl-9 pr-3 py-2 bg-paper text-meta rounded-edge border border-line focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              {/* Conflict items list */}
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {filteredConflicts.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedConflictId(item.id)}
                    className={`w-full text-left p-3 rounded-edge border transition-all cursor-pointer ${
                      activeConflict.id === item.id
                        ? "bg-brand-wash border-brand shadow-xs"
                        : "bg-paper hover:bg-raised border-line"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-meta text-body">{item.product}</span>
                      <span
                        className={`text-spec font-bold px-2 py-0.5 rounded-full ${
                          item.severity === "High"
                            ? "bg-urgent-wash text-urgent"
                            : item.severity === "Medium"
                            ? "bg-hold-wash text-hold"
                            : "bg-line text-ink-dim"
                        }`}
                      >
                        {item.severity} Risk
                      </span>
                    </div>
                    <p className="text-spec text-ink-dim mt-1 line-clamp-2">
                      {item.nature}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Grounded Resolution View */}
            <div className="lg:col-span-7 space-y-4">
              
              <div className="bg-white p-5 rounded-panel border border-line shadow-2xs space-y-4">
                <div className="flex items-start justify-between pb-3 border-b border-line">
                  <div>
                    <span className="text-spec font-bold text-urgent uppercase tracking-wider">
                      Discrepancy Detail • {activeConflict.severity} Priority
                    </span>
                    <h2 className="text-lg font-bold text-body mt-0.5">{activeConflict.product}</h2>
                  </div>
                  <button
                    onClick={() =>
                      handleCopyText(
                        `Product Conflict Resolution (${activeConflict.product}):\nNature: ${activeConflict.nature}\nDetails: ${activeConflict.details}\nSales & Quoting Rule: ${activeConflict.actionRequired}`,
                        "Conflict Resolution Guide"
                      )
                    }
                    className="text-spec font-bold text-brand-deep hover:bg-brand-wash px-2.5 py-1 rounded-edge border border-brand-edge flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    Copy Resolution Rule
                  </button>
                </div>

                {/* Problem Statement */}
                <div className="space-y-1">
                  <span className="text-spec font-bold text-ink-dim uppercase tracking-wider block">
                    Exact Discrepancy in Public Literature
                  </span>
                  <div className="p-3.5 rounded-edge bg-urgent-wash border border-urgent-edge text-meta text-urgent leading-relaxed font-medium">
                    {activeConflict.details}
                  </div>
                </div>

                {/* Nature of Conflict */}
                <div className="space-y-1">
                  <span className="text-spec font-bold text-ink-dim uppercase tracking-wider block">
                    Core Technical Nature
                  </span>
                  <div className="p-3 rounded-edge bg-paper border border-line text-meta text-body">
                    {activeConflict.nature}
                  </div>
                </div>

                {/* Ground Truth & Quoting Action */}
                <div className="space-y-1">
                  <span className="text-spec font-bold text-brand-deep uppercase tracking-wider block flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Authority Level 1 Quoting Rule (How to Handle):
                  </span>
                  <div className="p-3.5 rounded-edge bg-brand-wash border border-brand-edge text-meta text-brand-deep leading-relaxed font-semibold">
                    {activeConflict.actionRequired}
                  </div>
                </div>
              </div>

              {/* General Grounded Hierarchy Rule */}
              <div className="p-4 rounded-panel bg-raised border border-line space-y-1.5 text-meta text-ink-dim">
                <span className="text-spec font-bold text-body uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-brand-deep" />
                  Plasgain Document Hierarchy Principle
                </span>
                <p className="text-spec leading-relaxed">
                  1. Current approved internal documents override all public claims.<br />
                  2. Current approved product datasheets control technical specs.<br />
                  3. If a customer observes a public catalogue discrepancy, never guess or self-correct — acknowledge the exact model code on the current factory engineering sheet.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TOOL 5: Tender / RFQ Analyser */}
      {activeToolTab === "tender-analyser" && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-panel border border-line space-y-4 shadow-2xs">
            <h2 className="text-base font-bold text-body">Tender &amp; RFQ Specification Extractor</h2>
            <p className="text-meta text-ink-dim">
              Paste tender clauses or council requirements to extract lighting standards, autonomy requirements, mounting heights, and CCT limits.
            </p>
            <textarea
              value={tenderText}
              onChange={(e) => setTenderText(e.target.value)}
              rows={4}
              className="w-full p-3 bg-paper text-meta rounded-edge border border-line focus:outline-none focus:ring-2 focus:ring-brand font-mono text-spec"
            />
            <div className="p-3 rounded-edge bg-raised border border-line text-meta space-y-2">
              <span className="text-spec font-bold uppercase tracking-wider text-ink-dim">Extracted Tender Checklist</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-spec">
                <div className="bg-white p-2 rounded border border-line font-medium">Standards: AS/NZS 1158.3.1 (P4)</div>
                <div className="bg-white p-2 rounded border border-line font-medium">Pole Height: 6.0 Metres</div>
                <div className="bg-white p-2 rounded border border-line font-medium">Min Autonomy: 4 Nights</div>
                <div className="bg-white p-2 rounded border border-line font-medium">CCT Limit: 3000K Warm White</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOOL 6: Quote Reviewer */}
      {activeToolTab === "quote-review" && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-panel border border-line space-y-4 shadow-2xs">
            <h2 className="text-base font-bold text-body">Quote Accuracy &amp; Discrepancy Reviewer</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-spec font-bold uppercase text-ink-dim mb-1">Customer Enquiry Specification</label>
                <textarea
                  value={quoteEnquiryText}
                  onChange={(e) => setQuoteEnquiryText(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 bg-paper text-meta rounded-edge border border-line font-mono text-spec"
                />
              </div>
              <div>
                <label className="block text-spec font-bold uppercase text-ink-dim mb-1">Draft Quote Line Items</label>
                <textarea
                  value={quoteItemsText}
                  onChange={(e) => setQuoteItemsText(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 bg-paper text-meta rounded-edge border border-line font-mono text-spec"
                />
              </div>
            </div>
            <div className="p-3.5 rounded-edge bg-urgent-wash border border-urgent-edge text-meta text-urgent">
              <strong>Discrepancy Detected:</strong> Customer requested 3000K Warm White (for wildlife protection), but draft quote specified 4000K Cool White. Recommend amending luminaire code to 3000K SKU.
            </div>
          </div>
        </div>
      )}

      {/* TOOL 7: Product Comparison */}
      {activeToolTab === "product-comparison" && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-panel border border-line space-y-4 shadow-2xs">
            <h2 className="text-base font-bold text-body">Side-by-Side Product Comparison</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-spec font-bold text-ink-dim uppercase mb-1">Product 1</label>
                <input
                  type="text"
                  value={product1}
                  onChange={(e) => setProduct1(e.target.value)}
                  className="w-full p-2 bg-paper text-meta rounded-edge border border-line font-bold"
                />
              </div>
              <div>
                <label className="block text-spec font-bold text-ink-dim uppercase mb-1">Product 2</label>
                <input
                  type="text"
                  value={product2}
                  onChange={(e) => setProduct2(e.target.value)}
                  className="w-full p-2 bg-paper text-meta rounded-edge border border-line font-bold"
                />
              </div>
            </div>
            <div className="p-4 rounded-edge bg-paper border border-line text-meta space-y-2">
              <div className="font-bold text-body">Comparison Analysis:</div>
              <p className="text-spec text-ink-dim">
                <strong>{product1}</strong> is an all-in-one solar platform featuring LiFePO4 battery integrated behind the PV panel. <strong>{product2}</strong> is a split luminaire designed for high-mast cyclonic wind zones where panel tilt must be decoupled from luminaire outreach.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
