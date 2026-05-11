# AIFINITY.APP — COMPLETE PROJECT CONTEXT
*Upload this document to your Claude.ai project for full codebase awareness*

---

## 1. PROJECT OVERVIEW

**AiFinity.app** is an AI-powered personal finance dashboard that automatically imports, categorizes, and analyzes bank transactions.

- **Official URL:** aifinity.app
- **Tech Stack:** React 18 + Vite + TailwindCSS (frontend) · Node.js + Express + PostgreSQL (backend)
- **AI:** Claude API (Anthropic) — claude-3-haiku-20240307
- **Bank Integration:** Salt Edge API v6 (PSD2 / Open Banking)
- **Auth:** JWT + bcrypt
- **Deployment:** Netlify (frontend) · Railway (backend + PostgreSQL)
- **Language:** Bilingual (English / Spanish)

---

## 2. FRONTEND — `/frontend/src/`

### Components (`/frontend/src/components/`)
| Component | Purpose |
|---|---|
| **Header.jsx** | App header — user menu, language toggle, logout |
| **PremiumTabs.jsx** | Main tab navigation (Dashboard, Transactions, Trends, Insights, Budget, Upload, Settings) |
| **Auth.jsx** | Login / register modal |
| **AdminLogin.jsx** | Admin-only login |
| **Dashboard.jsx** | KPI cards, charts, account overview |
| **Transactions.jsx** | Transaction table — filter, sort, bulk update, category edit |
| **Trends.jsx** | Monthly income/expense trends |
| **Insights.jsx** | AI-powered financial insights |
| **Budget.jsx** | Budget tracking per category |
| **SetupBudget.jsx** | Initial budget configuration wizard |
| **Upload.jsx** | PDF/CSV drag-and-drop upload + ConnectBank card |
| **ConnectBank.jsx** | Salt Edge bank connection UI (Connect, Sync, Remove) |
| **AddAccountModal.jsx** | Manual bank account creation |
| **AccountSelector.jsx** | Account selection dropdown |
| **Settings.jsx** | User settings — income, family, AI config |
| **Admin.jsx** | Admin panel — user management |
| **CategoryModal.jsx** | Category edit/manage modal |
| **TransferModal.jsx** | Create transfer transactions |
| **FinancialScenarios.jsx** | What-if financial planning |
| **SpendingStatusHeader.jsx** | Spending status overview |
| **BudgetInsight.jsx** | Budget insight display |
| **DarkModeChart.jsx** | Dark mode chart wrapper |
| **SessionTimeoutWarning.jsx** | 30-min inactivity warning (1 min countdown) |
| **Trends/SpendingPrediction.jsx** | Spending prediction |
| **Trends/PredictionChart.jsx** | Prediction chart |
| **Trends/PredictionKPICards.jsx** | Prediction KPIs |
| **Trends/PendingPaymentsList.jsx** | Upcoming payments |
| **Trends/BudgetAlert.jsx** | Budget overspend alerts |

### Context & Hooks
- **LanguageContext.jsx** — i18n state (en/es)
- **ThemeContext.jsx** — Dark mode state
- **useSessionTimeout.js** — Session inactivity detection

### Utilities (`/frontend/src/utils/`)
- **api.js** — Axios API client with JWT interceptor. Covers all endpoints including Salt Edge helpers
- **auth.js** — JWT token management (localStorage key: `finova_auth`)
- **pdfParser.js** — Client-side PDF parsing for ING + Sabadell statements
- **masterCategories.js** — Hierarchical Spanish category system (50+ categories)
- **categoryColors/Icons/Format.js** — Category display helpers
- **currencyFormat.js** — EUR currency formatting

### Key Dependencies
```
react 18.2 · react-router-dom 7.9.5 · vite 5.0.8
tailwindcss 3.3.6 · recharts 2.10.3 · lucide-react 0.294
axios 1.6.2 · pdfjs-dist 3.11.174 · @dnd-kit (drag-drop)
@clerk/clerk-react 5.53.4 (optional auth provider)
```

---

## 3. BACKEND — `/backend/`

### Routes (`/backend/routes/`)
| File | Base Path | Key Endpoints |
|---|---|---|
| **auth.js** | `/api/auth` | POST /register, POST /login → JWT 7-day |
| **transactions.js** | `/api/transactions` | GET, POST, PATCH /:id, DELETE /:id, DELETE /all |
| **summary.js** | `/api/summary` | GET → total income/expenses/balance |
| **trends.js** | `/api/trends` | GET → monthly trends (last 12 months) |
| **predictions.js** | `/api/predictions` | GET /spending, /recurring, /pattern |
| **accounts.js** | `/api/accounts` | GET, POST, PATCH /:id, DELETE /:id |
| **budget.js** | `/api/budget` | GET /categories, /suggestions, /summary; POST /categories |
| **ai.js** | `/api/ai` | GET/POST /config, POST /chat, GET /chat/history |
| **settings.js** | `/api/settings` | GET, POST (income, family size, location, ages) |
| **export.js** | `/api/export` | GET /csv, GET /excel |
| **saltedge.js** | `/api/saltedge` | POST /connect, GET /connections, POST /sync/:id, DELETE /connections/:id |
| **admin.js** | `/api/admin` | GET /users, GET /users/:id, POST /users/:id/admin |
| **cleanup.js** | `/api/cleanup` | Utility cleanup endpoints |
| **diagnostic.js** | `/api/diagnostic` | Debug diagnostics |
| **fix-nomina.js** | `/api/fix-nomina` | Salary/payroll fixes + income rollover |
| **fix-remesas-traspasos.js** | `/api/fix-remesas-traspasos` | Remittance/transfer fixes |

### Services (`/backend/services/`)
| File | Purpose |
|---|---|
| **saltedgeService.js** | Salt Edge v6 API client — customers, connections, accounts, transactions |
| **aiInsightService.js** | Budget insights — 70% templates / 30% Claude API |
| **aiBudgetSuggestionService.js** | AI budget recommendations based on spending history |
| **aiPromptTemplates.js** | Prompt engineering templates |
| **questionClassifier.js** | Routes questions to template vs full AI |
| **quickResponses.js** | Template responses (avoid API calls for common questions) |
| **spendingPredictionService.js** | Monthly predictions + recurring detection + pattern analysis |
| **debtAnalysisService.js** | Credit card debt analysis |
| **insightTemplates.js** | Template-based insight generation |
| **pendingPaymentsService.js** | Upcoming/pending payment detection |

### Middleware (`/backend/middleware/`)
- **auth.js** — `authenticateToken` (hard require) + `optionalAuth` (soft require)
- **adminAuth.js** — Admin-only access guard
- **getUserId.js** — User ID extraction helper

---

## 4. DATABASE SCHEMA

### `users`
```sql
id, email (UNIQUE), password_hash, full_name,
is_admin BOOLEAN DEFAULT false,
saltedge_customer_id VARCHAR  -- Salt Edge integration
```

### `transactions`
```sql
id, user_id FK, bank VARCHAR(50),
date DATE, category VARCHAR(100), description TEXT,
amount DECIMAL(12,2), type ('income'|'expense'),
computable BOOLEAN DEFAULT true,         -- exclude from stats if false
account_id FK → bank_accounts,
applicable_month VARCHAR(7),             -- YYYY-MM, for income shifting
saltedge_transaction_id VARCHAR UNIQUE   -- dedup on bank sync
```

### `bank_accounts`
```sql
id, user_id FK, name, account_type, color, balance, credit_limit,
currency DEFAULT 'EUR', exclude_from_stats BOOLEAN,
saltedge_connection_id, saltedge_account_id,
saltedge_provider_code, last_synced_at,
balance_source ('manual'|'saltedge')
```

### `categories`
```sql
id, user_id FK (nullable = global), name,
budget_amount, color, icon,
is_annual BOOLEAN  -- annual vs monthly budget
UNIQUE(user_id, name)
```
50+ default categories with Spanish names (Alimentación > Supermercado, Vivienda > Hipoteca, etc.)

### `user_settings`
```sql
user_id PK FK, expected_monthly_income,
family_size DEFAULT 1, location DEFAULT 'Spain',
ages JSONB DEFAULT '[]'
```

### `summaries`
```sql
id, user_id FK, month VARCHAR(7) YYYY-MM,
total_income, total_expenses, net_balance
UNIQUE(user_id, month)
```

### `ai_config`
```sql
id, user_id FK, provider ('openai'|'claude'|'gemini'),
api_key TEXT, api_key_preview VARCHAR(20),
is_active BOOLEAN
UNIQUE(user_id, provider)
```

### `ai_chat_history`
```sql
id, user_id FK, provider, user_message TEXT, ai_response TEXT, created_at
```

---

## 5. AI INTEGRATION

### Claude Chat Flow (`POST /api/ai/chat`)
1. Resolve active AI config for user (Claude / OpenAI / Gemini)
2. Classify question → template response OR full Claude call
3. Gather financial context: transactions, categories, accounts, settings
4. Build system + user prompt with financial context
5. Call Claude API (`claude-3-haiku-20240307`, max 2048 tokens, temp 0.7)
6. Retry on 529 (overloaded) — exponential backoff (1s, 2s, 4s), max 3 attempts
7. Store in `ai_chat_history`
8. Return response + follow-up suggestions

### Two-tier AI System
- **70% templates** — Common questions answered from templates (no API cost)
- **30% Claude** — Complex/unique questions sent to Claude API

### Prompt Structure
- **System:** `FINANCIAL_SYSTEM_PROMPT` — financial advisor role in English/Spanish
- **User:** `buildFinancialPrompt()` — injects full financial context + user question

---

## 6. SALT EDGE BANK INTEGRATION

### Status
- ✅ Fully implemented and tested (end-to-end with Fake Bank)
- ⏳ Awaiting Salt Edge Test status approval to use real banks (Sabadell)
- Pending → Test → Live tier system

### How It Works
1. User clicks "Connect Bank" on Upload tab
2. Backend creates Salt Edge customer (stored in `users.saltedge_customer_id`)
3. Backend creates OAuth session via `POST /connections/connect`
4. User redirected to Salt Edge widget → selects bank → authenticates
5. Redirected back to app
6. User clicks Sync → backend fetches accounts + transactions from Salt Edge
7. Data stored in `bank_accounts` + `transactions` with dedup via `saltedge_transaction_id`

### API Details
- **Base URL:** `https://www.saltedge.com/api/v6`
- **Auth headers:** `App-id` + `Secret`
- **Connect endpoint:** `POST /connections/connect`
- **Scopes:** `accounts`, `transactions`

### When Test Status Arrives
No code changes needed. Connect Bank → search "Sabadell Web Banking" → log in → sync.

---

## 7. ENVIRONMENT VARIABLES

### Backend (`/backend/.env`)
```bash
PORT=5002
NODE_ENV=development
DATABASE_URL=postgresql://...
JWT_SECRET=...
SALTEDGE_APP_ID=...
SALTEDGE_SECRET=...
SALTEDGE_BASE_URL=https://www.saltedge.com/api/v6
```

### Frontend (`/frontend/.env.local` for dev)
```bash
VITE_API_URL=http://localhost:5002/api
```

### Production (Railway env vars)
Same as backend .env but with production DATABASE_URL and NODE_ENV=production

---

## 8. RUNNING LOCALLY

```bash
# Terminal 1 — Backend
cd backend && npm run dev   # http://localhost:5002

# Terminal 2 — Frontend
cd frontend && npm run dev  # http://localhost:5173
```

Run DB migrations (first time or after new migration files):
```bash
cd backend
node migrations/run.js
node migrations/add-saltedge-integration.js
```

---

## 9. DEPLOYMENT

| Layer | Platform | URL |
|---|---|---|
| Frontend | Netlify | aifinity.app |
| Backend | Railway | aifinity-production.up.railway.app |
| Database | Railway PostgreSQL | (internal connection string) |

### Deploy
- Push to `main` branch → auto-deploys on both Netlify + Railway
- Frontend build: `cd frontend && npm run build` → output in `frontend/dist`
- Backend start: `node server.js`

---

## 10. SPECIAL FEATURES & KNOWN BEHAVIOURS

- **Income Shifting** — `applicable_month` field lets income show in different month (e.g. December salary → January)
- **Computable flag** — transactions marked `computable = false` excluded from stats/budget
- **Account exclusion** — `exclude_from_stats = true` on accounts excludes all their transactions
- **Transaction deduplication** — `DISTINCT ON (date, description, amount)` in queries + `saltedge_transaction_id` UNIQUE for bank syncs
- **Category hierarchy** — `"Parent > Child"` format (e.g. `"Alimentación > Supermercado"`)
- **Category normalization** — `normalizeCategory()` maps old/variant names to master list
- **Pending mode (Salt Edge)** — Only fake banks available until Test status approved
- **Optional auth** — Most routes use `optionalAuth` middleware supporting both logged-in and guest users
- **localStorage auth key** — `finova_auth` (legacy name from before rebrand to AiFinity)

---

## 11. CURRENT BRANCH

Active development branch: `claude/start-project-6Qa78`
Main branch: `main`
Repository: `jarosquijano-netizen/aifinity`
