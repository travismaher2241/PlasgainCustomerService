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
  Wind,
  Truck,
  Plus,
  X,
  Building2,
  DollarSign,
  Package,
  Check
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
  // Tool 1: Trench Polymeric Cable Cover & Concrete Weight Offset Calculator
  // -------------------------------------------------------------
  const [trenchLengthMeters, setTrenchLengthMeters] = useState<number>(250);
  const [cableVoltage, setCableVoltage] = useState<"LV_240_415" | "HV_11kV" | "HV_22kV_33kV" | "COMMS_FIBRE">("LV_240_415");
  const [trenchWidthMm, setTrenchWidthMm] = useState<number>(300);
  const [concreteThicknessMm, setConcreteThicknessMm] = useState<number>(50);

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

    const rollsNeeded150 = Math.ceil((trenchLengthMeters * (trenchWidthMm / 150)) / 20);
    const rollsNeeded300 = Math.ceil(trenchLengthMeters / 20);
    const totalRolls = trenchWidthMm <= 150 ? rollsNeeded150 : rollsNeeded300;
    const polymericTotalWeightKg = trenchWidthMm <= 150 ? rollsNeeded150 * weightPerRoll150 : rollsNeeded300 * weightPerRoll300;

    // Traditional precast concrete slabs (approx 2400 kg/m3)
    const concreteVolumeM3 = trenchLengthMeters * (trenchWidthMm / 1000) * (concreteThicknessMm / 1000);
    const concreteWeightKg = concreteVolumeM3 * 2400;
    const concreteSlabsCount = Math.ceil(trenchLengthMeters / 1.0);
    const weightSavedKg = Math.max(0, concreteWeightKg - polymericTotalWeightKg);
    const weightReductionPercent = Math.round((weightSavedKg / (concreteWeightKg || 1)) * 100);

    const concreteCo2Kg = concreteWeightKg * 0.14;
    const polyCo2Kg = polymericTotalWeightKg * 0.08;
    const co2SavedKg = Math.round(concreteCo2Kg - polyCo2Kg);
    const estimatedCost = totalRolls * (rollUnitPrice * 0.65);
    const estimatedSell = totalRolls * rollUnitPrice;

    return {
      thicknessMm,
      productName,
      productCode,
      rollUnitPrice,
      totalRolls,
      rollsNeeded150,
      rollsNeeded300,
      polymericTotalWeightKg,
      concreteWeightKg: Math.round(concreteWeightKg),
      concreteSlabsCount,
      weightSavedKg: Math.round(weightSavedKg),
      weightReductionPercent,
      co2SavedKg,
      estimatedCost,
      estimatedSell
    };
  }, [trenchLengthMeters, cableVoltage, trenchWidthMm, concreteThicknessMm]);

  // -------------------------------------------------------------
  // Tool 2: AS/NZS 1158 Pathway Pole Spacing & Lux Estimator
  // -------------------------------------------------------------
  const [pathwayWidth, setPathwayWidth] = useState<number>(3.0);
  const [subCategory, setSubCategory] = useState<string>("P4");
  const [poleHeightM, setPoleHeightM] = useState<number>(5.0);
  const [luminaireOutputLm, setLuminaireOutputLm] = useState<number>(4500);

  const selectedCat = getLightingCategory(subCategory) || getLightingCategory("P4")!;

  const spacingCalculations = useMemo(() => {
    let baseSpacing = 40;
    if (selectedCat.id === "P1" || selectedCat.id === "PR1") baseSpacing = 20;
    else if (selectedCat.id === "P2" || selectedCat.id === "PR2") baseSpacing = 26;
    else if (selectedCat.id === "P3" || selectedCat.id === "PR3") baseSpacing = 32;
    else if (selectedCat.id === "P4" || selectedCat.id === "PR4") baseSpacing = 40;
    else if (selectedCat.id === "P5") baseSpacing = 48;

    const heightFactor = poleHeightM / 5.0;
    const lumenFactor = luminaireOutputLm / 4000;
    const recommendedSpacing = Math.round(baseSpacing * Math.sqrt(lumenFactor) * (0.8 + 0.2 * heightFactor));
    const polesPerKm = Math.ceil(1000 / recommendedSpacing);

    return {
      recommendedSpacing,
      polesPerKm,
      illuminanceEav: `${selectedCat.maintainedIlluminanceLux} Lux (avg)`,
      illuminanceEmin: `${selectedCat.minimumIlluminanceLux} Lux (min point)`,
      uniformityUo: selectedCat.uniformityRequirement,
      recommendedLuminaireCode: luminaireOutputLm >= 6000 ? "PB-100W-3K" : luminaireOutputLm >= 4000 ? "PB-75W-3K" : "PB-50W-3K",
      recommendedLuminaireName: luminaireOutputLm >= 6000 ? "Plasgain Pro Blade 100W Solar Luminaire (3000K)" : luminaireOutputLm >= 4000 ? "Plasgain Pro Blade 75W Solar Luminaire (3000K)" : "Plasgain Pro Blade 50W Solar Luminaire (3000K)",
      recommendedPoleCode: `PLASPOLE-${poleHeightM}M-DB-GRN`,
      recommendedPoleName: `Plaspole ${poleHeightM}m Recycled Composite Light Pole (Direct Burial)`,
      luminaireUnitPrice: luminaireOutputLm >= 6000 ? 1950 : luminaireOutputLm >= 4000 ? 1650 : 1350,
      poleUnitPrice: poleHeightM >= 6 ? 1200 : poleHeightM >= 5 ? 980 : 820,
      provenance: `${selectedCat.displayName} · ${selectedCat.standardReference} (Rev ${selectedCat.datasetRevision})`
    };
  }, [pathwayWidth, selectedCat, poleHeightM, luminaireOutputLm]);

  // -------------------------------------------------------------
  // Tool 3: Wind Region (AS 1170.2) & Foundation Hardware Estimator
  // -------------------------------------------------------------
  const [windRegion, setWindRegion] = useState<"Region A" | "Region B" | "Region C" | "Region D">("Region A");
  const [foundationPoleHeight, setFoundationPoleHeight] = useState<number>(6);
  const [poleMaterial, setPoleMaterial] = useState<"Composite Plaspole" | "Galvanized Steel">("Composite Plaspole");
  const [foundationType, setFoundationType] = useState<"Direct Burial" | "Base Plate (Ragbolt)">("Base Plate (Ragbolt)");
  const [soilType, setSoilType] = useState<"Clay / Standard" | "Sandy / Coastal" | "Rock / Hardpan">("Clay / Standard");
  const [foundationQuantity, setFoundationQuantity] = useState<number>(24);
  const [destState, setDestState] = useState<"VIC" | "NSW" | "QLD" | "WA" | "NT" | "SA" | "TAS">("QLD");

  const foundationCalculations = useMemo(() => {
    const windSpeedMap = {
      "Region A": { speed: "45 m/s (162 km/h)", factor: 1.0, desc: "Normal Inland (Melbourne, Sydney, Canberra, Bendigo)" },
      "Region B": { speed: "57 m/s (205 km/h)", factor: 1.25, desc: "Subtropical / Coastal Border (Brisbane, Newcastle, Wollongong)" },
      "Region C": { speed: "69 m/s (248 km/h)", factor: 1.6, desc: "Cyclonic Coastal (Townsville, Cairns, Darwin, Broome)" },
      "Region D": { speed: "88 m/s (316 km/h)", factor: 2.1, desc: "Severe Cyclonic (Pilbara, Port Hedland, Exmouth, Karratha)" }
    };

    const wData = windSpeedMap[windRegion];
    const soilFactor = soilType === "Sandy / Coastal" ? 1.2 : soilType === "Rock / Hardpan" ? 0.8 : 1.0;

    // Direct burial vs Base plate calculation
    let embedmentDepthM = 0;
    let footingDiameterMm = 0;
    let hardwareSKU = "";
    let hardwareName = "";
    let hardwareUnitPrice = 0;
    let hardwareWeightKg = 0;
    let poleUnitWeightKg = poleMaterial === "Composite Plaspole" ? foundationPoleHeight * 6 : foundationPoleHeight * 14;

    if (foundationType === "Direct Burial") {
      embedmentDepthM = Number((foundationPoleHeight * 0.2 * wData.factor * soilFactor).toFixed(2));
      footingDiameterMm = Math.round(350 * Math.sqrt(wData.factor));
      hardwareSKU = `COLLAR-${foundationPoleHeight}M-STABILIZER`;
      hardwareName = `Plasgain ${foundationPoleHeight}m Aggregate Stabilizer Collar Kit (AS/NZS 1158)`;
      hardwareUnitPrice = 115;
      hardwareWeightKg = 8;
    } else {
      embedmentDepthM = Number((0.9 + 0.15 * (foundationPoleHeight - 4) * wData.factor * soilFactor).toFixed(2));
      footingDiameterMm = Math.round(450 * Math.sqrt(wData.factor));
      if (windRegion === "Region C" || windRegion === "Region D") {
        hardwareSKU = `RAG-M27-4B-900-CYC`;
        hardwareName = `Heavy Duty M27x900mm Galvanised Ragbolt Cage Assembly (Cyclonic AS 1170.2)`;
        hardwareUnitPrice = 460;
        hardwareWeightKg = 28;
      } else {
        hardwareSKU = `RAG-M24-4B-600`;
        hardwareName = `Standard M24x600mm Galvanised Ragbolt Cage Assembly (AS 1170.2)`;
        hardwareUnitPrice = 285;
        hardwareWeightKg = 18;
      }
    }

    const footingRadiusM = (footingDiameterMm / 1000) / 2;
    const concreteVolPerFootingM3 = Number((Math.PI * Math.pow(footingRadiusM, 2) * embedmentDepthM).toFixed(3));
    const totalConcreteM3 = Number((concreteVolPerFootingM3 * foundationQuantity).toFixed(2));
    const totalShipmentWeightKg = (poleUnitWeightKg + hardwareWeightKg) * foundationQuantity;

    // Freight calculation
    const freightRatePerKg: Record<string, number> = {
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
  // FEAT-01: 1-Click "Add Calculation to Active Quote / Deal" Modal State
  // -------------------------------------------------------------
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalSourceTool, setModalSourceTool] = useState<"cable-cover" | "pole-spacing" | "wind-foundation">("cable-cover");
  const [addMode, setAddMode] = useState<"existing" | "new">("existing");
  const [selectedDealId, setSelectedDealId] = useState(crmOpportunities[0]?.id || "");
  const [newDealName, setNewDealName] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || "");
  const [selectedPipelineId, setSelectedPipelineId] = useState(pipelines[0]?.id || "pipe-major-projects");

  const handleOpenAddModal = (source: "cable-cover" | "pole-spacing" | "wind-foundation") => {
    setModalSourceTool(source);
    if (source === "cable-cover") {
      setNewDealName(`Civil Cable Protection - ${trenchLengthMeters}m Trench`);
    } else if (source === "pole-spacing") {
      setNewDealName(`Pathway Solar Lighting - ${spacingCalculations.polesPerKm} Poles (${subCategory})`);
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
        costPrice: Math.round(cableCoverCalculations.rollUnitPrice * 0.62),
        totalPrice: cableCoverCalculations.totalRolls * cableCoverCalculations.rollUnitPrice,
        marginPercent: 38,
        isOstendoVerified: true,
        notes: `Trench: ${trenchLengthMeters}m @ ${trenchWidthMm}mm width. Weight saved: ${cableCoverCalculations.weightSavedKg.toLocaleString()}kg vs concrete.`
      });
    } else if (modalSourceTool === "pole-spacing") {
      linesToAdd.push(
        {
          id: `prod-calc-${Date.now()}-1`,
          productCode: spacingCalculations.recommendedLuminaireCode,
          productName: spacingCalculations.recommendedLuminaireName,
          category: "Solar Luminaire",
          quantity: spacingCalculations.polesPerKm,
          unit: "ea",
          unitPrice: spacingCalculations.luminaireUnitPrice,
          costPrice: Math.round(spacingCalculations.luminaireUnitPrice * 0.65),
          totalPrice: spacingCalculations.polesPerKm * spacingCalculations.luminaireUnitPrice,
          marginPercent: 35,
          isOstendoVerified: true,
          notes: `AS/NZS 1158 Cat ${subCategory} | Spacing ~${spacingCalculations.recommendedSpacing}m | ${spacingCalculations.illuminanceEav}`
        },
        {
          id: `prod-calc-${Date.now()}-2`,
          productCode: spacingCalculations.recommendedPoleCode,
          productName: spacingCalculations.recommendedPoleName,
          category: "Composite Light Pole",
          quantity: spacingCalculations.polesPerKm,
          unit: "ea",
          unitPrice: spacingCalculations.poleUnitPrice,
          costPrice: Math.round(spacingCalculations.poleUnitPrice * 0.60),
          totalPrice: spacingCalculations.polesPerKm * spacingCalculations.poleUnitPrice,
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
        notes: `Wind: ${windRegion} (${foundationCalculations.windSpeed}) | Footing: ${foundationCalculations.footingDiameterMm}mm dia x ${foundationCalculations.embedmentDepthM}m depth (${foundationCalculations.concreteVolPerFootingM3}m3 concrete/footing).`
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
        latestActivity: `Added ${linesToAdd.length} engineered line item(s) from Technical Hub`,
        latestActivityDate: new Date().toISOString().split("T")[0]
      });

      showToast(`Injected ${linesToAdd.length} product(s) into Deal: "${targetDeal.name}"`, "success");
      setIsAddModalOpen(false);
      navigateToCRM("pipeline", targetDeal.id);
    } else {
      // Create new deal
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
        customerNeed: `Engineered BOM calculated in Plasgain Technical Estimator.`,
        keyRequirements: [`Standards: AS/NZS 1158 / AS 4702 / AS 1170.2`],
        source: "Technical Estimators Hub",
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
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="border-b border-line pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-meta font-semibold px-2 py-0.5 rounded bg-brand-wash text-brand-deep border border-brand-edge">
            Engineering &amp; Estimating Hub
          </span>
        </div>
        <h1 className="text-2xl font-bold text-body tracking-tight">Technical Estimators &amp; Plan Take-off</h1>
        <p className="text-meta text-ink-dim">
          Engineering drawing deciphering, polymeric mechanical protection sizing, AS/NZS 1158 spacing, and AS 1170.2 wind &amp; foundation hardware calculators.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-2">
        <button
          onClick={() => setActiveToolTab("plan-takeoff" as ToolSubTab)}
          className={`px-3.5 py-2 text-meta font-bold rounded-edge flex items-center gap-2 transition-colors cursor-pointer ${
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
          className={`px-3.5 py-2 text-meta font-bold rounded-edge flex items-center gap-2 transition-colors cursor-pointer ${
            activeToolTab === "cable-cover-calc"
              ? "bg-brand-deep text-white shadow-xs"
              : "bg-white text-ink-dim hover:text-body hover:bg-raised border border-line"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Polymeric Cable Cover (AS 4702)</span>
        </button>

        <button
          onClick={() => setActiveToolTab("pole-spacing-calc" as ToolSubTab)}
          className={`px-3.5 py-2 text-meta font-bold rounded-edge flex items-center gap-2 transition-colors cursor-pointer ${
            activeToolTab === "pole-spacing-calc"
              ? "bg-brand-deep text-white shadow-xs"
              : "bg-white text-ink-dim hover:text-body hover:bg-raised border border-line"
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Pathway Pole Spacing (AS/NZS 1158)</span>
        </button>

        <button
          onClick={() => setActiveToolTab("wind-foundation-calc" as ToolSubTab)}
          className={`px-3.5 py-2 text-meta font-bold rounded-edge flex items-center gap-2 transition-colors cursor-pointer ${
            activeToolTab === "wind-foundation-calc"
              ? "bg-brand-deep text-white shadow-xs"
              : "bg-white text-ink-dim hover:text-body hover:bg-raised border border-line"
          }`}
        >
          <Wind className="w-4 h-4" />
          <span>Wind Region &amp; Foundation Hardware (AS 1170.2)</span>
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
              Trench &amp; Protection Parameters
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
                <option value="COMMS_FIBRE">Communications &amp; Fibre Optic (White AS 4702)</option>
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
                  <h2 className="text-xl font-bold text-body">Polymeric Roll Requirement &amp; Weight Comparison</h2>
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
                    {trenchWidthMm <= 150 ? cableCoverCalculations.rollsNeeded150 : cableCoverCalculations.rollsNeeded300}x {cableCoverCalculations.productName} ({cableCoverCalculations.productCode})
                  </strong>
                  . Saves <strong>{cableCoverCalculations.weightSavedKg.toLocaleString()} kg</strong> of crane and manual handling weight on site.
                </p>
              </div>

              {/* FEAT-01: 1-Click Action to Send to Deal */}
              <div className="pt-2 flex items-center justify-between border-t border-brand-edge">
                <div className="text-spec text-ink-dim font-medium">
                  Estimated Schedule Value: <strong className="text-body font-bold">${cableCoverCalculations.estimatedSell.toLocaleString()}</strong> (ex GST)
                </div>
                <button
                  onClick={() => handleOpenAddModal("cable-cover")}
                  className="px-4 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-meta rounded-edge shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Calculation to Quote / Deal</span>
                </button>
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
                Pathway Category (AS/NZS 1158.3.1:2020)
              </label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full p-2 border border-line-strong rounded-edge text-meta font-semibold bg-white"
              >
                {LIGHTING_STANDARDS_CATEGORIES.filter((c) => c.family.includes("Category P") || c.family.includes("Category PR")).map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.category}: {cat.displayName.includes("—") ? cat.displayName.split("—")[1].trim() : cat.displayName} ({cat.maintainedIlluminanceLux} lx avg / {cat.minimumIlluminanceLux} lx min)
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1.5 text-[11px] text-ink-dim mt-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-deep shrink-0" />
                <span>
                  Target: <strong>{selectedCat.maintainedIlluminanceLux} lx avg</strong> ({selectedCat.minimumIlluminanceLux} lx min point) · {selectedCat.standardReference} (Rev {selectedCat.datasetRevision})
                </span>
              </div>
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
                <h2 className="text-xl font-bold text-body">{selectedCat.displayName}</h2>
                <div className="text-[11px] text-ink-dim mt-0.5">{selectedCat.subTitle}</div>
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
                  <div className="text-[11px] text-ink-dim">Min: {spacingCalculations.illuminanceEmin} · {spacingCalculations.uniformityUo}</div>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-edge border border-brand-edge text-meta space-y-1">
                <div className="font-bold text-body">Recommended Luminaire &amp; Pole Package:</div>
                <p className="text-ink-dim text-spec">
                  • <strong>{spacingCalculations.polesPerKm}x</strong> {spacingCalculations.recommendedLuminaireName} ({spacingCalculations.recommendedLuminaireCode})<br />
                  • <strong>{spacingCalculations.polesPerKm}x</strong> {spacingCalculations.recommendedPoleName} ({spacingCalculations.recommendedPoleCode})
                </p>
              </div>

              {/* FEAT-01: 1-Click Action to Send to Deal */}
              <div className="pt-2 flex items-center justify-between border-t border-brand-edge">
                <div className="text-spec text-ink-dim font-medium">
                  1km Package Est: <strong className="text-body font-bold">${((spacingCalculations.luminaireUnitPrice + spacingCalculations.poleUnitPrice) * spacingCalculations.polesPerKm).toLocaleString()}</strong> (ex GST)
                </div>
                <button
                  onClick={() => handleOpenAddModal("pole-spacing")}
                  className="px-4 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-meta rounded-edge shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Luminaire &amp; Pole Schedule to Deal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: FEAT-03 Wind Region & Foundation Hardware Estimator (AS 1170.2) */}
      {activeToolTab === "wind-foundation-calc" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-5 rounded-panel border border-line shadow-xs space-y-4">
            <h3 className="text-base font-bold text-body flex items-center gap-2">
              <Wind className="w-4 h-4 text-brand-deep" />
              Wind &amp; Soil Site Parameters
            </h3>

            <div>
              <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
                Wind Region (AS/NZS 1170.2)
              </label>
              <select
                value={windRegion}
                onChange={(e) => setWindRegion(e.target.value as any)}
                className="w-full p-2 border border-line-strong rounded-edge text-meta font-semibold bg-white"
              >
                <option value="Region A">Region A (45 m/s - Normal Inland: VIC/NSW/ACT/SA)</option>
                <option value="Region B">Region B (57 m/s - Subtropical / Coastal Border)</option>
                <option value="Region C">Region C (69 m/s - Cyclonic NT/QLD/WA Coast)</option>
                <option value="Region D">Region D (88 m/s - Severe Cyclonic Pilbara/Exmouth)</option>
              </select>
              <p className="text-[11px] text-ink-dim mt-0.5">{foundationCalculations.windDesc}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
                  Pole Height
                </label>
                <select
                  value={foundationPoleHeight}
                  onChange={(e) => setFoundationPoleHeight(Number(e.target.value))}
                  className="w-full p-2 border border-line-strong rounded-edge text-meta font-semibold bg-white"
                >
                  <option value={4}>4.0 Metres</option>
                  <option value={5}>5.0 Metres</option>
                  <option value={6}>6.0 Metres (Standard)</option>
                  <option value={8}>8.0 Metres</option>
                  <option value={10}>10.0 Metres</option>
                </select>
              </div>

              <div>
                <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
                  Foundation Type
                </label>
                <select
                  value={foundationType}
                  onChange={(e) => setFoundationType(e.target.value as any)}
                  className="w-full p-2 border border-line-strong rounded-edge text-meta font-semibold bg-white"
                >
                  <option value="Base Plate (Ragbolt)">Base Plate (Ragbolt Cage)</option>
                  <option value="Direct Burial">Direct Burial (Soil Embedment)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
                  Soil Classification
                </label>
                <select
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value as any)}
                  className="w-full p-2 border border-line-strong rounded-edge text-meta font-semibold bg-white"
                >
                  <option value="Clay / Standard">Clay / Cohesive Soil</option>
                  <option value="Sandy / Coastal">Sand / Coastal Fill</option>
                  <option value="Rock / Hardpan">Rock / Hard Ground</option>
                </select>
              </div>

              <div>
                <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
                  Pole Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  value={foundationQuantity}
                  onChange={(e) => setFoundationQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full p-2 border border-line-strong rounded-edge text-meta font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
                Destination State (Freight Calculation)
              </label>
              <select
                value={destState}
                onChange={(e) => setDestState(e.target.value as any)}
                className="w-full p-2 border border-line-strong rounded-edge text-meta font-semibold bg-white"
              >
                <option value="VIC">Victoria (Local Warehouse Dispatch)</option>
                <option value="NSW">New South Wales / ACT</option>
                <option value="QLD">Queensland (Regional / Coastal)</option>
                <option value="WA">Western Australia (Perth / Pilbara)</option>
                <option value="NT">Northern Territory (Darwin / Alice)</option>
                <option value="SA">South Australia</option>
                <option value="TAS">Tasmania</option>
              </select>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gradient-to-br from-brand-wash to-white p-6 rounded-panel border border-brand-edge shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-spec font-bold text-brand-deep uppercase">AS 1170.2 Structural Engineering Output</span>
                  <h2 className="text-xl font-bold text-body">Footing Dimensions &amp; Hardware Sizing</h2>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-brand-deep">
                    {foundationCalculations.windSpeed}
                  </span>
                  <p className="text-[11px] text-ink-dim uppercase font-bold">Design Ultimate Wind Speed</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-white p-3.5 rounded-edge border border-line shadow-2xs">
                  <div className="text-spec font-bold text-ink-dim uppercase">Footing Depth &amp; Diameter</div>
                  <div className="text-xl font-bold text-body mt-1">
                    {foundationCalculations.embedmentDepthM}m deep x {foundationCalculations.footingDiameterMm}mm dia
                  </div>
                  <div className="text-[11px] text-ink-dim">Embedment per AS 1170.2 / AS 2159</div>
                </div>

                <div className="bg-white p-3.5 rounded-edge border border-line shadow-2xs">
                  <div className="text-spec font-bold text-ink-dim uppercase">Total Concrete Volume</div>
                  <div className="text-xl font-bold text-brand-deep mt-1">
                    {foundationCalculations.totalConcreteM3} m³
                  </div>
                  <div className="text-[11px] text-ink-dim">~{foundationCalculations.concreteVolPerFootingM3} m³ per individual footing</div>
                </div>

                <div className="bg-white p-3.5 rounded-edge border border-line shadow-2xs">
                  <div className="text-spec font-bold text-ink-dim uppercase">Freight &amp; Total Weight</div>
                  <div className="text-xl font-bold text-brand mt-1">
                    {foundationCalculations.totalShipmentWeightKg.toLocaleString()} kg
                  </div>
                  <div className="text-[11px] text-ink-dim">Est. Depot Freight to {destState}: ${foundationCalculations.estimatedFreight.toLocaleString()}</div>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-edge border border-brand-edge text-meta space-y-1">
                <div className="font-bold text-body flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-brand-deep" />
                  <span>Recommended Foundation Hardware Schedule:</span>
                </div>
                <p className="text-ink-dim text-spec">
                  • <strong>{foundationQuantity}x</strong> {foundationCalculations.hardwareName} (<strong>{foundationCalculations.hardwareSKU}</strong>) @ ${foundationCalculations.hardwareUnitPrice}/ea<br />
                  • Total Foundation Hardware Scope: <strong>${(foundationQuantity * foundationCalculations.hardwareUnitPrice).toLocaleString()}</strong> (ex GST)
                </p>
              </div>

              {/* FEAT-01 / FEAT-03: Add Hardware to Deal */}
              <div className="pt-2 flex items-center justify-between border-t border-brand-edge">
                <div className="text-spec text-ink-dim font-medium">
                  Hardware Total: <strong className="text-body font-bold">${(foundationQuantity * foundationCalculations.hardwareUnitPrice).toLocaleString()}</strong> (ex GST)
                </div>
                <button
                  onClick={() => handleOpenAddModal("wind-foundation")}
                  className="px-4 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-meta rounded-edge shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Foundation Hardware to Deal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FEAT-01: Modal for Adding Calculation to Quote / Deal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-chrome/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-brand-deep" />
                <h3 className="text-lg font-bold text-body">
                  Inject Calculation into CRM Quote / Deal
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-ink-faint hover:text-ink p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-meta">
              {/* Destination Mode */}
              <div>
                <label className="block text-spec font-bold uppercase text-ink-dim mb-1.5">
                  Target Destination
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAddMode("existing")}
                    className={`py-2 px-3 rounded-edge font-bold text-meta border transition-colors cursor-pointer text-center ${
                      addMode === "existing"
                        ? "bg-brand-deep text-white border-brand-deep"
                        : "bg-paper hover:bg-raised text-ink-dim border-line"
                    }`}
                  >
                    Add to Existing Deal
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMode("new")}
                    className={`py-2 px-3 rounded-edge font-bold text-meta border transition-colors cursor-pointer text-center ${
                      addMode === "new"
                        ? "bg-brand-deep text-white border-brand-deep"
                        : "bg-paper hover:bg-raised text-ink-dim border-line"
                    }`}
                  >
                    Create New Deal
                  </button>
                </div>
              </div>

              {addMode === "existing" ? (
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Select CRM Deal *
                  </label>
                  <select
                    value={selectedDealId}
                    onChange={(e) => setSelectedDealId(e.target.value)}
                    className="w-full p-2 bg-paper rounded-edge border border-line text-meta font-medium"
                  >
                    {crmOpportunities.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.accountName} - ${d.dealValue.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                      New Project / Deal Name *
                    </label>
                    <input
                      type="text"
                      value={newDealName}
                      onChange={(e) => setNewDealName(e.target.value)}
                      className="w-full p-2 bg-paper rounded-edge border border-line text-meta font-semibold"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                        Customer Account *
                      </label>
                      <select
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="w-full p-2 bg-paper rounded-edge border border-line text-meta font-medium"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                        Pipeline
                      </label>
                      <select
                        value={selectedPipelineId}
                        onChange={(e) => setSelectedPipelineId(e.target.value)}
                        className="w-full p-2 bg-paper rounded-edge border border-line text-meta font-medium"
                      >
                        {pipelines.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Items Summary preview */}
              <div className="p-3 bg-brand-wash rounded-edge border border-brand-edge text-meta space-y-1">
                <div className="font-bold text-brand-deep text-spec uppercase">Items to be injected:</div>
                <div className="text-body font-medium text-spec">
                  {modalSourceTool === "cable-cover" && (
                    <span>• {cableCoverCalculations.totalRolls}x {cableCoverCalculations.productName} ({cableCoverCalculations.productCode}) = <strong>${cableCoverCalculations.estimatedSell.toLocaleString()}</strong></span>
                  )}
                  {modalSourceTool === "pole-spacing" && (
                    <span>
                      • {spacingCalculations.polesPerKm}x {spacingCalculations.recommendedLuminaireName}<br />
                      • {spacingCalculations.polesPerKm}x {spacingCalculations.recommendedPoleName}
                    </span>
                  )}
                  {modalSourceTool === "wind-foundation" && (
                    <span>• {foundationQuantity}x {foundationCalculations.hardwareName} ({foundationCalculations.hardwareSKU}) = <strong>${(foundationQuantity * foundationCalculations.hardwareUnitPrice).toLocaleString()}</strong></span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 text-ink-dim hover:text-ink font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddToDeal}
                  className="px-4 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-meta rounded-edge shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm &amp; Add to Deal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
