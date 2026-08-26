import {
  Opportunity,
  PlasgainProduct,
  KnowledgeDocument,
  LessonTopic,
  GlossaryTerm
} from "../types";

export const SAMPLE_PRODUCTS: PlasgainProduct[] = [
  {
    id: "prod-intense-50w",
    name: "Intense Light - 50W Solar",
    code: "50W-INTENSE",
    category: "Split-System Solar Luminaire",
    application: [
      "Shared pathways",
      "Walking trails",
      "Pedestrian crossings",
      "Residential roads",
      "Car parks",
      "Recreational reserves"
    ],
    lumens: "7,500 lm",
    cct: "3000K-6500K",
    autonomy: "Based on 896Wh battery / 70Ah 12.8V and programmable profile (PIR / time control)",
    battery: "896Wh with controller; 70Ah / 12.8V",
    solarPanel: "130W / 18V monocrystalline PV (swings approx. 260°)",
    poleHeight: "Lamp installation diameter: 60 mm spigot (typically 4m to 6m)",
    ingressImpact: "IP65 / IK09 die-cast aluminium",
    warranty: "3 years battery / 10 years solar panel",
    keyFeatures: [
      "7,500 lm output with Philips SMD 3030 LED module (150 lm/W lamp efficiency)",
      "Split-system design with solar panel capable of rotating approx. 260° to capture maximum solar radiation",
      "Battery housed inside luminaire body with 10A PWM IP68 waterproof charge controller",
      "PIR motion sensor and programmable operating times",
      "High-pressure die-cast aluminium fixture body with polycarbonate lens and custom paint options"
    ],
    limitations: [
      "Final spacing, mounting height, and exact lighting category (e.g. AS/NZS 1158 P4/P5) are not established by public page - requires Dialux calculation",
      "Solar autonomy depends on geographic solar exposure and selected dimming/sensor profile"
    ],
    datasheetDoc: "Plasgain 50W Solar Intense Light Web Page & 2025 Catalogue",
    sourceUrl: "https://plasgain.com.au/50w-solar-intense-light/",
    status: "Current",
    authorityLevel: "4. Public Plasgain webpage",
    standardCompliance: ["AS/NZS 1158 (Referenced for public spaces)", "IP65 / IK09", "CE / RoHS"]
  },
  {
    id: "prod-pro-blade",
    name: "Pro Blade Solar 75/125",
    code: "PBS-75 / PBS-125",
    category: "Modular Solar Pole Platform",
    application: [
      "Shared pathways",
      "Highways / major roadway",
      "Car parks",
      "Larger play areas",
      "Blackspot locations",
      "Mining areas",
      "Schools and public facilities"
    ],
    lumens: "15W (2,400 lm), 2x15W (4,800 lm), 40W (6,400 lm), 60W (8,900 lm) @ 150 lm/W",
    cct: "3000K and 4000K standard (2200K and 2700K available on request)",
    autonomy: "460.8Wh (Solar 75) or 921.6Wh (Solar 125) battery platform",
    battery: "460.8Wh (Solar 75) / 921.6Wh (Solar 125) low-voltage battery",
    solarPanel: "75W (panel ID 2030) or 125W (panel ID 2060) mounted 0.5m above luminaire mounting height H",
    poleHeight: "Configurable height H with outreach TX on Plaspole (A), tapered (B), or round (C) pole",
    ingressImpact: "CRI: 70, Lens options: Type 2, 3, 4",
    warranty: "Published as turnkey collaborative solar platform with enLighten",
    keyFeatures: [
      "Configurable turnkey platform (Plasgain & enLighten collaboration) - separate solar pole system and luminaire wattage",
      "Pro Blade 75: 75W PV, 460.8Wh battery, pairs with 15W (2,400 lm) or 2x15W luminaires",
      "Pro Blade 125: 125W PV, 921.6Wh battery, pairs with 40W (6,400 lm) or 60W (8,900 lm) luminaires",
      "Multiple lens options (Type 2, 3, 4) for pathways, roadways and car parks",
      "Compatible with Plaspole sustainable poles or galvanised/painted steel columns"
    ],
    limitations: [
      "75 and 125 designate the solar panel power, not the luminaire wattage",
      "Extracted catalogue table contains a model-code typo for the 60W 4000K row - verify exact SKU before quoting"
    ],
    datasheetDoc: "Plasgain Pro Blade Solar 75-125W Webpage & 2025 Solar Catalogue",
    sourceUrl: "https://plasgain.com.au/pro-blade-solar-75-125w/",
    status: "Current",
    authorityLevel: "4. Public Plasgain webpage",
    conflictFlag: {
      hasConflict: true,
      title: "Pro Blade Model Code String",
      description: "Last 60W 4000K row in catalogue extract repeats a 3K model code string.",
      actionRequired: "Verify exact SKU internally before quote/order."
    },
    standardCompliance: ["AS/NZS 1158 (P & V Category references)", "AS/NZS 4509 (Referenced)"]
  },
  {
    id: "prod-solar-blade-sonaray",
    name: "Solar Blade / All-In-One Pro Series (SS-2020 / SS-2030 / SS-2060)",
    code: "SS-2020 / SS-2030 / SS-2060",
    category: "All-In-One Solar Street Light",
    application: [
      "Council shared pathways & pedestrian trails (PP2 / PP3 standard)",
      "Car parks & commercial facilities",
      "Subdivision roads & urban pathways",
      "Temporary & portable infrastructure (6m Hinged Pole ballast base)",
      "Building perimeter & wall mount (with SS-2000-A01 bracket)"
    ],
    lumens: "SS-2020: 3,920 lm (196 lm/W) | SS-2030: 8,200 lm (205 lm/W) | SS-2060: 15,700 lm (210 lm/W)",
    cct: "2700K - 6500K (5000K on IV750 Type IV optics)",
    autonomy: "12-15 hours nightly with 4-5 cloudy/rainy days backup (MPPT controller)",
    battery: "SS-2020: 12.8V 18Ah (230.4Wh) | SS-2030: 12.8V 36Ah (460.8Wh) | SS-2060: 12.8V 72Ah (921.6Wh) LiFePO4",
    solarPanel: "SS-2020: 50W | SS-2030: 75W | SS-2060: 125W Monocrystalline PV (>21% cell efficiency)",
    poleHeight: "SS-2020: 6-7m (20-25m spacing) | SS-2030: 6-8m (20-25m spacing) | SS-2060: 8-10m (35-40m spacing). Spigot entry: 70-76mm.",
    ingressImpact: "IP66 waterproof / IK09 impact resistant / High-strength aluminium alloy frame",
    warranty: "3 years battery life / 2000+ cycles @ 25°C (>80% DoD)",
    keyFeatures: [
      "High efficacy LED engine delivering up to 210 lm/W fixture efficacy (220 lm/W high-efficiency LED chips)",
      "433MHz drone-grade remote control (up to 30m range through obstacles) with 4 operating modes (L, T, M, U)",
      "4-LED battery gauge (25%, 50%, 75%, 100%) and multi-colour diagnostics (Red/Green/Blue/Yellow)",
      "Standard 6.0m hinged pole portable ballast base (750-950kg) certified to achieve AS/NZS 1158 PP2/PP3 standard with 25-30m spacing",
      "0° - 90° angle adjustable spigot bracket (70-76mm caliber) and wall mount bracket accessory (SS-2000-A01)"
    ],
    limitations: [
      "Magnet iron sheet must be removed prior to pole lifting to activate luminaire",
      "Sequential RGB LED flashing indicates battery wiring/connector fault",
      "Direct daytime sunlight may require closer proximity for remote control configuration"
    ],
    datasheetDoc: "Sonaray Solar Blade / All-In-One Pro Series Technical Specification (v1.5, Feb 2024)",
    sourceUrl: "https://www.sonaray.com.au",
    status: "Current",
    authorityLevel: "2. Current approved product datasheet",
    standardCompliance: ["AS/NZS 1158 (PP2 / PP3 Pathway & Cyclist)", "IP66", "IK09", "CE / RoHS"]
  },
  {
    id: "prod-enlighten-zorro-2",
    name: "enLighten Zorro 2 (15W - 200W)",
    code: "ZAL15S / ZAL40S / ZAL60S / ZAL80M / ZAL120M / ZAL150L / ZAL200L",
    category: "Mains / Commercial Area & Street Luminaire",
    application: [
      "Council parks & recreational reserves",
      "Dedicated bike paths & shared walkways (PP1 - PP5 Category)",
      "Outdoor car parks & commercial facilities",
      "Industrial estates & campus roadways",
      "Coastal walkways & marine environments (C4 corrosion class)"
    ],
    lumens: "15W: 2,400 lm | 40W: 6,400 lm | 60W: 8,900 lm | 80W: 12,800 lm | 120W: 18,600 lm | 150W: 23,900 lm | 200W: 29,900 lm (>150 lm/W)",
    cct: "4000K standard (2200K - 5700K available on request), CRI Ra >70 / Ra >80",
    autonomy: "Mains powered (100-240V AC 50/60Hz, Inventronics Driver >90% eff, PF >0.9)",
    battery: "Mains AC (Optional solar integration via Pro Blade platform)",
    solarPanel: "N/A (Mains Powered Luminaire)",
    poleHeight: "3m to 20m mounting heights (suits 60mm spigot, 42mm with ZWB-ConAdap, 76mm with ZWB-PoleRed)",
    ingressImpact: "IP66 waterproof / IK10 impact resistant / C4 Coastal Corrosion Resistance / Tempered Glass",
    warranty: "5 years warranty / 120,000 hrs @ L70 (80,000h @ L80, 39,000h @ L90)",
    keyFeatures: [
      "High luminaire efficacy >150 lm/W using high-output Lumileds LEDs and Inventronics driver (up to 160 lm/W calculated)",
      "10kV standard surge protection (20kV available on request)",
      "Toolless clipping system for rapid electrical termination and maintenance",
      "Full optical distribution choices: Type 2 (Narrow paths), Type 3 (Wider roads/carparks), Type 4 (Forward area)",
      "AS 1158.3.1:2020 Pathway Spacing Tables available for PP1 through PP5 categories (15W and 40W)",
      "Smart control ready: Photoelectric (PE) cell, 1-10V, DALI, Casambi wireless controls with ZHAGA Book 18 socket",
      "Complete mounting accessory ecosystem: ZWB-PoleRed (78->60mm), ZWB-CrosArm (double light), ZWB-ConAdapV2 (42->60mm), ZWB-15 Degree (wall bracket), ZAL-BSG (back spill guard)",
      "Approved under state energy savings schemes: Victorian Energy Upgrades (VEU) & NSW IPART"
    ],
    limitations: [
      "Mounting spigot bolts must be torqued to 17 Nm (do not overtighten)",
      "Back Spill Guard (ZAL-BSG) rated up to 10m pole height and max 100 km/h winds",
      "Requires licensed electrician installation per AS/NZS 3000 wiring regulations",
      "Special order option for 240W requires direct manufacturer confirmation"
    ],
    datasheetDoc: "enLighten Zorro 2 Datasheet (March 2026), Installation Guide & AS 1158.3.1 Spacing Tables",
    sourceUrl: "https://www.enlighten.com.au",
    status: "Current",
    authorityLevel: "2. Current approved product datasheet",
    standardCompliance: ["AS/NZS 1158.3.1:2020 (PP1-PP5)", "AS/NZS 3000", "IP66", "IK10", "C4 Corrosion", "ZHAGA Book 18", "VEU Approved", "IPART Approved", "Lighting Council Australia Accredited"]
  },
  {
    id: "prod-roadway-vled-70w",
    name: "Roadway V-LED 70W",
    code: "V-LED-70W",
    category: "High-Output Roadway Solar System",
    application: [
      "Highways / major roadway",
      "Shared pathways",
      "Larger play areas",
      "Blackspot locations",
      "Car parks",
      "Mining areas"
    ],
    lumens: "70W high-performance CREE LED luminaire",
    cct: "3000K, 4000K standard; 5000K available",
    autonomy: "2800Wh integrated energy storage",
    battery: "2800Wh battery storage integrated with panel system",
    solarPanel: "Twin 230W panels (460W total monocrystalline PV capacity), 360° rotational orientation",
    poleHeight: "Mounting height: 9-15 m (Fixing: 43-48 mm spigot entry; catalogue shows 8.5m slip-base pole with 3m VESI outreach)",
    ingressImpact: "IP66 / IK06 Marine-grade die-cast aluminium",
    warranty: "High performance roadway luminaire",
    keyFeatures: [
      "Twin 230W solar panels providing 460W total PV collection with 360° rotation",
      "2800Wh substantial battery storage integrated with panel array",
      "CREE LEDs with Type 2, 3, 5 optics, glare shields, and semi-cut-off / aero-screen",
      "Catalogue references compliance to TS 1158.6 roadway specification and smart-city readiness",
      "Engineered replacement alternative for conventional HPS, mercury vapour and metal-halide lighting"
    ],
    limitations: [
      "TS 1158.6 is a public catalogue claim - tender submissions require current test reports and certified photometrics",
      "Public text alternates between generic 'lithium-ion' and 'LiFePO4' battery chemistry - confirm exact datasheet"
    ],
    datasheetDoc: "Plasgain Roadway V-LED 70W Webpage & 2025 Solar Catalogue",
    sourceUrl: "https://plasgain.com.au/roadway-v-led-70w/",
    status: "Current",
    authorityLevel: "4. Public Plasgain webpage",
    conflictFlag: {
      hasConflict: true,
      title: "Battery Chemistry Wording Ambiguity",
      description: "Public text alternates between generic 'lithium-ion' and 'LiFePO4' battery descriptions.",
      actionRequired: "Current product datasheet controls. Confirm chemistry before contractual commitments."
    },
    standardCompliance: ["TS 1158.6 (Catalogue claim - verify test report)", "AS/NZS 1158", "IP66 / IK06"]
  },
  {
    id: "prod-superlux",
    name: "Superlux Solar Lighting",
    code: "LRC-H 30W / 60W / 120W",
    category: "All-in-One Solar Lighting",
    application: [
      "Council infrastructure",
      "Car parks",
      "Public parks / gardens",
      "Permanent & portable lighting",
      "Light head for Portable Solar Tower (120W)"
    ],
    lumens: "30W: 5,400 lm | 60W: 10,800 lm | 120W: 21,600 lm",
    cct: "2700K-6500K",
    autonomy: "30W: 12.8V 307.2Wh LiFePO4 | 60W: 12.8V 460.8Wh LiFePO4 | 120W: 25.6Ah 921.6Wh LiFePO4",
    battery: "Modular LiFePO4 battery pack with smart protection and field replacement capability",
    solarPanel: "30W: 18V 60W | 60W: 18V 90W | 120W: 36V 160W monocrystalline",
    poleHeight: "Suits mid-hinge pole, concrete block, or telescopic 5-section pole",
    ingressImpact: "AL6063 aluminium frame, beam angle 150° x 80°",
    warranty: "Modular construction with replaceable battery design",
    keyFeatures: [
      "All-in-one aluminium body with Philips LED chips (72, 144, or 384 chips)",
      "Light control: PIR motion sensor + time control (30W & 60W); time control on 120W",
      "Modular battery pack allows field replacement without taking down the entire structure",
      "120W version is used on the Portable Solar Light Tower"
    ],
    limitations: [
      "Published 200 lm/W efficacy does not mathematically match listed lumens divided by nominal wattage (which equals 180 lm/W). Flag for internal confirmation if efficacy is a formal tender criterion."
    ],
    datasheetDoc: "Plasgain Superlux Solar Lighting Web Page & Catalogue",
    sourceUrl: "https://plasgain.com.au/superlux-solar-lighting/",
    status: "Current",
    authorityLevel: "4. Public Plasgain webpage",
    conflictFlag: {
      hasConflict: true,
      title: "Superlux Efficacy Numerical Inconsistency",
      description: "Table states 200 lm/W, but 5,400 lm / 30W = 180 lm/W.",
      actionRequired: "Do not self-correct; verify manufacturer intended efficacy if critical to a tender."
    },
    standardCompliance: ["AS/NZS 1158 (Referenced)", "AS/NZS 4509 (Referenced)"]
  },
  {
    id: "prod-deltalux",
    name: "Deltalux Solar Lighting",
    code: "SR-1010 (10W) / SR-4030 (30W) - CONFLICT RECORDED",
    category: "Path & Reserve Solar Lighting",
    application: [
      "Shared pathways",
      "Walking trails",
      "Pedestrian crossings",
      "Residential roads",
      "Car parks",
      "Recreational reserves",
      "Meandering pathways & irregular layouts"
    ],
    lumens: "Catalogue (SR-1010): 630 lm @ 10W | Web Specs (SR-4030): 3180 lm @ 30W",
    cct: "6000K published",
    autonomy: "Catalogue: 7.4V 15Ah battery (17h run) | Web Specs: 14.8V 15Ah battery (30h run)",
    battery: "7.4V 15Ah (catalogue) vs 14.8V 15Ah (web specs)",
    solarPanel: "Catalogue: 20W PV | Solar overview: 90W PV",
    poleHeight: "Multiple outreach options, 3-axis rotation / flexible mounting",
    ingressImpact: "IP65 aluminium construction, waterproof, corrosion resistant",
    warranty: "5 years published",
    keyFeatures: [
      "Designed for meandering pathways and irregular layouts where outreach and solar panel need independent orientation",
      "3-axis rotation with symmetrical or asymmetrical photometry options",
      "Waterproof, shock resistant, corrosion resistant and insect proof aluminium body"
    ],
    limitations: [
      "HIGH SEVERITY PUBLIC CONFLICT: Web page title says 'Deltalux 10W' but specs table describes 30W SR-4030 (3180 lm), whereas 2025 catalogue shows 10W SR-1010 (630 lm, 20W panel), and solar overview page mentions 90W panel. Technical confirmation required before quoting!"
    ],
    datasheetDoc: "Plasgain Deltalux Webpage, Solar Street Lighting Overview, & 2025 Catalogue",
    sourceUrl: "https://plasgain.com.au/deltalux-solar-lighting/",
    status: "Current",
    authorityLevel: "4. Public Plasgain webpage",
    conflictFlag: {
      hasConflict: true,
      title: "Deltalux High-Severity Specification Conflict",
      description: "Catalogue SR-1010 (10W, 20W panel, 630 lm) vs Webpage SR-4030 (30W, 3180 lm) vs 90W panel claim on solar overview.",
      actionRequired: "Technical confirmation required. Public Plasgain sources contain conflicting information. Confirm current internal datasheet before quoting."
    },
    standardCompliance: ["AS/NZS 1158 (Referenced for pathways)", "IP65"]
  },
  {
    id: "prod-portable-tower",
    name: "Portable Solar Light Tower",
    code: "PST-120W",
    category: "Portable / Temporary Solar Mast",
    application: [
      "Construction / temporary works",
      "Council temporary works",
      "Events / temporary sites",
      "Hire fleets",
      "Locations requiring no fuel / zero noise"
    ],
    lumens: "21,600 lm (120W Philips LED light head, 384 chips, 150° x 80° beam)",
    cct: "2700K-6500K",
    autonomy: "25.6Ah / 921.6Wh LiFePO4 battery with remote-control programmable time modes",
    battery: "LiFePO4 25.6Ah / 921.6Wh integrated in light head",
    solarPanel: "36V / 160W monocrystalline PV",
    poleHeight: "Telescopic mast: lowered 3.2 m, extended 6-7 m (raised/lowered in minutes via hand-winch)",
    ingressImpact: "Concrete base block (1150 x 1150 x 502 mm, 1153 kg, fork ports 200 x 100 mm, total weight 1300.8 kg)",
    warranty: "Structurally tested to Australian Standards (public claim)",
    keyFeatures: [
      "Zero fuel, zero noise, zero carbon mobile lighting solution for construction and events",
      "Heavy duty concrete ballast base with forklift pockets and Swift Lift ferrules for easy site relocation",
      "5-section galvanised telescopic mast extending to 6-7m with lockable hand-winch",
      "120W Superlux head delivering 21,600 lm with remote control timer scheduling"
    ],
    limitations: [
      "Requires forklift/crane access for transport (total weight 1300.8 kg)",
      "Collect site operating hours and required coverage before assuming one tower is sufficient"
    ],
    datasheetDoc: "Plasgain Portable Solar Light Tower Webpage & Catalogue",
    sourceUrl: "https://plasgain.com.au/portable-solar-light-tower/",
    status: "Current",
    authorityLevel: "4. Public Plasgain webpage",
    standardCompliance: ["Australian Standards Structural Testing (Public claim)"]
  },
  {
    id: "prod-industrial-cctv",
    name: "Industrial CCTV Cameras",
    code: "IND-CCTV-SOLAR",
    category: "Solar / Industrial Surveillance",
    application: [
      "Construction / industrial sites",
      "Remote monitoring / security",
      "Utilities & council infrastructure",
      "Permanent or portable surveillance"
    ],
    lumens: "Four light sources / two array infrared lights (IR distance up to 30m)",
    cct: "Infrared / full colour / smart night vision",
    autonomy: "5-7 rainy days backup (LiFePO4 12.8V / 42Ah battery, 8-10 yr lifespan)",
    battery: "LiFePO4 12.8V / 42Ah, solar controller 12V 10A",
    solarPanel: "18V / 80W solar panel (lifespan max 25 yrs)",
    poleHeight: "Recommended installation height: 3-6 m",
    ingressImpact: "IP66 2.5-inch aluminium body (-20°C to +60°C discharging)",
    warranty: "8-10 years battery lifespan statement (public page)",
    keyFeatures: [
      "4G cellular and Wi-Fi connectivity with live video, playback, and image download on Android / iOS / PC",
      "PTZ 355° horizontal and 0-90° vertical rotation with HD zoom lens",
      "Two-way voice intercom within 20m and audible alarm",
      "5MP (2560x1950) / 2MP (1920x1080) resolution, 64GB storage default (5-7 days recording, up to 128GB supported)",
      "HTTPS encryption, 2FA, and automated firmware update architecture"
    ],
    limitations: [
      "Verify current camera/software implementation before making contractual cybersecurity commitments"
    ],
    datasheetDoc: "Plasgain Industrial CCTV Cameras Webpage",
    sourceUrl: "https://plasgain.com.au/industrial-cctv-cameras/",
    status: "Current",
    authorityLevel: "4. Public Plasgain webpage",
    standardCompliance: ["IP66", "HTTPS / 2FA Security architecture (Public claim)"]
  },
  {
    id: "prod-portable-cctv",
    name: "Portable Solar CCTV 100W",
    code: "PST-CCTV-100W",
    category: "Portable Solar CCTV Mast",
    application: [
      "Construction sites",
      "Local council works",
      "Events",
      "Temporary installations",
      "Hire fleets"
    ],
    lumens: "Automatic IR-cut day/night mode",
    cct: "Day/night IR switch",
    autonomy: "24/7 continuous SD card recording with solar & LiFePO4 battery",
    battery: "LiFePO4 12.8V / 42Ah",
    solarPanel: "100W monocrystalline PV",
    poleHeight: "Telescopic relocatable mast on safety-yellow ballast base with forklift slots",
    ingressImpact: "Outdoor ruggedized",
    warranty: "Temporary/permanent relocatable system",
    keyFeatures: [
      "All-in-one portable CCTV system with 360° horizontal / 90° vertical camera viewing",
      "1/2.8 CMOS sensor, 2MP 1920x1080 resolution, 81.1°-26.2° field of view",
      "4G / Wi-Fi live video to smartphone or PC with motion-triggered recording and built-in speaker alerts",
      "Forklift slots for rapid site deployment and relocation as projects progress"
    ],
    limitations: [
      "Collect site power/shading, 4G coverage, and required recording retention before deploying"
    ],
    datasheetDoc: "Plasgain Portable Solar CCTV Webpage",
    sourceUrl: "https://plasgain.com.au/portable-solar-cctv/",
    status: "Current",
    authorityLevel: "4. Public Plasgain webpage",
    standardCompliance: ["Outdoor Weatherproof"]
  },
  {
    id: "prod-plaspole",
    name: "Plaspole",
    code: "PLASPOLE-SERIES",
    category: "Sustainable Recycled-Core Light Pole",
    application: [
      "Public parks / gardens",
      "Shared pathways",
      "Council infrastructure",
      "Urban subdivisions",
      "Compatible with decorative luminaires & solar systems"
    ],
    lumens: "N/A (Light Pole Platform)",
    cct: "N/A",
    autonomy: "N/A",
    battery: "N/A",
    solarPanel: "Can mount solar systems or grid-connected fittings",
    poleHeight: "Customisable heights, in-ground (5mm base wall thickness) or above-ground base plate",
    ingressImpact: "UV/weather-resistant aluminium skin + recycled plastic core + internal steel cable conduit",
    warranty: "Intended service life over 25 years; independent testing aligns with VESI and Australian Standards",
    keyFeatures: [
      "Australian made sustainable light pole using approx. 40 kg of recycled post-consumer plastic (approx. 2,000 milk containers) per pole",
      "Molten recycled plastic bonds with aluminium shell under pressure, adding structural integrity and natural electrical insulation",
      "Internal steel tube provides smooth cable conduit for easy electrical wiring",
      "Galvanised protection at ground level shields against line-trimmer damage; conventional access door layout",
      "Paintable finish with superior corrosion resistance"
    ],
    limitations: [
      "CARBON FIGURE CONFLICT: Public text states both 248 kg CO2 vs 380 kg steel and 246 kg CO2e vs 380 kg steel, and claims both 30% and 35% reduction. Do NOT quote exact carbon figures in tenders without checking current approved LCA report."
    ],
    datasheetDoc: "Plasgain Sustainable Light Poles & Light Pole Manufacturers Webpages",
    sourceUrl: "https://plasgain.com.au/sustainable-light-poles/",
    status: "Current",
    authorityLevel: "4. Public Plasgain webpage",
    conflictFlag: {
      hasConflict: true,
      title: "Plaspole Carbon Figure Inconsistency",
      description: "248 kg CO2 vs 246 kg CO2e, and 30% vs 35% carbon reduction figures in public pages.",
      actionRequired: "Do not quote exact carbon reduction percentage in tenders without current approved LCA report."
    },
    standardCompliance: ["VESI Alignment", "Australian Standards Structural Alignment", "25+ Year Service Life"]
  },
  {
    id: "prod-safepole",
    name: "SafePole",
    code: "SAFEPOLE",
    category: "Energy-Absorbing Road Safety Light Pole",
    application: [
      "Highways / major roadway",
      "Arterial roads",
      "Road-safety / frangible pole applications",
      "High-risk vehicle collision zones"
    ],
    lumens: "N/A (Light Pole Platform)",
    cct: "N/A",
    autonomy: "N/A",
    battery: "N/A",
    solarPanel: "Suits mains or solar roadway luminaires",
    poleHeight: "8.5m pole (11m mounting height) and 11m pole (12.5m mounting height); VESI and VicRoads-approved outreaches",
    ingressImpact: "Energy-absorbing patented slotting concept; crash tested at 60 km/h and 110 km/h; wind speeds up to 189 km/h",
    warranty: "Australian designed and tested",
    keyFeatures: [
      "Energy-absorbing design deforms in a controlled manner upon vehicle impact to reduce occupant injury and secondary projectile hazard",
      "Crash tested at 60 km/h and 110 km/h",
      "Non-trip-hazard base with protective in-ground coating",
      "Rated for wind speeds up to 189 km/h",
      "Compatible with VESI and VicRoads approved outreaches"
    ],
    limitations: [
      "Road-safety pole selection is safety-critical: do not use AI summary for approval; obtain current authority approvals, crash-test certs and engineering drawings"
    ],
    datasheetDoc: "Plasgain SafePole Webpage & The Safest Light Pole Article",
    sourceUrl: "https://plasgain.com.au/lighting-products/safe-pole/",
    status: "Current",
    authorityLevel: "4. Public Plasgain webpage",
    standardCompliance: ["VESI / VicRoads outreach compatibility", "Crash Tested 60 km/h & 110 km/h", "Wind rated to 189 km/h"]
  },
  {
    id: "prod-slipbase",
    name: "Slip Base Light Pole",
    code: "SLIP-BASE",
    category: "Breakaway Road Safety Light Pole",
    application: [
      "Highways / major roadway",
      "Arterial roads",
      "Breakaway road lighting applications",
      "On-grid and solar roadway lighting"
    ],
    lumens: "N/A (Light Pole Platform)",
    cct: "N/A",
    autonomy: "N/A",
    battery: "N/A",
    solarPanel: "Suitable for solar and on-grid roadway systems",
    poleHeight: "Mounting heights up to approximately 15 m",
    ingressImpact: "Two base plates clamped with three equally spaced bolts designed to release/topple during vehicle impact",
    warranty: "Engineered breakaway system",
    keyFeatures: [
      "Breakaway mechanism releases on impact to reduce decelerative forces on vehicle occupants",
      "Two plates clamped by three equally spaced bolts",
      "Accommodates mounting heights up to 15 m",
      "Suitable for both on-grid and solar roadway fixtures"
    ],
    limitations: [
      "Project authority requirements govern selection between slip-base (toppling) and SafePole (energy-absorbing)"
    ],
    datasheetDoc: "Plasgain Light Pole Manufacturers Webpage & SafePole Comparative Article",
    sourceUrl: "https://plasgain.com.au/the-safest-light-pole/",
    status: "Current",
    authorityLevel: "4. Public Plasgain webpage",
    standardCompliance: ["Road Authority Breakaway Standards"]
  },
  {
    id: "prod-standard-urd",
    name: "Standard URD Poles",
    code: "URD-OCTAGONAL",
    category: "Utility Octagonal Column",
    application: [
      "P Category internal / minor roads",
      "V Category major roads",
      "Residential roads",
      "Commercial subdivisions"
    ],
    lumens: "N/A (Pole Platform)",
    cct: "N/A",
    autonomy: "N/A",
    battery: "N/A",
    solarPanel: "Mains grid or solar roadway fixtures",
    poleHeight: "5.5 m, 7.5 m, and 9 m mounting heights",
    ingressImpact: "Tapered octagonal profile, hot-dip galvanised or painted",
    warranty: "Functional utility column",
    keyFeatures: [
      "Standard tapered octagonal profile widely used across Australian energy networks",
      "Standard side-entry roadway luminaire interface",
      "Available in 5.5m, 7.5m, and 9m heights with in-ground or base-plate mounting options"
    ],
    limitations: [
      "Mounting options depend on local power network/authority requirements"
    ],
    datasheetDoc: "Plasgain Standard URD Webpage",
    sourceUrl: "https://plasgain.com.au/light-pole-manufacturers/standard-urd/",
    status: "Current",
    authorityLevel: "4. Public Plasgain webpage",
    standardCompliance: ["Australian Power Authority Standards (P & V Category roads)"]
  },
  {
    id: "prod-standard-decorative",
    name: "Standard Decorative Poles",
    code: "STD-DECORATIVE",
    category: "Decorative Neighbourhood Pole",
    application: [
      "Neighbourhoods & residential estates",
      "Public spaces & reserves",
      "Commercial developments"
    ],
    lumens: "N/A (Pole Platform)",
    cct: "N/A",
    autonomy: "N/A",
    battery: "N/A",
    solarPanel: "Suits side-entry decorative fixtures",
    poleHeight: "6 m and 10 m mounting heights",
    ingressImpact: "Galvanised or painted finish",
    warranty: "Designed in conjunction with Powercor",
    keyFeatures: [
      "Contemporary decorative aesthetic designed/developed in conjunction with Powercor",
      "Single or double outreach arms with side-entry luminaire interface",
      "6m and 10m heights with in-ground mounting or base plate for foundation bolts"
    ],
    limitations: [
      "Check authority/network approved drawings for local estate compliance"
    ],
    datasheetDoc: "Plasgain Standard Decorative Webpage",
    sourceUrl: "https://plasgain.com.au/light-pole-manufacturers/standard-decorative/",
    status: "Current",
    authorityLevel: "4. Public Plasgain webpage",
    standardCompliance: ["Powercor Design Alignment"]
  },
  {
    id: "prod-posttop",
    name: "PostTop Poles",
    code: "POSTTOP",
    category: "Heritage / Period Decorative Column",
    application: [
      "Heritage precincts",
      "Council botanical gardens",
      "Period-style residential estates"
    ],
    lumens: "N/A (Pole Platform)",
    cct: "N/A",
    autonomy: "N/A",
    battery: "N/A",
    solarPanel: "Post-top luminaires",
    poleHeight: "Various sizes; in-ground or base plate with foundation bolts",
    ingressImpact: "Ornate transition castings, four standard colours + custom",
    warranty: "Architectural decorative column",
    keyFeatures: [
      "Period-style heritage aesthetic with two ornate transition castings",
      "Four standard colours (more on request), plain or painted finish",
      "Matching decorative street sign options available"
    ],
    limitations: ["Detailed dimensional specs require current product drawing"],
    datasheetDoc: "Plasgain PostTop Webpage",
    sourceUrl: "https://plasgain.com.au/light-pole-manufacturers/posttop/",
    status: "Current",
    authorityLevel: "4. Public Plasgain webpage"
  },
  {
    id: "prod-lincoln",
    name: "Lincoln Column",
    code: "LINCOLN",
    category: "Contemporary Curved Column",
    application: ["Urban developments", "Public open space", "Shopping centres"],
    lumens: "N/A (Pole Platform)",
    cct: "N/A",
    autonomy: "N/A",
    battery: "N/A",
    solarPanel: "Top-entry or side-entry luminaire options",
    poleHeight: "Various sizes; in-ground or base plate with foundation bolts",
    ingressImpact: "Tapered-round column with curved outreach",
    warranty: "Contemporary architectural column",
    keyFeatures: [
      "Tapered-round column profile with sweeping curved outreach",
      "Top-entry and side-entry luminaire fixture options",
      "Four standard colours, more on request"
    ],
    limitations: ["Detailed dimensional specs require current product drawing"],
    datasheetDoc: "Plasgain Lincoln Column Webpage",
    sourceUrl: "https://plasgain.com.au/light-pole-manufacturers/lincoln-column/",
    status: "Current",
    authorityLevel: "4. Public Plasgain webpage"
  },
  {
    id: "prod-gooseneck",
    name: "Gooseneck",
    code: "GOOSENECK",
    category: "Decorative Park & Urban Column",
    application: ["Urban developments", "Parks", "Shopping centres", "Council promenades"],
    lumens: "N/A (Pole Platform)",
    cct: "N/A",
    autonomy: "N/A",
    battery: "N/A",
    solarPanel: "Decorative outreach luminaire",
    poleHeight: "Various sizes; in-ground or base plate with foundation bolts",
    ingressImpact: "Single or double Gooseneck outreach",
    warranty: "Decorative park column",
    keyFeatures: [
      "Single or double Gooseneck decorative curved arms",
      "Four standard colours (more on request)",
      "In-ground or base plate mounting for foundation bolts"
    ],
    limitations: ["Detailed dimensional specs require current product drawing"],
    datasheetDoc: "Plasgain Gooseneck Webpage",
    sourceUrl: "https://plasgain.com.au/light-pole-manufacturers/gooseneck/",
    status: "Current",
    authorityLevel: "4. Public Plasgain webpage"
  },
  {
    id: "prod-other-poles",
    name: "Other Named Pole Families (Civic Park, Promenade, Royal Park, Terrace, Waterside Gridded, Manningham)",
    code: "OTHER-POLES",
    category: "Decorative Pole Families",
    application: ["Council civic areas", "Foreshores", "Urban plazas"],
    lumens: "N/A (Family Name Index)",
    cct: "N/A",
    autonomy: "N/A",
    battery: "N/A",
    solarPanel: "Decorative fixtures",
    poleHeight: "Not detailed in public source",
    ingressImpact: "Decorative series",
    warranty: "Architectural series",
    keyFeatures: [
      "Publicly named Plasgain design families: Civic Park, Promenade, Royal Park, Terrace, Waterside Gridded, Manningham"
    ],
    limitations: [
      "Detailed specifications are NOT included in this public knowledge base - retrieve current product page/datasheet or ask the lighting team."
    ],
    datasheetDoc: "Plasgain Light Pole Manufacturers Webpage",
    sourceUrl: "https://plasgain.com.au/light-pole-manufacturers/",
    status: "Current",
    authorityLevel: "4. Public Plasgain webpage"
  }
];

export const SAMPLE_OPPORTUNITIES: Opportunity[] = [
  {
    id: "opp-001",
    customerCompany: "ABC Civil Pty Ltd",
    contactName: "Rob Mitchell",
    contactEmail: "rob.mitchell@abccivil.com.au",
    contactPhone: "+61 412 884 921",
    project: "Ballarat 1.2km Shared Path Upgrade",
    location: "Ballarat, Victoria",
    application: "Shared pathway / Pedestrian Trail",
    stage: "Awaiting Information",
    status: "Pending Customer",
    estimatedQuantity: 30,
    estimatedValue: 0,
    productsConsidered: ["Intense Light - 50W Solar", "Pro Blade Solar 75/125"],
    quoteDeadline: "2026-08-28",
    projectDate: "2026-11-15",
    lastActivity: "Enquiry analysed against Knowledge Base. Clarification questions prepared on AS/NZS 1158 category, path width, and dimming profile.",
    lastActivityDate: "Today at 09:15",
    nextAction: "Send specification questions email to Rob before quoting.",
    nextActionDate: "2026-08-21",
    readinessScore: 65,
    notes: "Ballarat 1.2km shared path. Trenching mains power is cost-prohibitive. Solar lighting requested. Drawings show 6m poles. Dusk-to-dawn requested.",
    rawEnquiry: "We are pricing a new 1.2 km shared pathway in Ballarat and require a solar lighting option. The current drawings indicate 6 m poles. Lighting is expected to operate dusk to dawn. Can you recommend a suitable solution and provide budget pricing? Installation is expected around November."
  },
  {
    id: "opp-002",
    customerCompany: "City of Greater Geelong",
    contactName: "Sarah Jenkins",
    contactEmail: "sjenkins@geelongcity.vic.gov.au",
    contactPhone: "+61 3 5272 4400",
    project: "Eastern Beach Foreshore Reserve Path",
    location: "Geelong, Victoria",
    application: "Walking trails / Foreshore Reserve",
    stage: "Technical Review",
    status: "Internal Review",
    estimatedQuantity: 24,
    estimatedValue: 0,
    productsConsidered: ["Intense Light - 50W Solar", "Plaspole"],
    quoteDeadline: "2026-08-25",
    projectDate: "2026-10-01",
    lastActivity: "Dialux photometric calculation requested from engineering team for 3000K luminaires on Plaspole sustainable poles.",
    lastActivityDate: "Yesterday at 15:30",
    nextAction: "Review Dialux report from Engineering and confirm mounting height.",
    nextActionDate: "2026-08-24",
    readinessScore: 90,
    notes: "Council wants sustainable poles with recycled content (Plaspole) and 3000K warm white luminaires for coastal walking reserve."
  },
  {
    id: "opp-003",
    customerCompany: "Downer Civil Infrastructure",
    contactName: "Mark Henderson",
    contactEmail: "mark.henderson@downergroup.com",
    contactPhone: "+61 418 901 234",
    project: "Western Highway Rest Area Upgrade",
    location: "Ararat, Victoria",
    application: "Highways / major roadway / Truck Rest Area",
    stage: "Qualifying",
    status: "Active",
    estimatedQuantity: 18,
    estimatedValue: 0,
    productsConsidered: ["Roadway V-LED 70W", "SafePole"],
    quoteDeadline: "2026-08-30",
    projectDate: "2026-11-30",
    lastActivity: "Technical review recommended for TS 1158.6 roadway specification and SafePole crash testing approvals.",
    lastActivityDate: "2 days ago",
    nextAction: "Call Mark to discuss Department of Transport lighting approval status and obtain engineering drawings.",
    nextActionDate: "2026-08-22",
    readinessScore: 70,
    notes: "Highway rest area with truck parking bays. Needs higher output off-grid lighting on 9-15m mounting. Roadway V-LED 70W and SafePole energy-absorbing columns under evaluation."
  }
];

export const SAMPLE_DOCUMENTS: KnowledgeDocument[] = [
  {
    id: "doc-cat-solar-2025",
    filename: "Plasgain-Solar-Lighting-Catalogue-.pdf",
    title: "Plasgain Solar Lighting Master Catalogue 2025",
    category: "Master Catalogues",
    version: "2025.1",
    revisionDate: "2025-04-15",
    uploadedDate: "2025-04-20",
    status: "Current",
    authorityLevel: "3. Current approved catalogue",
    sourceUrl: "https://plasgain.com.au/wp-content/uploads/2025/04/Plasgain-Solar-Lighting-Catalogue-.pdf",
    fileSize: "8.6 MB",
    tags: ["Master Catalogue", "Solar Range", "Superlux", "Pro Blade", "Intense 50W", "Roadway V-LED 70W", "Portable Tower"],
    summary: "Official Plasgain Solar Lighting public catalogue detailing complete specifications for Superlux (30W/60W/120W), Pro Blade modular configurations (75/125), Intense 50W, Roadway V-LED 70W with TS 1158.6 reference, and Portable Solar Light Towers.",
    contentSnippet: "Complete commercial solar range catalogue with full electrical parameters, PV sizing, LiFePO4 battery storage, optical distributions, and pole mounting heights."
  },
  {
    id: "doc-cat-sustainable-poles",
    filename: "Plasgain-Sustainable-Poles-Infrastructure-Catalogue.pdf",
    title: "Plasgain Sustainable Poles & Infrastructure Catalogue",
    category: "Pole & Infrastructure Catalogues",
    version: "2026.1",
    revisionDate: "2026-02-10",
    uploadedDate: "2026-02-15",
    status: "Current",
    authorityLevel: "3. Current approved catalogue",
    sourceUrl: "https://plasgain.com.au/sustainable-light-poles/",
    fileSize: "6.2 MB",
    tags: ["Plaspole", "SafePole", "Recycled Plastic", "Passive Safety", "VESI Approved", "Sustainable Infrastructure"],
    summary: "Complete catalogue for Plasgain's sustainable and passive safety pole product line, including Plaspole (composite recycled plastic + marine aluminium skin) and SafePole energy-absorbing / impact-tested roadway columns.",
    contentSnippet: "Covers standard mounting heights (3m to 12m), base plate dimensions, ragbolt assemblies, outreach arm geometries, and environmental lifecycle analysis (LCA)."
  },
  {
    id: "doc-cat-amenity-bollards",
    filename: "Plasgain-Commercial-Bollards-Amenity-Catalogue.pdf",
    title: "Plasgain Commercial Bollards & Amenity Solar Lighting Catalogue",
    category: "Amenity & Pathway Catalogues",
    version: "2025.2",
    revisionDate: "2025-06-20",
    uploadedDate: "2025-06-25",
    status: "Current",
    authorityLevel: "3. Current approved catalogue",
    sourceUrl: "https://plasgain.com.au/",
    fileSize: "5.4 MB",
    tags: ["Solar Bollards", "Pathway Lighting", "Vandal Resistant", "Parkland", "Amenity", "IK10"],
    summary: "Comprehensive catalogue featuring Plasgain's architectural solar bollards, low-glare pathway luminaires, and public amenity lighting engineered for council parklands, university campuses, and shared pedestrian ways.",
    contentSnippet: "Photometric isolux profiles, 360-degree vandal-resistant polycarbonate optics, integrated LiFePO4 battery packs, and smart solar charge controllers."
  },
  {
    id: "doc-cat-smart-cctv",
    filename: "Plasgain-Smart-City-Solar-CCTV-Surveillance-Catalogue.pdf",
    title: "Plasgain Solar CCTV & Smart Public Safety Surveillance Catalogue",
    category: "Smart City & Security Catalogues",
    version: "2026.1",
    revisionDate: "2026-01-15",
    uploadedDate: "2026-01-20",
    status: "Current",
    authorityLevel: "3. Current approved catalogue",
    sourceUrl: "https://plasgain.com.au/",
    fileSize: "7.1 MB",
    tags: ["Solar CCTV", "Smart City", "4G/5G Remote", "PTZ Surveillance", "Industrial Security", "Portable Towers"],
    summary: "Official catalogue for Plasgain standalone and trailer-mounted solar CCTV surveillance solutions, integrated smart poles, IoT telemetry, and 24/7 security monitoring systems for remote and public infrastructure.",
    contentSnippet: "High-capacity mono solar arrays, 3-5 days autonomous battery backup, 4G/5G cellular router enclosures, and heavy-duty pole mount brackets."
  }
];

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: "Lumens (lm)",
    shortDefinition: "Total light output emitted from a luminaire across all directions.",
    whyItMatters: "More lumens does not by itself prove a site will meet required lux or uniformity.",
    plasgainRelevance: "E.g. Intense 50W produces 7,500 lm; Superlux 120W produces 21,600 lm. Final lux depends on mounting height and optics.",
    practicalExample: "A 10,000 lm light mounted at 12m will deliver much lower ground lux than the same light mounted at 4m."
  },
  {
    term: "Lux (lx)",
    shortDefinition: "Illuminance on a surface (lumens per square metre).",
    whyItMatters: "This is what people and sensors actually experience on the pathway or road surface.",
    plasgainRelevance: "AS/NZS 1158 specifies lux and uniformity requirements for council shared paths (e.g. Category P4 requires point min 0.2 lx / avg 1.0 lx).",
    practicalExample: "Point-by-point Dialux calculations verify whether pole spacing achieves required lux on the ground."
  },
  {
    term: "Efficacy (lm/W)",
    shortDefinition: "Light output per watt of electrical power consumed.",
    whyItMatters: "Higher efficacy means more light for less battery draw, allowing smaller solar panels and battery packs.",
    plasgainRelevance: "Superlux published efficacy is 200 lm/W (math check 180 lm/W); Intense 50W is 150 lm/W; Pro Blade is 150 lm/W.",
    practicalExample: "150 lm/W delivers 15,000 lumens from only 100W of battery load."
  },
  {
    term: "CCT (Correlated Colour Temperature)",
    shortDefinition: "Visual warmth or coolness of light, measured in Kelvin (K).",
    whyItMatters: "Lower K values (3000K) are warmer, reduce glare and protect nocturnal fauna; higher K (4000K/5000K) are crisper for roadway vision.",
    plasgainRelevance: "Victoria councils frequently mandate 3000K on shared paths and park trails. 4000K is standard for commercial car parks and V-category roads.",
    practicalExample: "3000K Warm White is fauna-friendly; 2200K Amber is coastal turtle friendly; 4000K is standard for road traffic."
  },
  {
    term: "CRI (Colour Rendering Index)",
    shortDefinition: "Scale (0-100) measuring how accurately a light source reveals true object colours compared to daylight.",
    whyItMatters: "Higher CRI improves facial recognition, security camera footage, and landscape aesthetics.",
    plasgainRelevance: "Pro Blade has CRI >70; Intense 50W has CRI >=75.",
    practicalExample: "High CRI makes security CCTV footage clear and distinguishes vehicle paint colours accurately."
  },
  {
    term: "Optics (Type 2, 3, 5)",
    shortDefinition: "Directional light-distribution patterns shaped by specialised lenses.",
    whyItMatters: "Type 2 is long/narrow (ideal for pathways/trails); Type 3 is medium-wide forward throw (roads); Type 5 is symmetrical 360° (open car parks).",
    plasgainRelevance: "Roadway V-LED and Pro Blade offer Type 2, 3, 5 options to optimize spacing and prevent light spill.",
    practicalExample: "Type 2 optics push light along a 1.2km shared path with minimal waste into adjacent private backyards."
  },
  {
    term: "IP Rating (Ingress Protection)",
    shortDefinition: "Two-digit standard measuring protection against solid particles/dust (1st digit) and liquid/water (2nd digit).",
    whyItMatters: "Outdoor streetlights need minimum IP65 or IP66 to survive Australian storm downpours and dust storms.",
    plasgainRelevance: "Intense 50W is IP65; Roadway V-LED 70W is IP66; Industrial CCTV is IP66.",
    practicalExample: "IP66 means total protection against dust ingress and high-pressure water jets from any direction."
  },
  {
    term: "IK Rating (Impact Resistance)",
    shortDefinition: "European/international classification (IK00 to IK10) indicating protection against mechanical impacts/vandalism.",
    whyItMatters: "High public vandalism areas require higher IK ratings (IK08-IK10) to prevent stone/hammer damage.",
    plasgainRelevance: "Intense 50W is IK09; Roadway V-LED is IK06.",
    practicalExample: "IK09 withstands a 10-joule impact (equivalent to dropping a 5kg mass from 200mm)."
  },
  {
    term: "PIR (Passive Infrared)",
    shortDefinition: "Motion sensor detecting infrared heat radiated by moving pedestrians, cyclists, or vehicles.",
    whyItMatters: "Enables smart dimming (e.g. 30% background light jumping to 100% when a person approaches), extending solar battery life.",
    plasgainRelevance: "Available on Superlux (30W & 60W) and Intense 50W.",
    practicalExample: "Dimming to 30% after midnight and waking to 100% on PIR reduces battery capacity requirement by 25-30%."
  },
  {
    term: "LiFePO4 (Lithium Iron Phosphate)",
    shortDefinition: "Safer, long-cycle lithium battery chemistry with high thermal stability.",
    whyItMatters: "Provides 2000-4000 charge cycles, zero thermal runaway risk, and operates across -20°C to +60°C.",
    plasgainRelevance: "Used extensively in Superlux, Intense 50W (896Wh), Pro Blade (460.8Wh/921.6Wh), and CCTV (42Ah).",
    practicalExample: "LiFePO4 lasts 8-10 years in Australian summer heat without degrading rapidly like standard lithium NMC."
  },
  {
    term: "Battery Autonomy",
    shortDefinition: "Number of continuous overcast/rainy days a solar system can operate without solar recharge.",
    whyItMatters: "Southern Australia (VIC/TAS) winter requires at least 4-5 days autonomy to avoid winter blackout.",
    plasgainRelevance: "Must be assessed against operating profile, battery capacity, solar irradiation, and dimming settings.",
    practicalExample: "An 896Wh battery running a 15W dimmed load delivers 4+ nights of continuous overcast operation."
  },
  {
    term: "Photometric Design (Dialux / AGi32)",
    shortDefinition: "Computer simulation calculating point-by-point illuminance (lux) and uniformity across a digital 3D model of the site.",
    whyItMatters: "Essential to prove AS/NZS 1158 compliance for council handover. Lumens alone are not a photometric design.",
    plasgainRelevance: "Plasgain engineering provides formal Dialux reports to verify pole spacing and category compliance.",
    practicalExample: "Dialux proves that 6m poles spaced at 42m with Type 2 optics achieve Category P4 standards."
  },
  {
    term: "Outreach & Spigot",
    shortDefinition: "Outreach is the horizontal arm extending the light away from the pole; Spigot is the mechanical cylindrical mounting entry.",
    whyItMatters: "Ensures mechanical compatibility between the column top and luminaire fixing collar.",
    plasgainRelevance: "Intense 50W has 60mm spigot entry; Roadway V-LED 70W has 43-48mm entry; Pro Blade offers configurable outreach TX.",
    practicalExample: "A 3m outreach positions the luminaire over the road lane while keeping the pole behind the safety barrier."
  },
  {
    term: "AS/NZS 1158 (P & V Categories)",
    shortDefinition: "Australian and New Zealand standard for lighting of roads and public spaces.",
    whyItMatters: "Category P covers pedestrian pathways, cycleways, parks, and local roads; Category V covers major arterial roads and highways.",
    plasgainRelevance: "Plasgain public material references AS/NZS 1158, but project-specific compliance requires lighting design and verification.",
    practicalExample: "Council shared paths typically specify AS/NZS 1158.3.1 Category P4 or P5."
  },
  {
    term: "AS/NZS 4509 (Stand-Alone Power)",
    shortDefinition: "Australian standard for off-grid stand-alone power systems and solar autonomy.",
    whyItMatters: "Guides solar panel sizing, battery storage safety, and off-grid power reliability.",
    plasgainRelevance: "Referenced on Plasgain solar lighting pages as applicable to off-grid solar infrastructure reliability.",
    practicalExample: "Ensures solar PV array and battery storage are balanced for winter solar radiation."
  },
  {
    term: "Solar Blade Remote Control Modes (L, T, M, U)",
    shortDefinition: "Standardised 433MHz wireless remote control operating profiles for Sonaray / Solar Blade luminaires.",
    whyItMatters: "Allows instant field programming up to 30m without bucket trucks. L = 12h full power, T = 4h full + 8h 25% dim, M = 12h PIR motion, U = 4h full + 8h PIR motion.",
    plasgainRelevance: "Used to configure Sonaray All-In-One Pro Series (SS-2020, SS-2030, SS-2060) to match seasonal sunlight availability.",
    practicalExample: "Switching from L-mode to T-mode in winter extends solar battery reserve from 3 nights to 5-7 days autonomy."
  },
  {
    term: "Solar Light Controller LED Diagnostics (RGB Cycle)",
    shortDefinition: "Diagnostic LED indicators on MPPT solar luminaire controllers.",
    whyItMatters: "4 blue LEDs indicate battery capacity (25/50/75/100%). Yellow = Motion, Green = Light ON (flicker = short), Blue = Normal battery (flicker = undervoltage), Red = Solar full (flicker = charging).",
    plasgainRelevance: "Red + Green + Blue sequential cycling indicates battery cable plugged backwards, poor contact connection, or faulty/disconnected battery.",
    practicalExample: "If an installer notices RGB LEDs cycling in sequence, immediately check the battery harness plug before crane lifting."
  },
  {
    term: "AS/NZS 1158 Category PP2 / PP3",
    shortDefinition: "Australian lighting subcategories specifically for dedicated pathway and cyclist routes.",
    whyItMatters: "Defines minimum horizontal illuminance and uniformity for shared cyclist/pedestrian corridors to ensure safe night transit.",
    plasgainRelevance: "Sonaray Solar Blade on 6.0m hinged pole (750-950kg ballast base) is certified to achieve PP2/PP3 standard with 25m - 30m pole spacing.",
    practicalExample: "For a 1km council bike path requiring PP2 compliance, 6m hinged poles spaced at 28m will meet the standard without trenching."
  },
  {
    term: "ZHAGA Book 18 & Casambi Smart Controls",
    shortDefinition: "Standardised modular sensor socket and wireless control ecosystem for smart city lighting.",
    whyItMatters: "Provides plug-and-play field upgradeability for PE cells, motion detectors, and Bluetooth mesh / Casambi lighting controls without rewiring.",
    plasgainRelevance: "Featured on enLighten Zorro 2 luminaires (ZAL15S through ZAL200L), enabling instant smart scheduling and grouping.",
    practicalExample: "Installing a Casambi node on a Zorro 2 via ZHAGA Book 18 socket allows remote group dimming across a campus via an iPhone app."
  },
  {
    term: "C4 Coastal Corrosion Resistance (ISO 12944)",
    shortDefinition: "Atmospheric corrosivity category defining durability in marine, industrial, and coastal saline environments.",
    whyItMatters: "Standard coatings blister and corrode within 2-3 years within 5km of ocean surf.",
    plasgainRelevance: "enLighten Zorro 2 features C4 corrosion-resistant powder-coated die-cast aluminium, making it suitable for ocean esplanades and beachside shared paths.",
    practicalExample: "For a foreshore path in Torquay or Bondi, C4 rated Zorro 2 luminaires prevent salt-spray housing decay."
  },
  {
    term: "Back Spill Guard (ZAL-BSG)",
    shortDefinition: "Physical optical shield mounted on luminaires to eliminate obtrusive rear light spill into adjacent residential properties.",
    whyItMatters: "Essential for meeting AS/NZS 4282 (Control of Obtrusive Effects of Outdoor Lighting) where cycleways abut private backyards.",
    plasgainRelevance: "Available in Small (15-60W), Medium (80-120W), and Large (150-200W) sizes for Zorro 2 luminaires, rated for up to 10m pole heights and 100 km/h wind gusts.",
    practicalExample: "Adding a ZAL-BSG-S to a 15W Zorro 2 pathway luminaire blocks light trespass through residential bedroom windows behind the pole."
  },
  {
    term: "Aeroscreen vs Semi Cut-Off (SCO) Visor",
    shortDefinition: "Optical shielding designations for roadway luminaires controlling upward light waste and glare.",
    whyItMatters: "Aeroscreen provides flat-glass cut-off (0% upward waste light) for dark-sky sensitive or residential interface corridors, whereas Semi Cut-Off (SCO) has curved lens profiles providing wider beam throw.",
    plasgainRelevance: "Critical in Sylvania ROADLED MIDI specifications (e.g. PM99A06L150 standard SCO vs PM99A16L150 Aeroscreen). Aeroscreen substitutions require specific CIE lighting design checks.",
    practicalExample: "Replacing a standard SCO fitting with an Aeroscreen version requires checking that pole spacing remains compliant since the forward throw changes."
  },
  {
    term: "AEMO NEM Unmetered Load Table",
    shortDefinition: "Official register maintained by the Australian Energy Market Operator defining standard power consumption values for unmetered public lighting.",
    whyItMatters: "Luminaires on public road networks must be AEMO-approved for distribution network service providers (DNSPs) like CitiPower, Powercor, Jemena, and AusNet to energise them.",
    plasgainRelevance: "Legacy codes like Sylvania StreetLED3 11W (JLC99A05L11) and 14W (JLC99A06L14) have formal AEMO listings at 11W and 13.7W system loads.",
    practicalExample: "When councils audit streetlighting power bills, unmetered loads are calculated directly from the AEMO schedule wattage multiplied by operational burn hours."
  },
  {
    term: "Utility Standard L1-L4 Categories (Cat V)",
    shortDefinition: "Distribution utility classification tiers for major road lighting under AS/NZS 1158 Category V.",
    whyItMatters: "Defines pre-approved standard luminaire wattages and optical configurations for arterial roads, collectors, and highways.",
    plasgainRelevance: "Sylvania ROADLED MIDI 66W/70W corresponds to Standard L1, 115W/150W to Standard L2, and ROADLED 210W (PL99A18L210) to Standard L4.",
    practicalExample: "A replacement proposal for an existing L2 150W HPS streetlight can evaluate a ROADLED MIDI 150W (PM99A06L150/PM99A16L150) or an enLighten Zorro 2 120W/150W candidate."
  },
  {
    term: "VEU & IPART Energy Savings Schemes",
    shortDefinition: "Australian state-based energy efficiency certificate schemes (Victorian Energy Upgrades & NSW Independent Pricing and Regulatory Tribunal).",
    whyItMatters: "Accredited luminaires qualify for tradeable energy efficiency certificates (VEECs/ESCs), lowering the capital cost of commercial and municipal lighting upgrades.",
    plasgainRelevance: "enLighten Zorro 2 is approved under both VEU and IPART schemes, providing rebates for council and commercial street/area lighting retrofits.",
    practicalExample: "When retrofitting an industrial estate with Zorro 2 luminaires, VEU or IPART rebate credits can be claimed to offset supply costs."
  }
];

export const SAMPLE_LESSONS: LessonTopic[] = [
  {
    id: "lesson-knowledge-priority",
    category: "Plasgain Knowledge Rules",
    title: "Knowledge Priority & Grounding Rules",
    readTimeMinutes: 4,
    summary: "Learn how the Plasgain Sales Copilot prioritises approved internal documents, catalogues, and public webpages, and why generic AI knowledge must never invent Plasgain specifications.",
    salesImportance: "Protects the sales rep and company from misquoting unverified specs, non-existent warranties, or fictitious pricing.",
    practicalExample: "If a customer asks for the battery size of Intense 50W, the rep must state 896Wh / 70Ah 12.8V as grounded in the approved source, not a generic guess.",
    keyTakeaways: [
      "1. Approved Plasgain knowledge-base documents take highest priority.",
      "2. Public webpage info is valid for discovery but requires technical confirmation for tenders.",
      "3. NEVER invent specifications (wattage, lumens, battery, CCT, IP/IK, pricing).",
      "4. If unknown, state: 'Information not found in the approved Plasgain knowledge base.'"
    ],
    testScenario: {
      question: "A contractor asks for the exact warranty period on a product that is not listed in the public knowledge base. What do you say?",
      sampleGoodAnswer: "I state that the warranty information for that specific item is not contained in the approved Plasgain knowledge base and offer to confirm with the commercial/engineering team rather than guessing."
    }
  },
  {
    id: "lesson-conflict-handling",
    category: "Plasgain Knowledge Rules",
    title: "Conflict Register & Public Data Quality",
    readTimeMinutes: 5,
    summary: "How to handle documented public data conflicts (e.g. Deltalux 10W vs 30W vs 90W panel, Plaspole carbon reduction figures, Superlux efficacy).",
    salesImportance: "Prevents embarrassing contract disputes by explicitly identifying conflicts and requesting internal datasheet confirmation.",
    practicalExample: "For Deltalux solar panel questions, never choose 20W or 90W silently. State: 'Technical confirmation required: Public Plasgain sources contain conflicting information for this specification. Please confirm the current internal datasheet before quoting.'",
    keyTakeaways: [
      "Never silently pick one conflicting number.",
      "Flag the conflict clearly: 'Technical confirmation required'.",
      "Deltalux: Catalogue shows 10W SR-1010 (20W PV) vs Webpage 30W SR-4030 vs 90W panel claim.",
      "Plaspole: 248 kg CO2 vs 246 kg CO2e (30% vs 35% reduction) - use approved LCA for formal claims."
    ],
    conflictWarning: "Public website contains documented conflicts. Always confirm current internal datasheets before quoting."
  },
  {
    id: "lesson-intense-50w",
    category: "Product Lessons",
    title: "Intense 50W Split-System Solar Luminaire",
    readTimeMinutes: 4,
    summary: "Deep dive into the 50W Solar Intense Light: 7,500 lm output, 896Wh battery, 130W 260° rotatable solar panel, PIR motion sensing, and IP65/IK09 die-cast body.",
    salesImportance: "Ideal candidate for council shared pathways, walking trails, pedestrian crossings, and park car parks where independent solar panel orientation is essential.",
    practicalExample: "In Victoria where paths meander under partial shading, the 260° panel swing lets installers aim the PV array true North while directing the light head along the trail.",
    keyTakeaways: [
      "Luminous flux: 7,500 lm (150 lm/W lamp efficiency with Philips SMD 3030).",
      "Battery: 896Wh with 10A PWM IP68 controller; 70Ah / 12.8V.",
      "Solar Panel: 130W / 18V monocrystalline PV with approx. 260° rotation.",
      "Published warranty: 3 years battery / 10 years solar panel."
    ]
  },
  {
    id: "lesson-pro-blade",
    category: "Product Lessons",
    title: "Pro Blade Solar 75/125 Platform",
    readTimeMinutes: 5,
    summary: "Understanding the modular turnkey solar lighting platform developed with enLighten, pairing separate solar poles (75W/125W) with versatile luminaire outputs (15W to 60W).",
    salesImportance: "Allows tailored modular configurations across shared paths, roadways, blackspots, and mining roads with Type 2, 3, 4 optics.",
    practicalExample: "Pro Blade 75 pairs a 75W panel with a 15W light (2,400 lm) or 2x15W lights (4,800 lm). Pro Blade 125 pairs a 125W panel with a 40W (6,400 lm) or 60W (8,900 lm) light.",
    keyTakeaways: [
      "75 and 125 refer to solar panel power (460.8Wh vs 921.6Wh battery), not the luminaire wattage.",
      "CCT: 3000K and 4000K standard (2200K/2700K on request).",
      "Efficacy: 150 lm/W, CRI: 70.",
      "Compatible with Plaspole (A), tapered steel (B), or round steel (C) poles."
    ]
  },
  {
    id: "lesson-roadway-vled",
    category: "Product Lessons",
    title: "Roadway V-LED 70W Solar Roadway System",
    readTimeMinutes: 4,
    summary: "High-output roadway solar light with twin 230W panels (460W total), 2800Wh battery storage, 9-15m mounting height, CREE LEDs, and TS 1158.6 catalogue reference.",
    salesImportance: "Positions Plasgain for higher-speed V-Category roadways, highway rest stops, and heavy industrial compounds.",
    practicalExample: "Mounted at 9m to 15m on an 8.5m slip-base pole with a 3m VESI outreach to illuminate multi-lane highways off-grid.",
    keyTakeaways: [
      "Twin 230W solar panels = 460W total monocrystalline PV capacity with 360° rotation.",
      "2800Wh integrated battery storage.",
      "Mounting height: 9-15m on 43-48mm spigot.",
      "Catalogue references TS 1158.6 roadway compliance (verify formal test reports for tenders)."
    ]
  },
  {
    id: "lesson-plaspole-safepole",
    category: "Product Lessons",
    title: "Plaspole & SafePole Engineering Columns",
    readTimeMinutes: 5,
    summary: "Exploring Plasgain's sustainable recycled-core Plaspole (~40kg recycled plastic / 2,000 milk bottles per pole) and energy-absorbing SafePole crash-tested columns.",
    salesImportance: "Key differentiator for sustainability-focused councils and road safety authorities.",
    practicalExample: "SafePole deforms progressively during 60 km/h and 110 km/h vehicle impacts to protect car occupants and avoid breakaway pole hazards in pedestrian zones.",
    keyTakeaways: [
      "Plaspole uses ~40kg of recycled post-consumer plastic bonded with aluminium skin + steel cable path.",
      "SafePole is crash tested at 60 km/h and 110 km/h, rated for wind up to 189 km/h.",
      "Slip-base poles use clamped plates that breakaway/topple upon impact.",
      "Always obtain current authority approvals and engineering drawings for road safety poles."
    ]
  },
  {
    id: "lesson-pricing-guardrail",
    category: "Plasgain Knowledge Rules",
    title: "Pricing Policy & Guardrails",
    readTimeMinutes: 3,
    summary: "Why pricing data is kept outside the static public knowledge base and must never be fabricated by the AI.",
    salesImportance: "Protects commercial margins and ensures sales reps use live internal ERP/quote systems rather than ungrounded estimates.",
    practicalExample: "When a customer asks 'What is the price of Pro Blade 125?', the AI must state: 'Pricing data is not currently connected to the app.'",
    keyTakeaways: [
      "The public knowledge base intentionally contains no pricing.",
      "Never invent, guess, or estimate Plasgain prices.",
      "Direct the user to internal commercial price lists and formal quotation workflows."
    ]
  },
  {
    id: "lesson-sylvania-legacy-crossref",
    category: "Technical Standards",
    title: "Sylvania-Schréder Legacy Utility Codes & Cross-Referencing",
    readTimeMinutes: 5,
    summary: "Understanding legacy Sylvania streetlighting codes (StreetLED3, ROADLED, ROADLED MIDI, Bourke Hill Mk2) across Jemena, CitiPower, and AEMO networks, and how to safely navigate replacement opportunities.",
    salesImportance: "Enables reps to respond intelligently to council retrofit RFQs and DNSP replacement tenders without making unverified equivalence claims.",
    practicalExample: "When a council tender mentions 'JLC99A06L14', recognize it as a 14W (13.7W system) StreetLED3 Cat P luminaire and present an enLighten Zorro 2 15W or Sonaray Solar Blade SS-2020 as potential candidates subject to formal lighting design audit.",
    keyTakeaways: [
      "Exact-code confirmed specs take strict priority over family generalizations.",
      "Codes like JLC99A16L24 and PL99A06L155 require technical confirmation before quoting.",
      "Always distinguish between standard SCO visors (e.g. PM99A06L150) and flat-glass Aeroscreen visors (e.g. PM99A16L150).",
      "Never claim photometric equivalence without a certified lighting design report."
    ],
    testScenario: {
      question: "A client asks if the Intense 50W Solar Light is a 1-to-1 photometric replacement for a Sylvania PM99A06L150 150W ROADLED MIDI.",
      sampleGoodAnswer: "I explain that PM99A06L150 is a 150W Category V roadway luminaire (151.2W system load) with a standard visor, while Intense 50W is an off-grid solar luminaire (7,500 lm) suited for Category P or secondary roads. For major road applications, an enLighten Zorro 2 120W/150W or Roadway V-LED 70W Solar should be investigated with a full AS/NZS 1158 lighting design."
    }
  }
];
