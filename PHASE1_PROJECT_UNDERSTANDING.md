# PHASE 1 PROJECT UNDERSTANDING
## Institutional Gold Research Engine Upgrade

> Generated: 2026-07-14
> Status: Analysis Complete - Awaiting Approval

---

## 1. Executive Summary

This document provides a comprehensive analysis of the current Gold Research Terminal architecture and the planned Phase 1 upgrade to an Institutional Gold Decision Engine. The upgrade transforms the system from a fixed 9-driver research tool into a dynamic, config-driven decision engine with weighted category scoring, institutional flow analysis, and transparent AI-powered analysis.

**Key Principle:** This is an ENHANCEMENT, not a redesign. All existing functionality must continue working, nothing removed, everything expandable.

---

## 2. Current Architecture Analysis

### 2.1 Type System (`src/types/goldResearch.ts` - 288 lines)

**Current Structure:**
- `GoldDriverName`: 9 hardcoded drivers (DXY, US Yields, Real Yields, Fed Tone, CPI/PCE, NFP/Jobs, Geopolitics, ETF/Central Bank, Custom News)
- `GoldBias`: 4 options (Bullish Gold, Bearish Gold, Neutral, Mixed/Wait)
- `GoldImpactLevel`: 3 levels (Low, Medium, High)
- `GoldTimeSensitivity`: 4 options (Immediate, Intraday, This Week, Longer-term)
- `GoldDriverAnalysis`: 13-field analysis output
- `GoldAutoDriverName`: 9 auto-fill section names (with "Check" suffix)
- `GoldAutoResearchSection`: 26 fields per section
- `GoldAutoFullSummary`: Summary with overall bias, drivers, risk, verdict
- `GoldAutoFillResponse`: Complete auto-fill response
- `DailyGoldResearchReport`: Database record

**Limitations:**
- Fixed 9-driver architecture
- Simple 4-point bias scale
- No category-based scoring
- No institutional flow analysis
- No weighted aggregation

### 2.2 Core Libraries

**`goldResearch.ts` (790 lines):**
- 9 hardcoded driver analyzers via switch statement
- Simple scoring system (bullish/bearish/neutral signals)
- `buildGoldBiasSummary()`: Aggregates driver reports
- `getGoldChecklistResult()`: 10-item pre-trade checklist

**`goldAutoResearch.ts` (223 lines):**
- 9 hardcoded auto-fill section names
- `normalizeAutoFillResponse()`: Sanitizes AI output
- `buildAutoGoldSummary()`: Computes summary from sections
- `createEmptyAutoFillResponse()`: Empty state

**`goldTradeSetup.ts` (272 lines):**
- Trade setup calculations
- Risk/reward analysis
- Strategy matching

### 2.3 UI Component (`GoldResearchDesk.tsx` - 1984 lines)

**Current Structure:**
- `DRIVER_FORM_CONFIG`: Hardcoded form configs for 9 drivers
- `AUTO_SECTION_FIELDS`: Hardcoded field configs for 9 auto sections
- Multiple state variables for different sections
- AI auto-fill integration
- Manual driver analysis
- Trade setup assistant
- Market data integration (TwelveData)

**Limitations:**
- Monolithic component
- Hardcoded section rendering
- No expandable details per section
- Fixed scoring visualization

### 2.4 API Routes

**`auto-fill/route.ts` (386 lines):**
- OpenAI gpt-4.1 with web_search
- Hardcoded 9-section schema
- Live price fetch from TwelveData
- 7-day freshness rule

**`xauusd/route.ts`:**
- TwelveData only (no multi-provider)
- Market data for setup assistant

**`analyze-gold-driver/route.ts`:**
- Individual driver analysis via AI

### 2.5 Database Schema

**Current Tables:**
- `daily_gold_research_reports`: Stores 9 sections in `sections_json`
- `gold_research_reports`: Manual driver analyses
- `gold_trade_setups`: Trade setups

---

## 3. Phase 1 Upgrade Requirements

### 3.1 Dynamic Research Engine (Config-Driven)

**Requirement:** Replace hardcoded 9 sections with config-driven unlimited sections.

**Implementation:**
- Create `GOLD_RESEARCH_CONFIG` in types or config file
- Define section metadata (name, category, weight, fields)
- Render sections dynamically from config
- Support unlimited sections without code changes

### 3.2 New Driver Analysis Model

**Requirement:** Enhanced driver analysis with 7 new dimensions.

**New Fields per Driver:**
1. **Driver Bias**: 5-point scale (Strong Bullish, Bullish, Neutral, Bearish, Strong Bearish)
2. **Driver Strength**: 4 levels (Strong, Moderate, Weak, None)
3. **Driver Confidence**: 0-100 with explanation
4. **Trend**: Rising, Falling, Stable, Accelerating, Decelerating
5. **Historical Change**: Improving, Deteriorating, Stable, New Development
6. **Economic Surprise**: Above Consensus, At Consensus, Below Consensus, N/A
7. **AI Explanation**: Detailed analysis explanation

### 3.3 Category Score Engine

**Requirement:** 9 categories with weighted scoring.

**Categories:**
1. Technical Analysis
2. Inflation
3. Employment
4. Economic Growth
5. Institutional Activity
6. Market Sentiment
7. Geopolitical Risk
8. Liquidity Conditions
9. Macro Environment

**Scoring:**
- Each category has a score (0-100)
- Categories have configurable weights
- Weighted aggregation for overall scores

### 3.4 Technical Bias Engine

**Requirement:** Multi-timeframe technical analysis.

**Components:**
- Support/resistance levels
- Market structure (Bullish/Bearish/Ranging)
- Trend analysis (Strong/Weak/Neutral)
- Timeframe alignment (HTF/MTF/LTF)

### 3.5 Institutional Flow Engine

**Requirement:** Institutional activity analysis.

**Components:**
- ETF flows (Inflows/Outflows/Net)
- Central Bank activity (Buying/Selling/Holding)
- COT data (Commercial/Non-Commercial positioning)
- Open Interest analysis

### 3.6 New Gold Research Sections

**Requirement:** 6 new research sections.

**New Sections:**
1. COT Positioning
2. Open Interest
3. Seasonality
4. Institutional Flow
5. Crowd Positioning
6. Position Risk

### 3.7 Driver Weighting Engine

**Requirement:** Weighted institutional scoring.

**Components:**
- Category-based aggregation
- Configurable weights per category
- Weighted average for final scores

### 3.8 Gold Decision Engine

**Requirement:** Final scoring system (0-100).

**Scores:**
1. Macro Score (0-100)
2. Technical Score (0-100)
3. Institutional Score (0-100)
4. Sentiment Score (0-100)
5. Risk Score (0-100)
6. Final Gold Score (0-100) - Weighted average

### 3.9 AI Requirements

**Requirement:** AI is analyst, not data provider.

**Principles:**
- AI provides analysis and explanation
- Data comes from verified sources (TwelveData, FRED, etc.)
- AI cannot fabricate prices or data
- All data must be source-linked

### 3.10 Database Extensions

**Requirement:** Backward compatible extensions.

**New Columns/Tables:**
- Extended driver analysis fields
- Category scores
- Decision engine scores
- Institutional flow data
- COT/Open Interest data

### 3.11 UI Upgrades

**Requirement:** Expandable details per section.

**Features:**
- Config-driven section rendering
- Expandable/collapsible sections
- New scoring visualizations
- Category score breakdowns

---

## 4. Affected Modules

| Module | Current | Phase 1 Change |
|--------|---------|----------------|
| `src/types/goldResearch.ts` | 9-driver types | Config-driven types, new analysis model |
| `src/lib/goldResearch.ts` | 9 hardcoded analyzers | Config-driven analyzer, category scoring |
| `src/lib/goldAutoResearch.ts` | 9 auto-fill sections | Config-driven sections, new normalization |
| `src/lib/goldTradeSetup.ts` | Trade setup calculations | Consume new Decision Engine scores |
| `src/components/GoldResearchDesk.tsx` | 1984-line monolith | Config-driven rendering, expandable sections |
| `src/app/api/gold-research/auto-fill/route.ts` | 9-section schema | Dynamic schema, new sections |
| `src/app/api/analyze-gold-driver/route.ts` | Individual driver analysis | Enhanced analysis model |
| `src/context/AppDataContext.tsx` | Data context | New methods for new data types |
| `supabase/schema.sql` | Current schema | Extended tables/columns |

---

## 5. Affected APIs

| API Route | Current | Phase 1 Change |
|-----------|---------|----------------|
| `POST /api/gold-research/auto-fill` | 9-section schema | Dynamic sections, new analysis model |
| `POST /api/analyze-gold-driver` | Individual driver analysis | Enhanced 7-dimension analysis |
| `POST /api/gold-research/generate-setup` | Trade setup generation | Consume Decision Engine scores |
| `GET /api/market-data/xauusd` | TwelveData only | No change (preserve constraint) |

---

## 6. Affected Database Tables

| Table | Current | Phase 1 Extension |
|-------|---------|-------------------|
| `daily_gold_research_reports` | `sections_json` (9 sections) | Extended sections, category scores, Decision Engine scores |
| `gold_research_reports` | Manual driver analyses | Extended driver analysis fields |
| `gold_trade_setups` | Trade setups | Consume new scores |
| `gold_category_scores` | **NEW** | Category scores per report |
| `gold_decision_engine` | **NEW** | Final Decision Engine scores |
| `gold_institutional_flow` | **NEW** | Institutional flow data |

---

## 7. Affected Components

| Component | Current Lines | Phase 1 Change |
|-----------|---------------|----------------|
| `GoldResearchDesk.tsx` | 1984 | Config-driven rendering, expandable sections |
| `GoldResearchHistory.tsx` | TBD | Display new scores |
| `LotMarginCalculator.tsx` | TBD | No change |
| `AppDataContext.tsx` | 1201 | New CRUD methods |

---

## 8. Affected Types

| Type File | Current | Phase 1 Change |
|-----------|---------|----------------|
| `goldResearch.ts` | 288 lines | Major expansion (config, analysis model, scores) |
| `goldTradeSetup.ts` | TBD | Consume new Decision Engine types |
| `trade.ts` | TBD | Minor - reference new fields |
| `lotMargin.ts` | TBD | No change |

---

## 9. Potential Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Backward compatibility | High | Use optional fields, migration scripts |
| Database migration | High | Test migrations on copy first |
| AI prompt changes | Medium | Keep existing prompts, add new ones |
| UI complexity | Medium | Config-driven rendering, progressive enhancement |
| Performance | Low | Lazy loading, pagination for new sections |

---

## 10. Migration Requirements

### 10.1 Database Migration
- Create new tables (`gold_category_scores`, `gold_decision_engine`, `gold_institutional_flow`)
- Add new columns to existing tables (optional fields)
- Migrate existing data to new format
- Preserve all existing data

### 10.2 Type Migration
- Extend existing types with optional fields
- Add new types for config, scores, etc.
- Maintain backward compatibility

### 10.3 API Migration
- Extend existing endpoints
- Add new endpoints for new features
- Maintain existing response formats

---

## 11. Backward Compatibility Plan

### 11.1 Data Compatibility
- Existing `sections_json` remains valid
- New fields are optional
- Migration scripts handle conversion

### 11.2 API Compatibility
- Existing endpoints continue working
- New fields in responses are optional
- No breaking changes

### 11.3 UI Compatibility
- Existing features remain functional
- New features are additive
- Progressive enhancement

---

## 12. Implementation Roadmap

### Phase 1.1: Config Foundation (Days 1-2)
- Create `GOLD_RESEARCH_CONFIG`
- Define section metadata
- Create new types for config-driven system

### Phase 1.2: Analysis Model (Days 3-4)
- Implement 7-dimension driver analysis
- Create category scoring engine
- Build weighted aggregation

### Phase 1.3: Database Extensions (Days 5-6)
- Create new tables
- Extend existing tables
- Migration scripts

### Phase 1.4: API Extensions (Days 7-8)
- Extend auto-fill route
- Extend analyze-gold-driver route
- New endpoints for Decision Engine

### Phase 1.5: UI Upgrades (Days 9-12)
- Config-driven section rendering
- Expandable details per section
- New scoring visualizations
- Category score breakdowns

### Phase 1.6: Testing & Polish (Days 13-14)
- Integration testing
- Backward compatibility testing
- Performance optimization
- Documentation

---

## 13. Recommended File Structure

```
src/
├── types/
│   ├── goldResearch.ts              # Extended types (backward compatible)
│   ├── goldResearchConfig.ts        # NEW: Config types
│   └── goldDecisionEngine.ts        # NEW: Decision Engine types
├── lib/
│   ├── goldResearch.ts              # Extended analyzers (backward compatible)
│   ├── goldResearchConfig.ts        # NEW: Config definitions
│   ├── goldCategoryScoring.ts       # NEW: Category scoring engine
│   ├── goldDecisionEngine.ts        # NEW: Decision Engine
│   ├── goldAutoResearch.ts          # Extended (backward compatible)
│   └── goldInstitutionalFlow.ts     # NEW: Institutional flow analysis
├── components/
│   ├── GoldResearchDesk.tsx         # Refactored (config-driven)
│   ├── GoldResearchSection.tsx      # NEW: Dynamic section component
│   ├── GoldDecisionEnginePanel.tsx  # NEW: Decision Engine display
│   └── GoldCategoryScoreCard.tsx    # NEW: Category score display
├── app/
│   └── api/
│       └── gold-research/
│           ├── auto-fill/route.ts   # Extended
│           ├── decision-engine/route.ts  # NEW
│           └── institutional-flow/route.ts  # NEW
└── supabase/
    └── gold-decision-engine.sql     # NEW: Migration script
```

---

## 14. Reusable Components

### 14.1 Existing (Reusable)
- `AutoSectionCard` → Extend for new sections
- `ResultRow` → Reuse for new displays
- `MarketDataMetric` → Reuse for scoring displays
- `TerminalMetric` → Reuse for Decision Engine

### 14.2 New (Reusable)
- `GoldResearchSection` → Config-driven section renderer
- `GoldCategoryScoreCard` → Category score display
- `GoldDecisionEnginePanel` → Decision Engine display
- `ExpandableDetails` → Expandable section details

---

## 15. Next Steps

1. **Await user approval** of this Phase 1 Project Understanding
2. **Begin implementation** starting with Phase 1.1 (Config Foundation)
3. **Iterate** through each phase with user feedback
4. **Test** backward compatibility at each step

---

*This document captures the complete Phase 1 analysis. All changes are ENHANCEMENTS, not redesigns. Existing functionality is preserved and extended.*
