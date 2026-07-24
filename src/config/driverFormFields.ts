import type { GoldAutoDriverName, GoldDriverName, GoldAutoImpact } from "@/types/goldResearch";

type DriverFieldType = "text" | "textarea" | "select" | "url";

export interface DriverFieldConfig {
  key: string;
  label: string;
  type: DriverFieldType;
  placeholder: string;
  options?: string[];
}

export interface DriverFormConfig {
  description: string;
  fields: DriverFieldConfig[];
}

type AutoFieldType = "text" | "textarea" | "url" | "select";

export interface AutoSectionFieldConfig {
  key: string;
  label: string;
  type?: AutoFieldType;
  options?: string[];
}

const AUTO_IMPACT_OPTIONS: GoldAutoImpact[] = ["Bullish Gold", "Bearish Gold", "Neutral", "Mixed-Wait"];

export const DRIVER_FORM_CONFIG: Record<GoldDriverName, DriverFormConfig> = {
  "DXY / US Dollar": {
    description: "Dollar pressure, DXY direction, and chart context.",
    fields: [
      { key: "dxyDirection", label: "DXY current direction", type: "select", placeholder: "Select direction", options: ["Rising", "Falling", "Sideways", "Rejecting Resistance", "Breaking Support", "Breaking Resistance"] },
      { key: "dxyCurrentLevel", label: "DXY current level", type: "text", placeholder: "Example: 105.20" },
      { key: "dxySupportResistance", label: "DXY key support/resistance", type: "text", placeholder: "Example: Resistance at 105.50, support at 104.80" },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Dollar weakens as rate-cut bets rise" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the Dollar driver in a few lines" },
      { key: "chartObservation", label: "My chart observation", type: "textarea", placeholder: "Example: DXY rejecting resistance on H1" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "US Yields": {
    description: "10Y and 2Y Treasury direction, yield levels, and news reaction.",
    fields: [
      { key: "tenYearYieldDirection", label: "10Y yield direction", type: "select", placeholder: "Select direction", options: ["Rising", "Falling", "Sideways", "Rejecting High", "Breaking Higher", "Breaking Lower"] },
      { key: "twoYearYieldDirection", label: "2Y yield direction", type: "select", placeholder: "Select direction", options: ["Rising", "Falling", "Sideways", "Rejecting High", "Breaking Higher", "Breaking Lower"] },
      { key: "tenYearYieldValue", label: "Current 10Y yield value", type: "text", placeholder: "Example: 4.47%" },
      { key: "twoYearYieldValue", label: "Current 2Y yield value", type: "text", placeholder: "Example: 3.82%" },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Treasury yields jump on higher-for-longer outlook" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the yield move and market reaction" },
      { key: "chartObservation", label: "My chart observation", type: "textarea", placeholder: "Example: 10Y pulling back from recent high" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "Real Yields": {
    description: "Real-yield pressure and inflation-expectation direction.",
    fields: [
      { key: "realYieldsDirection", label: "Real yields direction", type: "select", placeholder: "Select direction", options: ["Rising", "Falling", "Sideways", "Rejecting High", "Breaking Higher", "Breaking Lower"] },
      { key: "realYieldValue", label: "Current real yield value", type: "text", placeholder: "Example: 2.05%" },
      { key: "inflationExpectationDirection", label: "Inflation expectation direction", type: "select", placeholder: "Select direction", options: ["Rising", "Falling", "Stable"] },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Real yields pull back as inflation expectations rise" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the real-yield driver" },
      { key: "chartObservation", label: "My chart observation", type: "textarea", placeholder: "Example: Real yields rejecting recent high" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "Fed Tone / FOMC": {
    description: "Fed tone, rate expectations, speakers, and key quote.",
    fields: [
      { key: "fedTone", label: "Fed tone", type: "select", placeholder: "Select tone", options: ["Hawkish", "Dovish", "Neutral", "Mixed"] },
      { key: "rateExpectation", label: "Rate expectation", type: "select", placeholder: "Select expectation", options: ["Cuts Expected", "Hike Expected", "Hold Expected", "Higher For Longer"] },
      { key: "fedSpeakerOrEvent", label: "Fed speaker or event", type: "text", placeholder: "Example: Powell speech, FOMC minutes" },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Fed signals fewer cuts this year" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the Fed message" },
      { key: "keyQuote", label: "Key quote or takeaway", type: "textarea", placeholder: "Paste the quote or your main takeaway" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "CPI / PCE": {
    description: "Inflation surprise, actual/forecast/previous, and market reaction.",
    fields: [
      { key: "inflationResult", label: "Inflation result", type: "select", placeholder: "Select result", options: ["Hotter Than Expected", "Softer Than Expected", "In Line", "Mixed"] },
      { key: "inflationType", label: "CPI/PCE type", type: "select", placeholder: "Select type", options: ["CPI", "Core CPI", "PCE", "Core PCE"] },
      { key: "actualValue", label: "Actual value", type: "text", placeholder: "Example: 0.4% m/m" },
      { key: "forecastValue", label: "Forecast value", type: "text", placeholder: "Example: 0.3% m/m" },
      { key: "previousValue", label: "Previous value", type: "text", placeholder: "Example: 0.2% m/m" },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: CPI comes in hotter than expected" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the inflation print and reaction" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "NFP / Jobs": {
    description: "Payrolls, unemployment, wages, and labor-market reaction.",
    fields: [
      { key: "jobsResult", label: "Jobs result", type: "select", placeholder: "Select result", options: ["Stronger Than Expected", "Weaker Than Expected", "In Line", "Mixed"] },
      { key: "nfpActual", label: "NFP actual", type: "text", placeholder: "Example: 210K" },
      { key: "nfpForecast", label: "NFP forecast", type: "text", placeholder: "Example: 170K" },
      { key: "unemploymentRate", label: "Unemployment rate", type: "text", placeholder: "Example: 4.1%, unemployment rising" },
      { key: "wageGrowth", label: "Wage growth", type: "text", placeholder: "Example: wages cooling / 0.2% m/m" },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Payrolls miss forecast as unemployment rises" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the jobs report and reaction" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  Geopolitics: {
    description: "Risk level, event type, DXY reaction, and safe-haven demand.",
    fields: [
      { key: "geopoliticalRiskLevel", label: "Geopolitical risk level", type: "select", placeholder: "Select risk", options: ["Low", "Medium", "High", "Extreme"] },
      { key: "eventType", label: "Event type", type: "select", placeholder: "Select event", options: ["War", "Conflict", "Sanctions", "Election Risk", "Banking Risk", "Global Uncertainty", "Other"] },
      { key: "dxyReaction", label: "DXY reaction", type: "select", placeholder: "Select reaction", options: ["Rising", "Falling", "Stable", "Unknown"] },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Gold catches safe-haven bid as tensions rise" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the geopolitical event and market reaction" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "ETF / Central Bank Demand": {
    description: "ETF flows, central-bank demand, and longer-term Gold demand.",
    fields: [
      { key: "etfFlowDirection", label: "ETF flow direction", type: "select", placeholder: "Select flow", options: ["Inflows", "Outflows", "Flat", "Unknown"] },
      { key: "centralBankDemand", label: "Central bank demand", type: "select", placeholder: "Select demand", options: ["Strong Buying", "Weak Buying", "Selling", "Unknown"] },
      { key: "reportPeriod", label: "Report period", type: "text", placeholder: "Example: Weekly, May 2026, Q2" },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: ETF inflows rise as central banks keep buying" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the demand report" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "Custom News": {
    description: "Any Gold-related news that does not fit one driver cleanly.",
    fields: [
      { key: "newsCategory", label: "News category", type: "select", placeholder: "Select category", options: ["Dollar", "Yields", "Fed", "Inflation", "Jobs", "Geopolitics", "Gold Demand", "Other"] },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Gold reacts to mixed macro headlines" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the news and market reaction" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "myInterpretation", label: "My interpretation", type: "textarea", placeholder: "Example: This looks Gold-supportive only if DXY keeps falling" },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "Economic Growth": {
    description: "GDP, PMI, ISM, and broader economic activity indicators.",
    fields: [
      { key: "economicActivity", label: "Economic activity level", type: "select", placeholder: "Select level", options: ["Expanding", "Contracting", "Stable", "Slowing"] },
      { key: "gdpGrowth", label: "GDP growth rate", type: "text", placeholder: "Example: 2.1% annualized" },
      { key: "pmi", label: "PMI reading", type: "text", placeholder: "Example: 52.3 (expansion)" },
      { key: "ism", label: "ISM reading", type: "text", placeholder: "Example: 49.2 (contraction)" },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Manufacturing PMI signals slowdown" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the economic growth data" },
      { key: "chartObservation", label: "My chart observation", type: "textarea", placeholder: "Example: Economic slowdown may support Gold as safe haven" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "Gold ETF Flows": {
    description: "ETF inflows/outflows and institutional demand signals.",
    fields: [
      { key: "etfFlowDirection", label: "ETF flow direction", type: "select", placeholder: "Select flow", options: ["Inflows", "Outflows", "Flat", "Accelerating Inflows", "Accelerating Outflows", "Unknown"] },
      { key: "etfFlowMagnitude", label: "Flow magnitude", type: "select", placeholder: "Select magnitude", options: ["Large", "Moderate", "Small", "Unknown"] },
      { key: "reportPeriod", label: "Report period", type: "text", placeholder: "Example: Weekly, May 2026" },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Gold ETF inflows hit 3-month high" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the ETF flow data" },
      { key: "chartObservation", label: "My chart observation", type: "textarea", placeholder: "Example: Rising ETF inflows confirm institutional demand" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "Central Bank Demand": {
    description: "Central bank gold buying/selling activity and reserve trends.",
    fields: [
      { key: "cbBuyingVolume", label: "Central bank buying volume", type: "select", placeholder: "Select volume", options: ["Heavy Buying", "Moderate Buying", "Light Buying", "Selling", "Unknown"] },
      { key: "centralBankDemand", label: "Demand trend", type: "select", placeholder: "Select trend", options: ["Strong Buying", "Weak Buying", "Selling", "Accelerating", "Decelerating", "Unknown"] },
      { key: "reportPeriod", label: "Report period", type: "text", placeholder: "Example: Q1 2026, Monthly" },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: PBOC adds 15 tonnes to reserves" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the central bank activity" },
      { key: "chartObservation", label: "My chart observation", type: "textarea", placeholder: "Example: Sustained CB buying supports long-term Gold bid" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "Market Sentiment": {
    description: "Fear/greed, VIX, risk appetite, and sentiment indicators.",
    fields: [
      { key: "fearGreedIndex", label: "Fear & Greed Index", type: "text", placeholder: "Example: 72 (Greed)" },
      { key: "vixLevel", label: "VIX level", type: "text", placeholder: "Example: 18.5" },
      { key: "riskAppetite", label: "Risk appetite", type: "select", placeholder: "Select appetite", options: ["Risk-On", "Risk-Off", "Mixed", "Neutral"] },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Markets turn risk-off as trade tensions rise" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the sentiment data" },
      { key: "chartObservation", label: "My chart observation", type: "textarea", placeholder: "Example: Risk-off sentiment supporting Gold as safe haven" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "Crowd Positioning": {
    description: "Retail vs institutional positioning and crowded trade risk.",
    fields: [
      { key: "retailPositioning", label: "Retail positioning", type: "select", placeholder: "Select positioning", options: ["Heavily Long", "Slightly Long", "Balanced", "Slightly Short", "Heavily Short", "Unknown"] },
      { key: "institutionalPositioning", label: "Institutional positioning", type: "select", placeholder: "Select positioning", options: ["Heavily Long", "Slightly Long", "Balanced", "Slightly Short", "Heavily Short", "Unknown"] },
      { key: "crowdedTradeRisk", label: "Crowded trade risk", type: "select", placeholder: "Select risk", options: ["High", "Moderate", "Low", "Unknown"] },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: CFTC shows speculators piling into Gold longs" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the positioning data" },
      { key: "chartObservation", label: "My chart observation", type: "textarea", placeholder: "Example: Crowded longs increase risk of pullback" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "Liquidity Conditions": {
    description: "Funding conditions, balance sheet, and monetary base trends.",
    fields: [
      { key: "fundingConditions", label: "Funding conditions", type: "select", placeholder: "Select conditions", options: ["Loose", "Tight", "Normalizing", "Stressed", "Unknown"] },
      { key: "balanceSheetSize", label: "Central bank balance sheet", type: "text", placeholder: "Example: Fed BS at $7.4T, declining" },
      { key: "repoRate", label: "Repo rate", type: "text", placeholder: "Example: 5.30%" },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Fed balance sheet runoff continues at $95B/month" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize liquidity conditions" },
      { key: "chartObservation", label: "My chart observation", type: "textarea", placeholder: "Example: Tightening liquidity may weigh on risk assets, support Gold" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "Seasonality": {
    description: "Historical seasonal patterns and monthly return tendencies.",
    fields: [
      { key: "seasonalPattern", label: "Seasonal pattern", type: "select", placeholder: "Select pattern", options: ["Historically Bullish", "Historically Bearish", "Neutral", "Unclear"] },
      { key: "historicalReturn", label: "Historical average return", type: "text", placeholder: "Example: July avg +2.3%" },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Gold historically rallies in July on wedding season demand" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the seasonal pattern" },
      { key: "chartObservation", label: "My chart observation", type: "textarea", placeholder: "Example: Seasonal tailwind aligns with current bullish structure" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "Position Risk": {
    description: "Short interest, CFTC positioning, and crowded trade risk.",
    fields: [
      { key: "shortInterest", label: "Short interest", type: "text", placeholder: "Example: Short interest at 6-month low" },
      { key: "cftcNetLong", label: "CFTC net long positioning", type: "text", placeholder: "Example: Net long at 180K contracts" },
      { key: "positionCrowding", label: "Position crowding", type: "select", placeholder: "Select level", options: ["High", "Moderate", "Low", "Unknown"] },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Speculative net longs approach extreme levels" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the positioning risk" },
      { key: "chartObservation", label: "My chart observation", type: "textarea", placeholder: "Example: Extreme positioning increases reversal risk" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "Gold Technical Structure": {
    description: "Multi-timeframe technical analysis, market structure, and setup quality.",
    fields: [
      { key: "higherTimeframeBias", label: "Higher timeframe bias", type: "select", placeholder: "Select bias", options: ["Bullish", "Bearish", "Neutral", "Ranging"] },
      { key: "keySupport", label: "Key support", type: "text", placeholder: "Example: $2,320 (daily demand zone)" },
      { key: "keyResistance", label: "Key resistance", type: "text", placeholder: "Example: $2,380 (supply zone)" },
      { key: "marketStructure", label: "Market structure", type: "select", placeholder: "Select structure", options: ["Bullish BOS", "Bearish BOS", "Ranging", "MSS Bullish", "MSS Bearish"] },
      { key: "setupPresent", label: "Setup present", type: "select", placeholder: "Select", options: ["Yes", "No", "Developing"] },
      { key: "setupType", label: "Setup type", type: "select", placeholder: "Select setup", options: ["Liquidity Sweep", "BOS", "MSS", "FVG", "OB", "Retest", "Other", "None"] },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Gold holds bullish structure above $2,320" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the technical picture" },
      { key: "chartObservation", label: "My chart observation", type: "textarea", placeholder: "Example: Daily bullish BOS, H4 demand zone at $2,320 holding" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  }
};

export const AUTO_SECTION_FIELDS: Record<GoldAutoDriverName, AutoSectionFieldConfig[]> = {
  "DXY / US Dollar Check": [
    { key: "currentDataValue", label: "Current Data/Value" },
    { key: "direction", label: "Direction", type: "select", options: ["Rising", "Falling", "Sideways", "Rejecting Resistance", "Breaking Support", "Breaking Resistance", "Data not verified"] },
    { key: "newsHeadline", label: "News Headline" },
    { key: "newsSummary", label: "News Summary", type: "textarea" },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldImpact", label: "Gold Impact", type: "select", options: AUTO_IMPACT_OPTIONS },
    { key: "reason", label: "Reason", type: "textarea" }
  ],
  "US Yields Check": [
    { key: "currentDataValue", label: "Current Data/Value" },
    { key: "tenYearYieldDirection", label: "10Y Yield Direction", type: "select", options: ["Rising", "Falling", "Sideways", "Mixed", "Data not verified"] },
    { key: "twoYearYieldDirection", label: "2Y Yield Direction", type: "select", options: ["Rising", "Falling", "Sideways", "Mixed", "Data not verified"] },
    { key: "newsHeadline", label: "News Headline" },
    { key: "newsSummary", label: "News Summary", type: "textarea" },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldImpact", label: "Gold Impact", type: "select", options: AUTO_IMPACT_OPTIONS },
    { key: "reason", label: "Reason", type: "textarea" }
  ],
  "Real Yields Check": [
    { key: "currentDataValue", label: "Current Data/Value" },
    { key: "realYieldsDirection", label: "Real Yields Direction", type: "select", options: ["Rising", "Falling", "Sideways", "Mixed", "Data not verified"] },
    { key: "newsHeadline", label: "News Headline" },
    { key: "newsSummary", label: "News Summary", type: "textarea" },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldImpact", label: "Gold Impact", type: "select", options: AUTO_IMPACT_OPTIONS },
    { key: "reason", label: "Reason", type: "textarea" }
  ],
  "Fed Tone / FOMC Check": [
    { key: "fedTone", label: "Fed Tone", type: "select", options: ["Hawkish", "Dovish", "Neutral", "Mixed", "Data not verified"] },
    { key: "rateExpectation", label: "Rate Expectation", type: "select", options: ["Cuts Expected", "Hold Expected", "Hike Expected", "Higher For Longer", "Mixed", "Data not verified"] },
    { key: "newsHeadline", label: "News Headline" },
    { key: "newsSummary", label: "News Summary", type: "textarea" },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldImpact", label: "Gold Impact", type: "select", options: AUTO_IMPACT_OPTIONS },
    { key: "reason", label: "Reason", type: "textarea" }
  ],
  "CPI / PCE Inflation Check": [
    { key: "latestInflationData", label: "Latest Inflation Data" },
    { key: "inflationResult", label: "Inflation Result", type: "select", options: ["Hotter Than Expected", "Softer Than Expected", "In Line", "Mixed", "Data not verified"] },
    { key: "newsHeadline", label: "News Headline" },
    { key: "newsSummary", label: "News Summary", type: "textarea" },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldImpact", label: "Gold Impact", type: "select", options: AUTO_IMPACT_OPTIONS },
    { key: "reason", label: "Reason", type: "textarea" }
  ],
  "NFP / Jobs Check": [
    { key: "latestJobsData", label: "Latest Jobs Data" },
    { key: "jobsResult", label: "Jobs Result", type: "select", options: ["Stronger Than Expected", "Weaker Than Expected", "In Line", "Mixed", "Data not verified"] },
    { key: "unemploymentRate", label: "Unemployment Rate" },
    { key: "wageGrowth", label: "Wage Growth" },
    { key: "newsHeadline", label: "News Headline" },
    { key: "newsSummary", label: "News Summary", type: "textarea" },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldImpact", label: "Gold Impact", type: "select", options: AUTO_IMPACT_OPTIONS },
    { key: "reason", label: "Reason", type: "textarea" }
  ],
  "Geopolitics / Risk Sentiment Check": [
    { key: "riskLevel", label: "Risk Level", type: "select", options: ["Low", "Medium", "High", "Extreme", "Data not verified"] },
    { key: "dxyReaction", label: "DXY Reaction", type: "select", options: ["Rising", "Falling", "Stable", "Unknown"] },
    { key: "newsHeadline", label: "News Headline" },
    { key: "newsSummary", label: "News Summary", type: "textarea" },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldImpact", label: "Gold Impact", type: "select", options: AUTO_IMPACT_OPTIONS },
    { key: "reason", label: "Reason", type: "textarea" }
  ],
  "ETF / Central Bank Demand Check": [
    { key: "etfFlowDirection", label: "ETF Flow Direction", type: "select", options: ["Inflows", "Outflows", "Flat", "Unknown"] },
    { key: "centralBankDemand", label: "Central Bank Demand", type: "select", options: ["Strong Buying", "Weak Buying", "Selling", "Unknown"] },
    { key: "newsHeadline", label: "News Headline" },
    { key: "newsSummary", label: "News Summary", type: "textarea" },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldImpact", label: "Gold Impact", type: "select", options: AUTO_IMPACT_OPTIONS },
    { key: "reason", label: "Reason", type: "textarea" }
  ],
  "Gold Technical Structure Check": [
    { key: "higherTimeframeBias", label: "Higher Timeframe Bias", type: "select", options: ["Bullish", "Bearish", "Neutral", "Data not verified"] },
    { key: "keySupport", label: "Key Support" },
    { key: "keyResistance", label: "Key Resistance" },
    { key: "liquidityArea", label: "Liquidity Area" },
    { key: "marketStructure", label: "Market Structure", type: "select", options: ["Bullish", "Bearish", "Ranging", "Data not verified"] },
    { key: "setupPresent", label: "Setup Present", type: "select", options: ["Yes", "No", "Unclear"] },
    { key: "setupType", label: "Setup Type", type: "select", options: ["Liquidity Sweep", "BOS", "MSS", "FVG", "OB", "Retest", "Other", "None"] },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldTechnicalVerdict", label: "Gold Technical Verdict", type: "select", options: ["Buy Setup", "Sell Setup", "Wait"] },
    { key: "reason", label: "Reason", type: "textarea" }
  ],
  "Economic Growth Check": [
    { key: "gdpGrowth", label: "GDP Growth Rate" },
    { key: "pmi", label: "PMI Reading" },
    { key: "ism", label: "ISM Reading" },
    { key: "economicActivity", label: "Economic Activity", type: "select", options: ["Expanding", "Contracting", "Stable", "Slowing", "Data not verified"] },
    { key: "newsHeadline", label: "News Headline" },
    { key: "newsSummary", label: "News Summary", type: "textarea" },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldImpact", label: "Gold Impact", type: "select", options: AUTO_IMPACT_OPTIONS },
    { key: "reason", label: "Reason", type: "textarea" }
  ],
  "Gold ETF Flows Check": [
    { key: "etfFlowDirection", label: "ETF Flow Direction", type: "select", options: ["Inflows", "Outflows", "Flat", "Accelerating Inflows", "Accelerating Outflows", "Data not verified"] },
    { key: "etfFlowMagnitude", label: "Flow Magnitude", type: "select", options: ["Large", "Moderate", "Small", "Data not verified"] },
    { key: "newsHeadline", label: "News Headline" },
    { key: "newsSummary", label: "News Summary", type: "textarea" },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldImpact", label: "Gold Impact", type: "select", options: AUTO_IMPACT_OPTIONS },
    { key: "reason", label: "Reason", type: "textarea" }
  ],
  "Central Bank Demand Check": [
    { key: "cbBuyingVolume", label: "Central Bank Buying Volume", type: "select", options: ["Heavy Buying", "Moderate Buying", "Light Buying", "Selling", "Data not verified"] },
    { key: "cbSellingVolume", label: "Central Bank Selling Volume", type: "select", options: ["Heavy Selling", "Moderate Selling", "Light Selling", "Data not verified"] },
    { key: "newsHeadline", label: "News Headline" },
    { key: "newsSummary", label: "News Summary", type: "textarea" },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldImpact", label: "Gold Impact", type: "select", options: AUTO_IMPACT_OPTIONS },
    { key: "reason", label: "Reason", type: "textarea" }
  ],
  "Market Sentiment Check": [
    { key: "fearGreedIndex", label: "Fear & Greed Index" },
    { key: "vixLevel", label: "VIX Level" },
    { key: "riskAppetite", label: "Risk Appetite", type: "select", options: ["Risk-On", "Risk-Off", "Mixed", "Neutral", "Data not verified"] },
    { key: "newsHeadline", label: "News Headline" },
    { key: "newsSummary", label: "News Summary", type: "textarea" },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldImpact", label: "Gold Impact", type: "select", options: AUTO_IMPACT_OPTIONS },
    { key: "reason", label: "Reason", type: "textarea" }
  ],
  "Crowd Positioning Check": [
    { key: "retailPositioning", label: "Retail Positioning", type: "select", options: ["Heavily Long", "Slightly Long", "Balanced", "Slightly Short", "Heavily Short", "Data not verified"] },
    { key: "institutionalPositioning", label: "Institutional Positioning", type: "select", options: ["Heavily Long", "Slightly Long", "Balanced", "Slightly Short", "Heavily Short", "Data not verified"] },
    { key: "crowdedTradeRisk", label: "Crowded Trade Risk", type: "select", options: ["High", "Moderate", "Low", "Data not verified"] },
    { key: "newsHeadline", label: "News Headline" },
    { key: "newsSummary", label: "News Summary", type: "textarea" },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldImpact", label: "Gold Impact", type: "select", options: AUTO_IMPACT_OPTIONS },
    { key: "reason", label: "Reason", type: "textarea" }
  ],
  "Liquidity Conditions Check": [
    { key: "fundingConditions", label: "Funding Conditions", type: "select", options: ["Loose", "Tight", "Normalizing", "Stressed", "Data not verified"] },
    { key: "balanceSheetSize", label: "Central Bank Balance Sheet" },
    { key: "repoRate", label: "Repo Rate" },
    { key: "newsHeadline", label: "News Headline" },
    { key: "newsSummary", label: "News Summary", type: "textarea" },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldImpact", label: "Gold Impact", type: "select", options: AUTO_IMPACT_OPTIONS },
    { key: "reason", label: "Reason", type: "textarea" }
  ],
  "Seasonality Check": [
    { key: "seasonalPattern", label: "Seasonal Pattern", type: "select", options: ["Historically Bullish", "Historically Bearish", "Neutral", "Data not verified"] },
    { key: "historicalReturn", label: "Historical Average Return" },
    { key: "newsHeadline", label: "News Headline" },
    { key: "newsSummary", label: "News Summary", type: "textarea" },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldImpact", label: "Gold Impact", type: "select", options: AUTO_IMPACT_OPTIONS },
    { key: "reason", label: "Reason", type: "textarea" }
  ],
  "Position Risk Check": [
    { key: "shortInterest", label: "Short Interest" },
    { key: "cftcNetLong", label: "CFTC Net Long Positioning" },
    { key: "positionCrowding", label: "Position Crowding", type: "select", options: ["High", "Moderate", "Low", "Data not verified"] },
    { key: "newsHeadline", label: "News Headline" },
    { key: "newsSummary", label: "News Summary", type: "textarea" },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldImpact", label: "Gold Impact", type: "select", options: AUTO_IMPACT_OPTIONS },
    { key: "reason", label: "Reason", type: "textarea" }
  ]
};

export const CORE_FIELD_KEYS = new Set(["newsHeadline", "newsSummary", "chartObservation", "sourceLink", "notes"]);

export const CORE_RESEARCH_FIELDS: DriverFieldConfig[] = [
  { key: "newsHeadline", label: "News Headline", type: "text", placeholder: "Paste the exact headline or write a clear research title" },
  { key: "newsSummary", label: "News Summary", type: "textarea", placeholder: "Summarize the news driver, numbers, reaction, and important context" },
  { key: "chartObservation", label: "My Chart Observation", type: "textarea", placeholder: "Write what price structure shows: resistance, support, supply, demand, rejection, breakout, or liquidity" },
  { key: "sourceLink", label: "Source Link", type: "url", placeholder: "https://..." },
  { key: "notes", label: "Notes", type: "textarea", placeholder: "Optional: extra risk, timing, or confirmation notes" }
];

export function getDriverFormConfig(driverName: GoldDriverName): DriverFormConfig {
  return DRIVER_FORM_CONFIG[driverName] ?? { description: "", fields: [] };
}

export function getDriverSpecificFields(driverName: GoldDriverName): DriverFieldConfig[] {
  const config = getDriverFormConfig(driverName);
  return config.fields.filter((field) => !CORE_FIELD_KEYS.has(field.key));
}

export function getAutoSectionFields(driverName: GoldAutoDriverName): AutoSectionFieldConfig[] {
  return AUTO_SECTION_FIELDS[driverName] ?? [];
}
