/**
 * Parsed Data Types
 *
 * These types represent data that has been transformed from raw API responses
 * to include both absolute and relative values for display.
 */

/**
 * A single parsed data value with both absolute and relative representations
 */
export interface ParsedValue {
  /** The original value from the API */
  original: number | string | null;
  /** The absolute value (actual count/measurement) */
  absolute: number | null;
  /** The relative value (percentage, ratio, or normalized score) */
  relative: number | null;
  /** Human-readable label for this metric */
  label: string;
  /** Optional unit for display (e.g., "people", "km", "%") */
  unit?: string;
}

/**
 * Parsed demographics data with absolute and relative values
 */
export interface ParsedDemographicsData {
  // Location metadata
  municipalityName: string;
  regionType: string;
  regionCode: string;

  // Population
  totalPopulation: ParsedValue;

  // Gender distribution
  males: ParsedValue;
  females: ParsedValue;

  // Age distribution
  age0to15: ParsedValue;
  age15to25: ParsedValue;
  age25to45: ParsedValue;
  age45to65: ParsedValue;
  age65Plus: ParsedValue;

  // Marital status
  unmarried: ParsedValue;
  married: ParsedValue;
  divorced: ParsedValue;
  widowed: ParsedValue;

  // Migration background
  native: ParsedValue;
  westernBackground: ParsedValue;
  nonWesternBackground: ParsedValue;
  morocco: ParsedValue;
  dutchCaribbean: ParsedValue;
  suriname: ParsedValue;
  turkey: ParsedValue;
  otherNonWestern: ParsedValue;

  // Birth and death rates
  totalBirths: ParsedValue;
  relativeBirthRate: ParsedValue;
  totalDeaths: ParsedValue;
  relativeDeathRate: ParsedValue;

  // Households
  totalHouseholds: ParsedValue;
  singlePersonHouseholds: ParsedValue;
  householdsWithoutChildren: ParsedValue;
  householdsWithChildren: ParsedValue;
  averageHouseholdSize: ParsedValue;

  // Housing
  populationDensity: ParsedValue;
  housingStock: ParsedValue;
  averageWOZValue: ParsedValue;
  percentageSingleFamily: ParsedValue;
  percentageMultiFamily: ParsedValue;
  percentageOccupied: ParsedValue;
  percentageVacant: ParsedValue;
  ownerOccupied: ParsedValue;
  rentalTotal: ParsedValue;
  rentalHousingCorporation: ParsedValue;
  rentalOtherLandlords: ParsedValue;
  ownershipUnknown: ParsedValue;
  builtBefore2000: ParsedValue;
  builtFrom2000: ParsedValue;

  // Energy consumption
  avgElectricityTotal: ParsedValue;
  avgElectricityApartment: ParsedValue;
  avgElectricityTerrace: ParsedValue;
  avgElectricityCorner: ParsedValue;
  avgElectricitySemiDetached: ParsedValue;
  avgElectricityDetached: ParsedValue;
  avgElectricityRental: ParsedValue;
  avgElectricityOwned: ParsedValue;
  avgGasTotal: ParsedValue;
  avgGasApartment: ParsedValue;
  avgGasTerrace: ParsedValue;
  avgGasCorner: ParsedValue;
  avgGasSemiDetached: ParsedValue;
  avgGasDetached: ParsedValue;
  avgGasRental: ParsedValue;
  avgGasOwned: ParsedValue;
  percentageDistrictHeating: ParsedValue;

  // Education levels
  educationLow: ParsedValue;
  educationMedium: ParsedValue;
  educationHigh: ParsedValue;

  // Employment
  netLaborParticipation: ParsedValue;
  percentageEmployees: ParsedValue;
  percentageSelfEmployed: ParsedValue;

  // Income
  totalIncomeRecipients: ParsedValue;
  avgIncomePerRecipient: ParsedValue;
  avgIncomePerResident: ParsedValue;
  bottom40PercentIncome: ParsedValue;
  top20PercentIncome: ParsedValue;
  avgStandardizedHouseholdIncome: ParsedValue;
  bottom40PercentHouseholds: ParsedValue;
  top20PercentHouseholds: ParsedValue;
  lowIncomeHouseholds: ParsedValue;
  householdsAtSocialMinimum: ParsedValue;
  householdsTo110PercentMinimum: ParsedValue;
  householdsTo120PercentMinimum: ParsedValue;
  medianHouseholdWealth: ParsedValue;

  // Social benefits
  socialAssistance: ParsedValue;
  disabilityBenefits: ParsedValue;
  unemploymentBenefits: ParsedValue;
  pensionBenefits: ParsedValue;
  youthCareRecipients: ParsedValue;
  percentageYouthCare: ParsedValue;
  wmoClients: ParsedValue;
  wmoClientsRelative: ParsedValue;

  // Business establishments
  totalBusinesses: ParsedValue;
  agricultureForestryFishing: ParsedValue;
  industryEnergy: ParsedValue;
  tradeHospitality: ParsedValue;
  transportInfoComm: ParsedValue;
  financialRealEstate: ParsedValue;
  businessServices: ParsedValue;
  cultureRecreationOther: ParsedValue;

  // Vehicles
  totalCars: ParsedValue;
  carsPetrol: ParsedValue;
  carsOtherFuel: ParsedValue;
  carsPerHousehold: ParsedValue;
  carsPerArea: ParsedValue;
  motorcycles: ParsedValue;

  // Proximity to amenities
  distanceToGP: ParsedValue;
  distanceToSupermarket: ParsedValue;
  distanceToDaycare: ParsedValue;
  distanceToSchool: ParsedValue;
  schoolsWithin3km: ParsedValue;

  // Area
  totalArea: ParsedValue;
  landArea: ParsedValue;
  waterArea: ParsedValue;
  urbanDensity: ParsedValue;
  addressDensity: ParsedValue;

  [key: string]: ParsedValue | string; // Allow indexing
}

/**
 * Parsed health data with absolute and relative values
 */
export interface ParsedHealthData {
  // Location metadata
  municipalityName: string;
  regionType: string;
  regionCode: string;

  // General health
  goodOrVeryGoodHealth: ParsedValue;

  // Physical activity
  meetsExerciseGuidelines: ParsedValue;
  weeklySportParticipants: ParsedValue;

  // Weight
  underweight: ParsedValue;
  normalWeight: ParsedValue;
  overweight: ParsedValue;
  severelyOverweight: ParsedValue;

  // Substance use
  smokers: ParsedValue;
  meetsAlcoholGuidelines: ParsedValue;
  drinkers: ParsedValue;
  heavyDrinkers: ParsedValue;
  excessiveDrinkers: ParsedValue;

  // Chronic conditions and limitations
  oneOrMoreChronicConditions: ParsedValue;
  limitedByHealth: ParsedValue;
  severelyLimitedByHealth: ParsedValue;
  longTermSeverelyLimited: ParsedValue;

  // Mental health
  psychologicalComplaints: ParsedValue;
  veryLowResilience: ParsedValue;
  veryHighResilience: ParsedValue;
  lacksEmotionalSupport: ParsedValue;
  suicidalThoughtsLast12Months: ParsedValue;
  highRiskAnxietyDepression: ParsedValue;
  highStressLast4Weeks: ParsedValue;

  // Loneliness
  lonely: ParsedValue;
  severelyOrVeryLonely: ParsedValue;
  emotionallyLonely: ParsedValue;
  sociallyLonely: ParsedValue;

  // Social participation
  informalCaregivers: ParsedValue;
  volunteers: ParsedValue;

  // Financial stress
  difficultyMakingEndsMeet: ParsedValue;

  // Mobility
  walkOrCycleToWork: ParsedValue;
  walkToWork: ParsedValue;
  cycleToWork: ParsedValue;

  // Non-specific complaints
  nonSpecificComplaints: ParsedValue;

  [key: string]: ParsedValue | string; // Allow indexing
}

/**
 * Parsed livability data with absolute and relative values
 */
export interface ParsedLivabilityData {
  // Location metadata
  municipalityName: string;
  regionType: string;
  regionCode: string;

  // Physical facilities
  maintenanceSidewalkStreets: ParsedValue;
  maintenanceParks: ParsedValue;
  streetLighting: ParsedValue;
  playgroundsChildren: ParsedValue;
  facilitiesYouth: ParsedValue;
  physicalFacilitiesScore: ParsedValue;

  // Social cohesion
  peopleHardlyKnowEachOther: ParsedValue;
  peopleGetAlongWell: ParsedValue;
  pleasantHelpfulNeighborhood: ParsedValue;
  feelAtHomeWithNeighbors: ParsedValue;
  contactWithNeighbors: ParsedValue;
  satisfiedWithPopulationComposition: ParsedValue;
  wouldGiveHouseKey: ParsedValue;
  peopleCorrectBehavior: ParsedValue;
  socialCohesionScore: ParsedValue;

  // Neighborhood development
  neighborhoodImproved: ParsedValue;
  neighborhoodDeteriorated: ParsedValue;
  neighborhoodRating: ParsedValue;

  // Municipal services
  municipalPerformanceGeneral: ParsedValue;
  municipalPerformanceEnforcers: ParsedValue;

  // Nuisance - Physical
  experiencesNuisance: ParsedValue;
  litterOnStreet: ParsedValue;
  vandalizedStreetFurniture: ParsedValue;
  graffiti: ParsedValue;
  dogFeces: ParsedValue;
  physicalDeterioration: ParsedValue;

  // Nuisance - Social
  drunkPeople: ParsedValue;
  confusedPeople: ParsedValue;
  drugUse: ParsedValue;
  drugDealing: ParsedValue;
  nuisanceFromNeighbors: ParsedValue;
  harassmentOnStreet: ParsedValue;
  loiteringYouths: ParsedValue;
  socialNuisance: ParsedValue;

  // Nuisance - Traffic
  parkingProblems: ParsedValue;
  speeding: ParsedValue;
  aggressiveDriving: ParsedValue;
  trafficNuisance: ParsedValue;

  // Nuisance - Environmental
  noiseNuisance: ParsedValue;
  odorNuisance: ParsedValue;
  nuisanceFromBars: ParsedValue;
  environmentalNuisance: ParsedValue;

  // Safety perception
  sometimesFeelsUnsafe: ParsedValue;
  oftenFeelsUnsafe: ParsedValue;
  fearOfPickpocketing: ParsedValue;
  fearOfStreetRobbery: ParsedValue;
  fearOfBurglary: ParsedValue;
  fearOfAssault: ParsedValue;
  fearOfOnlineFraud: ParsedValue;
  sometimesFeelsUnsafeInNeighborhood: ParsedValue;
  oftenFeelsUnsafeInNeighborhood: ParsedValue;
  unsafeOnStreetAtNight: ParsedValue;
  unsafeAloneAtHome: ParsedValue;
  doesNotOpenDoorAtNight: ParsedValue;
  drivesOrWalksAround: ParsedValue;
  afraidOfBeingVictim: ParsedValue;
  perceivedHighCrime: ParsedValue;
  perceivedCrimeIncrease: ParsedValue;
  perceivedCrimeDecrease: ParsedValue;
  safetyRating: ParsedValue;

  // Discrimination
  discriminatedByStrangers: ParsedValue;
  discriminatedInPublicTransport: ParsedValue;
  discriminatedByShopStaff: ParsedValue;
  discriminatedByGovernmentStaff: ParsedValue;
  discriminatedByAcquaintances: ParsedValue;
  feltDiscriminated: ParsedValue;

  // Crime victimization
  victimsTheft: ParsedValue;
  victimsBurglary: ParsedValue;
  victimsVehicleTheft: ParsedValue;
  victimsTheftFromVehicle: ParsedValue;
  victimsBicycleTheft: ParsedValue;
  victimsRobbery: ParsedValue;
  victimsVandalism: ParsedValue;
  victimsAssault: ParsedValue;
  victimsSexualOffense: ParsedValue;
  victimsConsumerFraud: ParsedValue;
  victimsOnlineShoppingFraud: ParsedValue;
  victimsLotteryFraud: ParsedValue;
  victimsCardFraud: ParsedValue;
  victimsPhishing: ParsedValue;
  victimsIdentityFraud: ParsedValue;
  victimsFraud: ParsedValue;
  victimsHacking: ParsedValue;
  victimsCyberbullying: ParsedValue;
  victimsImageAbuse: ParsedValue;
  victimsSexualCybercrime: ParsedValue;
  victimsDiscrimination: ParsedValue;
  victimsUnwantedAccess: ParsedValue;
  victimsThreatIntimidation: ParsedValue;
  victimsStalking: ParsedValue;
  victimsCyberstalking: ParsedValue;
  victimsOtherOnlineCrime: ParsedValue;

  // Police contact
  contactWithPolice: ParsedValue;
  contactInNeighborhood: ParsedValue;
  contactElsewhere: ParsedValue;
  contactOutsideMunicipality: ParsedValue;
  contactForEnforcement: ParsedValue;
  contactForReport: ParsedValue;
  contactOther: ParsedValue;
  satisfactionPoliceInNeighborhood: ParsedValue;
  satisfactionPoliceVisibility: ParsedValue;
  satisfactionPoliceGeneral: ParsedValue;

  // Prevention measures
  leaveLightsOn: ParsedValue;
  securedBicycleStorage: ParsedValue;
  removeValuablesFromCar: ParsedValue;
  leaveValuablesAtHome: ParsedValue;
  preventiveBehaviorScore: ParsedValue;
  extraSecurityLocks: ParsedValue;
  shutters: ParsedValue;
  motionLighting: ParsedValue;
  alarmSystem: ParsedValue;
  cameraSurveillance: ParsedValue;
  policeQualityMarkSticker: ParsedValue;
  preventiveMeasuresScore: ParsedValue;
  neighborhoodAppPresent: ParsedValue;
  participatesInApp: ParsedValue;
  registeredWithBurgernet: ParsedValue;
  neighborhoodWatchPresent: ParsedValue;

  // Digital security
  strongPasswords: ParsedValue;
  regularlyChangesPasswords: ParsedValue;
  usesPasswordManager: ParsedValue;
  usesVirusScanner: ParsedValue;
  usesFirewall: ParsedValue;
  performsUpdatesBackups: ParsedValue;
  digitalSecurityScore: ParsedValue;

  [key: string]: ParsedValue | string; // Allow indexing
}

/**
 * Parsed safety data with absolute and relative values
 */
export interface ParsedSafetyData {
  // Location metadata
  municipalityName: string;
  regionType: string;
  regionCode: string;

  // Crime statistics
  totalCrimes: ParsedValue;
  residentialBurglary: ParsedValue;
  garageStorageBurglary: ParsedValue;
  theftFromVehicle: ParsedValue;
  vehicleTheft: ParsedValue;
  bicycleTheft: ParsedValue;
  pickpocketing: ParsedValue;
  theftFromOtherVehicles: ParsedValue;

  // Traffic
  trafficAccidents: ParsedValue;

  // Violent crimes
  sexualOffenses: ParsedValue;
  murderManslaughter: ParsedValue;
  publicViolence: ParsedValue;
  threats: ParsedValue;
  assault: ParsedValue;
  streetRobbery: ParsedValue;
  robbery: ParsedValue;

  // Property crimes
  waterTheft: ParsedValue;
  fireExplosion: ParsedValue;
  otherPropertyCrimes: ParsedValue;

  // Other crimes
  humanTrafficking: ParsedValue;
  drugAlcoholNuisance: ParsedValue;
  vandalism: ParsedValue;
  neighborDispute: ParsedValue;
  trespassing: ParsedValue;
  businessBurglary: ParsedValue;
  shoplifting: ParsedValue;

  // Environmental crimes
  environmentalPermitViolation: ParsedValue;
  soilPollution: ParsedValue;
  waterPollution: ParsedValue;
  wasteViolation: ParsedValue;
  buildingMaterialsViolation: ParsedValue;
  manureViolation: ParsedValue;
  hazardousGoodsTransport: ParsedValue;
  fireworks: ParsedValue;
  pesticidesViolation: ParsedValue;
  natureConservation: ParsedValue;
  spatialPlanning: ParsedValue;
  animalOffenses: ParsedValue;
  foodSafety: ParsedValue;
  specialLaws: ParsedValue;
  livabilityOther: ParsedValue;

  // Organized crime
  drugTrafficking: ParsedValue;
  humanSmuggling: ParsedValue;
  weaponsTrafficking: ParsedValue;
  childPornography: ParsedValue;
  childProstitution: ParsedValue;

  // Traffic violations
  drivingUnderInfluenceAir: ParsedValue;
  airTrafficOther: ParsedValue;
  drivingUnderInfluenceWater: ParsedValue;
  drivingUnderInfluenceRoad: ParsedValue;
  roadTrafficOther: ParsedValue;

  // Social integrity
  disturbingPublicOrder: ParsedValue;
  discrimination: ParsedValue;
  immigrationCare: ParsedValue;
  socialIntegrityOther: ParsedValue;

  // Fraud
  cybercrime: ParsedValue;
  horizontalFraud: ParsedValue;
  verticalFraud: ParsedValue;
  fraudOther: ParsedValue;

  [key: string]: ParsedValue | string; // Allow indexing
}
