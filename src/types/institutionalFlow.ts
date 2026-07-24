export type FlowDirection = "Inflow" | "Outflow" | "Flat" | "Unknown";
export type FlowMagnitude = "Heavy" | "Moderate" | "Light" | "None" | "Unknown";
export type PositioningBias = "Net Long" | "Net Short" | "Flat" | "Unknown";
export type CrowdingLevel = "Extreme" | "High" | "Moderate" | "Low" | "Unknown";
export type RiskLevel = "Extreme" | "High" | "Moderate" | "Low" | "Unknown";
export type DataFreshness = "Current" | "Recent" | "Stale" | "Unknown";

export interface EtfFlowInput {
  direction: FlowDirection;
  magnitude?: FlowMagnitude;
  weeklyChange?: number;
  cumulativeChange?: number;
  period?: string;
  source?: string;
  notes?: string;
}

export interface CentralBankInput {
  netPurchases?: number;
  buyingVolume?: FlowMagnitude;
  sellingVolume?: FlowMagnitude;
  topBuyers?: string[];
  topSellers?: string[];
  period?: string;
  trend?: FlowDirection;
  source?: string;
  notes?: string;
}

export interface CotPositioningInput {
  commercials?: PositioningData;
  nonCommercials?: PositioningData;
  managedMoney?: PositioningData;
  reportDate?: string;
  source?: string;
  notes?: string;
}

export interface PositioningData {
  netLong?: number;
  netShort?: number;
  changeFromPrevious?: number;
  openInterest?: number;
  percentLong?: number;
  percentShort?: number;
}

export interface OpenInterestInput {
  currentLevel?: number;
  changeFromPrevious?: number;
  trend?: FlowDirection;
  highLevel?: boolean;
  lowLevel?: boolean;
  period?: string;
  source?: string;
  notes?: string;
}

export interface CrowdPositioningInput {
  retailBias?: PositioningBias;
  institutionalBias?: PositioningBias;
  crowdingLevel?: CrowdingLevel;
  crowdedTradeRisk?: RiskLevel;
  contrarianSignal?: boolean;
  source?: string;
  notes?: string;
}

export interface PositionRiskInput {
  level: RiskLevel;
  shortInterest?: number;
  cftcNetLong?: number;
  crowdingFactor?: number;
  reversalRisk?: string;
  source?: string;
  notes?: string;
}

export interface InstitutionalFlowInput {
  etfFlows?: EtfFlowInput;
  centralBank?: CentralBankInput;
  cotPositioning?: CotPositioningInput;
  openInterest?: OpenInterestInput;
  crowdPositioning?: CrowdPositioningInput;
  positionRisk?: PositionRiskInput;
  currentPrice?: number;
  notes?: string;
  timestamp?: string;
}

export interface InstitutionalFactor {
  name: string;
  direction: "Bullish" | "Bearish" | "Neutral";
  strength: "Strong" | "Moderate" | "Weak" | "None";
  weight: number;
  contribution: number;
  reason: string;
}

export interface InstitutionalDataQuality {
  score: number;
  completeness: number;
  hasEtfFlows: boolean;
  hasCentralBank: boolean;
  hasCotPositioning: boolean;
  hasOpenInterest: boolean;
  hasCrowdPositioning: boolean;
  hasPositionRisk: boolean;
  availableDrivers: string[];
  missingDrivers: string[];
  freshness: DataFreshness;
}

export interface ConcentrationRisk {
  detected: boolean;
  type: string;
  severity: RiskLevel;
  description: string;
  recommendation: string;
}

export interface InstitutionalFlowResult {
  institutionalBias: "Strong Bullish" | "Bullish" | "Neutral" | "Bearish" | "Strong Bearish";
  institutionalScore: number;
  confidence: number;
  strength: "Strong" | "Moderate" | "Weak" | "None";
  supportingFactors: string[];
  conflictingFactors: string[];
  concentrationRisks: ConcentrationRisk[];
  summary: string;
  timestamp: string;
  dataQuality: InstitutionalDataQuality;
  factors: InstitutionalFactor[];
}

export const FLOW_DIRECTION_NUMERIC: Record<FlowDirection, number> = {
  "Inflow": 1.0,
  "Outflow": -1.0,
  "Flat": 0.0,
  "Unknown": 0.0
};

export const FLOW_MAGNITUDE_MULTIPLIER: Record<FlowMagnitude, number> = {
  "Heavy": 1.0,
  "Moderate": 0.65,
  "Light": 0.35,
  "None": 0.0,
  "Unknown": 0.3
};

export const POSITIONING_BIAS_NUMERIC: Record<PositioningBias, number> = {
  "Net Long": 1.0,
  "Net Short": -1.0,
  "Flat": 0.0,
  "Unknown": 0.0
};

export const CROWDING_RISK_NUMERIC: Record<CrowdingLevel, number> = {
  "Extreme": 1.0,
  "High": 0.75,
  "Moderate": 0.5,
  "Low": 0.25,
  "Unknown": 0.0
};

export const RISK_LEVEL_NUMERIC: Record<RiskLevel, number> = {
  "Extreme": 1.0,
  "High": 0.75,
  "Moderate": 0.5,
  "Low": 0.25,
  "Unknown": 0.0
};
