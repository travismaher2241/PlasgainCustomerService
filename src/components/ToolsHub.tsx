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
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Wind,
  Truck,
  Plus,
  X,
  Building2,
  DollarSign,
  Package,
  Check,
  Sun,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Search,
  FileText
} from "lucide-react";
import { useApp, ToolSubTab } from "../context/AppContext";
import { PlanTakeoffWorkspace } from "./PlanTakeoffWorkspace";
import { OpportunityProductLine } from "../types/crm";
import {
  LIGHTING_STANDARDS_CATEGORIES,
  getLightingCategory,
  DATASET_METADATA
} from "../data/lightingStandards";

export const ToolsHub: React.FC = () => {
  const {
    activeToolTab,
    setActiveToolTab,
    crmOpportunities,
    accounts,
    pipelines,
    addCrmOpportunity,
    updateCrmOpportunity,
    navigateToCRM,
    currentUser,
    showToast
  } = useApp();

  // -------------------------------------------------------------
  // Tool 1: Trench Polymeric Cable Cover & Weight Offset
  // -------------------------------------------------------------
  const [trenchLengthMeters, setTrenchLengthMeters] = useState<number>(250);
  const [cableVoltage, setCableVoltage] = useState<"LV_240_415" | "HV_11kV" | "HV_22kV_33kV" | "COMMS_FIBRE">("LV_240_415");
  const [trenchWidthMm, setTrenchWidthMm] = useState<number>(300);
  const [concreteThicknessMm, setConcreteThicknessMm] = useState<number>(50);
  const [showCableComparison, setShowCableComparison] = useState(false);
  const [showCableAssumptions, setShowCableAssumptions] = useState(false);

  const cableCoverCalculations = useMemo(() => {
    let thicknessMm = 5;
    let weightPerRoll150 = 18;
    let weightPerRoll300 = 36;
    let productName = "AS 4702 5mm Polymeric Cable Cover (LV 240V/415V)";
    let productCode = "PCC-200-1M";
    let rollUnitPrice = 145;

    if (cableVoltage === "HV_11kV") {
      thicknessMm = 6;
      weightPerRoll150 = 22;
      weightPerRoll300 = 44;
      productName = "AS 4702 6mm Heavy Duty Polymeric Cover (HV 11kV)";
      productCode = "PCC-200-6MM-HV";
      rollUnitPrice = 185;
    } else if (cableVoltage === "HV_22kV_33kV") {
      thicknessMm = 10;
      weightPerRoll150 = 36;
      weightPerRoll300 = 72;
      productName = "AS 4702 10mm Extra Heavy Duty Mechanical Protection (HV 22kV/33kV)";
      productCode = "PCC-300-10MM-EHD";
      rollUnitPrice = 265;
    } else if (cableVoltage === "COMMS_FIBRE") {
      thicknessMm = 4;
      weightPerRoll150 = 14;
      weightPerRoll300 = 28;
      productName = "AS 4702 4mm Telecommunications Polymeric Warning Cover";
      productCode = "PCC-150-COMMS";
      rollUnitPrice = 115;
    }

    const selectedStripWidthMm = trenchWidthMm <= 150 ? 150 : 300;
    const parallelStrips = Math.ceil(trenchWidthMm / selectedStripWidthMm);
    const rollsPerStrip = Math.ceil(trenchLengthMeters / 20);
    const rollsNeeded150 = rollsPerStrip * Math.ceil(trenchWidthMm / 150);
    const rollsNeeded300 = rollsPerStrip * parallelStrips;
    const totalRolls = selectedStripWidthMm === 150 ? rollsNeeded150 : rollsNeeded300;
    const totalCoverageMetres = totalRolls * 20;
    const polymericTotalWeightKg = totalRolls * (selectedStripWidthMm === 150 ? weightPerRoll150 : weightPerRoll300);

    if (cableVoltage === "LV_240_415") {
      productCode = selectedStripWidthMm === 150 ? "PCC-150-20M" : "PCC-300-20M";
      productName = `AS 4702 5mm Polymeric Cable Cover (${selectedStripWidthMm}mm x 20m roll)`;
    }

    // Concrete comparison
    const concreteVolumeM3 = trenchLengthMeters * (trenchWidthMm / 1000) * (concreteThicknessMm / 1000);
    const concreteWeightKg = concreteVolumeM3 * 2400;
    const concreteSlabsCount = Math.ceil(trenchLengthMeters / 1.0);
    const weightSavedKg = Math.max(0, concreteWeightKg - polymericTotalWeightKg);
    const weightReductionPercent = Math.round((weightSavedKg / (concreteWeightKg || 1)) * 100);

    const concreteCo2Kg = concreteWeightKg * 0.14;
    const polyCo2Kg = polymericTotalWeightKg * 0.08;
    const co2SavedKg = Math.round(concreteCo2Kg - polyCo2Kg);
    const estimatedSell = totalRolls * rollUnitPrice;

    return {
      thicknessMm,
      productName,
      productCode,
      rollUnitPrice,
      totalRolls,
      totalCoverageMetres,
      selectedStripWidthMm,
      parallelStrips,
      polymericTotalWeightKg,
      concreteWeightKg,
      concreteSlabsCount,
      weightSavedKg,
      weightReductionPercent,
      co2SavedKg,
      estimatedSell
    };
  }, [trenchLengthMeters, cableVoltage, trenchWidthMm, concreteThicknessMm]);

  // -------------------------------------------------------------
  // Tool 2: AS/NZS 1158 Pathway Pole Spacing & Quantity
  // -------------------------------------------------------------
  const [pathWidthM, setPathWidthM] = useState<number>(3.0);
  const [poleHeightM, setPoleHeightM] = useState<number>(5.0);
  const [subCategory, setSubCategory] = useState<string>("P4");
  const [luminaireFamily, setLuminaireFamily] = useState<string>("PBS_75W");
  const [projectLengthMeters, setProjectLengthMeters] = useState<number>(1000);
  const [showSpacingAssumptions, setShowSpacingAssumptions] = useState(false);

  const spacingCalculations = useMemo(() => {
    const cat = getLightingCategory(subCategory) || getLightingCategory("P4")!;

    let rawLumens = 7500;
    let luminaireModel = "Plasgain Pro Blade Solar 75W (Type 2 Optics)";
    let luminaireSKU = "PBS-75W-SOLAR";
    let luminaireUnitPrice = 1950;
    let poleSKU = "PP-050-DB";
    let poleModel = "Plasgain 5.0m Direct Burial Composite Pole";
    let poleUnitPrice = 780;

    if (luminaireFamily === "INTENSE_50W") {
      rawLumens = 5000;
      luminaireModel = "Plasgain Intense Light 50W Solar (Asymmetric Pathway Optics)";
      luminaireSKU = "INTENSE-50W-3K";
      luminaireUnitPrice = 1850;
      poleSKU = "PP-045-DB";
      poleModel = "Plasgain 4.5m Direct Burial Composite Pole";
      poleUnitPrice = 690;
    } else if (luminaireFamily === "PBS_100W") {
      rawLumens = 10000;
      luminaireModel = "Plasgain Pro Blade Solar 100W (High-Output Pathway Optics)";
      luminaireSKU = "PBS-100W-SOLAR";
      luminaireUnitPrice = 2200;
      poleSKU = "PP-060-DB";
      poleModel = "Plasgain 6.0m Direct Burial Composite Pole";
      poleUnitPrice = 890;
    }

    const E_avg = cat.maintainedIlluminanceLux;
    const UF = 0.42;
    const MF = 0.85;
    const calculatedSpacingM = Math.min(65, Math.max(18, Math.round((rawLumens * UF * MF) / (E_avg * pathWidthM))));
    const polesForProject = Math.max(2, Math.ceil(projectLengthMeters / calculatedSpacingM) + 1);

    const totalPackageCostPerPole = luminaireUnitPrice + poleUnitPrice;
    const totalProjectSell = polesForProject * totalPackageCostPerPole;

    return {
      cat,
      calculatedSpacingM,
      polesForProject,
      luminaireModel,
      luminaireSKU,
      luminaireUnitPrice,
      poleSKU,
      poleModel,
      poleUnitPrice,
      totalPackageCostPerPole,
      totalProjectSell
    };
  }, [subCategory, luminaireFamily, pathWidthM, poleHeightM, projectLengthMeters]);

  // -------------------------------------------------------------
  // Tool 3: Foundations & Structural Embedment
  // -------------------------------------------------------------
  const [windRegion, setWindRegion] = useState<"Region_A" | "Region_B" | "Region_C" | "Region_D">("Region_A");
  const [foundationPoleHeight, setFoundationPoleHeight] = useState<number>(6.0);
  const [poleMaterial, setPoleMaterial] = useState<"Composite_Plaspole" | "Galvanized_Steel">("Composite_Plaspole");
  const [foundationType, setFoundationType] = useState<"Direct_Burial" | "Baseplate_Ragbolt">("Direct_Burial");
  const [soilType, setSoilType] = useState<"CLASS_M_CLAY" | "CLASS_S_SOFT" | "CLASS_A_SAND_ROCK">("CLASS_M_CLAY");
  const [foundationQuantity, setFoundationQuantity] = useState<number>(18);
  const [destState, setDestState] = useState<"VIC" | "NSW" | "QLD" | "SA" | "WA" | "NT" | "TAS">("VIC");

  const foundationCalculations = useMemo(() => {
    const windMap = {
      Region_A: { speed: "41 m/s (148 km/h)", desc: "Normal Inland (Melbourne, Ballarat, Sydney, Canberra)" },
      Region_B: { speed: "48 m/s (173 km/h)", desc: "Coastal Non-Cyclonic (Brisbane, Gold Coast, Newcastle)" },
      Region_C: { speed: "56 m/s (202 km/h)", desc: "Cyclonic (Townsville, Mackay, Cairns, Darwin)" },
      Region_D: { speed: "66 m/s (238 km/h)", desc: "Severe Cyclonic (Karratha, Port Hedland, Exmouth)" }
    };
    const wData = windMap[windRegion];

    let embedmentDepthM = 1.2;
    let footingDiameterMm = 350;

    if (foundationPoleHeight <= 4.5) {
      embedmentDepthM = windRegion === "Region_A" ? 1.0 : windRegion === "Region_B" ? 1.1 : 1.3;
      footingDiameterMm = 300;
    } else if (foundationPoleHeight <= 6.0) {
      embedmentDepthM = windRegion === "Region_A" ? 1.2 : windRegion === "Region_B" ? 1.3 : 1.6;
      footingDiameterMm = 350;
    } else if (foundationPoleHeight <= 8.0) {
      embedmentDepthM = windRegion === "Region_A" ? 1.5 : windRegion === "Region_B" ? 1.7 : 2.0;
      footingDiameterMm = 450;
    } else {
      embedmentDepthM = windRegion === "Region_A" ? 1.8 : windRegion === "Region_B" ? 2.1 : 2.4;
      footingDiameterMm = 500;
    }

    if (soilType === "CLASS_S_SOFT") {
      embedmentDepthM = Number((embedmentDepthM * 1.25).toFixed(2));
      footingDiameterMm += 50;
    } else if (soilType === "CLASS_A_SAND_ROCK") {
      embedmentDepthM = Number((embedmentDepthM * 0.85).toFixed(2));
    }

    const radiusM = footingDiameterMm / 2000;
    const concreteVolPerFootingM3 = Number((Math.PI * radiusM * radiusM * embedmentDepthM).toFixed(3));
    const totalConcreteM3 = Number((concreteVolPerFootingM3 * foundationQuantity).toFixed(2));

    let hardwareSKU = "PLAS-CA-350";
    let hardwareName = "Direct Burial Anti-Rotation Foam Collar Kit (350mm)";
    let hardwareUnitPrice = 85;
    let hardwareWeightKg = 3.5;

    if (foundationType === "Baseplate_Ragbolt") {
      if (foundationPoleHeight <= 6.0 && (windRegion === "Region_A" || windRegion === "Region_B")) {
        hardwareSKU = "RAG-4M18-500";
        hardwareName = "4x M18 x 500mm Grade 8.8 Galvanized J-Bolt Cage & Template";
        hardwareUnitPrice = 185;
        hardwareWeightKg = 12;
      } else {
        hardwareSKU = "RAG-4M24-750";
        hardwareName = "4x M24 x 750mm Grade 8.8 Galvanized J-Bolt Structural Cage";
        hardwareUnitPrice = 285;
        hardwareWeightKg = 24;
      }
    }

    const poleUnitWeightKg = poleMaterial === "Composite_Plaspole" ? foundationPoleHeight * 5.8 : foundationPoleHeight * 22.0;
    const totalShipmentWeightKg = Math.round((poleUnitWeightKg + hardwareWeightKg) * foundationQuantity);

    const freightRatePerKg = {
      VIC: 0.25,
      NSW: 0.45,
      QLD: 0.65,
      SA: 0.55,
      WA: 1.10,
      NT: 1.25,
      TAS: 0.85
    };
    const estimatedFreight = Math.max(350, Math.round(totalShipmentWeightKg * (freightRatePerKg[destState] || 0.5)));

    return {
      windSpeed: wData.speed,
      windDesc: wData.desc,
      embedmentDepthM,
      footingDiameterMm,
      concreteVolPerFootingM3,
      totalConcreteM3,
      hardwareSKU,
      hardwareName,
      hardwareUnitPrice,
      hardwareWeightKg,
      poleUnitWeightKg,
      totalShipmentWeightKg,
      estimatedFreight
    };
  }, [windRegion, foundationPoleHeight, poleMaterial, foundationType, soilType, foundationQuantity, destState]);

  // -------------------------------------------------------------
  // Tool 4: Solar Sizing & Battery Autonomy
  // -------------------------------------------------------------
  const [solarZone, setSolarZone] = useState<"QLD_NT" | "NSW_ACT" | "VIC_TAS" | "WA_SA">("QLD_NT");
  const [solarWatts, setSolarWatts] = useState<number>(50);
  const [solarProfile, setSolarProfile] = useState<"DUSK_DAWN_12H" | "PIR_PROFILE_SMART">("PIR_PROFILE_SMART");
  const [solarAutonomyDays, setSolarAutonomyDays] = useState<number>(5);
  const [solarQuantity, setSolarQuantity] = useState<number>(18);
  const [showSolarAssumptions, setShowSolarAssumptions] = useState(false);

  const solarCalculations = useMemo(() => {
    const zoneMap = {
      QLD_NT: { name: "QLD / NT (Subtropical & Tropical)", psh: 5.2 },
      NSW_ACT: { name: "NSW / ACT (Central East Coast)", psh: 4.5 },
      VIC_TAS: { name: "VIC / TAS (Southern Latitudes)", psh: 3.6 },
      WA_SA: { name: "WA / SA (Western Sunbelt)", psh: 5.8 }
    };

    const z = zoneMap[solarZone];
    const effectiveHours = solarProfile === "DUSK_DAWN_12H" ? 12.0 : 6.0 * 1.0 + 6.0 * 0.3; // 7.8 effective hours
    const dailyWattHours = Math.round(solarWatts * effectiveHours);
    const minBatteryStorageWh = Math.round((dailyWattHours * solarAutonomyDays) / 0.85); // 85% DoD
    const minPvWatts = Math.round((dailyWattHours * 1.35) / z.psh);

    const standardPackages = [
      {
        sku: "INTENSE-50W-3K",
        name: "Plasgain Intense Light 50W Solar (896Wh LiFePO4 / 130W PV)",
        nominalWatts: 50,
        batteryWh: 896,
        pvWatts: 130,
        unitPrice: 1850,
        costPrice: 1200
      },
      {
        sku: "PBS-75W-SOLAR",
        name: "Plasgain Pro Blade Solar 75W (1024Wh LiFePO4 / 150W PV)",
        nominalWatts: 75,
        batteryWh: 1024,
        pvWatts: 150,
        unitPrice: 1950,
        costPrice: 1280
      },
      {
        sku: "PBS-100W-SOLAR",
        name: "Plasgain Pro Blade Solar 100W (1280Wh LiFePO4 / 180W PV)",
        nominalWatts: 100,
        batteryWh: 1280,
        pvWatts: 180,
        unitPrice: 2200,
        costPrice: 1450
      },
      {
        sku: "PBS-125W-SOLAR",
        name: "Plasgain Pro Blade Solar 125W (1536Wh LiFePO4 / 200W PV)",
        nominalWatts: 125,
        batteryWh: 1536,
        pvWatts: 200,
        unitPrice: 2450,
        costPrice: 1600
      }
    ];

    const matchingWattageSKU = standardPackages.find((p) => p.nominalWatts === solarWatts) || standardPackages[0];
    const isCompliant = matchingWattageSKU.batteryWh >= minBatteryStorageWh && matchingWattageSKU.pvWatts >= minPvWatts;
    const shortfallWh = Math.max(0, minBatteryStorageWh - matchingWattageSKU.batteryWh);
    const reserveWh = Math.max(0, matchingWattageSKU.batteryWh - minBatteryStorageWh);

    return {
      zoneName: z.name,
      psh: z.psh,
      dailyWattHours,
      minBatteryStorageWh,
      minPvWatts,
      selectedPackage: matchingWattageSKU,
      isCompliant,
      shortfallWh,
      reserveWh,
      luminaireSKU: matchingWattageSKU.sku,
      luminaireName: matchingWattageSKU.name,
      unitPrice: matchingWattageSKU.unitPrice
    };
  }, [solarZone, solarWatts, solarProfile, solarAutonomyDays]);

  // -------------------------------------------------------------
  // Tool 5: Specification Review (Standards & Tender Clauses)
  // -------------------------------------------------------------
  const [tenderClauseInput, setTenderClauseInput] = useState("");
  const [specAnalysisResult, setSpecAnalysisResult] = useState<{
    clause: string;
    concern: string;
    source: string;
    suggestedResponse: string;
    detailedReasoning?: string;
  } | null>(null);
  const [showSpecExamples, setShowSpecExamples] = useState(false);
  const [showDetailedReasoning, setShowDetailedReasoning] = useState(false);

  const SPEC_EXAMPLES = [
    {
      id: "fauna-cct",
      title: "5700K Daylight LED vs Fauna Dark-Sky Overlay",
      clause: "Supply and install 5700K Daylight LED fittings along riverside shared path reserve.",
      concern: "5700K high blue-spectrum light disrupts nocturnal wildlife and violates local council fauna protection overlays.",
      source: "AS 4282:2019 (Control of Obtrusive Light) & National Light Pollution Guidelines for Wildlife",
      suggestedResponse: "Offer Plasgain 3000K Warm White or 2200K wildlife-friendly luminaire candidates to ensure dark-sky and environmental compliance."
    },
    {
      id: "c5-corrosion",
      title: "Galvanized Steel in C5 Severe Coastal Marine Zone",
      clause: "Supply 6m Rag-bolt Baseplate Hot-Dip Galvanized Steel Poles within 200m of ocean surf beach.",
      concern: "Hot-dip galvanized steel in C5-M marine zones suffers severe accelerated corrosion (4.2–8.4 µm/year zinc loss), risking premature failure in 3-5 years.",
      source: "AS/NZS 2312.2 & AS 4312 (Atmospheric Corrosivity Categories - C5-M)",
      suggestedResponse: "Recommend Plasgain Class 1 Recycled Composite Plaspole (100% rust-proof, non-conductive, 25-year structural warranty) to eliminate corrosion and maintenance repainting."
    },
    {
      id: "spacing-p4",
      title: "80m Pole Spacing on 4.5m Poles vs Category P4",
      clause: "Lighting poles to be spaced at 80m intervals along 3m shared cycleway.",
      concern: "At 80m spacing with 4.5m poles, mid-span illuminance drops below 0.04 lux (failing the 0.85 lux average / 0.17 lux minimum required by Category P4).",
      source: "AS/NZS 1158.3.1:2020 Table 2.1 (Pedestrian Category P4)",
      suggestedResponse: "Adjust pole spacing to 40m–44m on 5.0m poles with Type 2 pathway asymmetric optics to achieve full certified Category P4 compliance."
    }
  ];

  const handleAnalyzeClause = () => {
    if (!tenderClauseInput.trim()) return;

    const text = tenderClauseInput.toLowerCase();
    let concern = "Potential specification ambiguity or non-standard requirement identified.";
    let source = "AS/NZS 1158 / AS 1170.2 General Standards";
    let suggestedResponse = "Request technical clarification from consultant engineer regarding specific performance criteria.";

    if (text.includes("5700k") || text.includes("daylight") || text.includes("fauna") || text.includes("park")) {
      concern = "5700K high blue-spectrum light disrupts nocturnal wildlife and may violate municipal environmental overlays.";
      source = "AS 4282:2019 (Obtrusive Light) & National Light Pollution Guidelines for Wildlife";
      suggestedResponse = "Offer Plasgain 3000K Warm White or 2200K wildlife-friendly luminaire candidates to ensure dark-sky compliance.";
    } else if (text.includes("galv") || text.includes("steel") || text.includes("coast") || text.includes("marine") || text.includes("c5")) {
      concern = "Galvanized steel in coastal marine zones (C5-M) experiences severe zinc loss and accelerated baseplate rust.";
      source = "AS/NZS 2312.2 & AS 4312 (Corrosivity Categories - C5-M)";
      suggestedResponse = "Recommend Plasgain Class 1 Recycled Composite Plaspole (100% rust-proof, non-conductive, 25-year warranty).";
    } else if (text.includes("80m") || text.includes("spacing") || text.includes("p4") || text.includes("p3")) {
      concern = "Excessive pole spacing risks failing AS/NZS 1158.3.1 minimum illuminance and uniformity thresholds.";
      source = "AS/NZS 1158.3.1:2020 Table 2.1 (Pedestrian Lighting)";
      suggestedResponse = "Adjust pole spacing to 40m–44m on 5.0m poles with Type 2 pathway asymmetric optics for certified compliance.";
    }

    setSpecAnalysisResult({
      clause: tenderClauseInput,
      concern,
      source,
      suggestedResponse,
      detailedReasoning: `Clause evaluated against Australian engineering standards and Plasgain certified product parameters. Confirm exact requirements with project consultant.`
    });
    showToast("Specification clause analyzed!", "success");
  };

  // -------------------------------------------------------------
  // Shared Add to Deal Modal
  // -------------------------------------------------------------
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalSourceTool, setModalSourceTool] = useState<"cable-cover" | "pole-spacing" | "wind-foundation" | "solar-autonomy">("cable-cover");
  const [addMode, setAddMode] = useState<"existing" | "new">("existing");
  const [selectedDealId, setSelectedDealId] = useState(crmOpportunities[0]?.id || "");
  const [newDealName, setNewDealName] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || "");
  const [selectedPipelineId, setSelectedPipelineId] = useState(pipelines[0]?.id || "pipe-major-projects");

  const handleOpenAddModal = (source: "cable-cover" | "pole-spacing" | "wind-foundation" | "solar-autonomy") => {
    if (source === "solar-autonomy" && !solarCalculations.isCompliant) {
      showToast("Cannot add insufficient solar package to deal. Engineering review required.", "warning");
      return;
    }
    setModalSourceTool(source);
    if (source === "cable-cover") {
      setNewDealName(`Civil Cable Protection - ${trenchLengthMeters}m Trench`);
    } else if (source === "pole-spacing") {
      setNewDealName(`Pathway Solar Lighting - ${spacingCalculations.polesForProject} Poles (${subCategory})`);
    } else if (source === "solar-autonomy") {
      setNewDealName(`Solar Lighting Package - ${solarQuantity}x ${solarWatts}W (${solarCalculations.zoneName})`);
    } else {
      setNewDealName(`Foundation & Pole Hardware - ${foundationQuantity}x ${foundationPoleHeight}m (${windRegion})`);
    }
    setIsAddModalOpen(true);
  };

  const handleConfirmAddToDeal = () => {
    const linesToAdd: OpportunityProductLine[] = [];

    if (modalSourceTool === "cable-cover") {
      linesToAdd.push({
        id: `prod-calc-${Date.now()}-1`,
        productCode: cableCoverCalculations.productCode,
        productName: cableCoverCalculations.productName,
        category: "Civil Mechanical Protection",
        quantity: cableCoverCalculations.totalRolls,
        unit: "rolls",
        unitPrice: cableCoverCalculations.rollUnitPrice,
        costPrice: Math.round(cableCoverCalculations.rollUnitPrice * 0.65),
        totalPrice: cableCoverCalculations.totalRolls * cableCoverCalculations.rollUnitPrice,
        marginPercent: 35,
        isOstendoVerified: true,
        notes: `AS 4702 Trench Coverage: ${trenchLengthMeters}m run × ${trenchWidthMm}mm width (${cableCoverCalculations.parallelStrips} strips).`
      });
    } else if (modalSourceTool === "pole-spacing") {
      linesToAdd.push(
        {
          id: `prod-calc-${Date.now()}-1`,
          productCode: spacingCalculations.luminaireSKU,
          productName: spacingCalculations.luminaireModel,
          category: "Solar Luminaire",
          quantity: spacingCalculations.polesForProject,
          unit: "ea",
          unitPrice: spacingCalculations.luminaireUnitPrice,
          costPrice: Math.round(spacingCalculations.luminaireUnitPrice * 0.65),
          totalPrice: spacingCalculations.polesForProject * spacingCalculations.luminaireUnitPrice,
          marginPercent: 35,
          isOstendoVerified: true,
          notes: `AS/NZS 1158.3.1 Cat ${subCategory} | Spacing: ${spacingCalculations.calculatedSpacingM}m`
        },
        {
          id: `prod-calc-${Date.now()}-2`,
          productCode: spacingCalculations.poleSKU,
          productName: spacingCalculations.poleModel,
          category: "Composite Pole",
          quantity: spacingCalculations.polesForProject,
          unit: "ea",
          unitPrice: spacingCalculations.poleUnitPrice,
          costPrice: Math.round(spacingCalculations.poleUnitPrice * 0.60),
          totalPrice: spacingCalculations.polesForProject * spacingCalculations.poleUnitPrice,
          marginPercent: 40,
          isOstendoVerified: true,
          notes: `Mounting height ${poleHeightM}m | Non-conductive composite direct burial`
        }
      );
    } else if (modalSourceTool === "wind-foundation") {
      linesToAdd.push({
        id: `prod-calc-${Date.now()}-1`,
        productCode: foundationCalculations.hardwareSKU,
        productName: foundationCalculations.hardwareName,
        category: "Structural Foundation Hardware",
        quantity: foundationQuantity,
        unit: "ea",
        unitPrice: foundationCalculations.hardwareUnitPrice,
        costPrice: Math.round(foundationCalculations.hardwareUnitPrice * 0.68),
        totalPrice: foundationQuantity * foundationCalculations.hardwareUnitPrice,
        marginPercent: 32,
        isOstendoVerified: true,
        notes: `Wind: ${windRegion} (${foundationCalculations.windSpeed}) | Footing: ${foundationCalculations.footingDiameterMm}mm dia × ${foundationCalculations.embedmentDepthM}m depth.`
      });
    } else if (modalSourceTool === "solar-autonomy") {
      linesToAdd.push({
        id: `prod-calc-${Date.now()}-1`,
        productCode: solarCalculations.luminaireSKU,
        productName: solarCalculations.luminaireName,
        category: "Solar Luminaire",
        quantity: solarQuantity,
        unit: "ea",
        unitPrice: solarCalculations.unitPrice,
        costPrice: Math.round(solarCalculations.unitPrice * 0.65),
        totalPrice: solarQuantity * solarCalculations.unitPrice,
        marginPercent: 35,
        isOstendoVerified: true,
        notes: `Solar Sizing: ${solarCalculations.zoneName} (${solarCalculations.psh} PSH) | Min PV: ${solarCalculations.minPvWatts}W | Battery: ${solarCalculations.minBatteryStorageWh}Wh.`
      });
    }

    const addedTotal = linesToAdd.reduce((sum, l) => sum + (l.totalPrice || 0), 0);

    if (addMode === "existing") {
      const targetDeal = crmOpportunities.find((d) => d.id === selectedDealId);
      if (!targetDeal) {
        showToast("Please select a target deal", "warning");
        return;
      }
      const existingProducts = targetDeal.products || [];
      const updatedProducts = [...existingProducts, ...linesToAdd];
      const updatedDealValue = (targetDeal.dealValue || 0) + addedTotal;

      updateCrmOpportunity(targetDeal.id, {
        products: updatedProducts,
        dealValue: updatedDealValue,
        weightedValue: updatedDealValue * (targetDeal.probability / 100),
        latestActivity: `Added ${linesToAdd.length} engineered line item(s) from Tools`,
        latestActivityDate: new Date().toISOString().split("T")[0]
      });

      showToast(`Added items to Deal: "${targetDeal.name}"`, "success");
      setIsAddModalOpen(false);
      navigateToCRM("pipeline", targetDeal.id);
    } else {
      const account = accounts.find((a) => a.id === selectedAccountId) || accounts[0];
      const pipeline = pipelines.find((p) => p.id === selectedPipelineId) || pipelines[0];
      const stage = pipeline.stages[0];
      const newDealId = `deal-calc-${Date.now()}`;

      addCrmOpportunity({
        id: newDealId,
        name: newDealName || "Engineered Lighting Project",
        accountId: account.id,
        accountName: account.name,
        primaryContactId: "con-001",
        primaryContactName: "Technical Estimator",
        opportunityOwner: currentUser.name,
        pipelineId: pipeline.id,
        stageId: stage.id,
        stageName: stage.name,
        dealValue: addedTotal,
        weightedValue: addedTotal * (stage.probability / 100),
        probability: stage.probability,
        forecastCategory: "Pipeline",
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        products: linesToAdd,
        projectApplication: modalSourceTool === "cable-cover" ? "Civil Trench Protection" : "Solar Pathway Lighting",
        location: "Australia",
        customerNeed: `Engineered schedule calculated in Plasgain Tools Hub.`,
        keyRequirements: [`Standards: AS/NZS 1158 / AS 4702 / AS 1170.2`],
        source: "Tools Hub",
        latestActivity: "Created deal with engineered BOM schedule",
        latestActivityDate: new Date().toISOString().split("T")[0],
        nextAction: "Issue quotation and technical schedule to client",
        nextActionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        daysInCurrentStage: 0,
        totalDealAgeDays: 0,
        dealHealth: "Healthy",
        dealHealthReasons: ["Engineered specification schedule verified"],
        notes: `Engineered via Plasgain Tools Hub.`
      });

      showToast(`Created new CRM Deal: "${newDealName}"`, "success");
      setIsAddModalOpen(false);
      navigateToCRM("pipeline", newDealId);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 w-full min-w-0">
      {/* COMPACT SEGMENTED NAVIGATION STRIP */}
      <div className="flex items-center gap-1.5 p-1.5 bg-paper rounded-panel border border-line overflow-x-auto no-scrollbar shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveToolTab("plan-takeoff" as ToolSubTab)}
          className={`px-3.5 py-1.5 text-meta font-bold rounded-edge flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeToolTab === "plan-takeoff"
              ? "bg-brand text-white shadow-xs"
              : "text-ink-dim hover:text-body hover:bg-raised"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Take-off</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveToolTab("cable-cover-calc" as ToolSubTab)}
          className={`px-3.5 py-1.5 text-meta font-bold rounded-edge flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeToolTab === "cable-cover-calc"
              ? "bg-brand text-white shadow-xs"
              : "text-ink-dim hover:text-body hover:bg-raised"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Cable Cover</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveToolTab("pole-spacing-calc" as ToolSubTab)}
          className={`px-3.5 py-1.5 text-meta font-bold rounded-edge flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeToolTab === "pole-spacing-calc"
              ? "bg-brand text-white shadow-xs"
              : "text-ink-dim hover:text-body hover:bg-raised"
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Pole Spacing</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveToolTab("wind-foundation-calc" as ToolSubTab)}
          className={`px-3.5 py-1.5 text-meta font-bold rounded-edge flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeToolTab === "wind-foundation-calc"
              ? "bg-brand text-white shadow-xs"
              : "text-ink-dim hover:text-body hover:bg-raised"
          }`}
        >
          <Wind className="w-4 h-4" />
          <span>Foundations</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveToolTab("solar-autonomy" as ToolSubTab)}
          className={`px-3.5 py-1.5 text-meta font-bold rounded-edge flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeToolTab === "solar-autonomy"
              ? "bg-brand text-white shadow-xs"
              : "text-ink-dim hover:text-body hover:bg-raised"
          }`}
        >
          <Sun className="w-4 h-4" />
          <span>Solar Sizing</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveToolTab("conflict-resolver" as ToolSubTab)}
          className={`px-3.5 py-1.5 text-meta font-bold rounded-edge flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeToolTab === "conflict-resolver"
              ? "bg-brand text-white shadow-xs"
              : "text-ink-dim hover:text-body hover:bg-raised"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Spec Review</span>
        </button>
      </div>

      {/* Tab 1: Plan Take-off (Step 1 Completed, Preserved!) */}
      {activeToolTab === "plan-takeoff" && <PlanTakeoffWorkspace />}

      {/* Tab 2: Polymeric Cable Cover Calculator (PART H & I) */}
      {activeToolTab === "cable-cover-calc" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Inputs Column */}
          <div className="lg:col-span-4 bg-white p-5 rounded-panel border border-line shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-body flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-deep" />
              <span>Trench Parameters</span>
            </h3>

            <div>
              <label className="block text-spec font-bold mb-1">Trench Length (Metres)</label>
              <input
                type="number"
                min={1}
                value={trenchLengthMeters}
                onChange={(e) => setTrenchLengthMeters(Math.max(1, Number(e.target.value)))}
                className="w-full p-2 border border-line rounded-edge text-spec font-mono bg-white"
              />
            </div>

            <div>
              <label className="block text-spec font-bold mb-1">Service Classification</label>
              <select
                value={cableVoltage}
                onChange={(e) => setCableVoltage(e.target.value as any)}
                className="w-full p-2 border border-line rounded-edge text-spec bg-white"
              >
                <option value="LV_240_415">Low Voltage (240V / 415V - AS 4702 5mm)</option>
                <option value="HV_11kV">High Voltage (11kV - AS 4702 6mm)</option>
                <option value="HV_22kV_33kV">High Voltage Transmission (22kV/33kV - 10mm)</option>
                <option value="COMMS_FIBRE">Communications / Fibre (White AS 4702)</option>
              </select>
            </div>

            <div>
              <label className="block text-spec font-bold mb-1">Trench Width</label>
              <select
                value={trenchWidthMm}
                onChange={(e) => setTrenchWidthMm(Number(e.target.value))}
                className="w-full p-2 border border-line rounded-edge text-spec bg-white"
              >
                <option value={150}>150 mm (Single conduit)</option>
                <option value={300}>300 mm (Standard electrical trench)</option>
                <option value={450}>450 mm (Wide multi-conduit trench)</option>
                <option value={600}>600 mm (Heavy service corridor)</option>
              </select>
            </div>

            <div>
              <label className="block text-spec font-bold mb-1">Concrete Slab Benchmark (mm)</label>
              <input
                type="number"
                min={25}
                max={150}
                value={concreteThicknessMm}
                onChange={(e) => setConcreteThicknessMm(Number(e.target.value))}
                className="w-full p-2 border border-line rounded-edge text-spec font-mono bg-white"
              />
            </div>
          </div>

          {/* Results Column (PART H: LEADS WITH PRODUCT, STRIPS, ROLLS, COVERAGE) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white p-5 rounded-panel border border-line shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-line pb-3">
                <div>
                  <span className="text-xs font-bold text-brand-deep uppercase tracking-wider block">
                    Calculated Polymeric Protection
                  </span>
                  <h2 className="text-xl font-bold text-body mt-0.5">{cableCoverCalculations.productName}</h2>
                  <p className="text-xs text-ink-dim font-mono">SKU: {cableCoverCalculations.productCode}</p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-ink-dim uppercase block">Estimated Schedule Value</span>
                  <span className="text-xl font-bold font-mono text-body">
                    ${cableCoverCalculations.estimatedSell.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-ink-dim block font-medium">(Ex GST, Estimate)</span>
                </div>
              </div>

              {/* 4 PRIMARY RESULT METRICS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-paper p-3 rounded-edge border border-line">
                  <span className="text-xs text-ink-dim block">Required Rolls</span>
                  <span className="text-lg font-bold font-mono text-body block mt-0.5">
                    {cableCoverCalculations.totalRolls} rolls
                  </span>
                  <span className="text-[11px] text-ink-dim">20m per roll</span>
                </div>

                <div className="bg-paper p-3 rounded-edge border border-line">
                  <span className="text-xs text-ink-dim block">Strip Arrangement</span>
                  <span className="text-lg font-bold text-body block mt-0.5">
                    {cableCoverCalculations.parallelStrips} parallel {cableCoverCalculations.parallelStrips === 1 ? "strip" : "strips"}
                  </span>
                  <span className="text-[11px] text-ink-dim">{cableCoverCalculations.selectedStripWidthMm}mm width</span>
                </div>

                <div className="bg-paper p-3 rounded-edge border border-line">
                  <span className="text-xs text-ink-dim block">Strip Coverage</span>
                  <span className="text-lg font-bold font-mono text-body block mt-0.5">
                    {cableCoverCalculations.totalCoverageMetres} m
                  </span>
                  <span className="text-[11px] text-ink-dim">Total strip run</span>
                </div>

                <div className="bg-paper p-3 rounded-edge border border-line">
                  <span className="text-xs text-ink-dim block">Total Weight</span>
                  <span className="text-lg font-bold font-mono text-body block mt-0.5">
                    {cableCoverCalculations.polymericTotalWeightKg} kg
                  </span>
                  <span className="text-[11px] text-ink-dim">Polymer mass</span>
                </div>
              </div>

              {/* OVERLAP & AUTHORITY LIMITATIONS (PART I) */}
              <div className="p-3 bg-amber-50/60 rounded-edge border border-amber-200 text-xs text-amber-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  <span>Authority &amp; Overlap Requirements:</span>
                </div>
                <p>
                  Maintain 100mm minimum longitudinal overlap between rolls. Check local network authority guidelines (e.g. Ausgrid, Energex, AusNet) for specific cover depth and color coding standards before installation.
                </p>
              </div>

              {/* COLLAPSIBLE WEIGHT & CARBON COMPARISON (PART I) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowCableComparison(!showCableComparison)}
                  className="text-xs font-bold text-brand-deep hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{showCableComparison ? "Hide manual handling & carbon comparison" : "View weight reduction & carbon comparison (vs concrete slabs)"}</span>
                  {showCableComparison ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showCableComparison && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 animate-in fade-in duration-100">
                    <div className="p-3 bg-paper rounded-edge border border-line">
                      <span className="text-xs text-ink-dim block">Weight Reduction vs Concrete</span>
                      <span className="text-base font-bold text-body block mt-0.5">
                        {cableCoverCalculations.weightReductionPercent}% lighter ({cableCoverCalculations.weightSavedKg.toLocaleString()} kg saved)
                      </span>
                      <span className="text-[11px] text-ink-dim">Replaces ~{cableCoverCalculations.concreteSlabsCount} heavy 1m precast concrete slabs</span>
                    </div>

                    <div className="p-3 bg-paper rounded-edge border border-line">
                      <span className="text-xs text-ink-dim block">Embodied Carbon Offset</span>
                      <span className="text-base font-bold text-emerald-800 block mt-0.5">
                        ~{cableCoverCalculations.co2SavedKg.toLocaleString()} kg CO₂e offset
                      </span>
                      <span className="text-[11px] text-ink-dim">Based on 0.14 kg CO₂e/kg precast concrete</span>
                    </div>
                  </div>
                )}
              </div>

              {/* COLLAPSIBLE ASSUMPTIONS (PART I) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowCableAssumptions(!showCableAssumptions)}
                  className="text-xs font-bold text-brand-deep hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{showCableAssumptions ? "Hide calculation assumptions" : "How this was calculated (Assumptions & formula)"}</span>
                  {showCableAssumptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showCableAssumptions && (
                  <div className="p-3 bg-raised rounded-edge border border-line text-xs text-body font-mono pt-3 animate-in fade-in duration-100">
                    Rolls = ceil(Trench Length / 20m) × ceil(Trench Width / {cableCoverCalculations.selectedStripWidthMm}mm) · Concrete Density = 2,400 kg/m³
                  </div>
                )}
              </div>

              {/* ACTION BAR */}
              <div className="pt-3 flex justify-end border-t border-line">
                <button
                  type="button"
                  onClick={() => handleOpenAddModal("cable-cover")}
                  className="px-4 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to deal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: AS/NZS 1158 Pathway Pole Spacing Calculator (PART J) */}
      {activeToolTab === "pole-spacing-calc" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Inputs Column */}
          <div className="lg:col-span-4 bg-white p-5 rounded-panel border border-line shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-body flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-deep" />
              <span>Pathway Parameters</span>
            </h3>

            {/* EXPLICIT PROJECT LENGTH (PART J) */}
            <div>
              <label className="block text-spec font-bold mb-1">Project Length (Metres)</label>
              <input
                type="number"
                min={10}
                value={projectLengthMeters}
                onChange={(e) => setProjectLengthMeters(Math.max(10, Number(e.target.value)))}
                className="w-full p-2 border border-line rounded-edge text-spec font-mono bg-white"
              />
            </div>

            <div>
              <label className="block text-spec font-bold mb-1">Lighting Sub-Category (AS/NZS 1158.3.1)</label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full p-2 border border-line rounded-edge text-spec bg-white"
              >
                {LIGHTING_STANDARDS_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.displayName} ({cat.maintainedIlluminanceLux} lux avg)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-spec font-bold mb-1">Luminaire Package</label>
              <select
                value={luminaireFamily}
                onChange={(e) => setLuminaireFamily(e.target.value)}
                className="w-full p-2 border border-line rounded-edge text-spec bg-white"
              >
                <option value="INTENSE_50W">Plasgain Intense Light 50W Solar (5,000 lm)</option>
                <option value="PBS_75W">Plasgain Pro Blade Solar 75W (7,500 lm)</option>
                <option value="PBS_100W">Plasgain Pro Blade Solar 100W (10,000 lm)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-spec font-bold mb-1">Path Width (m)</label>
                <input
                  type="number"
                  step="0.5"
                  min={1}
                  max={12}
                  value={pathWidthM}
                  onChange={(e) => setPathWidthM(Number(e.target.value))}
                  className="w-full p-2 border border-line rounded-edge text-spec font-mono bg-white"
                />
              </div>
              <div>
                <label className="block text-spec font-bold mb-1">Mounting Height (m)</label>
                <input
                  type="number"
                  step="0.5"
                  min={3}
                  max={12}
                  value={poleHeightM}
                  onChange={(e) => setPoleHeightM(Number(e.target.value))}
                  className="w-full p-2 border border-line rounded-edge text-spec font-mono bg-white"
                />
              </div>
            </div>
          </div>

          {/* Results Column (PART J: LEADS WITH ESTIMATED SPACING & POLE QUANTITY) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white p-5 rounded-panel border border-line shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-line pb-3">
                <div>
                  <span className="text-xs font-bold text-brand-deep uppercase tracking-wider block">
                    Lighting Design Estimate
                  </span>
                  <h2 className="text-xl font-bold text-body mt-0.5">
                    {spacingCalculations.cat.displayName} Spacing Model
                  </h2>
                  <p className="text-xs text-ink-dim">
                    Target: {spacingCalculations.cat.maintainedIlluminanceLux} lux avg / {spacingCalculations.cat.minimumIlluminanceLux} lux point min
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-ink-dim uppercase block">Estimated Project Value</span>
                  <span className="text-xl font-bold font-mono text-body">
                    ${spacingCalculations.totalProjectSell.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-ink-dim block font-medium">(Ex GST, Estimate)</span>
                </div>
              </div>

              {/* 2 PRIMARY RESULTS: SPACING & POLES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-brand-wash/40 border border-brand-edge rounded-edge p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-deep block">
                    Estimated Pole Spacing
                  </span>
                  <span className="text-3xl font-black font-mono text-body block mt-1">
                    {spacingCalculations.calculatedSpacingM} metres
                  </span>
                  <span className="text-xs text-ink-dim">Inter-pole span along {pathWidthM}m wide path</span>
                </div>

                <div className="bg-paper border border-line rounded-edge p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-dim block">
                    Estimated Pole Quantity
                  </span>
                  <span className="text-3xl font-black font-mono text-body block mt-1">
                    {spacingCalculations.polesForProject} poles
                  </span>
                  <span className="text-xs text-ink-dim">For complete {projectLengthMeters}m run</span>
                </div>
              </div>

              {/* COMPACT RECOMMENDED PACKAGE (PART J) */}
              <div className="p-3.5 bg-paper rounded-edge border border-line space-y-2 text-spec">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-dim block">
                  Recommended Luminaire &amp; Pole Package
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-white rounded border border-line">
                    <span className="font-bold text-body block">Luminaire: {spacingCalculations.luminaireModel}</span>
                    <span className="text-ink-dim font-mono">SKU: {spacingCalculations.luminaireSKU}</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-line">
                    <span className="font-bold text-body">Pole: {spacingCalculations.poleModel}</span>
                    <span className="text-ink-dim font-mono">SKU: {spacingCalculations.poleSKU}</span>
                  </div>
                </div>
              </div>

              {/* PRELIMINARY WARNING CALLOUT (PART J) */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-edge text-xs text-amber-950 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p>
                  <strong>Preliminary estimate only:</strong> Spacing calculations are indicative benchmarks. Project-specific photometric verification (DIALux simulation) is required prior to luminaire procurement and installation.
                </p>
              </div>

              {/* COLLAPSIBLE ASSUMPTIONS (PART J) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowSpacingAssumptions(!showSpacingAssumptions)}
                  className="text-xs font-bold text-brand-deep hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{showSpacingAssumptions ? "Hide spacing formula & assumptions" : "View spacing formula & assumptions"}</span>
                  {showSpacingAssumptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showSpacingAssumptions && (
                  <div className="p-3 bg-raised rounded-edge border border-line text-xs text-body font-mono pt-3 animate-in fade-in duration-100">
                    Spacing = (Luminaire Lumens × UF 0.42 × MF 0.85) / (E_avg {spacingCalculations.cat.maintainedIlluminanceLux} lux × Path Width {pathWidthM}m)
                  </div>
                )}
              </div>

              {/* ACTION BAR */}
              <div className="pt-3 flex justify-end border-t border-line">
                <button
                  type="button"
                  onClick={() => handleOpenAddModal("pole-spacing")}
                  className="px-4 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to deal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Foundations & Footings Calculator (PART K) */}
      {activeToolTab === "wind-foundation-calc" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* 1. SITE INPUTS SECTION (PART K) */}
          <div className="lg:col-span-4 bg-white p-5 rounded-panel border border-line shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-body flex items-center gap-2">
              <Wind className="w-4 h-4 text-brand-deep" />
              <span>Site &amp; Structural Inputs</span>
            </h3>

            <div>
              <label className="block text-spec font-bold mb-1">Wind Region (AS 1170.2)</label>
              <select
                value={windRegion}
                onChange={(e) => setWindRegion(e.target.value as any)}
                className="w-full p-2 border border-line rounded-edge text-spec bg-white"
              >
                <option value="Region_A">Region A (41 m/s - Normal Inland)</option>
                <option value="Region_B">Region B (48 m/s - Coastal Non-Cyclonic)</option>
                <option value="Region_C">Region C (56 m/s - Cyclonic QLD/NT/WA)</option>
                <option value="Region_D">Region D (66 m/s - Severe Cyclonic)</option>
              </select>
            </div>

            <div>
              <label className="block text-spec font-bold mb-1">Pole Height</label>
              <select
                value={foundationPoleHeight}
                onChange={(e) => setFoundationPoleHeight(Number(e.target.value))}
                className="w-full p-2 border border-line rounded-edge text-spec bg-white"
              >
                <option value={4.5}>4.5 metres (Pedestrian / Pathway)</option>
                <option value={6.0}>6.0 metres (Standard Shared Path / Road)</option>
                <option value={8.0}>8.0 metres (Car Park / Collector Road)</option>
                <option value={10.0}>10.0 metres (Heavy Industrial)</option>
              </select>
            </div>

            <div>
              <label className="block text-spec font-bold mb-1">Soil Classification</label>
              <select
                value={soilType}
                onChange={(e) => setSoilType(e.target.value as any)}
                className="w-full p-2 border border-line rounded-edge text-spec bg-white"
              >
                <option value="CLASS_M_CLAY">Class M - Moderately Reactive Clay</option>
                <option value="CLASS_S_SOFT">Class S - Soft Clay / Fill (+25% depth)</option>
                <option value="CLASS_A_SAND_ROCK">Class A - Stable Sand / Hard Rock</option>
              </select>
            </div>

            <div>
              <label className="block text-spec font-bold mb-1">Foundation Type</label>
              <select
                value={foundationType}
                onChange={(e) => setFoundationType(e.target.value as any)}
                className="w-full p-2 border border-line rounded-edge text-spec bg-white"
              >
                <option value="Direct_Burial">Direct Burial / In-Ground</option>
                <option value="Baseplate_Ragbolt">Baseplate &amp; Rag-bolt Cage</option>
              </select>
            </div>

            <div>
              <label className="block text-spec font-bold mb-1">Quantity of Footings</label>
              <input
                type="number"
                min={1}
                value={foundationQuantity}
                onChange={(e) => setFoundationQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full p-2 border border-line rounded-edge text-spec font-mono bg-white"
              />
            </div>
          </div>

          {/* 2 & 3. FOUNDATION ESTIMATE & HARDWARE SECTIONS (PART K) */}
          <div className="lg:col-span-8 space-y-4">
            {/* 2. FOUNDATION ESTIMATE (UNMISTAKABLE PER-FOOTING VS PROJECT TOTAL) */}
            <div className="bg-white p-5 rounded-panel border border-line shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-line pb-3">
                <div>
                  <span className="text-xs font-bold text-brand-deep uppercase tracking-wider block">
                    Structural Footing Estimate
                  </span>
                  <h2 className="text-xl font-bold text-body mt-0.5">
                    {foundationType === "Direct_Burial" ? "Direct Burial In-Ground Embedment" : "Baseplate Ragbolt Footing"}
                  </h2>
                  <p className="text-xs text-ink-dim">
                    Wind Design Speed: <strong>{foundationCalculations.windSpeed}</strong> · {foundationCalculations.windDesc}
                  </p>
                </div>

                <span className="text-xs font-bold px-2.5 py-1 rounded bg-amber-50 text-amber-900 border border-amber-200">
                  Preliminary estimate
                </span>
              </div>

              {/* CLEAR PER-FOOTING VS PROJECT TOTAL GRID (PART K) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-paper p-4 rounded-edge border border-line space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-dim block">
                    PER FOOTING
                  </span>
                  <span className="text-2xl font-bold font-mono text-body block">
                    {foundationCalculations.concreteVolPerFootingM3} m³ concrete
                  </span>
                  <span className="text-xs text-ink-dim">
                    {foundationCalculations.footingDiameterMm}mm diameter × {foundationCalculations.embedmentDepthM}m embedment depth
                  </span>
                </div>

                <div className="bg-brand-wash/40 p-4 rounded-edge border border-brand-edge space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-deep block">
                    PROJECT TOTAL — {foundationQuantity} FOOTINGS
                  </span>
                  <span className="text-2xl font-bold font-mono text-body block">
                    {foundationCalculations.totalConcreteM3} m³ concrete
                  </span>
                  <span className="text-xs text-ink-dim">
                    Combined volume for {foundationQuantity} civil footings
                  </span>
                </div>
              </div>

              {/* 3. HARDWARE & FREIGHT SECTION (PART K) */}
              <div className="p-4 bg-paper rounded-edge border border-line space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-dim block">
                  Hardware &amp; Freight Schedule
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 bg-white rounded border border-line space-y-0.5">
                    <span className="font-bold text-body block">Hardware: {foundationCalculations.hardwareName}</span>
                    <span className="text-ink-dim font-mono">SKU: {foundationCalculations.hardwareSKU}</span>
                    <span className="text-body font-bold block mt-1">Quantity: {foundationQuantity} sets</span>
                  </div>

                  <div className="p-2.5 bg-white rounded border border-line space-y-0.5">
                    <span className="font-bold text-body block">Estimated Logistics ({destState})</span>
                    <span className="text-ink-dim">Total Mass: ~{foundationCalculations.totalShipmentWeightKg.toLocaleString()} kg</span>
                    <span className="text-body font-bold block mt-1">Estimated Freight: ${foundationCalculations.estimatedFreight.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* ACTION BAR */}
              <div className="pt-2 flex justify-end border-t border-line">
                <button
                  type="button"
                  onClick={() => handleOpenAddModal("wind-foundation")}
                  className="px-4 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to deal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Solar Sizing & LiFePO4 Battery Autonomy (PART L) */}
      {activeToolTab === "solar-autonomy" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Inputs Column */}
          <div className="lg:col-span-4 bg-white p-5 rounded-panel border border-line shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-body flex items-center gap-2">
              <Sun className="w-4 h-4 text-brand-deep" />
              <span>Solar Sizing Inputs</span>
            </h3>

            <div>
              <label className="block text-spec font-bold mb-1">Insolation Solar Zone</label>
              <select
                value={solarZone}
                onChange={(e) => setSolarZone(e.target.value as any)}
                className="w-full p-2 border border-line rounded-edge text-spec bg-white"
              >
                <option value="QLD_NT">QLD / NT (5.2 Peak Sun Hours)</option>
                <option value="NSW_ACT">NSW / ACT (4.5 Peak Sun Hours)</option>
                <option value="VIC_TAS">VIC / TAS (3.6 Peak Sun Hours)</option>
                <option value="WA_SA">WA / SA (5.8 Peak Sun Hours)</option>
              </select>
            </div>

            <div>
              <label className="block text-spec font-bold mb-1">Luminaire Power Rating</label>
              <select
                value={solarWatts}
                onChange={(e) => setSolarWatts(Number(e.target.value))}
                className="w-full p-2 border border-line rounded-edge text-spec bg-white"
              >
                <option value={50}>50W Luminaire (Intense Light)</option>
                <option value={75}>75W Luminaire (Pro Blade Solar 75)</option>
                <option value={100}>100W Luminaire (Pro Blade Solar 100)</option>
                <option value={125}>125W Luminaire (Pro Blade Solar 125)</option>
              </select>
            </div>

            <div>
              <label className="block text-spec font-bold mb-1">Operating Profile</label>
              <select
                value={solarProfile}
                onChange={(e) => setSolarProfile(e.target.value as any)}
                className="w-full p-2 border border-line rounded-edge text-spec bg-white"
              >
                <option value="PIR_PROFILE_SMART">Smart Profile (6h 100% + 6h 30% Dimmed PIR)</option>
                <option value="DUSK_DAWN_12H">Continuous 100% (Dusk to Dawn 12h)</option>
              </select>
            </div>

            <div>
              <label className="block text-spec font-bold mb-1">Autonomy Target (Nights)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={solarAutonomyDays}
                onChange={(e) => setSolarAutonomyDays(Math.max(1, Number(e.target.value)))}
                className="w-full p-2 border border-line rounded-edge text-spec font-mono bg-white"
              />
            </div>
          </div>

          {/* Results Column (PART L: REQUIRED VS AVAILABLE CAPACITY TOGETHER) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white p-5 rounded-panel border border-line shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-line pb-3">
                <div>
                  <span className="text-xs font-bold text-brand-deep uppercase tracking-wider block">
                    Autonomous Solar Engineering
                  </span>
                  <h2 className="text-xl font-bold text-body mt-0.5">
                    {solarCalculations.selectedPackage.name}
                  </h2>
                  <p className="text-xs text-ink-dim">
                    {solarCalculations.zoneName} · {solarCalculations.psh} Peak Sun Hours (Winter Design)
                  </p>
                </div>

                {/* SINGLE TOP-LEVEL SUITABILITY RESULT (PART L) */}
                {solarCalculations.isCompliant ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Suitable candidate</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-200 inline-flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Engineering review required</span>
                  </span>
                )}
              </div>

              {/* REQUIRED VS AVAILABLE CAPACITY TOGETHER (PART L) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-paper p-3.5 rounded-edge border border-line">
                  <span className="text-xs text-ink-dim block">Required Battery Capacity</span>
                  <span className="text-xl font-bold font-mono text-body block mt-0.5">
                    {solarCalculations.minBatteryStorageWh} Wh
                  </span>
                  <span className="text-[11px] text-ink-dim">For {solarAutonomyDays} nights autonomy</span>
                </div>

                <div className="bg-paper p-3.5 rounded-edge border border-line">
                  <span className="text-xs text-ink-dim block">Selected Package Capacity</span>
                  <span className="text-xl font-bold font-mono text-body block mt-0.5">
                    {solarCalculations.selectedPackage.batteryWh} Wh
                  </span>
                  <span className="text-[11px] text-ink-dim">LiFePO4 battery pack</span>
                </div>

                <div className={`p-3.5 rounded-edge border ${
                  solarCalculations.isCompliant ? "bg-emerald-50/50 border-emerald-200" : "bg-red-50/50 border-red-200"
                }`}>
                  <span className="text-xs text-ink-dim block">Capacity Margin / Shortfall</span>
                  <span className={`text-xl font-bold font-mono block mt-0.5 ${
                    solarCalculations.isCompliant ? "text-emerald-800" : "text-red-800"
                  }`}>
                    {solarCalculations.isCompliant
                      ? `+${solarCalculations.reserveWh} Wh reserve`
                      : `-${solarCalculations.shortfallWh} Wh shortfall`}
                  </span>
                  <span className="text-[11px] text-ink-dim">
                    {solarCalculations.isCompliant ? "Adequate autonomy margin" : "Capacity deficit"}
                  </span>
                </div>
              </div>

              {/* SHORTFALL NOTICE IF NON-COMPLIANT (PART L) */}
              {!solarCalculations.isCompliant && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-edge text-xs text-red-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                  <p>
                    <strong>Shortfall: {solarCalculations.shortfallWh} Wh.</strong> Select a larger solar package or send to engineering for project-specific profile adjustments.
                  </p>
                </div>
              )}

              {/* OPERATING PROFILE IN COMPACT TABLE (PART L) */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-dim block">
                  Operating Profile Breakdown
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-line bg-paper/60 text-ink-dim font-bold">
                        <th className="py-2 px-3">Period</th>
                        <th className="py-2 px-3">Luminaire Output</th>
                        <th className="py-2 px-3">Duration</th>
                        <th className="py-2 px-3">Daily Energy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      <tr>
                        <td className="py-2 px-3 font-semibold">Dusk to Midnight</td>
                        <td className="py-2 px-3">100% ({solarWatts}W)</td>
                        <td className="py-2 px-3">6.0 hrs</td>
                        <td className="py-2 px-3 font-mono">{Math.round(solarWatts * 6)} Wh</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold">Midnight to Dawn</td>
                        <td className="py-2 px-3">{solarProfile === "DUSK_DAWN_12H" ? `100% (${solarWatts}W)` : `30% Dimmed PIR (${Math.round(solarWatts * 0.3)}W)`}</td>
                        <td className="py-2 px-3">6.0 hrs</td>
                        <td className="py-2 px-3 font-mono">{solarProfile === "DUSK_DAWN_12H" ? Math.round(solarWatts * 6) : Math.round(solarWatts * 0.3 * 6)} Wh</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* COLLAPSIBLE ASSUMPTIONS (PART L) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowSolarAssumptions(!showSolarAssumptions)}
                  className="text-xs font-bold text-brand-deep hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{showSolarAssumptions ? "Hide solar assumptions" : "View solar constants & assumptions"}</span>
                  {showSolarAssumptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showSolarAssumptions && (
                  <div className="p-3 bg-raised rounded-edge border border-line text-xs text-body font-mono pt-3 animate-in fade-in duration-100">
                    Battery DoD = 85% · PV Oversize Ratio = 1.35 · Daily Energy = {solarCalculations.dailyWattHours} Wh/day
                  </div>
                )}
              </div>

              {/* ACTION BAR (BLOCKED WHEN NON-COMPLIANT, PART L & R) */}
              <div className="pt-3 flex items-center justify-between border-t border-line">
                <div className="text-xs text-ink-dim">
                  {!solarCalculations.isCompliant && (
                    <span className="text-red-700 font-bold">Add to deal is blocked: battery capacity shortfall.</span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!solarCalculations.isCompliant}
                  onClick={() => handleOpenAddModal("solar-autonomy")}
                  className={`px-4 py-2 font-bold text-spec rounded-edge transition-colors flex items-center gap-1.5 shadow-xs ${
                    solarCalculations.isCompliant
                      ? "bg-brand-deep hover:bg-brand text-white cursor-pointer"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to deal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Specification Review (PART M, N, O, P) */}
      {activeToolTab === "conflict-resolver" && (
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-panel border border-line shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-line pb-3">
              <div>
                <h2 className="text-xl font-bold text-body">Specification Review</h2>
                <p className="text-spec text-ink-dim mt-0.5">
                  Evaluate client specification clauses against Australian Standards and catalogue constraints.
                </p>
              </div>

              {/* DELIBERATE VIEW EXAMPLES ACTION (PART M) */}
              <button
                type="button"
                onClick={() => setShowSpecExamples(!showSpecExamples)}
                className="text-spec font-bold text-brand-deep hover:underline flex items-center gap-1 cursor-pointer self-start"
              >
                <span>{showSpecExamples ? "Hide examples" : "View examples"}</span>
                {showSpecExamples ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* CURATED EXAMPLES (LABELLED EXAMPLE, PART M) */}
            {showSpecExamples && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-paper rounded-edge border border-line animate-in fade-in duration-100">
                {SPEC_EXAMPLES.map((ex) => (
                  <div
                    key={ex.id}
                    onClick={() => {
                      setTenderClauseInput(ex.clause);
                      setShowSpecExamples(false);
                    }}
                    className="p-3 bg-white rounded border border-line hover:border-brand-deep cursor-pointer transition-colors space-y-1 text-spec"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                      Example
                    </span>
                    <h4 className="font-bold text-body text-xs">{ex.title}</h4>
                    <p className="text-xs text-ink-dim line-clamp-2">{ex.clause}</p>
                  </div>
                ))}
              </div>
            )}

            {/* PRIMARY INPUT: PASTE SPECIFICATION CLAUSE (PART M) */}
            <div className="space-y-2">
              <label className="block text-spec font-bold">
                Paste or Enter Specification Clause
              </label>
              <textarea
                rows={3}
                value={tenderClauseInput}
                onChange={(e) => setTenderClauseInput(e.target.value)}
                placeholder="e.g. Supply and install 5700K Daylight LED luminaires at 80m intervals along shared pathway..."
                className="w-full p-3 border border-line rounded-edge text-spec bg-white focus:outline-none focus:border-brand-deep"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAnalyzeClause}
                  className="px-4 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Specification</span>
                </button>
              </div>
            </div>
          </div>

          {/* SPEC REVIEW RESULT: CLAUSE -> CONCERN -> SOURCE -> SUGGESTED RESPONSE (PART N & O) */}
          {specAnalysisResult && (
            <div className="bg-white p-5 rounded-panel border border-line shadow-2xs space-y-4 animate-in fade-in duration-150">
              <h3 className="font-bold text-body text-base border-b border-line pb-2">
                Specification Analysis Findings
              </h3>

              <div className="space-y-3 text-spec">
                {/* 1. CLAUSE */}
                <div className="p-3 bg-paper rounded-edge border border-line space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-dim block">
                    Supplied Clause
                  </span>
                  <p className="text-xs text-body italic font-mono">
                    "{specAnalysisResult.clause}"
                  </p>
                </div>

                {/* 2. CONCERN */}
                <div className="p-3.5 bg-amber-50/60 rounded-edge border border-amber-200 space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900 block flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    <span>Identified Concern / Conflict</span>
                  </span>
                  <p className="text-xs text-amber-950 font-medium leading-relaxed">
                    {specAnalysisResult.concern}
                  </p>
                </div>

                {/* 3. SOURCE */}
                <div className="p-3 bg-paper rounded-edge border border-line space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-dim block">
                    Source &amp; Standard Reference
                  </span>
                  <p className="text-xs font-bold text-body">
                    {specAnalysisResult.source}
                  </p>
                </div>

                {/* 4. SUGGESTED RESPONSE */}
                <div className="p-3.5 bg-brand-wash/40 rounded-edge border border-brand-edge space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-deep block flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-brand-deep" />
                    <span>Suggested Technical Response / RFI</span>
                  </span>
                  <p className="text-xs text-body leading-relaxed">
                    {specAnalysisResult.suggestedResponse}
                  </p>
                </div>

                {/* COLLAPSIBLE DETAILED REASONING (PART P) */}
                {specAnalysisResult.detailedReasoning && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowDetailedReasoning(!showDetailedReasoning)}
                      className="text-xs font-bold text-brand-deep hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{showDetailedReasoning ? "Hide detailed reasoning" : "View detailed reasoning"}</span>
                      {showDetailedReasoning ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {showDetailedReasoning && (
                      <div className="p-3 bg-raised rounded-edge border border-line text-xs text-ink-dim mt-2 animate-in fade-in duration-100">
                        {specAnalysisResult.detailedReasoning}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SHARED ADD TO DEAL MODAL (PART R) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-chrome/70 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-150">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-calc-deal-title"
            className="bg-surface rounded-panel max-w-lg w-full p-5 border border-line shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 id="add-calc-deal-title" className="font-bold text-body text-base">
                Add Calculation to Deal
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-ink-dim hover:text-body">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-spec">
              <div>
                <label className="block font-bold mb-1">Target Mode</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={addMode === "existing"}
                      onChange={() => setAddMode("existing")}
                    />
                    <span>Existing Active Deal</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={addMode === "new"}
                      onChange={() => setAddMode("new")}
                    />
                    <span>Create New Deal</span>
                  </label>
                </div>
              </div>

              {addMode === "existing" ? (
                <div>
                  <label className="block font-bold mb-1">Select Deal *</label>
                  <select
                    value={selectedDealId}
                    onChange={(e) => setSelectedDealId(e.target.value)}
                    className="w-full p-2 border border-line rounded-edge bg-white"
                  >
                    {crmOpportunities.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.accountName})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block font-bold mb-1">New Deal Name *</label>
                    <input
                      value={newDealName}
                      onChange={(e) => setNewDealName(e.target.value)}
                      className="w-full p-2 border border-line rounded-edge bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Account *</label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full p-2 border border-line rounded-edge bg-white"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1.5 border border-line rounded-edge text-spec font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAddToDeal}
                className="px-4 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge"
              >
                Add to deal
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
