export interface LightingTermExplanation {
  term: string;
  category: "Solar & Battery" | "Lighting Standards" | "Photometry & Optics" | "Electrical & Mechanical" | "Commercial & Rebates";
  plainEnglish: string;
  whyItMattersInSales: string;
  howToExplainToCustomer: string;
  practicalExample: string;
  commonMistakesToAvoid: string;
  relatedPlasgainProducts: string[];
  australianStandardRef?: string;
}

export const COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA: Record<string, LightingTermExplanation> = {
  "autonomy": {
    term: "Battery Autonomy (Days of Autonomy)",
    category: "Solar & Battery",
    plainEnglish: "The number of consecutive overcast, rainy, or sunless days a solar lighting system can continue illuminating without receiving any solar recharge.",
    whyItMattersInSales: "In southern Australia (VIC, TAS, SA, ACT), winter solar radiation drops significantly. A system with low autonomy will suffer blackouts in June/July. Quoting 4-5+ days autonomy guarantees reliability.",
    howToExplainToCustomer: "Autonomy is your safety backup reserve. If you get 4 continuous days of torrential Melbourne winter rain, our systems keep operating normally through smart battery reserves and automated dimming profiles.",
    practicalExample: "The Intense 50W Solar Light is equipped with an 896Wh LiFePO4 battery pack, delivering up to 4+ nights of continuous overcast operation under a standard dimming profile.",
    commonMistakesToAvoid: "Never assume autonomy is identical across Australia; Darwin requires 2-3 days, while Melbourne/Hobart requires 4-6 days.",
    relatedPlasgainProducts: ["Intense 50W Solar", "Pro Blade 75/125", "Superlux 30W/60W/120W", "Roadway V-LED 70W"],
    australianStandardRef: "AS/NZS 4509.2 (Stand-alone power systems design)"
  },
  "cct (correlated colour temperature)": {
    term: "CCT (Correlated Colour Temperature)",
    category: "Photometry & Optics",
    plainEnglish: "A measurement in Kelvin (K) indicating the visual warmth or coolness of light emitted by the LEDs.",
    whyItMattersInSales: "Australian councils and environmental bodies frequently mandate 3000K Warm White or 2200K Amber on nature paths to protect nocturnal wildlife, whereas commercial car parks and roadway intersections require 4000K or 5700K for crisp visibility.",
    howToExplainToCustomer: "CCT describes the colour tone of the light. 3000K is a warm, soft white that complies with council environmental fauna guidelines, while 4000K is a neutral white optimal for commercial car parks and driver vigilance.",
    practicalExample: "A shared pedestrian trail through a park requires 3000K warm white, while a high-security industrial logistics compound specifies 4000K or 5700K.",
    commonMistakesToAvoid: "Do not quote 5700K (cool daylight) for council residential or parkland pathway tenders without checking local environmental dark-sky overlays.",
    relatedPlasgainProducts: ["enLighten Zorro 2 (3000K/4000K/5700K/2200K)", "Pro Blade 75/125", "Intense 50W Solar"],
    australianStandardRef: "AS/NZS 1158.3.1 & AS 4282 (Dark Sky & Environmental)"
  },
  "as/nzs 1158": {
    term: "AS/NZS 1158 (Public Lighting Standard)",
    category: "Lighting Standards",
    plainEnglish: "The overarching Australian and New Zealand standard for the design and compliance of road, public space, pedestrian, and pathway lighting.",
    whyItMattersInSales: "Municipal councils, developers, and road authorities mandate AS/NZS 1158 compliance before certifying and taking ownership of new civil infrastructure. Simply stating lumens is never enough—a certified photometric calculation report is required.",
    howToExplainToCustomer: "AS/NZS 1158 is the Australian national benchmark for public safety. Our lighting designs are modelled in Dialux to prove your project meets the exact lux and uniformity targets required for council sign-off.",
    practicalExample: "Category P4 is standard for council shared cycleways and local trails (maintained horizontal illuminance of 0.85 lux average, 0.17 lux point minimum), while Category V3 applies to major multi-lane arterial thoroughfares (approx 0.75 cd/m² / 10 lux).",
    commonMistakesToAvoid: "Never guarantee compliance on pole spacing alone without running a project-specific Dialux photometric calculation.",
    relatedPlasgainProducts: ["enLighten Zorro 2", "Roadway V-LED 70W", "Intense 50W", "Plaspole 4.5m/6m/8m"],
    australianStandardRef: "AS/NZS 1158.1.1:2022 (Cat V) & AS/NZS 1158.3.1:2020 (Cat P)"
  },
  "as/nzs 1158.3.1": {
    term: "AS/NZS 1158.3.1 (Category P Lighting)",
    category: "Lighting Standards",
    plainEnglish: "The specific sub-part of the Australian public lighting standard governing pedestrian pathways, cycle routes, parks, and local roads (Categories P1 through P5, and PR1 through PR4).",
    whyItMattersInSales: "Category P is the primary specification for 90% of council park, pathway, and suburban lighting tenders. Knowing whether a project is P1 (7.0 lx avg), P2 (3.5 lx avg), P3 (1.75 lx avg), P4 (0.85 lx avg), or P5 (0.45 lx avg) dictates pole spacing, battery sizing, and luminaire wattage.",
    howToExplainToCustomer: "Category P establishes minimum light levels and uniformity so pedestrians, cyclists, and mobility scooter users can see obstacles and recognize oncoming faces safely at night.",
    practicalExample: "A 1.2km shared regional bike path typically targets Category P4 (maintained horizontal average 0.85 lux, minimum point 0.17 lux, uniformity U_o <= 10).",
    commonMistakesToAvoid: "Over-lighting a quiet nature trail to P1 levels (7.0 lx) causes excessive glare and power draw; under-lighting a busy commuter corridor to P5 (0.45 lx) will fail council compliance audit.",
    relatedPlasgainProducts: ["Intense 50W", "Pro Blade 75/125", "Sonaray Solar Blade", "enLighten Zorro 2 15W-30W"],
    australianStandardRef: "AS/NZS 1158.3.1:2020 Category P Table 2.1"
  },
  "cri (colour rendering index)": {
    term: "CRI (Colour Rendering Index)",
    category: "Photometry & Optics",
    plainEnglish: "A scale from 0 to 100 measuring how accurately and naturally a light source reveals the true colours of objects, vegetation, and people compared to natural sunlight (100).",
    whyItMattersInSales: "Outdoor security and public space lighting requires at least CRI 70 (often CRI 80) to enable facial recognition on CCTV cameras and true vehicle colour identification for emergency services.",
    howToExplainToCustomer: "CRI ensures colours look natural and vivid at night. A higher CRI makes security cameras dramatically clearer and helps people feel safer because facial expressions and surroundings look natural.",
    practicalExample: "Pro Blade features CRI >70, and Intense 50W features CRI >=75, making both ideal for CCTV-monitored council reserves.",
    commonMistakesToAvoid: "Do not confuse CRI with CCT; CCT is color warmth (Kelvin), while CRI is color accuracy and fidelity.",
    relatedPlasgainProducts: ["Pro Blade 75/125", "Intense 50W", "Superlux 30W/60W/120W"],
    australianStandardRef: "AS/NZS 1158 & CIE 13.3"
  },
  "lifepo4 (lithium iron phosphate)": {
    term: "LiFePO4 (Lithium Iron Phosphate Battery)",
    category: "Solar & Battery",
    plainEnglish: "The safest, most thermally stable, and longest-lasting lithium battery chemistry used in modern commercial solar lighting.",
    whyItMattersInSales: "Traditional Lead-Acid/Gel batteries last only 2-3 years and fail in high heat. Standard Lithium-ion (NMC) carries thermal runaway risks. LiFePO4 delivers 2,000 to 4,000+ deep discharge cycles and lasts 8-10+ years in harsh Australian summer heat.",
    howToExplainToCustomer: "We use LiFePO4 battery chemistry because it doesn't overheat in 45°C summer conditions, doesn't catch fire, and will last 8 to 10 years without needing costly crane maintenance to replace.",
    practicalExample: "The 896Wh battery inside the Intense 50W and the modular battery packs in Superlux and Pro Blade are all high-grade LiFePO4.",
    commonMistakesToAvoid: "Never refer to LiFePO4 as generic lead-acid or standard combustible phone battery chemistry; emphasize thermal safety and 10-year lifespan.",
    relatedPlasgainProducts: ["Intense 50W (896Wh)", "Pro Blade 75/125 (460Wh/921Wh)", "Superlux Solar", "Solar CCTV Tower"],
    australianStandardRef: "AS/NZS 62619 & UN38.3 Transport Safety"
  },
  "ip rating (ingress protection)": {
    term: "IP Rating (Ingress Protection - e.g. IP65 / IP66)",
    category: "Electrical & Mechanical",
    plainEnglish: "A two-digit rating indicating how well an electrical enclosure stops solid dust particles (1st digit, max 6) and water/liquids (2nd digit, max 8 or 9K) from penetrating the housing.",
    whyItMattersInSales: "Australian outdoor luminaires are subjected to torrential monsoonal rains, red dust, coastal salt spray, and spider nesting. Minimum IP65 (dust-tight and water-jet proof) or IP66 (powerful water jets) is mandatory for commercial longevity.",
    howToExplainToCustomer: "IP66 means the fitting is 100% dust-sealed and completely waterproof against high-pressure storm downpours and coastal sea spray.",
    practicalExample: "Roadway V-LED 70W and enLighten Zorro 2 are IP66 rated, preventing internal driver corrosion in tropical Queensland downpours.",
    commonMistakesToAvoid: "Indoor fittings (IP20/IP44) will fail within weeks if installed outdoors; never specify below IP65 for external public lighting.",
    relatedPlasgainProducts: ["Roadway V-LED 70W (IP66)", "enLighten Zorro 2 (IP66)", "Intense 50W (IP65)"],
    australianStandardRef: "AS 60529 (Degrees of protection provided by enclosures)"
  },
  "ik rating (impact resistance)": {
    term: "IK Rating (Vandal & Mechanical Impact - e.g. IK08 / IK09 / IK10)",
    category: "Electrical & Mechanical",
    plainEnglish: "An international numerical rating from IK00 to IK10 defining the degree of protection against external mechanical impacts, rock throwing, and public vandalism.",
    whyItMattersInSales: "Public parks, skate parks, school borders, and remote pathway lights are frequent targets for vandalism. An IK09 or IK10 rating guarantees the luminaire housing will not crack when struck by stones, balls, or tools.",
    howToExplainToCustomer: "IK rating measures toughness against vandalism. An IK09 rating means the die-cast housing can withstand a direct 10-joule impact (like a 5kg weight dropped from 200mm) without breaking.",
    practicalExample: "The Intense 50W features an IK09 die-cast aluminium frame, ensuring durability along isolated shared trails.",
    commonMistakesToAvoid: "Assuming plastic residential solar lights with IK02-IK04 can withstand public park environments; commercial council projects require minimum IK08.",
    relatedPlasgainProducts: ["Intense 50W (IK09)", "enLighten Zorro 2 (IK08/IK09)", "Plaspole Impact Core"],
    australianStandardRef: "AS 62262 (IK code for mechanical impact protection)"
  },
  "optics (type 2, type 3, type 5)": {
    term: "Beam Optics (Type II, Type III, Type V Distributions)",
    category: "Photometry & Optics",
    plainEnglish: "Precision optical lenses engineered across the LED array to shape and project light in specific directional footprint patterns.",
    whyItMattersInSales: "Instead of wasting light in a round circle, Type II stretches light sideways along a long narrow shared path; Type III pushes light forward across wide road lanes; Type V casts a 360° square/circular throw for open car parks.",
    howToExplainToCustomer: "Optics shape the beam so every lumen hits the pathway rather than spilling into nearby trees or residential bedroom windows. Type 2 lets us space poles 30–40m apart along a trail while keeping light strictly on the concrete.",
    practicalExample: "On a 1.2km shared pathway, using Type 2 optics reduces the total number of poles needed from 45 down to 32, saving the client tens of thousands in pole and foundation costs.",
    commonMistakesToAvoid: "Using standard wide symmetrical flood optics on a pathway will cause severe backward light spill into neighbouring houses and fail AS 4282 obtrusive light standards.",
    relatedPlasgainProducts: ["Roadway V-LED 70W", "enLighten Zorro 2", "Pro Blade 75/125"],
    australianStandardRef: "IESNA / AS/NZS 1158 Optical Classifications"
  },
  "wind region a / b / c / d": {
    term: "Australian Wind Regions (Region A, B, C, D)",
    category: "Electrical & Mechanical",
    plainEnglish: "Geographical zoning across Australia defining structural wind loading design speeds from calm inland areas (Region A: 45 m/s) to severe tropical cyclonic coastlines (Region C & D: up to 88 m/s).",
    whyItMattersInSales: "Solar lighting poles hold large surface-area solar panels at the top (sail area). A pole installed in Coastal Queensland or Karratha (Region C/D) requires heavier baseplates, larger concrete footings, and reinforced ragbolt cages compared to inland Victoria (Region A).",
    howToExplainToCustomer: "Because solar panels act like sails in high winds, we engineer the pole thickness, ragbolt cage, and footing depth to match your specific Australian wind region so the pole stays structurally certified in severe storms.",
    practicalExample: "Region A applies to Ballarat/Melbourne; Region B applies to Brisbane/Gold Coast; Region C applies to Cairns/Townsville; Region D applies to Pilbara/WA Cyclone coast.",
    commonMistakesToAvoid: "Never supply standard Region A standard footing drawings to a cyclone-prone Region C or D project in Northern Australia.",
    relatedPlasgainProducts: ["Plaspole Columns", "SafePole Impact Columns", "Pro Blade Structural Poles", "Slip-Base 8.5m"],
    australianStandardRef: "AS/NZS 1170.2 (Structural Wind Actions)"
  },
  "zhaga book 18 & casambi": {
    term: "ZHAGA Book 18 & Smart City Controls",
    category: "Electrical & Mechanical",
    plainEnglish: "A standardised, compact 4-pin waterproof receptacle mounted on top or bottom of a luminaire, allowing plug-and-play installation of PE cells, motion sensors, or IoT smart city wireless mesh nodes.",
    whyItMattersInSales: "Allows councils and developers to buy future-ready luminaires today and snap on smart CMS nodes (like Casambi, DALI, or LoRaWAN) years later without opening or rewiring the luminaire.",
    howToExplainToCustomer: "ZHAGA Book 18 is like an external USB port for streetlights. It lets you plug in smart dusk-to-dawn sensors or wireless phone-app control nodes in 5 seconds with a simple twist-lock.",
    practicalExample: "enLighten Zorro 2 comes equipped with ZHAGA Book 18 sockets, allowing instant integration with Casambi Bluetooth mesh for automated park scheduling.",
    commonMistakesToAvoid: "Confusing traditional 7-pin NEMA sockets (large twist-lock) with modern compact DC ZHAGA Book 18 receptacles.",
    relatedPlasgainProducts: ["enLighten Zorro 2 (ZAL15S to ZAL200L)"],
    australianStandardRef: "ZHAGA Consortium Book 18 Standard"
  },
  "plaspole & safepole": {
    term: "Plaspole & SafePole Sustainable Columns",
    category: "Electrical & Mechanical",
    plainEnglish: "Plasgain's proprietary Australian engineered lighting columns. Plaspole incorporates ~40kg of recycled post-consumer plastic milk bottles, while SafePole provides vehicle impact energy-absorbing safety.",
    whyItMattersInSales: "Provides unmatched sustainability credentials for councils targeting Net Zero circular economy procurement, while SafePole protects vehicle occupants on high-speed roads.",
    howToExplainToCustomer: "Each Plaspole repurposes approximately 2,000 recycled milk bottles into a structural internal core with zero rot, zero rust, and 30%+ lower embodied carbon than virgin steel.",
    practicalExample: "For a council shared path seeking environmental grant funding, Plaspole provides verified circular economy procurement metrics.",
    commonMistakesToAvoid: "Assuming Plaspole is flimsy plastic; it features high-tensile aluminium cladding and engineered steel core paths rated to Australian structural standards.",
    relatedPlasgainProducts: ["Plaspole 4.5m / 6m / 8m", "SafePole 60km/h & 110km/h", "Hinged Base Poles"],
    australianStandardRef: "AS/NZS 4676 (Structural design of utility columns) & AS/NZS 3845"
  },
  "veu & ipart rebates": {
    term: "VEU & IPART Energy Efficiency Rebates",
    category: "Commercial & Rebates",
    plainEnglish: "Australian state government energy savings schemes (Victorian Energy Upgrades in VIC, and Energy Savings Scheme via IPART in NSW) that award tradeable energy certificates for energy-saving LED upgrades.",
    whyItMattersInSales: "Accredited luminaires generate certificates (VEECs or ESCs) that provide substantial upfront cash rebates, dramatically lowering the payback period for commercial retrofits and council car parks.",
    howToExplainToCustomer: "Because our luminaires are formally accredited under VEU and IPART, your project qualifies for government rebate certificates that can be deducted directly from your project costs.",
    practicalExample: "Retrofitting an industrial facility or council depot from old 250W metal-halide floodlights to 60W Zorro 2 luminaires generates thousands of dollars in rebate credits.",
    commonMistakesToAvoid: "Unaccredited cheap import luminaires cannot generate VEECs/ESCs; always specify accredited fittings like enLighten Zorro 2.",
    relatedPlasgainProducts: ["enLighten Zorro 2 Series (VEU/IPART Accredited)"],
    australianStandardRef: "VIC Essential Services Commission & NSW IPART ESS"
  },
  "photometric design (dialux)": {
    term: "Photometric Design (Dialux / AGi32)",
    category: "Lighting Standards",
    plainEnglish: "An engineered 3D simulation calculating point-by-point light levels (Lux), uniformity, and glare across a digital twin of the customer's actual site.",
    whyItMattersInSales: "A photometric report is the definitive document submitted to council engineers or certifiers to secure project approval. Without a Dialux report, an estimate of pole spacing is just a guess.",
    howToExplainToCustomer: "We provide an engineered Dialux 3D lighting calculation showing exact lux levels along your path or car park, giving you full compliance documentation for council sign-off.",
    practicalExample: "Our Dialux calculation proves that 15W luminaires at 6m mounting height spaced at 28m achieve Category P4 lux and uniformity on a 2.5m wide asphalt path.",
    commonMistakesToAvoid: "Relying on raw wattage or nominal lumens to claim compliance without verifying against road width, pole setbacks, and luminaire tilt.",
    relatedPlasgainProducts: ["All Plasgain Luminaires & Columns"],
    australianStandardRef: "AS/NZS 1158 Photometric Design Procedures"
  },
  "pir motion sensor dimming": {
    term: "PIR Motion Sensor & Smart Dimming Profiles",
    category: "Solar & Battery",
    plainEnglish: "An automated control profile where solar lights run at a discreet low energy level (e.g. 20-30% standby) and instantly boost to 100% full brightness when motion is detected.",
    whyItMattersInSales: "Drastically extends battery autonomy during winter while providing full safety lighting whenever people, cyclists, or cars are present.",
    howToExplainToCustomer: "The lights run quietly at 25% background level to save power, but the moment a pedestrian or cyclist steps within 10–12 metres, they instantly illuminate to 100% brightness for safe passage.",
    practicalExample: "Superlux and Intense 50W luminaires feature integrated PIR sensors to ensure battery reserves survive prolonged winter cloud cover.",
    commonMistakesToAvoid: "Leaving solar lights on 100% fixed dusk-to-dawn without motion dimming in southern states where winter sunlight is insufficient.",
    relatedPlasgainProducts: ["Superlux 30W/60W", "Intense 50W", "Sonaray Solar Blade"],
    australianStandardRef: "AS/NZS 1158 & AS/NZS 4509"
  }
};

export function lookupLightingTerm(query: string): LightingTermExplanation {
  const normalized = query.toLowerCase().trim();
  
  // Direct match
  if (COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA[normalized]) {
    return COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA[normalized];
  }

  // Substring match in keys
  for (const key of Object.keys(COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA[key];
    }
  }

  // Fuzzy match keywords
  if (normalized.includes("1158") || normalized.includes("standard") || normalized.includes("cat p") || normalized.includes("cat v")) {
    return COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA["as/nzs 1158"];
  }
  if (normalized.includes("battery") || normalized.includes("cloudy") || normalized.includes("rain") || normalized.includes("backup")) {
    return COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA["autonomy"];
  }
  if (normalized.includes("kelvin") || normalized.includes("colour") || normalized.includes("3000k") || normalized.includes("4000k")) {
    return COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA["cct (correlated colour temperature)"];
  }
  if (normalized.includes("ip") || normalized.includes("water") || normalized.includes("dust") || normalized.includes("weather")) {
    return COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA["ip rating (ingress protection)"];
  }
  if (normalized.includes("ik") || normalized.includes("vandal") || normalized.includes("impact") || normalized.includes("smash")) {
    return COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA["ik rating (impact resistance)"];
  }
  if (normalized.includes("optic") || normalized.includes("lens") || normalized.includes("distribution") || normalized.includes("beam")) {
    return COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA["optics (type 2, type 3, type 5)"];
  }
  if (normalized.includes("wind") || normalized.includes("cyclone") || normalized.includes("region")) {
    return COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA["wind region a / b / c / d"];
  }
  if (normalized.includes("pole") || normalized.includes("plastic") || normalized.includes("bottle") || normalized.includes("safepole")) {
    return COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA["plaspole & safepole"];
  }
  if (normalized.includes("rebate") || normalized.includes("veu") || normalized.includes("ipart") || normalized.includes("veec")) {
    return COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA["veu & ipart rebates"];
  }
  if (normalized.includes("dialux") || normalized.includes("photometric") || normalized.includes("lux") || normalized.includes("uniformity")) {
    return COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA["photometric design (dialux)"];
  }
  if (normalized.includes("pir") || normalized.includes("motion") || normalized.includes("dimming") || normalized.includes("sensor")) {
    return COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA["pir motion sensor dimming"];
  }
  if (normalized.includes("lithium") || normalized.includes("lifepo4") || normalized.includes("iron")) {
    return COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA["lifepo4 (lithium iron phosphate)"];
  }

  // Dynamic fallback constructed intelligently
  return {
    term: query,
    category: "Lighting Standards",
    plainEnglish: `Technical specification term: "${query}". In commercial and solar lighting tenders, this specifies a core optical, electrical, or structural compliance requirement under Australian standards.`,
    whyItMattersInSales: `Ensuring strict alignment with this specification prevents non-compliance rejections during council lighting audits and contractor handovers.`,
    howToExplainToCustomer: `This parameter is engineered into our luminaire and pole selections to ensure full compliance with your tender's technical schedule and Australian Standards.`,
    practicalExample: `Refer to the project's photometric design and manufacturer datasheet to verify exact ratings.`,
    commonMistakesToAvoid: `Never guess compliance without consulting the official Plasgain product datasheet.`,
    relatedPlasgainProducts: ["enLighten Zorro 2", "Intense 50W Solar", "Pro Blade 75/125", "Roadway V-LED 70W"],
    australianStandardRef: "AS/NZS 1158 & AS/NZS 4509"
  };
}
