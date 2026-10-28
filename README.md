# Options Lot Calculator — Angel One SmartAPI & Groww-Inspired Workflow

An institutional-grade, responsive options affordability and whole-lot calculation application designed for Indian derivative markets (**NIFTY 50**, **BANK NIFTY**, **FINNIFTY**, **MIDCPNIFTY**, **BSE SENSEX**, and **MCX Commodities**).

The application features a modern two-page workflow inspired by the usability of Groww's option chain, paired with a server-side **Angel One SmartAPI** market-data integration architecture.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│ PAGE 1: Market Selection & Groww Option Chain (/)                      │
│                                                                        │
│  [1. Market Buttons] ──► Indices (NIFTY 50, BANK NIFTY, SENSEX, etc.)   │
│                          Commodities (GOLD, SILVER, CRUDE OIL, etc.)   │
│  [2. Expiry Selector] ── Expiry cycle selection tabs (Weekly/Monthly)  │
│  [3. Option Chain] ───── Groww Layout:                                 │
│                          • Left: CALLS (CE) (OI, Chg OI, Vol, IV, LTP)│
│                          • Center: STRIKE PRICE (ATM highlighting)     │
│                          • Right: PUTS (PE) (OI, Chg OI, Vol, IV, LTP)│
│  [4. Selection] ──────── Independent CE and PE contract selection     │
│  [5. Sticky Bar] ─────── Floating confirmation bar with Continue button │
│                          (Disabled until both CE and PE are selected)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                       Router Push  ▼ (via sessionStorage context)
┌────────────────────────────────────────────────────────────────────────┐
│ PAGE 2: Capital Allocation & Lot Calculator (/calculator)              │
│                                                                        │
│  [1. Contract Overview] ─ Selected CE & PE strike, premium, lot size   │
│  [2. Capital Input] ──── INR input with quick chips (₹50K to ₹10L)     │
│  [3. Allocation Controls] Synchronized CE/PE slider & percentage inputs│
│                          (Starts at 50/50, always totals 100%)         │
│  [4. Calculations] ───── Cost per lot = Premium × Lot size (+ charges) │
│                          Affordable lots = floor(Budget ÷ Cost/lot)    │
│                          Actual cost = Affordable lots × Cost/lot      │
│                          Unused allocation = Budget − Actual cost      │
│  [5. Results Table] ──── Side-by-side comparison table (CE vs PE)      │
│  [6. Summary & Actions]  Utilization bar, Total lots, Remaining cash,  │
│                          Refresh Quotes, Edit Contracts, Reset 50/50,  │
│                          and Copy Trade Plan to clipboard              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ SERVER-SIDE MARKET DATA BOUNDARY (App Router Routes)                   │
│                                                                        │
│  • GET  /api/market-data/status       (Connection diagnostics)         │
│  • GET  /api/market-data/option-chain (Filtered contracts & live LTP)  │
│  • POST /api/market-data/quote        (Single contract quote lookup)   │
│  • POST /api/market-data/quote-batch  (Batched quotes up to 50 tokens) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ ANGEL ONE SMARTAPI ADAPTER LAYER                                       │
│                                                                        │
│  1. TOTP Engine (RFC 6238 native dynamic 6-digit TOTP generator)       │
│  2. Session Manager (loginByPassword, token expiry & refresh)          │
│  3. Instrument Master Service (OpenAPIScripMaster.json daily cache)    │
│  4. Batch Market Data Client (/quote endpoint with rate-limiting)      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Angel One SmartAPI Integration Setup

### 1. Environment Configuration

All credentials are kept strictly **server-side** and are never exposed to client browsers.

Create a `.env.local` file in the root of your project (excluded from version control in `.gitignore`):

```bash
# Enable Angel One SmartAPI
MARKET_DATA_PROVIDER=ANGEL_ONE

# SmartAPI Application Credentials
ANGEL_ONE_API_KEY=your_smartapi_api_key_here
ANGEL_ONE_CLIENT_CODE=your_angel_one_client_id_here
ANGEL_ONE_PIN=your_account_pin_here
ANGEL_ONE_TOTP_SECRET=your_base32_totp_secret_here

# Optional: Gateway URLs (defaults to production endpoints)
ANGEL_ONE_BASE_URL=https://apiconnect.angelone.in
ANGEL_ONE_WS_URL=wss://smartapisocket.angelone.in/smart-stream
ANGEL_ONE_SCRIP_MASTER_URL=https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json

# Cache & Staleness Settings
MARKET_DATA_STALENESS_THRESHOLD_MS=60000
MARKET_DATA_TIMEOUT_MS=10000
INSTRUMENT_MASTER_CACHE_TTL_MS=86400000
```

### 2. How to Obtain Angel One Credentials

1. **API Key:** Sign in to the [Angel One SmartAPI Developer Portal](https://smartapi.angelone.in), create a new app (type: Trading/Market Data), and copy the generated **API Key**.
2. **Client Code:** Your Angel One Trading account ID (e.g. `A123456`).
3. **PIN:** Your 4-digit or 6-digit Angel One trading account login PIN.
4. **TOTP Secret:** When setting up Authenticator / TOTP for your Angel One account, copy the alphanumeric **Base32 secret key** shown below the QR code (e.g. `JBSWY3DPEHPK3PXP`). The application uses this secret to compute RFC 6238 TOTP codes dynamically for session generation.

---

## Features & Implementation Details

### Page 1: Market Selection & Option Chain (`/`)

1. **Grouped Market Selector Buttons (`src/components/dashboard/MarketSelector.tsx`):**
   - **Index Options:** NIFTY 50, BANK NIFTY, FINNIFTY, MIDCPNIFTY, BSE SENSEX.
   - **MCX Commodities:** GOLD, SILVER, CRUDE OIL, NATURAL GAS, COPPER, ZINC.
   - Displays exchange code (`NSE`, `BSE`, `MCX`), underlying symbol, and options support status.
2. **Groww-Style Option Chain (`src/components/chain/GrowwOptionChain.tsx`):**
   - **Left:** Calls (CE) with Open Interest (OI), Change in OI, Volume, Implied Volatility (IV), Bid/Ask, and LTP with price change.
   - **Center:** Strike Price ladder with At-The-Money (ATM) visual badge.
   - **Right:** Puts (PE) with LTP, Bid/Ask, IV, Volume, Change in OI, and OI.
   - Strike filter search input and Compact vs. Detailed column view toggle.
   - Real-time connection status pill (`Angel One SmartAPI Live Feed`).
   - If credentials are not configured, displays an informative unconfigured guide with a **"Load Verified Test Option Chain [Reference Example]"** button and a **"Use Manual Entry Fallback"** button without fabricating fake prices.
3. **Independent Contract Selection:**
   - One-click independent selection of CE and PE strikes.
4. **Sticky Floating Bottom Bar (`src/components/chain/OptionSelectionBottomBar.tsx`):**
   - Summarizes selected CE contract, PE contract, and contract lot size.
   - Prominent **"Continue to Lot Calculator"** button; disabled until both valid CE and PE contracts are selected.
5. **Manual Entry Fallback (`src/components/chain/ManualEntryCard.tsx`):**
   - Retained for entering bespoke strikes, premiums, and custom commodity lot sizes.

---

### Page 2: Capital Allocation & Lot Calculator (`/calculator`)

1. **Contract Summary Banner:**
   - Displays selected instrument name, exchange, symbol, expiry date, and dedicated CE / PE summary cards.
   - Includes real-time `QuoteStatusBadge` (`LIVE`, `NOT_CONNECTED`, `STALE`, `UNAVAILABLE`).
   - **Refresh Quotes** action button to re-fetch live market quotes and recalculate lots in real time.
2. **Capital Management:**
   - Total available capital input in INR with quick chips: `₹50,000`, `₹1,00,000`, `₹2,00,000`, `₹5,00,000`, `₹10,00,000`.
   - Synchronized allocation slider and numerical inputs initialized to 50/50 (guaranteed strictly 100% total).
   - Dynamic rupee allocation calculation for each side.
   - Optional toggle to include estimated brokerage and exchange charges per lot.
3. **Whole-Lot Calculation Engine (`src/lib/calculations.ts`):**
   - $\text{Cost per lot} = \text{Option premium} \times \text{Official contract lot size} + \text{Charge per lot}$
   - $\text{Affordable whole lots} = \lfloor \frac{\text{Allocated capital}}{\text{Cost per lot}} \rfloor$
   - $\text{Actual cost} = \text{Affordable lots} \times \text{Cost per lot}$
   - $\text{Unused allocation} = \text{Allocated capital} - \text{Actual cost}$
4. **Comprehensive Results Table:**
   - Side-by-side comparison of CE and PE across: Leg, Strike Price, Premium, Lot Size, Capital Allocation (₹ and %), Cost per Lot, Affordable Lots (and units), Actual Cost, and Unused Allocation.
   - Combined portfolio total footer.
5. **Portfolio Summary & Visual Allocation Bar:**
   - Total capital utilized (%), remaining unused cash (%), total affordable lots, and segmented progress bar.
6. **Action Buttons:**
   - **Edit Selected Contracts:** Returns to Page 1 with selections preserved.
   - **Reset Allocation:** Resets allocation slider back to 50/50.
   - **Start Again:** Clears state and returns to Page 1.
   - **Copy Trade Plan:** Formats an institutional trade plan and copies to clipboard with visual confirmation.

---

## Test Suite & Verification Results

The project includes **51 automated unit tests** across 5 test suites:
- `src/services/marketData/__tests__/angelOne.test.ts` (15 tests): TOTP generation, RFC 6238 vectors, instrument master parsing, expiry normalization, strike scaling, authentication, session caching, token renewal, batching, and error handling.
- `src/services/marketData/__tests__/twoPageWorkflow.test.ts` (7 tests): Two-page Groww workflow, 50/50 allocation synchronization, prompt baseline validation, charges handling, zero-safe math.
- `src/services/marketData/__tests__/contractSelection.test.ts` (6 tests): Market and expiry selection isolation and leg independence.
- `src/services/marketData/__tests__/marketData.test.ts` (18 tests): Server-side API endpoints, credential security, query validation, and staleness detection.
- `src/lib/__tests__/calculations.test.ts` (5 tests): Pure mathematical engine calculations.

Run tests:
```bash
npm run test
```

Run ESLint (0 errors, 0 warnings):
```bash
npm run lint
```

Build for production:
```bash
npm run build
```

---

## How to Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Run unit tests
npm test

# 3. Start development server
npm run dev

# 4. Open in browser
# http://localhost:3000
```
