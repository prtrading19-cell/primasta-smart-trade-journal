# PRIMASTA GOLD RESEARCH ENGINE V2

## Technical Architecture Specification

> **Document Version:** 1.0
> **Generated:** 2026-07-14
> **Classification:** Institutional Software Architecture
> **Status:** Approved for Implementation
> **Authoritative Sources:** PRIMASTA_MASTER_SPECIFICATION_v1.0, CURRENT_PROJECT_STATE.md, PHASE1_PROJECT_UNDERSTANDING.md

---

# TABLE OF CONTENTS

1. Executive Summary
2. Current Architecture Review
3. Target Architecture
4. Gold Research Driver Registry
5. Driver Analysis Model
6. Research Section Schema
7. Category Score Engine
8. Institutional Flow Engine
9. Technical Bias Engine
10. Gold Decision Engine
11. Driver Weight System
12. Data Flow
13. Database Design
14. API Architecture
15. AI Architecture
16. UI Architecture
17. Reports
18. File Structure
19. Migration Plan
20. Testing Strategy
21. Risks
22. Future Expansion

---

# 1. EXECUTIVE SUMMARY

## 1.1 Why This Upgrade Exists

The PRIMASTA Gold Research Terminal currently operates as a fixed 9-driver research tool. While functional, this architecture imposes fundamental limitations on analytical depth, scoring transparency, institutional-grade reporting, and future extensibility. The Gold/XAUUSD market demands a research engine that can accommodate unlimited analytical dimensions, provide weighted institutional scoring, and deliver transparent, auditable decision support.

## 1.2 Current Limitations

The existing architecture presents the following constraints:

- **Fixed Driver Count:** Exactly 9 hardcoded drivers. Adding a 10th driver requires modifying types, analyzers, normalization functions, API schemas, database columns, and UI components. This violates the open-closed principle.
- **Simple Bias Scale:** Four-point bias classification (Bullish Gold, Bearish Gold, Neutral, Mixed/Wait) lacks granularity for institutional decision-making.
- **No Category Aggregation:** Individual driver analyses exist in isolation. There is no mechanism to aggregate drivers into meaningful categories (Technical, Inflation, Employment, etc.) for higher-level scoring.
- **No Weighted Scoring:** All drivers carry equal weight regardless of their analytical significance or market relevance.
- **No Institutional Flow Analysis:** ETF flows, central bank activity, COT positioning, and open interest analysis are embedded within a single "ETF / Central Bank Demand" driver rather than existing as independent analytical dimensions.
- **No Historical Context:** Driver analyses are point-in-time snapshots with no trending, momentum tracking, or historical comparison.
- **No Confidence Calibration:** The current confidence score (0-100 integer) is derived from a simple signal-counting heuristic with no structured explanation.
- **Monolithic UI:** The 1984-line GoldResearchDesk component renders all sections through hardcoded conditional logic. Adding a new section requires modifying this component directly.
- **No Decision Engine:** The system provides raw driver analyses and a qualitative summary but does not produce a structured, weighted final decision with traceable reasoning.

## 1.3 Target Architecture

The target architecture replaces the fixed 9-driver model with an unlimited, config-driven research engine composed of:

- A **Driver Registry** that defines every available driver as configuration metadata
- A **Driver Analysis Model** producing structured, multi-dimensional analysis objects
- A **Category Score Engine** aggregating drivers into weighted category scores
- An **Institutional Flow Engine** analyzing positioning and flow data
- A **Technical Bias Engine** synthesizing multi-timeframe technical analysis
- A **Gold Decision Engine** producing the final weighted score and trade decision
- A **Config-Driven UI** that renders sections dynamically from registry metadata

## 1.4 Expected Benefits

- **Extensibility:** New drivers and research sections added through configuration, not code modification
- **Transparency:** Every score is traceable to its contributing drivers, weights, and reasoning
- **Institutional Grade:** Category scoring, institutional flow analysis, and structured decision output meet hedge fund analytical standards
- **Backward Compatibility:** All existing functionality preserved; new capabilities are additive
- **Auditability:** Full decision trail from raw data through to final score
- **Reusability:** Engine components designed for future extension to Forex, Indices, Crypto, and Commodities

---

# 2. CURRENT ARCHITECTURE REVIEW

## 2.1 Current Gold Research Engine

The engine operates across three layers:

**Manual Analysis Layer:**
Users select one of 9 hardcoded drivers, fill in driver-specific fields and core research fields (headline, summary, chart observation, source link, notes), and trigger analysis. The analysis is performed by a combination of client-side scoring logic and an AI API call. Results are stored as individual `GoldResearchReport` records.

**Auto-Fill Layer:**
A single API call to OpenAI gpt-4.1 with forced web_search generates a structured report containing all 9 sections. The response is normalized, live-priced from TwelveData, and stored as a `DailyGoldResearchReport` with `sections_json` containing the 9 auto-fill sections.

**Setup Assistant Layer:**
Takes the latest research summary (either from manual reports or auto-fill) and user-provided liquidity/structure inputs to generate a trade setup with verdict, entry, stop loss, take profit, and risk/reward analysis.

## 2.2 Current Driver Flow

```
User Input (per driver)
    |
    v
buildAnalysisInput() --> GoldAnalysisInput
    |
    v
POST /api/analyze-gold-driver
    |
    v
analyzeGoldDriver() --> switch(driverName) --> 9 hardcoded analyzers
    |
    v
finalizeDriver() --> GoldDriverAnalysis
    |
    v
Client displays analysis
    |
    v
addGoldResearchReport() --> Supabase gold_research_reports
    |
    v
buildGoldBiasSummary() --> GoldBiasSummary (aggregated view)
```

## 2.3 Current Auto Fill

```
POST /api/gold-research/auto-fill { date }
    |
    v
fetchLiveGoldPrice() --> TwelveData (parallel)
requestStructuredReport() --> OpenAI gpt-4.1 + web_search
    |
    v
parseStructuredReport() --> normalizeAutoFillResponse()
    |
    v
withLivePrice() --> Override AI price with live TwelveData
    |
    v
GoldAutoFillResponse { date, goldCurrentPrice, sections[9], fullSummary }
    |
    v
Client renders 9 AutoSectionCards
    |
    v
addDailyGoldResearchReport() --> Supabase daily_gold_research_reports
```

## 2.4 Current UI

The `GoldResearchDesk.tsx` component (1984 lines) renders:

1. **GoldTerminalHeader** - Price, bias, driver stack, checklist, sync status
2. **ResearchEngineStatus** - 4 status cards (Market Data, AI Analysis, Chart Confirmation, Execution Readiness)
3. **AI Research Layer** - Auto-fill button, 9 AutoSectionCards, full summary panel
4. **Macro Driver Heatmap** - 5x2 grid of driver impact cards
5. **Gold Trade Setup Assistant** - Decision matrix, inputs, market data, TradingView chart
6. **Manual Driver Lab** - Driver selector, driver-specific form, analysis panel
7. **Gold Pre-Trade Checklist** - 10-item checklist with scoring
8. **Gold Trading Windows** - 6 session windows in SAST
9. **Research Exports** - PDF/CSV export buttons

All sections are hardcoded. The 9 auto-fill sections are rendered by mapping over a fixed array. The manual driver forms are defined in `DRIVER_FORM_CONFIG` (a Record keyed by the 9 hardcoded driver names).

## 2.5 Current Database

**Tables:**
- `gold_research_reports` - Manual driver analyses (one row per driver analysis)
- `daily_gold_research_reports` - Auto-fill reports (one row per date, sections stored as JSONB)
- `gold_trade_setups` - Generated trade setups

**Key Schema Properties:**
- All tables have `user_id` foreign key with RLS policies
- `daily_gold_research_reports.sections_json` stores exactly 9 sections as JSONB
- `daily_gold_research_reports.full_summary_json` stores the aggregated summary
- No category scores, no Decision Engine scores, no institutional flow data

## 2.6 Current APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/gold-research/auto-fill` | POST | AI-generated 9-section research report |
| `/api/gold-research/generate-setup` | POST | Trade setup generation |
| `/api/analyze-gold-driver` | POST | Individual driver analysis |
| `/api/market-data/xauusd` | GET | TwelveData XAU/USD market data |

All APIs return data conforming to the current type system. The auto-fill route has a hardcoded JSON schema (`GOLD_AUTO_FILL_SCHEMA`) that enforces exactly 9 sections.

## 2.7 Current Type System

**Core Types:**
- `GoldDriverName` - Union of 9 string literals
- `GoldAutoDriverName` - Union of 9 string literals (with "Check" suffix)
- `GoldBias` - 4-value union
- `GoldDriverAnalysis` - 13-field analysis output
- `GoldAutoResearchSection` - 26-field auto-fill section
- `GoldAutoFillResponse` - Complete auto-fill response
- `GoldAutoFullSummary` - Aggregated summary
- `DailyGoldResearchReport` - Database record type

## 2.8 Architectural Bottlenecks

1. **Hardcoded Driver Enumeration:** Every layer references the same 9-string union type. Adding a driver touches types, analyzers, normalization, API schema, database, and UI.
2. **Switch-Statement Analysis:** `analyzeGoldDriver()` uses a switch statement routing to 9 separate analyzer functions. Each analyzer has its own scoring logic and message templates.
3. **Fixed Section Count in AI Schema:** The auto-fill JSON schema enforces `minItems: 9, maxItems: 9` with a fixed `enum` for driver names.
4. **Monolithic Component:** The 1984-line component contains all logic, all sub-components, and all rendering in a single file.
5. **No Abstraction Layer:** There is no config object, no registry, no section schema that could drive rendering or analysis.
6. **No Category Model:** Drivers exist as flat, independent records with no hierarchical grouping.

---

# 3. TARGET ARCHITECTURE

## 3.1 Architecture Evolution

```
CURRENT STATE                          TARGET STATE
================                      ============

Fixed 9 Sections          --->        Unlimited Dynamic Sections
Hardcoded Driver Names    --->        Config-Driven Driver Registry
4-Point Bias Scale        --->        Multi-Dimensional Analysis Model
Equal-Weight Drivers      --->        Weighted Category Scoring
Flat Driver List          --->        Hierarchical Category Structure
Point-in-Time Snapshot    --->        Historical Trending & Momentum
Simple Confidence Score   --->        Structured Confidence with Reasoning
Single "ETF/CB" Driver    --->        Independent Institutional Flow Engine
No Technical Integration  --->        Multi-Timeframe Technical Bias Engine
Qualitative Summary       --->        Quantitative Decision Engine (0-100)
Monolithic UI             --->        Config-Driven Component Architecture
```

## 3.2 Engine Composition

The upgraded Gold Research Engine consists of six interconnected engines:

```
+---------------------+
|   DRIVER REGISTRY   |  <-- Configuration definitions
+---------------------+
           |
           v
+---------------------+
|  DRIVER ANALYSIS    |  <-- Per-driver multi-dimensional analysis
|      ENGINE         |
+---------------------+
           |
           v
+---------------------+     +---------------------+
| CATEGORY SCORE      | <-- | INSTITUTIONAL FLOW  |
| ENGINE              |     | ENGINE              |
+---------------------+     +---------------------+
           |                           |
           v                           v
+---------------------+     +---------------------+
| TECHNICAL BIAS      | <-- | GOLD DECISION       |
| ENGINE              |     | ENGINE              |
+---------------------+     +---------------------+
                                      |
                                      v
                            +---------------------+
                            |   DASHBOARD &       |
                            |   REPORTS           |
                            +---------------------+
```

## 3.3 Layer Architecture

**Configuration Layer:** Driver Registry, Category Definitions, Weight Configuration
**Analysis Layer:** Driver Analysis Engine, Institutional Flow Engine, Technical Bias Engine
**Aggregation Layer:** Category Score Engine, Gold Decision Engine
**Storage Layer:** Database tables, JSONB columns, historical records
**Presentation Layer:** Config-driven UI components, dashboards, reports

## 3.4 Backward Compatibility Principle

Every new capability is added through:
- New optional fields on existing types (never removing fields)
- New database columns or tables (never altering existing columns)
- New API endpoints or optional response fields (never breaking existing responses)
- New UI components rendered alongside existing components (never replacing)

Existing `GoldAutoResearchSection` with 26 fields continues to function. New fields are appended. Existing `sections_json` with 9 sections continues to render. New sections are appended.

---

# 4. GOLD RESEARCH DRIVER REGISTRY

## 4.1 Purpose

The Driver Registry is the single source of truth for all research drivers. It replaces the hardcoded `GoldDriverName` union type and the `GOLD_DRIVER_NAMES` constant array. Every driver that the system can analyze, render, or store must be defined in the registry.

## 4.2 Registry Structure

Each driver entry contains the following properties:

### Core Identity

- **id** - Unique string identifier (e.g., `"dxy-us-dollar"`, `"cot-positioning"`). Stable across versions. Used in database storage, API payloads, and component keys.
- **title** - Display name (e.g., `"DXY / US Dollar"`, `"COT Positioning"`). Rendered in UI headers and reports.
- **shortTitle** - Abbreviated name for compact displays (e.g., `"DXY"`, `"COT"`). Used in heatmaps and score breakdowns.

### Classification

- **category** - The category this driver belongs to. Must reference a valid `CategoryId` from the Category Registry. Multiple drivers can share a category. Examples: `"inflation"`, `"institutional"`, `"technical"`.
- **order** - Numeric sort order within its category. Controls display sequence. Lower numbers render first.

### Data Source

- **source** - The primary data provider or source type. Examples: `"twelvedata"`, `"fred"`, `"world-gold-council"`, `"cftc"`, `"ai-analysis"`. Used for data provenance tracking and source-specific fetching logic.
- **sourceUrl** - Template URL for the primary data source. Used for source-link generation and verification.

### Configuration Flags

- **enabled** - Boolean. Whether this driver is active in the current system configuration. Disabled drivers are excluded from auto-fill, scoring, and UI rendering but remain in the registry for historical reference.
- **weight** - Numeric weight (0.0 to 1.0). Used by the Category Score Engine and Decision Engine to weight this driver's contribution. Weights are configurable and NOT hardcoded.
- **defaultWeight** - The initial weight assigned when the driver is first registered. Serves as the fallback if no custom weight override exists.

### Capability Flags

- **supportsTrend** - Boolean. Whether this driver tracks directional trend (Rising/Falling/Stable/Accelerating/Decelerating).
- **supportsHistory** - Boolean. Whether this driver stores historical snapshots for comparison (Current/Previous/Weekly/Monthly).
- **supportsEconomicSurprise** - Boolean. Whether this driver compares actual data against consensus expectations.
- **supportsInstitutionalFlow** - Boolean. Whether this driver is part of the Institutional Flow Engine and consumes flow/positioning data.
- **supportsTechnicalBias** - Boolean. Whether this driver integrates with the Technical Bias Engine and consumes multi-timeframe technical data.

### Display Configuration

- **icon** - Icon identifier for UI rendering. References a registered icon component.
- **color** - Hex color code for accent rendering in cards, badges, and charts.
- **description** - Short description rendered in driver selection and help tooltips.
- **detailPlaceholder** - Placeholder text for the driver's detail input field.

## 4.3 Default Driver Registry

The registry ships with the following default drivers, organized by category:

**Macro Category:**
1. `dxy-us-dollar` - DXY / US Dollar
2. `us-yields` - US Yields
3. `real-yields` - Real Yields
4. `fed-tone-fomc` - Fed Tone / FOMC
5. `economic-growth` - Economic Growth (GDP, PMI)

**Inflation Category:**
6. `cpi-pce` - CPI / PCE Inflation

**Employment Category:**
7. `nfp-jobs` - NFP / Jobs

**Institutional Category:**
8. `etf-flows` - Gold ETF Flows
9. `central-bank-demand` - Central Bank Demand
10. `cot-positioning` - COT Positioning
11. `open-interest` - Open Interest

**Sentiment Category:**
12. `market-sentiment` - Market Sentiment / Risk Appetite
13. `crowd-positioning` - Crowd Positioning

**Geopolitics Category:**
14. `geopolitics` - Geopolitical Risk

**Technical Category:**
15. `gold-technical-structure` - Gold Technical Structure

**Liquidity Category:**
16. `seasonality` - Seasonality Patterns
17. `liquidity-conditions` - Liquidity Conditions

**Risk Category:**
18. `position-risk` - Position Risk Assessment

**Custom Category:**
19. `custom-news` - Custom News / Manual Entry

## 4.4 Registry Extensibility

New drivers are added by appending a new entry to the registry configuration. No code changes are required in analysis engines, scoring engines, UI components, or API schemas. The system renders and processes any driver present in the registry.

The registry is stored as a configuration object. Future versions may externalize this to a database table or configuration file, enabling runtime driver management without deployment.

---

# 5. DRIVER ANALYSIS MODEL

## 5.1 Purpose

Every driver analysis produces a structured object conforming to a universal analysis schema. This replaces the current `GoldDriverAnalysis` type (13 fields) with a comprehensive multi-dimensional analysis object.

## 5.2 Universal Driver Analysis Object

Each driver analysis contains the following fields:

### Identity

- **driverId** - Reference to the Driver Registry id. Links analysis to its configuration.
- **driverTitle** - Display name. Denormalized for rendering convenience.
- **categoryId** - Reference to the driver's category.

### Bias

- **bias** - The directional bias for this driver. Values: `"Strong Bullish"`, `"Bullish"`, `"Neutral"`, `"Bearish"`, `"Strong Bearish"`. Five-point scale replacing the current four-point scale.
- **biasReason** - Structured explanation of why this bias was assigned. Must reference specific signals, data points, or observations.

### Strength

- **strength** - How strongly this driver supports its bias. Values: `"Strong"`, `"Moderate"`, `"Weak"`, `"None"`. Strong indicates multiple converging signals with high confidence. None indicates insufficient data.
- **strengthFactors** - Array of contributing factors. Each factor is a short string describing a specific signal or observation that contributed to the strength assessment.

### Confidence

- **confidence** - Numeric score from 0 to 100. Represents the analytical certainty of this driver's assessment.
- **confidenceReason** - Structured explanation of confidence calibration. Must reference data quality, source reliability, recency, and signal clarity.

Confidence tiers:
- 90-100: Verified data from official sources, clear directional signals, no conflicts
- 75-89: Reliable data, mostly clear signals, minor uncertainties
- 60-74: Adequate data, some ambiguity, signals partially conflicting
- 40-59: Limited data, significant uncertainty, signals mixed
- 0-39: Unverified or stale data, unclear direction, high uncertainty

### Trend

- **trend** - Directional momentum of this driver. Values: `"Rising"`, `"Falling"`, `"Stable"`, `"Accelerating"`, `"Decelerating"`. Only present when the driver's registry entry has `supportsTrend: true`.
- **trendMagnitude** - Qualitative magnitude of the trend: `"Significant"`, `"Moderate"`, `"Minimal"`.

### Historical Context

- **history** - Historical comparison object. Only present when `supportsHistory: true`.
  - **current** - Current period value or assessment.
  - **previous** - Previous period (e.g., last month) value or assessment.
  - **weekly** - Week-over-week change direction.
  - **monthly** - Month-over-month change direction.
  - **historicalNote** - Brief context about historical significance.

### Economic Surprise

- **economicSurprise** - How actual data compares to consensus expectations. Values: `"Above Consensus"`, `"At Consensus"`, `"Below Consensus"`, `"N/A"`. Only present when `supportsEconomicSurprise: true`.
- **surpriseMagnitude** - Magnitude of the surprise: `"Major"`, `"Minor"`, `"Negligible"`.
- **consensusValue** - The consensus or expected value (string).
- **actualValue** - The actual reported value (string).

### Technical Observation

- **technicalObservation** - Free-text description of what the chart or technical data shows for this driver's asset or indicator.
- **technicalLevels** - Optional structured object containing key price levels, support, resistance, or threshold values relevant to this driver.

### Signal Analysis

- **supportingDrivers** - Array of driver ids that support or confirm this driver's bias. Used by the Decision Engine to identify convergent signals.
- **conflictingDrivers** - Array of driver ids that conflict with this driver's bias. Used by the Decision Engine to identify divergent signals.

### Narrative

- **reason** - Concise one-to-two sentence reason for the assigned bias. Used in heatmap cards and summary views.
- **aiExplanation** - Detailed AI-generated explanation of the analysis. Must reference specific data points, events, or observations. Must explain the causal chain from raw data to bias conclusion. This is the primary explainability field.

### Provenance

- **source** - Data source identifier (e.g., `"TwelveData"`, `"FRED"`, `"CFTC"`, `"World Gold Council"`, `"Reuters"`).
- **sourceUrl** - Direct URL to the primary data source or article.
- **sourceDate** - Publication or data date of the primary source.
- **timestamp** - ISO 8601 timestamp of when this analysis was generated.

### Weight and Contribution

- **weight** - The driver's weight within its category, as defined by the Driver Registry and potentially overridden by user configuration.
- **contribution** - Calculated contribution score. Derived from: `bias_numeric * strength_numeric * weight * (confidence / 100)`. This value is used by the Category Score Engine for aggregation.

### Data Fields

- **dataFields** - Key-value pair object containing driver-specific raw data fields (e.g., `dxyDirection: "Falling"`, `tenYearYield: "4.47%"`). Preserves the raw inputs for audit and historical reference.

## 5.3 Bias Numeric Mapping

For calculation purposes, bias values map to numeric scores:

| Bias | Numeric Value |
|------|---------------|
| Strong Bullish | +2.0 |
| Bullish | +1.0 |
| Neutral | 0.0 |
| Bearish | -1.0 |
| Strong Bearish | -2.0 |

## 5.4 Strength Numeric Mapping

| Strength | Numeric Multiplier |
|----------|-------------------|
| Strong | 1.0 |
| Moderate | 0.75 |
| Weak | 0.5 |
| None | 0.0 |

---

# 6. RESEARCH SECTION SCHEMA

## 6.1 Purpose

The Research Section Schema defines a universal rendering contract. Every research section (driver analysis card) in the UI renders from this schema. Future sections are added by defining new registry entries and populating the schema; no UI component modification is required.

## 6.2 Universal Section Schema

Every research section card renders the following structural elements:

### Header Block

- **Title** - Driver title from registry
- **Badge** - Bias badge (color-coded by bias value)
- **Strength Indicator** - Visual strength indicator (Strong/Moderate/Weak/None)
- **Confidence Badge** - Numeric confidence with color tier
- **Expand/Collapse Toggle** - Controls detail panel visibility

### Summary Block

- **Reason** - Concise bias reason (always visible)
- **Trend Arrow** - Directional trend indicator (if applicable)
- **Historical Comparison** - Current vs. previous period (if applicable)

### Detail Block (Expandable)

- **AI Explanation** - Full analysis explanation
- **Supporting Drivers** - Linked list of confirming drivers
- **Conflicting Drivers** - Linked list of conflicting drivers
- **Data Fields** - Raw data inputs in key-value format
- **Source** - Source name, link, and date
- **Timestamp** - Analysis generation time

### Scoring Block

- **Weight** - Driver's weight within category
- **Contribution** - Calculated contribution score
- **Bias Numeric** - Numeric bias value for charting

### Category Block

- **Category Name** - The category this driver belongs to
- **Category Score** - The category's aggregated score (from Category Engine)

## 6.3 Section Addition Protocol

To add a new research section:

1. Add entry to Driver Registry with appropriate configuration flags
2. Implement or configure the data source adapter
3. Implement or configure the analysis logic (manual input, AI-assisted, or API-fed)
4. The UI automatically renders the new section using the universal schema
5. The Category Score Engine automatically includes the new driver in its category
6. The Decision Engine automatically factors the new driver into scoring

No changes required in: UI components, rendering logic, database schema (new sections stored in JSONB), or API response structure (new fields are optional).

---

# 7. CATEGORY SCORE ENGINE

## 7.1 Purpose

The Category Score Engine aggregates individual driver analyses into category-level scores. Each category groups related drivers and produces a weighted composite score with traceable reasoning.

## 7.2 Category Definitions

### Technical Category

- **id:** `technical`
- **title:** Technical Analysis
- **Description:** Multi-timeframe price structure, trend, and setup analysis.
- **Drivers:** `gold-technical-structure`
- **Default Weight:** 0.20 (20% of Final Gold Score)

**Inputs:** Technical Bias Engine output, support/resistance levels, market structure, trend alignment, setup presence.

**Calculation:** Weighted average of technical driver contributions. Technical Bias Engine output serves as primary input. Market structure quality (Bullish/Bearish/Ranging) adjusts the score. Setup presence (Buy/Sell/None) provides directional confirmation.

**Output:** Technical Score (0-100). 50 = Neutral. Above 50 = Bullish technical backdrop. Below 50 = Bearish technical backdrop.

**Confidence:** Derived from the number of timeframes analyzed, data freshness, and signal consistency across timeframes.

**Reason:** Structured text explaining the technical assessment. Must reference specific structure, levels, and timeframe alignment.

**Timestamp:** Analysis generation time.

### Inflation Category

- **id:** `inflation`
- **title:** Inflation
- **Description:** CPI, PCE, and inflation expectation analysis.
- **Drivers:** `cpi-pce`
- **Default Weight:** 0.15 (15% of Final Gold Score)

**Inputs:** Latest CPI/PCE data, inflation expectations, actual vs. forecast vs. previous, economic surprise.

**Calculation:** Softer-than-expected inflation increases score. Hotter-than-expected decreases score. In-line maintains current level. Economic surprise magnitude amplifies or dampens the effect.

**Output:** Inflation Score (0-100). Above 50 = Gold-supportive (disinflationary). Below 50 = Gold-negative (inflationary/hawkish response expected).

**Confidence:** Tier 1 when official BLS/BEA data is within 7 days. Tier 2 when within 14 days. Degrades with staleness.

**Reason:** Must reference specific data print, surprise direction, and expected policy implication.

**Timestamp:** Data release date and analysis generation time.

### Employment Category

- **id:** `employment`
- **title:** Employment
- **Description:** NFP, unemployment, wages, and labor market analysis.
- **Drivers:** `nfp-jobs`
- **Default Weight:** 0.10 (10% of Final Gold Score)

**Inputs:** NFP print, unemployment rate, wage growth, labor force participation, initial jobless claims.

**Calculation:** Weak jobs data increases score (supports rate cuts, risk fear). Strong jobs data decreases score (supports USD/yields). Mixed signals (strong jobs + weak wages) trigger conflict adjustment.

**Output:** Employment Score (0-100). Above 50 = Labor market weakening supports Gold. Below 50 = Labor market strength pressures Gold.

**Confidence:** Tier 1 for official BLS release day. Degrades over following weeks until next release.

**Reason:** Must reference specific NFP figure, unemployment rate, wage growth, and deviation from consensus.

**Timestamp:** Release date and analysis generation time.

### Growth Category

- **id:** `growth`
- **title:** Economic Growth
- **Description:** GDP, PMI, ISM, and broader economic activity analysis.
- **Drivers:** `economic-growth`
- **Default Weight:** 0.10 (10% of Final Gold Score)

**Inputs:** GDP growth rate, manufacturing/services PMI, ISM data, retail sales, industrial production.

**Calculation:** Slowing growth increases score (supports rate cuts, safe haven). Accelerating growth decreases score (supports risk-on, USD). Recession signals significantly increase score.

**Output:** Growth Score (0-100). Above 50 = Growth concerns support Gold. Below 50 = Growth strength pressures Gold.

**Confidence:** Tier 1 for official releases within 7 days. Tier 2 for PMI/ISM within 14 days.

**Reason:** Must reference specific data point, trend direction, and recession/probability assessment.

**Timestamp:** Release date and analysis generation time.

### Institutional Category

- **id:** `institutional`
- **title:** Institutional Activity
- **Description:** ETF flows, central bank buying, COT positioning, and institutional flow analysis.
- **Drivers:** `etf-flows`, `central-bank-demand`, `cot-positioning`, `open-interest`
- **Default Weight:** 0.20 (20% of Final Gold Score)

**Inputs:** ETF flow data (weekly/monthly), central bank purchase reports, COT report positioning, open interest changes, institutional strength indicators.

**Calculation:** Weighted combination of all institutional drivers. Inflows + strong buying + commercial positioning bullish = high score. Outflows + selling + crowded longs = low score. Institutional flow direction is the primary determinant.

**Output:** Institutional Score (0-100). Above 50 = Institutional positioning supports Gold. Below 50 = Institutional positioning pressures Gold.

**Confidence:** Tier 1 for CFTC data within 5 days, ETF flows within 3 days. Tier 2 for central bank data within 30 days (data release lag).

**Reason:** Must reference specific flow data, positioning changes, and institutional sentiment.

**Timestamp:** Data period end date and analysis generation time.

### Sentiment Category

- **id:** `sentiment`
- **title:** Market Sentiment
- **Description:** Risk appetite, fear/greed, VIX, and crowd positioning analysis.
- **Drivers:** `market-sentiment`, `crowd-positioning`
- **Default Weight:** 0.10 (10% of Final Gold Score)

**Inputs:** VIX level, put/call ratios, sentiment surveys, social media sentiment, retail positioning, fear/greed index.

**Calculation:** High fear/increased positioning for safety increases score. Extreme greed/de-risking decreases score. Crowd positioning extremes (too many longs or too many shorts) trigger contrarian adjustments.

**Output:** Sentiment Score (0-100). Above 50 = Risk aversion supports Gold safe-haven demand. Below 50 = Risk-on sentiment pressures Gold.

**Confidence:** Tier 1 for VIX/options data within 1 day. Tier 2 for surveys within 7 days. Tier 3 for social sentiment within 3 days.

**Reason:** Must reference specific sentiment indicators, crowd positioning data, and contrarian assessment.

**Timestamp:** Indicator date and analysis generation time.

### Liquidity Category

- **id:** `liquidity`
- **title:** Liquidity Conditions
- **Description:** Market liquidity, central bank balance sheet, and funding conditions.
- **Drivers:** `liquidity-conditions`
- **Default Weight:** 0.05 (5% of Final Gold Score)

**Inputs:** Central bank balance sheet size, reverse repo usage, SOFR rates, Treasury general account balance, global liquidity proxies.

**Calculation:** Expanding liquidity increases score. Tightening liquidity decreases score. Balance sheet expansion/compression trends are primary signals.

**Output:** Liquidity Score (0-100). Above 50 = Expanding liquidity supports Gold. Below 50 = Tightening liquidity pressures Gold.

**Confidence:** Tier 1 for Fed balance sheet data within 7 days. Tier 2 for proxy estimates within 14 days.

**Reason:** Must reference specific liquidity metric, trend direction, and expected impact on Gold.

**Timestamp:** Data date and analysis generation time.

### Geopolitics Category

- **id:** `geopolitics`
- **title:** Geopolitical Risk
- **Description:** Geopolitical events, conflict, sanctions, and safe-haven demand analysis.
- **Drivers:** `geopolitics`
- **Default Weight:** 0.05 (5% of Final Gold Score)

**Inputs:** Geopolitical risk level, event type, DXY reaction to events, safe-haven demand indicators, escalation/de-escalation signals.

**Calculation:** High/extreme risk with stable or falling DXY increases score significantly. High risk with rising DXY creates conflict (mixed). Low risk maintains neutral. Escalation signals amplify score. De-escalation signals reduce score.

**Output:** Geopolitics Score (0-100). Above 50 = Geopolitical risk supports Gold safe-haven bid. Below 50 = Geopolitical conditions do not support Gold or DXY strength overrides.

**Confidence:** Tier 1 for confirmed major events. Tier 2 for developing situations. Degrades with information uncertainty.

**Reason:** Must reference specific event, risk level assessment, DXY reaction, and safe-haven demand evaluation.

**Timestamp:** Event time and analysis generation time.

### Macro Category

- **id:** `macro`
- **title:** Macro Environment
- **Description:** DXY, yields, real yields, Fed policy, and broader macroeconomic environment.
- **Drivers:** `dxy-us-dollar`, `us-yields`, `real-yields`, `fed-tone-fomc`
- **Default Weight:** 0.05 (5% of Final Gold Score)

**Inputs:** DXY direction and level, 10Y/2Y yield levels and direction, real yield levels, Fed tone and rate expectations, dot plot projections.

**Calculation:** Falling DXY + falling yields + dovish Fed = high score. Rising DXY + rising yields + hawkish Fed = low score. Conflicting signals reduce confidence and produce mixed score near 50.

**Output:** Macro Score (0-100). Above 50 = Macro environment supports Gold. Below 50 = Macro environment pressures Gold.

**Confidence:** Tier 1 for FOMC day. Tier 2 for regular trading days with fresh data. Degrades with staleness.

**Reason:** Must reference specific DXY level/direction, yield levels/direction, Fed tone, and rate expectation.

**Timestamp:** Data date and analysis generation time.

### Seasonality Category

- **id:** `seasonality`
- **title:** Seasonality
- **Description:** Historical seasonal patterns for Gold.
- **Drivers:** `seasonality`, `position-risk`
- **Default Weight:** 0.05 (5% of Final Gold Score)

**Inputs:** Current month's historical Gold performance, seasonal pattern strength, position risk from crowded trades.

**Calculation:** Historical seasonal tendency for the current month adjusts the base score. Strong seasonal patterns amplify the adjustment. Position risk from crowded positioning moderates the adjustment.

**Output:** Seasonality Score (0-100). Above 50 = Seasonal pattern supports Gold. Below 50 = Seasonal pattern does not support Gold.

**Confidence:** Tier 1 for well-established seasonal patterns (10+ years of data). Tier 2 for moderate patterns (5-10 years).

**Reason:** Must reference specific seasonal pattern, historical timeframe, and current positioning context.

**Timestamp:** Analysis generation time.

## 7.3 Category Score Aggregation

Each category score is calculated as follows:

1. Collect all driver analyses belonging to the category
2. For each driver, calculate: `contribution = bias_numeric * strength_numeric * weight * (confidence / 100)`
3. Sum all contributions within the category
4. Normalize to 0-100 scale where 50 = Neutral
5. Apply confidence penalty if any driver has confidence below 50

## 7.4 Category Score Object

Each category score contains:

- **categoryId** - Reference to category definition
- **categoryTitle** - Display name
- **score** - Numeric score (0-100)
- **bias** - Derived bias from score (>60 = Bullish, <40 = Bearish, else Neutral)
- **confidence** - Weighted average confidence of contributing drivers
- **driverCount** - Number of drivers contributing to this category
- **reason** - Structured explanation referencing key drivers
- **drivers** - Array of contributing driver analysis references
- **timestamp** - Calculation time

---

# 8. INSTITUTIONAL FLOW ENGINE

## 8.1 Purpose

The Institutional Flow Engine analyzes institutional positioning, fund flows, and market participant behavior. It operates as a specialized subsystem that feeds into the Category Score Engine's Institutional category.

## 8.2 Data Components

### ETF Flows

- **Data Source:** World Gold Council, ETF providers, financial data APIs
- **Metric:** Weekly and monthly gold ETF inflows/outflows (tonnage and USD value)
- **Analysis:**
  - Net flow direction (inflows vs. outflows)
  - Flow magnitude relative to historical average
  - Trend acceleration or deceleration
  - Regional breakdown (Western vs. Asian ETFs)
  - Trapped longs assessment (overhead supply from underwater positions)

### Central Bank Activity

- **Data Source:** World Gold Council, central bank reports, IMF IFS data
- **Metric:** Monthly/quarterly central bank gold purchases and sales
- **Analysis:**
  - Net buying/selling volume
  - Buying concentration (which central banks)
  - Strategic vs. tactical buying assessment
  - Reserve diversification trend
  - Annual run rate vs. historical average

### COT Positioning (Commitments of Traders)

- **Data Source:** CFTC weekly COT report
- **Metric:** Net positioning of Commercials, Large Speculators, and Leveraged Funds
- **Analysis:**
  - Commercial net position (hedgers)
  - Large Speculator net position (trend followers)
  - Leveraged Fund net position (speculative)
  - Position change week-over-week
  - Extreme positioning detection (historical percentile)
  - Crowded trade assessment

### Open Interest

- **Data Source:** COMEX/CME, futures exchange data
- **Metric:** Total open interest, change in open interest, price-OI divergence
- **Analysis:**
  - Open interest trend (increasing/decreasing/stable)
  - Price-OI relationship (confirming/diverging)
  - New position creation vs. position closing
  - Contract expiry and roll activity impact

### Crowd Positioning

- **Data Source:** Retail broker data, sentiment surveys, social sentiment
- **Metric:** Retail long/short ratios, sentiment indicators
- **Analysis:**
  - Retail crowd positioning direction
  - Extreme crowd readings (contrarian signal)
  - Crowd vs. institutional divergence
  - Sentiment momentum

## 8.3 Data Flow

```
Raw Data Sources (ETF, CFTC, CME, WGC, etc.)
    |
    v
Data Fetcher (API calls, scheduled updates)
    |
    v
Normalizer (standardize formats, units, timeframes)
    |
    v
Institutional Analysis
    |
    +---> ETF Analysis
    +---> Central Bank Analysis
    +---> COT Analysis
    +---> Open Interest Analysis
    +---> Crowd Analysis
    |
    v
Institutional Flow Score (aggregated)
    |
    v
Contributes to Institutional Category Score
    |
    v
Contributes to Final Gold Score
```

## 8.4 Institutional Flow Score

The engine produces a composite Institutional Flow Score:

- **etfFlowBias** - Directional bias from ETF flow analysis
- **centralBankBias** - Directional bias from central bank analysis
- **cotBias** - Directional bias from COT positioning analysis
- **openInterestBias** - Directional bias from open interest analysis
- **crowdBias** - Directional bias from crowd positioning analysis
- **institutionalStrength** - Aggregate strength of institutional signals
- **institutionalBias** - Overall institutional directional bias
- **crowdedTradeRisk** - Assessment of crowded trade risk
- **reason** - Structured explanation referencing key institutional signals

---

# 9. TECHNICAL BIAS ENGINE

## 9.1 Purpose

The Technical Bias Engine synthesizes multi-timeframe technical analysis into a structured technical bias assessment. It operates as a specialized subsystem that feeds into the Category Score Engine's Technical category.

## 9.2 Analysis Components

### HTF Trend (Higher Timeframe)

- **Timeframes:** Monthly, Weekly
- **Analysis:**
  - Primary trend direction (Bullish/Bearish/Neutral)
  - Trend strength (Strong/Moderate/Weak)
  - Key structural levels (Major support/resistance)
  - Trend maturity (Early/Mature/Extended)

### Daily Trend

- **Timeframe:** Daily
- **Analysis:**
  - Daily trend direction
  - Daily structure (Higher Highs/Higher Lows or Lower Highs/Lower Lows)
  - Daily key levels
  - Daily momentum assessment

### 4H Trend

- **Timeframe:** 4-Hour
- **Analysis:**
  - 4H trend direction
  - 4H structure
  - 4H key levels
  - 4H setup identification

### Market Structure

- **Components:**
  - **BOS (Break of Structure):** Direction and confirmation level
  - **CHOCH (Change of Character):** Direction and confirmation level
  - **Structure Type:** Bullish (HH/HL) / Bearish (LH/LL) / Ranging
  - **Structure Strength:** Strong/Moderate/Weak

### Liquidity Analysis

- **Components:**
  - **Buy-Side Liquidity:** Level, reason, swept status
  - **Sell-Side Liquidity:** Level, reason, swept status
  - **Liquidity Pools:** Identified resting orders
  - **Liquidity Sweep Status:** Recent sweeps and their implications

### Order Flow

- **Components:**
  - **FVG (Fair Value Gaps):** Location, direction, status (filled/unfilled)
  - **Order Blocks:** Location, direction, strength
  - **Premium/Discount:** Current price zone assessment

### Technical Confidence

- **Calculation:** Based on:
  - Number of timeframes analyzed (more = higher confidence)
  - Signal alignment across timeframes (alignment = higher confidence)
  - Data freshness (recent = higher confidence)
  - Setup clarity (clear setup = higher confidence)

## 9.3 Technical Bias Output

The engine produces:

- **technicalBias** - Overall technical directional bias (Strong Bullish/Bullish/Neutral/Bearish/Strong Bearish)
- **technicalConfidence** - Confidence score (0-100)
- **htfTrend** - Higher timeframe trend assessment
- **dailyTrend** - Daily trend assessment
- **fourHTrend** - 4H trend assessment
- **marketStructure** - Structure assessment
- **liquidityAssessment** - Liquidity analysis
- **orderFlowAssessment** - Order flow analysis
- **setupPresent** - Whether a trade setup is identified
- **setupType** - Type of setup (if present)
- **supportLevels** - Array of key support levels
- **resistanceLevels** - Array of key resistance levels
- **reason** - Structured explanation referencing key technical factors
- **timestamp** - Analysis generation time

---

# 10. GOLD DECISION ENGINE

## 10.1 Purpose

The Gold Decision Engine produces the final, weighted composite score and trade decision. It aggregates outputs from all Category Scores, the Technical Bias Engine, and the Institutional Flow Engine into a single structured decision object.

## 10.2 Input Sources

- Category Scores (9 categories, each with score, confidence, reason)
- Technical Bias Engine output
- Institutional Flow Engine output
- Driver Weight Configuration
- User-defined risk parameters (optional)

## 10.3 Scoring Model

### Macro Score

- **Source:** Aggregated Macro Category Score
- **Calculation:** Weighted average of Macro category drivers (DXY, Yields, Real Yields, Fed Tone)
- **Range:** 0-100
- **Interpretation:** Above 50 = Macro environment supports Gold. Below 50 = Macro environment pressures Gold.

### Technical Score

- **Source:** Technical Bias Engine output and Technical Category Score
- **Calculation:** Combination of technical bias numeric value and category score, weighted by technical confidence
- **Range:** 0-100
- **Interpretation:** Above 50 = Technical structure supports Gold. Below 50 = Technical structure pressures Gold.

### Institutional Score

- **Source:** Institutional Flow Engine output and Institutional Category Score
- **Calculation:** Combination of institutional flow bias and category score, weighted by institutional confidence
- **Range:** 0-100
- **Interpretation:** Above 50 = Institutional positioning supports Gold. Below 50 = Institutional positioning pressures Gold.

### Sentiment Score

- **Source:** Sentiment Category Score
- **Calculation:** Weighted average of sentiment drivers (Market Sentiment, Crowd Positioning)
- **Range:** 0-100
- **Interpretation:** Above 50 = Risk aversion supports Gold. Below 50 = Risk-on pressures Gold.

### Risk Score

- **Source:** Risk-related category scores (Liquidity, Geopolitics, Seasonality, Position Risk)
- **Calculation:** Weighted combination where:
  - Geopolitical risk above threshold increases risk score (supports Gold)
  - Liquidity tightening increases risk score (supports Gold)
  - Position risk from crowded trades adjusts risk score
- **Range:** 0-100
- **Interpretation:** Above 50 = Risk conditions support Gold. Below 50 = Risk conditions do not support Gold.

### Final Gold Score

- **Source:** Weighted average of all component scores
- **Calculation:**
  ```
  Final Gold Score = (Macro Score * Macro Weight) +
                    (Technical Score * Technical Weight) +
                    (Institutional Score * Institutional Weight) +
                    (Sentiment Score * Sentiment Weight) +
                    (Risk Score * Risk Weight)
  ```
- **Range:** 0-100
- **Interpretation:**
  - 75-100: Strong Bullish - High confidence buy signal
  - 60-74: Bullish - Buy signal with moderate confidence
  - 45-59: Neutral - No clear signal, wait for confirmation
  - 25-44: Bearish - Sell signal with moderate confidence
  - 0-24: Strong Bearish - High confidence sell signal

## 10.4 Decision Logic

### Overall Bias Derivation

| Final Gold Score | Overall Bias |
|-----------------|--------------|
| 75-100 | Strong Bullish |
| 60-74 | Bullish |
| 45-59 | Neutral |
| 25-44 | Bearish |
| 0-24 | Strong Bearish |

### Decision Output

| Overall Bias + Conditions | Decision |
|--------------------------|----------|
| Strong Bullish + Technical Confirmation + No Major News Risk | Buy |
| Bullish + Technical Confirmation + No Major News Risk | Buy |
| Strong Bearish + Technical Confirmation + No Major News Risk | Sell |
| Bearish + Technical Confirmation + No Major News Risk | Sell |
| Any Bias + Major News Risk Detected | Wait |
| Any Bias + No Technical Confirmation | Wait |
| Neutral + Mixed Signals | Wait |
| Any Bias + Confidence Below 50 | Wait |

### Supporting and Conflicting Drivers

The Decision Engine identifies:
- **supportingDrivers** - All drivers whose bias aligns with the Final Gold Score direction
- **conflictingDrivers** - All drivers whose bias conflicts with the Final Gold Score direction
- **driverAlignment** - Percentage of drivers aligned with the final decision
- **alignmentStrength** - Assessment of alignment quality (Strong/Moderate/Weak)

## 10.5 Decision Object Structure

- **macroScore** - Macro Score (0-100)
- **technicalScore** - Technical Score (0-100)
- **institutionalScore** - Institutional Score (0-100)
- **sentimentScore** - Sentiment Score (0-100)
- **riskScore** - Risk Score (0-100)
- **finalGoldScore** - Final Gold Score (0-100)
- **overallBias** - Derived overall bias
- **confidence** - Weighted average confidence across all categories
- **decision** - Trade decision (Buy/Sell/Wait)
- **supportingDrivers** - Array of supporting driver references
- **conflictingDrivers** - Array of conflicting driver references
- **driverAlignment** - Alignment percentage
- **alignmentStrength** - Alignment quality assessment
- **reasoningSummary** - Human-readable summary of the decision rationale
- **riskWarnings** - Array of identified risk warnings
- **timestamp** - Decision generation time
- **reportId** - Reference to the research report that produced this decision

## 10.6 Transparency Requirement

Every component score must be traceable to its contributing drivers, weights, and calculations. The Decision Engine must never produce a score without a corresponding reason. The reasoningSummary must explain the key factors that drove the decision, the main conflict points (if any), and the confidence assessment.

---

# 11. DRIVER WEIGHT SYSTEM

## 11.1 Purpose

The Driver Weight System provides configurable, non-hardcoded weights for all drivers and categories. Weights determine each driver's and category's contribution to the final scoring.

## 11.2 Weight Hierarchy

**Level 1: Category Weights** - Weight of each category within the Final Gold Score.
**Level 2: Driver Weights** - Weight of each driver within its category.

## 11.3 Default Category Weights

| Category | Default Weight |
|----------|---------------|
| Technical | 0.20 |
| Inflation | 0.15 |
| Employment | 0.10 |
| Growth | 0.10 |
| Institutional | 0.20 |
| Sentiment | 0.10 |
| Liquidity | 0.05 |
| Geopolitics | 0.05 |
| Macro | 0.05 |
| Seasonality | 0.05 |

Total: 1.00 (100%)

## 11.4 Default Driver Weights

Within each category, drivers are weighted equally by default. The Category Score Engine distributes the category weight across its drivers.

**Example (Institutional Category - 0.20 total):**
| Driver | Default Intra-Category Weight |
|--------|-------------------------------|
| ETF Flows | 0.25 |
| Central Bank Demand | 0.25 |
| COT Positioning | 0.25 |
| Open Interest | 0.25 |

## 11.5 Override Rules

- Weights can be overridden at the user level (stored in user preferences)
- Weights can be overridden at the system level (stored in configuration)
- User overrides take precedence over system defaults
- System defaults take precedence if no override exists
- Weights must sum to 1.0 within their scope (category weights sum to 1.0; driver weights within a category sum to 1.0)

## 11.6 Future Expansion

- UI for weight adjustment (slider or input fields per category/driver)
- Preset weight profiles (e.g., "Macro Focus", "Technical Focus", "Institutional Focus")
- Dynamic weight adjustment based on data freshness (higher weight for drivers with fresh data)
- Historical weight tracking (how weights have changed over time)

## 11.7 Configuration Strategy

Weights are stored as a configuration object with the following structure:

```
CategoryWeightConfig:
  categoryId: string
  weight: number (0.0-1.0)
  driverWeights:
    driverId: string
    weight: number (0.0-1.0)
```

The configuration is loaded at application initialization and can be refreshed without restarting the application.

---

# 12. DATA FLOW

## 12.1 Complete Data Pipeline

```
LIVE DATA SOURCES
=================
TwelveData (Price, Market Data)
FRED (Yields, Inflation, Employment, GDP)
CFTC (COT Report)
World Gold Council (ETF Flows, Central Bank)
Exchange Data (Open Interest)
News APIs (Headlines, Events)
    |
    v
DATA NORMALIZATION LAYER
========================
- Standardize formats, units, timeframes
- Validate data freshness
- Deduplicate and reconcile
- Assign confidence tiers
    |
    v
DRIVER ANALYSIS ENGINE
======================
- Per-driver multi-dimensional analysis
- Manual input processing
- AI-assisted analysis (where applicable)
- Produces Driver Analysis Objects
    |
    v
CATEGORY SCORE ENGINE
=====================
- Aggregate drivers into category scores
- Apply driver weights
- Calculate category confidence
- Produce Category Score Objects
    |
    v
SPECIALIZED ENGINES
===================
- Institutional Flow Engine
- Technical Bias Engine
- Produces specialized analysis objects
    |
    v
GOLD DECISION ENGINE
====================
- Aggregate category scores
- Apply category weights
- Calculate Final Gold Score
- Determine Overall Bias
- Generate Trade Decision
- Produce Decision Object
    |
    v
STORAGE LAYER
=============
- Supabase database
- Historical records
- JSONB columns for flexible data
- RLS policies for security
    |
    v
PRESENTATION LAYER
==================
- Config-driven UI components
- Dashboard visualizations
- Research reports
- Export documents
```

## 12.2 Data Freshness Requirements

| Data Type | Maximum Age | Refresh Trigger |
|-----------|-------------|-----------------|
| Price Data | Real-time (last close) | Every page load |
| ETF Flows | 7 days | Daily |
| COT Data | 5 days | Weekly (Friday) |
| Central Bank | 30 days | Monthly |
| Economic Data | 14 days | Per release |
| News/Events | 7 days | Per auto-fill |

## 12.3 Error Handling in Data Flow

- If a data source is unavailable, the corresponding driver receives confidence = 0 and strength = None
- If data is stale beyond maximum age, confidence is penalized proportionally
- If multiple sources conflict, the system flags the conflict and reduces confidence
- Data flow failures are logged but do not prevent other drivers from being analyzed
- The system gracefully degrades: missing data for one driver does not block the entire engine

---

# 13. DATABASE DESIGN

## 13.1 New Tables

### gold_driver_analyses

Purpose: Store individual driver analysis records with the expanded analysis model.

Key columns:
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `report_date` (date)
- `driver_id` (text, references driver registry id)
- `category_id` (text, references category id)
- `bias` (text - 5-point scale value)
- `strength` (text - Strong/Moderate/Weak/None)
- `confidence` (integer - 0-100)
- `confidence_reason` (text)
- `trend` (text, nullable - Rising/Falling/Stable/Accelerating/Decelerating)
- `history` (jsonb - current/previous/weekly/monthly)
- `economic_surprise` (text, nullable)
- `technical_observation` (text)
- `supporting_drivers` (jsonb - array of driver ids)
- `conflicting_drivers` (jsonb - array of driver ids)
- `reason` (text)
- `ai_explanation` (text)
- `source` (text)
- `source_url` (text)
- `source_date` (date)
- `weight` (numeric)
- `contribution` (numeric)
- `data_fields` (jsonb)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

Indexes:
- `user_id + report_date` (composite, for date-range queries)
- `user_id + driver_id` (composite, for driver-specific history)
- `user_id + category_id` (composite, for category queries)

### gold_category_scores

Purpose: Store category-level aggregated scores.

Key columns:
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key)
- `report_date` (date)
- `category_id` (text)
- `score` (integer - 0-100)
- `bias` (text)
- `confidence` (integer - 0-100)
- `driver_count` (integer)
- `reason` (text)
- `drivers` (jsonb - array of contributing driver references)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

Indexes:
- `user_id + report_date` (composite)
- `user_id + category_id` (composite)

### gold_decision_engine

Purpose: Store final Decision Engine outputs.

Key columns:
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key)
- `report_date` (date)
- `macro_score` (integer - 0-100)
- `technical_score` (integer - 0-100)
- `institutional_score` (integer - 0-100)
- `sentiment_score` (integer - 0-100)
- `risk_score` (integer - 0-100)
- `final_gold_score` (integer - 0-100)
- `overall_bias` (text)
- `confidence` (integer - 0-100)
- `decision` (text - Buy/Sell/Wait)
- `supporting_drivers` (jsonb - array)
- `conflicting_drivers` (jsonb - array)
- `driver_alignment` (numeric)
- `alignment_strength` (text)
- `reasoning_summary` (text)
- `risk_warnings` (jsonb - array)
- `research_report_id` (uuid, foreign key to daily_gold_research_reports)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

Indexes:
- `user_id + report_date` (composite, unique)
- `user_id + decision` (composite)

### gold_institutional_flow

Purpose: Store institutional flow analysis data.

Key columns:
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key)
- `report_date` (date)
- `etf_flow_bias` (text)
- `etf_flow_magnitude` (text)
- `central_bank_bias` (text)
- `central_bank_volume` (text)
- `cot_commercial_net` (text)
- `cot_speculator_net` (text)
- `open_interest_trend` (text)
- `crowd_bias` (text)
- `institutional_strength` (text)
- `institutional_bias` (text)
- `crowded_trade_risk` (text)
- `reason` (text)
- `data_sources` (jsonb - array of source references)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

Indexes:
- `user_id + report_date` (composite)

## 13.2 Schema Extensions to Existing Tables

### daily_gold_research_reports

New optional columns:
- `decision_engine_id` (uuid, foreign key to gold_decision_engine)
- `category_scores_json` (jsonb - array of category score objects)
- `technical_bias_json` (jsonb - Technical Bias Engine output)
- `institutional_flow_json` (jsonb - Institutional Flow Engine output)
- `driver_analyses_json` (jsonb - array of Driver Analysis Objects)

These columns are nullable. Existing rows without these columns continue to function.

## 13.3 Backward Compatibility

- All new columns are nullable with default null
- Existing `sections_json` (9 sections) continues to render
- Existing `full_summary_json` continues to display
- Migration is additive only
- No existing column is modified or dropped
- Existing RLS policies continue to function

## 13.4 Historical Storage

- Each report date produces one record in each new table
- Historical queries support date-range analysis
- Trend calculations query historical records
- No automatic purging (configurable retention policy in future)

## 13.5 Migration Strategy

1. Create new tables (no impact on existing tables)
2. Add nullable columns to existing tables (no impact on existing data)
3. Backfill historical data from existing `sections_json` where possible
4. Deploy application code that writes to both old and new structures
5. Verify data integrity
6. Switch reads to new structures
7. Old structures remain for backward compatibility

---

# 14. API ARCHITECTURE

## 14.1 API Endpoints

### POST /api/gold-research/auto-fill

**Purpose:** AI-generated gold research report (upgraded from 9 sections to unlimited sections).

**Input:**
- `date` (string, optional) - Report date

**Output:**
- `GoldAutoFillResponse` (extended) with:
  - `sections` - Array of research sections (config-driven count)
  - `categoryScores` - Array of category scores (new)
  - `technicalBias` - Technical Bias Engine output (new)
  - `institutionalFlow` - Institutional Flow Engine output (new)
  - `decisionEngine` - Decision Engine output (new)
  - `fullSummary` - Extended summary object

**Validation:**
- Date format validation
- Rate limiting (per user, per day)
- API key validation

**Error Handling:**
- API key missing → 500 with descriptive error
- Quota/billing issue → 429 with billing guidance
- Web search failure → 502 with retry guidance
- JSON parse error → 502 with retry guidance

**Rate Limiting:**
- Maximum 10 auto-fill requests per user per day
- Minimum 60 seconds between requests

**Caching:**
- No caching for real-time research data
- Response headers indicate no-cache

**Versioning:**
- No version prefix needed (backward compatible extension)

### POST /api/gold-research/decision-engine

**Purpose:** Calculate Decision Engine scores from existing research data.

**Input:**
- `reportDate` (string) - Date of the research report to evaluate
- `weightOverrides` (object, optional) - Custom weight configuration

**Output:**
- `GoldDecisionEngineOutput` with all scores, bias, decision, reasoning

**Validation:**
- Report date must reference existing research data
- Weight overrides validated for sum = 1.0

**Error Handling:**
- No research data for date → 404 with guidance
- Invalid weight overrides → 400 with validation details

### POST /api/gold-research/analyze-driver

**Purpose:** Analyze a single driver with the enhanced analysis model (upgraded from current).

**Input:**
- `driverId` (string) - Driver registry id
- `reportDate` (string)
- `dataFields` (object) - Driver-specific input fields

**Output:**
- `DriverAnalysisObject` (universal schema)

**Validation:**
- Driver ID must exist in registry
- Required fields validated per driver configuration

**Error Handling:**
- Unknown driver ID → 400
- Missing required fields → 400 with field list

### GET /api/gold-research/scores

**Purpose:** Retrieve historical scores for a date range.

**Input:**
- `startDate` (string, query parameter)
- `endDate` (string, query parameter)

**Output:**
- Array of score records (category scores, decision engine outputs)

**Validation:**
- Date range validation
- Maximum 90-day range per request

### GET /api/market-data/xauusd

**Purpose:** Fetch live XAU/USD market data (unchanged).

**No modifications.** TwelveData only constraint preserved.

## 14.2 API Response Extensions

All existing API responses are extended with optional new fields. Clients that do not understand new fields ignore them. No existing field is removed or renamed.

---

# 15. AI ARCHITECTURE

## 15.1 Prompt Flow

```
System Instruction (Gold Research Analyst Role)
    |
    v
User Prompt (date, section requirements, data rules)
    |
    v
AI Analysis Generation
    |
    v
Response Parsing
    |
    v
Normalization & Validation
    |
    v
Live Data Override (prices, verified data)
    |
    v
Output
```

## 15.2 AI Role Definition

The AI operates as a **Gold Research Analyst**, not a data provider. Its responsibilities:

- Analyze news headlines and summarize their impact on Gold
- Identify supporting and conflicting signals within news data
- Explain causal chains from data events to Gold price implications
- Assess confidence based on data quality and signal clarity
- Flag data that cannot be verified

The AI does NOT:
- Fabricate prices (live prices come from TwelveData)
- Invent data points (unverified data must be flagged)
- Make definitive trade calls (final decision comes from the Decision Engine)
- Replace human judgment (AI output is one input among many)

## 15.3 Verification Layer

Before AI output is accepted:

1. **Price Verification:** All price data is cross-checked against TwelveData. AI-provided prices are rejected.
2. **Source Verification:** Source links are validated for format and accessibility. "Not found" sources are flagged.
3. **Freshness Verification:** All news items are checked for publication date. Items older than 7 days are flagged.
4. **Consistency Verification:** AI output is checked for internal consistency (e.g., bullish bias with bearish reasoning is flagged).

## 15.4 Normalization

AI output passes through normalization:

1. **Field Sanitization:** All string fields trimmed, empty strings defaulted
2. **Enum Validation:** Bias, impact, and verdict values validated against allowed values
3. **Confidence Clamping:** Confidence values clamped to 0-100
4. **Section Completeness:** All required fields verified present
5. **Summary Recalculation:** Full summary recalculated from normalized sections (never trust AI summary)

## 15.5 Reasoning Requirements

Every AI analysis must include:

- **Causal Chain:** Explain how the data event leads to the bias conclusion
- **Signal Identification:** List specific bullish and bearish signals detected
- **Conflict Detection:** Identify any conflicting signals within the analysis
- **Confidence Justification:** Explain why confidence is at the assigned level
- **Risk Identification:** Flag risks or uncertainties in the analysis

## 15.6 Conflict Resolution

When AI analysis conflicts with verified data:

1. Verified data takes precedence over AI analysis
2. Conflicts are logged and flagged in the output
3. Confidence is reduced proportionally to the conflict severity
4. The conflict is included in the reasoning summary

## 15.7 Decision Generation

The AI does not generate the final decision. The Decision Engine algorithmically derives the decision from:

- Category scores (derived from driver analyses)
- Technical Bias Engine output
- Institutional Flow Engine output
- Weight configuration

The AI provides analysis and explanation. The Decision Engine provides the decision.

## 15.8 Explainability

Every AI-generated analysis must be explainable:

- The AI explanation must reference specific data points
- The AI explanation must explain the reasoning chain
- The AI explanation must acknowledge uncertainties
- The AI explanation must be comprehensible to a non-technical user

---

# 16. UI ARCHITECTURE

## 16.1 Component Hierarchy

```
GoldResearchDesk (Main Container)
    |
    +-- GoldTerminalHeader (Price, Bias, Status)
    |
    +-- ResearchEngineStatus (Layer Status Cards)
    |
    +-- DecisionDashboard (NEW - Decision Engine Output)
    |       +-- ScoreGauge (Macro, Technical, Institutional, Sentiment, Risk)
    |       +-- FinalScoreGauge
    |       +-- DecisionBadge
    |       +-- DriverAlignmentPanel
    |       +-- RiskWarningsPanel
    |
    +-- CategoryScoreOverview (NEW - Category Scores)
    |       +-- CategoryScoreCard (per category)
    |       +-- CategoryBreakdown (expandable)
    |
    +-- ResearchSectionRenderer (Config-Driven Sections)
    |       +-- DriverAnalysisCard (per driver)
    |           +-- DriverHeader (title, badges)
    |           +-- DriverSummary (reason, trend)
    |           +-- DriverDetails (expandable)
    |           |   +-- AIExplanation
    |           |   +-- SupportingDrivers
    |           |   +-- ConflictingDrivers
    |           |   +-- DataFields
    |           |   +-- SourceInfo
    |           +-- DriverScoring (weight, contribution)
    |
    +-- InstitutionalDashboard (NEW - Institutional Flow)
    |       +-- ETFFlowCard
    |       +-- CentralBankCard
    |       +-- COTPositioningCard
    |       +-- OpenInterestCard
    |       +-- CrowdPositioningCard
    |
    +-- TechnicalDashboard (NEW - Technical Bias)
    |       +-- TimeframeCard (HTF, Daily, 4H)
    |       +-- MarketStructureCard
    |       +-- LiquidityCard
    |       +-- OrderFlowCard
    |
    +-- MacroDriverHeatmap (Upgraded - from 5x2 to dynamic grid)
    |
    +-- GoldTradeSetupAssistant (Existing - preserved)
    |
    +-- ManualDriverLab (Upgraded - config-driven driver selection)
    |
    +-- GoldPreTradeChecklist (Existing - preserved)
    |
    +-- GoldTradingWindows (Existing - preserved)
    |
    +-- ResearchExports (Upgraded - new report types)
```

## 16.2 Reusable UI Components

### Research Card

Universal component for rendering any driver analysis. Receives a `DriverAnalysisObject` and renders using the Research Section Schema. All driver cards use this single component.

### Category Card

Renders a category score with visual gauge, contributing drivers summary, and expandable breakdown. Used in CategoryScoreOverview.

### Decision Dashboard

Renders the complete Decision Engine output: five component scores as gauges, final score as prominent gauge, decision badge, driver alignment visualization, and risk warnings.

### Score Gauge

Visual gauge component displaying a score (0-100) with color coding and label. Used across Decision Dashboard and Category Cards.

### Confidence Badge

Displays confidence value with color tier (green/amber/red). Used on every driver card and category card.

### Strength Badge

Displays strength level (Strong/Moderate/Weak/None) with visual indicator. Used on driver cards.

### Historical Panel

Displays historical comparison (Current vs. Previous vs. Weekly vs. Monthly) in expandable format. Used on driver cards with `supportsHistory: true`.

### Expandable Detail Panel

Generic expandable/collapsible panel used for driver details, category breakdowns, and scoring breakdowns. Consistent expand/collapse behavior across the application.

### Driver Comparison Panel

Side-by-side comparison of two drivers or two time periods. Used for trend analysis and historical comparison.

### Trend Card

Displays trend direction (Rising/Falling/Stable/Accelerating/Decelerating) with directional arrow. Used on driver cards with `supportsTrend: true`.

## 16.3 Config-Driven Rendering

The ResearchSectionRenderer component:

1. Reads the Driver Registry configuration
2. Filters to enabled drivers
3. Groups drivers by category
4. For each category, renders a category section
5. For each driver within the category, renders a DriverAnalysisCard
6. All rendering is driven by the registry configuration and the analysis data

No hardcoded driver lists. No hardcoded section counts. The UI adapts automatically to registry changes.

## 16.4 Responsive Layout

- Decision Dashboard: Full-width on desktop, stacked on mobile
- Category Scores: 3-column grid on desktop, 2 on tablet, 1 on mobile
- Driver Cards: 2-column grid on desktop, 1 on mobile
- Institutional Dashboard: 2-column grid on desktop, 1 on mobile

---

# 17. REPORTS

## 17.1 PDF Reports

### Daily Research Report

- Header: Date, price, overall bias, decision
- Category Scores: Visual breakdown of all 9 categories
- Decision Engine: Full scoring model with gauges
- Driver Analyses: All active drivers with bias, confidence, explanation
- Institutional Flow: ETF, COT, Open Interest summary
- Technical Assessment: Multi-timeframe summary
- Risk Warnings: All identified risks
- Footer: Generation timestamp, disclaimer

### Decision History Report

- Date range selection
- Daily Final Gold Scores plotted over time
- Decision log (Buy/Sell/Wait entries)
- Score breakdowns by category
- Confidence trend

### Institutional Report

- ETF Flow analysis over time
- COT Positioning changes
- Central Bank activity summary
- Open Interest trends
- Institutional Flow Score history

## 17.2 CSV Reports

### Driver Analysis CSV

- All driver analyses for a date range
- Columns: Date, Driver, Category, Bias, Strength, Confidence, Score, Source

### Decision Engine CSV

- Daily Decision Engine outputs for a date range
- Columns: Date, Macro Score, Technical Score, Institutional Score, Sentiment Score, Risk Score, Final Score, Decision

### Category Scores CSV

- Daily category scores for a date range
- Columns: Date, Category, Score, Bias, Confidence, Driver Count

## 17.3 Historical Reports

- Monthly summary reports
- Quarterly performance reviews
- Annual research archive

## 17.4 Decision History

Every Decision Engine output is stored and queryable:

- Browse decisions by date
- Filter by decision type (Buy/Sell/Wait)
- Filter by score range
- Export decision history

## 17.5 Audit Trail

Complete audit trail for every analysis:

- Who generated the analysis (user_id)
- When it was generated (timestamp)
- What data sources were used
- What AI model was used
- What weights were applied
- What the final scores and decision were

---

# 18. FILE STRUCTURE

```
src/
├── types/
│   ├── goldResearch.ts                    # Existing types (backward compatible)
│   ├── goldResearchConfig.ts              # NEW: Registry, Category, Weight types
│   ├── goldDriverAnalysis.ts              # NEW: Universal Driver Analysis types
│   ├── goldDecisionEngine.ts              # NEW: Decision Engine types
│   ├── goldInstitutionalFlow.ts           # NEW: Institutional Flow types
│   ├── goldTechnicalBias.ts               # NEW: Technical Bias types
│   ├── goldCategoryScore.ts               # NEW: Category Score types
│   ├── goldTradeSetup.ts                  # Existing (minor extensions)
│   ├── trade.ts                           # Existing (unchanged)
│   └── lotMargin.ts                       # Existing (unchanged)
│
├── config/
│   ├── driverRegistry.ts                  # NEW: Driver Registry definitions
│   ├── categoryConfig.ts                  # NEW: Category definitions
│   ├── defaultWeights.ts                  # NEW: Default weight configuration
│   └── researchConfig.ts                  # NEW: Master configuration
│
├── engines/
│   ├── driverAnalysisEngine.ts            # NEW: Per-driver analysis logic
│   ├── categoryScoreEngine.ts             # NEW: Category aggregation
│   ├── institutionalFlowEngine.ts         # NEW: Institutional analysis
│   ├── technicalBiasEngine.ts             # NEW: Technical analysis
│   ├── goldDecisionEngine.ts              # NEW: Final scoring and decision
│   ├── weightEngine.ts                    # NEW: Weight management
│   └── historicalEngine.ts               # NEW: Historical comparisons
│
├── services/
│   ├── goldResearchService.ts             # NEW: Research orchestration
│   ├── dataFetchService.ts                # NEW: Data source fetching
│   ├── normalizationService.ts            # NEW: Data normalization
│   └── aiAnalysisService.ts              # NEW: AI integration
│
├── hooks/
│   ├── useGoldResearch.ts                 # NEW: Research data hook
│   ├── useDecisionEngine.ts               # NEW: Decision Engine hook
│   ├── useCategoryScores.ts               # NEW: Category scores hook
│   └── useInstitutionalFlow.ts            # NEW: Institutional flow hook
│
├── components/
│   ├── GoldResearchDesk.tsx               # Refactored (config-driven shell)
│   ├── research/
│   │   ├── ResearchSectionRenderer.tsx    # NEW: Config-driven section renderer
│   │   ├── DriverAnalysisCard.tsx         # NEW: Universal driver card
│   │   ├── DriverHeader.tsx              # NEW: Driver card header
│   │   ├── DriverSummary.tsx             # NEW: Driver card summary
│   │   ├── DriverDetails.tsx             # NEW: Driver card details (expandable)
│   │   └── DriverScoring.tsx             # NEW: Driver scoring display
│   ├── decision/
│   │   ├── DecisionDashboard.tsx          # NEW: Decision Engine display
│   │   ├── ScoreGauge.tsx                # NEW: Visual score gauge
│   │   ├── DecisionBadge.tsx             # NEW: Decision badge
│   │   ├── DriverAlignmentPanel.tsx      # NEW: Alignment visualization
│   │   └── RiskWarningsPanel.tsx         # NEW: Risk warnings display
│   ├── categories/
│   │   ├── CategoryScoreOverview.tsx      # NEW: Category scores overview
│   │   ├── CategoryScoreCard.tsx          # NEW: Individual category card
│   │   └── CategoryBreakdown.tsx         # NEW: Expandable breakdown
│   ├── institutional/
│   │   ├── InstitutionalDashboard.tsx     # NEW: Institutional flow display
│   │   ├── ETFFlowCard.tsx               # NEW: ETF flow card
│   │   ├── CentralBankCard.tsx           # NEW: Central bank card
│   │   ├── COTPositioningCard.tsx        # NEW: COT positioning card
│   │   ├── OpenInterestCard.tsx          # NEW: Open interest card
│   │   └── CrowdPositioningCard.tsx      # NEW: Crowd positioning card
│   ├── technical/
│   │   ├── TechnicalDashboard.tsx         # NEW: Technical bias display
│   │   ├── TimeframeCard.tsx             # NEW: Timeframe analysis card
│   │   ├── MarketStructureCard.tsx       # NEW: Market structure card
│   │   ├── LiquidityCard.tsx             # NEW: Liquidity analysis card
│   │   └── OrderFlowCard.tsx             # NEW: Order flow card
│   ├── ui/
│   │   ├── ConfidenceBadge.tsx           # NEW: Confidence badge
│   │   ├── StrengthBadge.tsx             # NEW: Strength badge
│   │   ├── TrendCard.tsx                 # NEW: Trend display
│   │   ├── HistoricalPanel.tsx           # NEW: Historical comparison
│   │   ├── ExpandableDetailPanel.tsx     # NEW: Generic expandable panel
│   │   └── DriverComparisonPanel.tsx     # NEW: Driver comparison
│   ├── GoldTerminalHeader.tsx             # Existing (preserved)
│   ├── ResearchEngineStatus.tsx           # Existing (preserved)
│   ├── GoldTradeSetupAssistant.tsx        # Existing (preserved)
│   ├── ManualDriverLab.tsx               # Existing (upgraded to config-driven)
│   ├── GoldPreTradeChecklist.tsx          # Existing (preserved)
│   ├── GoldTradingWindows.tsx             # Existing (preserved)
│   └── ResearchExports.tsx               # Existing (upgraded with new reports)
│
├── lib/
│   ├── goldResearch.ts                    # Existing (backward compatible)
│   ├── goldAutoResearch.ts                # Existing (backward compatible)
│   ├── goldTradeSetup.ts                  # Existing (backward compatible)
│   ├── goldResearchExporters.ts           # Existing (extended)
│   ├── calculations.ts                    # Existing (unchanged)
│   ├── format.ts                          # Existing (unchanged)
│   ├── supabase.ts                        # Existing (unchanged)
│   └── storage.ts                         # Existing (unchanged)
│
├── context/
│   └── AppDataContext.tsx                  # Existing (extended with new CRUD)
│
├── app/
│   ├── gold-research/
│   │   ├── page.tsx                       # Existing (preserved)
│   │   └── history/
│   │       └── page.tsx                   # Existing (preserved)
│   └── api/
│       ├── gold-research/
│       │   ├── auto-fill/route.ts         # Existing (extended)
│       │   ├── decision-engine/route.ts   # NEW
│       │   ├── analyze-driver/route.ts    # Existing (extended)
│       │   └── scores/route.ts            # NEW
│       └── market-data/
│           └── xauusd/route.ts            # Existing (unchanged)
│
└── supabase/
    ├── schema.sql                         # Existing (unchanged)
    ├── gold-research-desk.sql             # Existing (unchanged)
    ├── daily-gold-research-reports.sql    # Existing (unchanged)
    ├── gold-trade-setups.sql              # Existing (unchanged)
    ├── gold-decision-engine-v2.sql        # NEW: New tables + columns
    └── lot-margin-calculator.sql          # Existing (unchanged)
```

## 18.1 File Organization Principles

- **Types:** One file per domain model
- **Config:** Separate configuration from logic
- **Engines:** Pure computation, no side effects, no UI
- **Services:** Orchestration, API calls, data fetching
- **Hooks:** React hooks connecting engines to UI
- **Components:** One component per file, organized by domain
- **Existing Files:** Never deleted, only extended with optional additions

---

# 19. MIGRATION PLAN

## Phase 1: Foundation (Week 1)

- Create type definitions for new models
- Create Driver Registry configuration
- Create Category configuration
- Create Weight configuration
- Create database migration script (new tables + nullable columns)
- Verify no impact on existing functionality

## Phase 2: Analysis Engine (Week 2)

- Implement Driver Analysis Engine
- Implement Category Score Engine
- Implement Weight Engine
- Implement Historical Engine
- Unit test each engine independently
- Verify backward compatibility of analysis output

## Phase 3: Specialized Engines (Week 3)

- Implement Institutional Flow Engine
- Implement Technical Bias Engine
- Implement Gold Decision Engine
- Integrate specialized engines with Category Score Engine
- Unit test integration

## Phase 4: API Layer (Week 4)

- Extend auto-fill route with new output fields
- Create decision-engine API endpoint
- Create scores API endpoint
- Extend analyze-driver route
- Integration test all API endpoints

## Phase 5: UI Components (Weeks 5-6)

- Build reusable UI components (ScoreGauge, ConfidenceBadge, etc.)
- Build DecisionDashboard
- Build CategoryScoreOverview
- Build InstitutionalDashboard
- Build TechnicalDashboard
- Build ResearchSectionRenderer
- Refactor GoldResearchDesk to use new components

## Phase 6: AI Integration (Week 7)

- Extend auto-fill prompts for new analysis model
- Implement verification layer
- Implement normalization for new fields
- Test AI output compliance with new schema
- Verify live data override behavior

## Phase 7: Reports & Export (Week 8)

- Upgrade PDF export with new data
- Create new CSV export templates
- Create Decision History report
- Create Institutional report
- Test all export formats

## Phase 8: Testing & Polish (Week 9)

- Full regression testing
- Performance testing
- Backward compatibility verification
- Edge case testing
- Documentation finalization

## Phase 9: Production Deployment (Week 10)

- Deploy database migration
- Deploy application code
- Verify production functionality
- Monitor for issues
- Rollback plan ready

---

# 20. TESTING STRATEGY

## 20.1 Driver Engine Testing

- **Unit Tests:** Each driver analyzer produces correct bias, strength, confidence for known inputs
- **Edge Cases:** Empty inputs, missing data, conflicting signals, extreme values
- **Regression:** All 19 default drivers produce valid analysis objects
- **Consistency:** Same inputs always produce same outputs (deterministic where possible)

## 20.2 Category Engine Testing

- **Unit Tests:** Category scores correctly aggregate driver contributions
- **Weight Verification:** Category scores respect configured weights
- **Boundary Tests:** All drivers in one category bullish, all bearish, mixed
- **Normalization:** Scores correctly normalized to 0-100 range

## 20.3 Decision Engine Testing

- **Unit Tests:** Decision correctly derived from category scores
- **Decision Logic:** All decision paths tested (Buy/Sell/Wait conditions)
- **Weight Sensitivity:** Scores change proportionally with weight adjustments
- **Conflict Resolution:** Conflicting drivers correctly identified and reported

## 20.4 Institutional Engine Testing

- **Unit Tests:** Each institutional data source correctly analyzed
- **Data Integration:** ETF, COT, Open Interest data correctly combined
- **Edge Cases:** Missing institutional data, stale data, conflicting signals
- **Historical:** Trend calculations correct over date ranges

## 20.5 API Testing

- **Request Validation:** Invalid inputs rejected with appropriate errors
- **Response Validation:** All responses conform to defined schemas
- **Rate Limiting:** Rate limits enforced correctly
- **Error Handling:** All error paths tested
- **Integration:** End-to-end API flow tested

## 20.6 UI Testing

- **Component Rendering:** All new components render without errors
- **Config-Driven:** New sections appear when added to registry
- **Expandable Panels:** All expand/collapse interactions work
- **Responsive:** Layout correct on all viewport sizes
- **Accessibility:** Keyboard navigation, screen reader support

## 20.7 Database Testing

- **Migration:** Migration script runs cleanly on fresh database
- **Backward Compatibility:** Existing data remains accessible
- **RLS Policies:** Security policies correctly restrict access
- **Performance:** Queries perform within acceptable thresholds

## 20.8 Regression Testing

- **Existing Features:** All existing features continue to work
- **GoldResearchDesk:** All existing sections render correctly
- **Trade Setup Assistant:** Setup generation unchanged
- **Exports:** Existing PDF/CSV exports unchanged
- **Checklist:** Pre-trade checklist unchanged

## 20.9 Performance Testing

- **Load Time:** Page load time does not degrade by more than 20%
- **API Response:** API responses within 5 seconds for standard requests
- **Database:** Query execution within 100ms for standard queries
- **Rendering:** Component render time within acceptable thresholds

---

# 21. RISKS

## 21.1 Technical Risks

**Risk:** Complexity of six interconnected engines may introduce subtle bugs.
**Mitigation:** Each engine is independently unit-testable. Integration tests verify cross-engine communication. Engines communicate through well-defined interfaces.

**Risk:** Config-driven UI may have rendering edge cases with unexpected registry configurations.
**Mitigation:** Registry validation layer ensures all entries have required fields. Fallback rendering for invalid configurations.

**Risk:** JSONB storage may lead to query performance issues at scale.
**Mitigation:** Indexed JSONB columns for frequently queried paths. Historical data partitioning if record count exceeds thresholds.

## 21.2 Data Risks

**Risk:** Institutional data sources (CFTC, World Gold Council) may have release delays or gaps.
**Mitigation:** Graceful degradation when data unavailable. Confidence penalization for stale data. Multiple fallback sources where possible.

**Risk:** AI-generated analysis may contain subtle inaccuracies.
**Mitigation:** Verification layer cross-checks AI output against verified data. Confidence scoring reflects data quality. Human review recommended for high-stakes decisions.

**Risk:** Historical data backfill may introduce inconsistencies.
**Mitigation:** Backfill is best-effort. Historical records without complete data are flagged as partial.

## 21.3 AI Risks

**Risk:** OpenAI model changes may affect output quality or format compliance.
**Mitigation:** Strict JSON schema enforcement. Normalization layer handles format variations. Fallback prompts for retry. Model version pinning where possible.

**Risk:** AI may produce plausible-sounding but factually incorrect analysis.
**Mitigation:** AI is positioned as analyst, not data provider. Verified data takes precedence. All AI output flagged for human review. Confidence scoring reflects certainty.

## 21.4 Performance Risks

**Risk:** Rendering 19+ driver cards may impact page performance.
**Mitigation:** Virtual scrolling for large driver lists. Lazy loading of expandable details. Pagination for historical views.

**Risk:** Decision Engine calculation may be slow with many drivers.
**Mitigation:** Engine calculations are O(n) where n = number of active drivers. Caching of intermediate results. Calculation runs on-demand, not continuously.

## 21.5 Migration Risks

**Risk:** Database migration may fail on existing Supabase projects.
**Mitigation:** Migration is additive only (new tables, nullable columns). Rollback scripts provided. Migration tested on copy of production database.

**Risk:** New application code may break existing functionality.
**Mitigation:** Feature flags for new functionality. Gradual rollout. Existing code paths preserved until new paths verified.

## 21.6 Backward Compatibility Risks

**Risk:** Existing stored research data may not render correctly with new components.
**Mitigation:** New components accept both old and new data formats. Existing rendering logic preserved as fallback. Migration script normalizes old data where possible.

**Risk:** Existing API consumers may not handle new response fields.
**Mitigation:** New fields are optional. No existing fields removed. API versioning if breaking changes needed.

---

# 22. FUTURE EXPANSION

## 22.1 Multi-Asset Support

The Gold Research Engine architecture is designed for extension to other asset classes:

### Forex

- Replace Gold-specific drivers with Forex drivers (Interest Rate Differential, Trade Balance, Political Stability, etc.)
- Modify category definitions for Forex-relevant categories
- Adjust weight defaults for Forex market dynamics
- The Decision Engine, Category Engine, and UI components remain structurally identical

### Indices

- Drivers: Economic Growth, Corporate Earnings, Monetary Policy, Sector Rotation, Volatility
- Categories: Macro, Earnings, Sentiment, Technical, Institutional
- Same engine architecture, different configuration

### Crypto

- Drivers: On-Chain Metrics, Exchange Flows, Mining Difficulty, Regulatory, Adoption, Technical
- Categories: On-Chain, Technical, Institutional, Sentiment, Regulatory
- Same engine architecture, different configuration

### Commodities

- Drivers: Supply/Demand, Inventory, Weather, Currency, Geopolitics, Seasonality
- Categories: Supply, Demand, Technical, Macro, Geopolitical
- Same engine architecture, different configuration

## 22.2 Extension Mechanism

To support a new asset class:

1. Create new Driver Registry with asset-specific drivers
2. Create new Category definitions with asset-specific categories
3. Create new Weight configuration with asset-specific defaults
4. Implement asset-specific data fetchers
5. Reuse all engines (Driver Analysis, Category Score, Decision Engine)
6. Reuse all UI components (config-driven rendering adapts automatically)
7. No engine or UI code changes required

## 22.3 Additional Future Capabilities

- **Backtesting:** Run Decision Engine against historical data to evaluate signal quality
- **Alerts:** Push notifications when Decision Engine produces Buy/Sell signals
- **Portfolio Integration:** Multiple asset class decisions combined into portfolio-level assessment
- **Custom Models:** User-defined scoring models on top of the engine outputs
- **Machine Learning:** ML models trained on Decision Engine outputs to improve confidence calibration
- **API Marketplace:** Expose Decision Engine outputs via public API for third-party integration

---

# DOCUMENT HISTORY

| Version | Date | Author | Status |
|---------|------|--------|--------|
| 1.0 | 2026-07-14 | PRIMASTA Architecture Team | Approved for Implementation |

---

*This document is the authoritative technical architecture specification for the PRIMASTA Gold Research Engine v2. All implementation work must conform to this specification. Any deviations require explicit architecture review and approval.*
