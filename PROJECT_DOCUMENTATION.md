# AiFinity.app - Complete Technical Documentation

**Version:** 2.0.0  
**Last Updated:** January 2025  
**Status:** Production Ready  
**Deployment:** Railway (Backend) + Netlify (Frontend)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Frontend Structure](#frontend-structure)
7. [Backend Structure](#backend-structure)
8. [Key Features](#key-features)
9. [Configuration](#configuration)
10. [Deployment](#deployment)
11. [Development Setup](#development-setup)
12. [File Parsing](#file-parsing)
13. [AI Assistant](#ai-assistant)
14. [Design System](#design-system)

---

## Project Overview

**AiFinity.app** is a full-stack financial intelligence platform that helps users track, analyze, and optimize their finances through AI-powered insights. The platform automatically extracts transactions from bank statements (PDF/CSV), categorizes them, and provides comprehensive financial analysis.

### Core Capabilities
- 📄 **Bank Statement Parsing**: Supports ING, Sabadell, and generic CSV formats
- 🤖 **AI-Powered Analysis**: Financial advice using OpenAI, Claude, or Gemini
- 📊 **Real-time Analytics**: Dashboard with KPIs, charts, and trends
- 💰 **Budget Management**: Category-based budgeting with tracking
- 💳 **Multi-Account Support**: Bank accounts, credit cards, savings accounts
- 🌍 **Bilingual**: Full English and Spanish support
- 🎨 **Premium UI**: Modern, responsive design with dark mode

### Production URLs
- **Frontend**: https://aifinity.app (Netlify)
- **Backend API**: https://aifinity-backend-production.up.railway.app (Railway)
- **Database**: PostgreSQL on Railway

---

## Architecture

### System Architecture
```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Frontend  │ ◄─────► │   Backend   │ ◄─────► │  PostgreSQL │
│  (React)    │  HTTP   │  (Express)  │  SQL    │  Database   │
│  (Netlify)  │         │  (Railway)  │         │  (Railway)   │
└─────────────┘         └─────────────┘         └─────────────┘
       │                       │
       │                       │
       ▼                       ▼
┌─────────────┐         ┌─────────────┐
│   AI APIs   │         │ File Parser │
│ OpenAI/     │         │ PDF/CSV     │
│ Claude/     │         │ Processing  │
│ Gemini      │         │             │
└─────────────┘         └─────────────┘
```

### Frontend Architecture
- **Framework**: React 18.2 with Vite
- **State Management**: React Hooks (useState, useEffect, useContext)
- **Routing**: React Router with hash-based navigation
- **Styling**: TailwindCSS with custom design system
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **PDF Parsing**: pdfjs-dist (client-side)

### Backend Architecture
- **Runtime**: Node.js with ES Modules
- **Framework**: Express.js
- **Database**: PostgreSQL with connection pooling
- **Authentication**: JWT tokens
- **File Processing**: Multer for uploads, XLSX for Excel parsing
- **AI Integration**: Fetch API to OpenAI, Claude, Gemini APIs

---

## Tech Stack

### Frontend Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^7.9.5",
  "axios": "^1.6.2",
  "recharts": "^2.10.3",
  "lucide-react": "^0.294.0",
  "pdfjs-dist": "^3.11.174",
  "@dnd-kit/core": "^6.3.1",
  "@dnd-kit/sortable": "^10.0.0",
  "@clerk/clerk-react": "^5.53.4",
  "tailwindcss": "^3.3.6",
  "vite": "^5.0.8"
}
```

### Backend Dependencies
```json
{
  "express": "^4.18.2",
  "pg": "^8.11.3",
  "bcrypt": "^5.1.1",
  "jsonwebtoken": "^9.0.2",
  "multer": "^1.4.5-lts.1",
  "xlsx": "^0.18.5",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1"
}
```

---

## Database Schema

### Table: `users`
User authentication and profile management.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-increment user ID |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | User email (login) |
| `password_hash` | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| `full_name` | VARCHAR(255) | NULL | User's full name |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Registration timestamp |
| `is_admin` | BOOLEAN | DEFAULT FALSE | Admin access flag |

### Table: `transactions`
Core transaction data storage.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Transaction ID |
| `user_id` | INTEGER | FOREIGN KEY → users(id) | Owner user ID (NULL for demo) |
| `bank` | VARCHAR(50) | NOT NULL | Bank/account name |
| `date` | DATE | NOT NULL | Transaction date |
| `category` | VARCHAR(100) | NULL | Category name |
| `description` | TEXT | NULL | Transaction description |
| `amount` | NUMERIC(12,2) | NOT NULL | Transaction amount |
| `type` | VARCHAR(20) | CHECK (income/expense) | Transaction type |
| `computable` | BOOLEAN | DEFAULT TRUE | Include in analytics |
| `applicable_month` | VARCHAR(7) | NULL | Month for analytics (YYYY-MM) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Import timestamp |

**Indexes:**
- `idx_transactions_user_date` on `(user_id, date DESC)`
- `idx_transactions_category` on `(user_id, category)`

### Table: `accounts` (bank_accounts)
Multi-account management with credit card support.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Account ID |
| `user_id` | INTEGER | FOREIGN KEY → users(id) | Owner user ID |
| `name` | VARCHAR(255) | NOT NULL | Account name |
| `account_type` | VARCHAR(100) | DEFAULT 'General' | checking/savings/credit/investment |
| `color` | VARCHAR(7) | DEFAULT '#6d4c41' | Display color (hex) |
| `balance` | NUMERIC(12,2) | DEFAULT 0 | Current balance |
| `credit_limit` | NUMERIC(12,2) | NULL | Credit card limit |
| `statement_day` | INTEGER | NULL | Statement date (1-31) |
| `due_day` | INTEGER | NULL | Payment due date (1-31) |
| `currency` | VARCHAR(3) | DEFAULT 'EUR' | Currency code |
| `exclude_from_stats` | BOOLEAN | DEFAULT FALSE | Exclude from analytics |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Account Types:**
- `checking` - Regular checking account
- `savings` - Savings account
- `credit` - Credit card
- `investment` - Investment account
- `General` - Generic account

### Table: `budgets`
Category-based budget management.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Budget ID |
| `user_id` | INTEGER | FOREIGN KEY → users(id) | Owner user ID |
| `category` | VARCHAR(255) | NOT NULL | Category name |
| `amount` | NUMERIC(12,2) | DEFAULT 0 | Monthly budget amount |
| `spent` | NUMERIC(12,2) | DEFAULT 0 | Amount spent this month |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Unique Constraint:** `UNIQUE(user_id, category)`

### Table: `categories`
Transaction category definitions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Category ID |
| `user_id` | INTEGER | FOREIGN KEY → users(id) | Owner user ID (NULL for defaults) |
| `name` | VARCHAR(255) | NOT NULL | Category name |
| `budget_amount` | NUMERIC(12,2) | DEFAULT 0 | Monthly budget |
| `color` | VARCHAR(7) | DEFAULT '#6d4c41' | Display color (hex) |
| `icon` | VARCHAR(50) | NULL | Icon name |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Default Categories:** 57 pre-configured categories including:
- Food & Dining (Supermercado, Restaurantes, etc.)
- Transportation (Transportes, Gasolina, etc.)
- Housing (Hipoteca, Comunidad, etc.)
- Utilities (Internet, Electricidad, etc.)
- Healthcare (Médico, Farmacia, etc.)
- And more...

### Table: `settings` (user_settings)
User preferences and financial settings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | INTEGER | PRIMARY KEY, FK → users(id) | User ID |
| `expected_monthly_income` | NUMERIC(12,2) | DEFAULT 0 | Expected monthly income |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

### Table: `ai_config`
AI provider configuration for users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Config ID |
| `user_id` | INTEGER | FOREIGN KEY → users(id) | Owner user ID |
| `provider` | VARCHAR(50) | NOT NULL | openai/claude/gemini |
| `api_key` | VARCHAR(500) | NOT NULL | Encrypted API key |
| `api_key_preview` | VARCHAR(10) | NULL | Last 4 chars for display |
| `is_active` | BOOLEAN | DEFAULT FALSE | Active provider flag |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Unique Constraint:** `UNIQUE(user_id, provider)`

### Table: `ai_chat_history`
AI conversation history.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Chat ID |
| `user_id` | INTEGER | FOREIGN KEY → users(id) | Owner user ID |
| `provider` | VARCHAR(50) | NOT NULL | AI provider used |
| `user_message` | TEXT | NOT NULL | User's question |
| `ai_response` | TEXT | NOT NULL | AI's response |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Message timestamp |

---

## API Endpoints

### Base URL
- **Development**: `http://localhost:5000/api`
- **Production**: `https://aifinity-backend-production.up.railway.app/api`

### Authentication

#### POST `/api/auth/register`
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "fullName": "John Doe"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "fullName": "John Doe"
  }
}
```

#### POST `/api/auth/login`
Login existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "fullName": "John Doe"
  }
}
```

### Transactions

#### POST `/api/transactions/upload`
Upload parsed transactions from PDF/CSV files.

**Headers:** `Authorization: Bearer <token>` (optional)

**Request:**
```json
{
  "transactions": [
    {
      "bank": "ING",
      "date": "2024-01-15",
      "category": "Supermercado",
      "description": "Mercadona Shopping",
      "amount": 85.50,
      "type": "expense",
      "computable": true
    }
  ]
}
```

**Response:**
```json
{
  "message": "Transactions uploaded successfully",
  "count": 1,
  "skipped": 0,
  "transactions": [...]
}
```

**Features:**
- Duplicate detection (same date, description, amount)
- Auto-categorization based on description
- Recurring income detection
- Account balance updates
- Summary recalculation

#### GET `/api/transactions/all`
Get all transactions for user.

**Query Parameters:**
- `limit` - Limit results (default: all)
- `offset` - Pagination offset

**Response:**
```json
{
  "transactions": [
    {
      "id": 1,
      "user_id": 1,
      "bank": "ING",
      "date": "2024-01-15",
      "category": "Supermercado",
      "description": "Mercadona Shopping",
      "amount": "85.50",
      "type": "expense",
      "computable": true,
      "applicable_month": null,
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### DELETE `/api/transactions/:id`
Delete a single transaction.

**Headers:** `Authorization: Bearer <token>` (optional)

**Response:**
```json
{
  "message": "Transaction deleted successfully"
}
```

#### DELETE `/api/transactions/all`
Delete all transactions for user.

**Headers:** `Authorization: Bearer <token>` (optional)

**Response:**
```json
{
  "message": "All transactions deleted successfully"
}
```

### Summary

#### GET `/api/summary`
Get comprehensive financial summary.

**Headers:** `Authorization: Bearer <token>` (optional)

**Response:**
```json
{
  "totalIncome": 2500.00,
  "totalExpenses": 1500.00,
  "netBalance": 1000.00,
  "transactionCount": 50,
  "actualIncome": 2500.00,
  "actualExpenses": 1500.00,
  "actualNetBalance": 1000.00,
  "categories": [
    {
      "category": "Supermercado",
      "total": 600.00,
      "count": 12,
      "type": "expense"
    }
  ],
  "recentTransactions": [...]
}
```

**Logic:**
- Income: Sums all income transactions for current month
- Expenses: Sums all expense transactions for current month (uses actual date, not applicable_month)
- Categories: Grouped by category and type
- Recent: Last 10 transactions

### Budget

#### GET `/api/budget/overview`
Get budget overview for a specific month.

**Query Parameters:**
- `month` - Month in YYYY-MM format (default: current month)

**Response:**
```json
{
  "totals": {
    "budget": 5000.00,
    "spent": 3500.00,
    "remaining": 1500.00
  },
  "categories": [
    {
      "category": "Supermercado",
      "budget": 600.00,
      "spent": 550.00,
      "remaining": 50.00,
      "usage": 91.67
    }
  ]
}
```

#### POST `/api/budget`
Create or update a budget for a category.

**Request:**
```json
{
  "category": "Supermercado",
  "amount": 600.00
}
```

**Response:**
```json
{
  "message": "Budget updated successfully",
  "budget": {
    "id": 1,
    "category": "Supermercado",
    "amount": "600.00",
    "spent": "0.00"
  }
}
```

### Accounts

#### GET `/api/accounts`
Get all accounts for user.

**Response:**
```json
{
  "accounts": [
    {
      "id": 1,
      "user_id": 1,
      "name": "ING Checking",
      "account_type": "checking",
      "balance": "5000.00",
      "credit_limit": null,
      "color": "#6d4c41",
      "currency": "EUR"
    }
  ]
}
```

#### POST `/api/accounts`
Create a new account.

**Request:**
```json
{
  "name": "ING Checking",
  "account_type": "checking",
  "balance": 5000.00,
  "color": "#6d4c41",
  "currency": "EUR"
}
```

#### PUT `/api/accounts/:id`
Update an existing account.

#### DELETE `/api/accounts/:id`
Delete an account.

### Trends

#### GET `/api/trends`
Get monthly income/expense trends.

**Response:**
```json
{
  "trends": [
    {
      "month": "2024-01",
      "income": 2500.00,
      "expenses": 1500.00,
      "netBalance": 1000.00
    }
  ]
}
```

### Settings

#### GET `/api/settings`
Get user settings.

**Response:**
```json
{
  "expectedMonthlyIncome": 2500.00
}
```

#### POST `/api/settings`
Update user settings.

**Request:**
```json
{
  "expectedMonthlyIncome": 2500.00
}
```

### AI Assistant

#### GET `/api/ai/config`
Get user's AI configurations.

**Headers:** `Authorization: Bearer <token>` (required)

**Response:**
```json
{
  "configs": [
    {
      "id": 1,
      "provider": "openai",
      "api_key_preview": "****1234",
      "is_active": true
    }
  ]
}
```

#### POST `/api/ai/config`
Save or update AI configuration.

**Request:**
```json
{
  "provider": "openai",
  "apiKey": "sk-..."
}
```

#### POST `/api/ai/chat`
Send message to AI assistant.

**Request:**
```json
{
  "message": "How is my budget this month?",
  "timePeriod": "month",
  "language": "en"
}
```

**Parameters:**
- `message` - User's question (required)
- `timePeriod` - Filter: 'day', 'week', 'month', 'year', or null for all (optional)
- `language` - Response language: 'en' or 'es' (optional, default: 'en')

**Response:**
```json
{
  "response": "Based on your financial data...",
  "provider": "openai"
}
```

**Features:**
- Comprehensive financial context included
- Time period filtering
- Bilingual support (English/Spanish)
- Supports OpenAI, Claude, Gemini

#### GET `/api/ai/chat/history`
Get chat history.

**Query Parameters:**
- `limit` - Number of messages (default: 50)

**Response:**
```json
{
  "history": [
    {
      "id": 1,
      "provider": "openai",
      "user_message": "How is my budget?",
      "ai_response": "Your budget looks good...",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Admin

#### GET `/api/admin/users`
Get all users (admin only).

**Headers:** `Authorization: Bearer <token>` (admin required)

#### GET `/api/admin/users/:id`
Get detailed user information.

#### DELETE `/api/admin/users/:id`
Delete a user.

#### GET `/api/admin/stats`
Get platform statistics.

---

## Frontend Structure

### Component Architecture

```
frontend/src/
├── App.jsx                    # Main app component (routing, state)
├── main.jsx                    # Entry point
├── index.css                   # Global styles
│
├── components/
│   ├── Header.jsx              # App header with logo, user menu
│   ├── PremiumTabs.jsx        # Navigation tabs
│   ├── Dashboard.jsx           # Main dashboard with KPIs and charts
│   ├── Transactions.jsx        # Transaction list with filters
│   ├── Trends.jsx              # Monthly trends visualization
│   ├── Insights.jsx            # Financial insights with AI chat
│   ├── Budget.jsx              # Budget management
│   ├── Upload.jsx              # File upload interface
│   ├── Settings.jsx            # User settings and AI config
│   ├── Auth.jsx                # Login/Register modal
│   ├── CategoryModal.jsx       # Category selection modal
│   ├── TransferModal.jsx       # Transfer between accounts
│   ├── AddAccountModal.jsx     # Add/edit account modal
│   └── Admin.jsx               # Admin panel
│
├── context/
│   ├── LanguageContext.jsx     # i18n context (English/Spanish)
│   └── ThemeContext.jsx        # Dark/Light theme context
│
├── i18n/
│   └── translations.js         # Translation strings (en/es)
│
└── utils/
    ├── api.js                  # API client (axios wrapper)
    ├── auth.js                 # Authentication helpers
    ├── pdfParser.js            # PDF/CSV parsing logic
    ├── categoryColors.js      # Category color mapping
    └── categoryIcons.js        # Category icon mapping
```

### Key Components

#### `App.jsx`
Main application component managing:
- Tab navigation (hash-based routing)
- User authentication state
- Global refresh triggers
- Transaction filters
- URL hash persistence

**State:**
- `activeTab` - Current active tab
- `user` - Current user object
- `refreshTrigger` - Counter to trigger refreshes
- `transactionFilters` - Filters for transaction navigation

#### `Dashboard.jsx`
Main dashboard displaying:
- KPI cards (Income, Expenses, Balance, Savings)
- Income vs Expenses chart
- Expenses by Category chart
- Recent transactions table
- Balance advice

**Features:**
- Auto-refresh on transaction updates
- Drag-and-drop widget ordering (dnd-kit)
- Responsive grid layout
- Custom event listeners for real-time updates

#### `Transactions.jsx`
Transaction management interface with:
- Search functionality
- Filters (Type, Category, Bank, Month)
- Bulk category update
- Individual transaction category update
- Transaction deletion
- Pagination support

**Filtering:**
- Text search (description)
- Type filter (income/expense/all)
- Category filter
- Bank filter
- Month filter (YYYY-MM format)

#### `Insights.jsx`
Financial insights page with:
- Spending capacity analysis
- Financial status overview
- Spending by category (with progress bars)
- Credit card analysis
- Situation analysis
- AI recommendations
- **AI Assistant Chat** (integrated)

**AI Chat Features:**
- Time period selector (day/week/month/year/all)
- Suggested questions
- Chat history
- Bilingual support
- Real-time financial data context

#### `Upload.jsx`
File upload interface supporting:
- PDF files (ING, Sabadell statements)
- CSV files (ING, Sabadell, Generic formats)
- Excel files (.xls, .xlsx)
- Drag-and-drop
- Multiple file upload
- Auto-detection of bank format

#### `Budget.jsx`
Budget management with:
- Budget vs actual spending
- Category-based budgets
- Usage percentage tracking
- Progress indicators
- Budget creation/editing

### Context Providers

#### `LanguageContext.jsx`
Provides:
- `language` - Current language ('en' or 'es')
- `t(key)` - Translation function
- `toggleLanguage()` - Switch language
- Persists to localStorage

#### `ThemeContext.jsx`
Provides:
- `theme` - Current theme ('light' or 'dark')
- `toggleTheme()` - Switch theme
- Persists to localStorage

---

## Backend Structure

### Route Structure

```
backend/
├── server.js                  # Express server setup
├── config/
│   └── database.js           # PostgreSQL connection pool
│
├── middleware/
│   ├── auth.js               # JWT authentication middleware
│   ├── adminAuth.js          # Admin authorization middleware
│   └── getUserId.js          # User ID extraction helper
│
├── routes/
│   ├── auth.js               # Authentication endpoints
│   ├── transactions.js       # Transaction CRUD
│   ├── summary.js            # Financial summary
│   ├── trends.js             # Trends and analytics
│   ├── budget.js             # Budget management
│   ├── accounts.js           # Account management
│   ├── settings.js           # User settings
│   ├── ai.js                 # AI assistant endpoints
│   ├── admin.js              # Admin endpoints
│   ├── export.js             # CSV/Excel export
│   └── cleanup.js            # Data cleanup utilities
│
└── migrations/
    ├── run.js                # Run all migrations
    ├── add-categories-budgets.js
    ├── add-bank-accounts.js
    ├── add-ai-tables.js
    ├── add-computable-field.js
    ├── add-credit-card-fields.js
    └── ...
```

### Key Route Files

#### `routes/transactions.js`
Handles:
- Transaction upload with validation
- Duplicate detection
- Bulk updates
- Category assignment
- Account balance updates
- Summary recalculation
- Transaction deletion

**Key Functions:**
- `updateSummaries()` - Recalculate budget spent amounts
- Duplicate checking using Levenshtein distance
- Recurring income detection

#### `routes/summary.js`
Calculates:
- Current month income/expenses
- All-time totals
- Category breakdowns
- Recent transactions

**Logic:**
- Income: Uses `applicable_month` if available, otherwise `date`
- Expenses: Always uses actual `date` (ignores `applicable_month`)
- Filters by `computable = true`

#### `routes/ai.js`
AI assistant integration:
- Configuration management
- Chat endpoint with comprehensive financial context
- Chat history storage
- Support for OpenAI, Claude, Gemini
- Time period filtering
- Bilingual support

**Financial Context Includes:**
- All-time totals
- Filtered totals (by time period)
- Current month data
- Budget status
- Category breakdown
- Account balances
- Recent transactions
- Monthly trends

#### `routes/budget.js`
Budget management:
- Budget creation/updates
- Monthly spending calculation
- Budget vs actual comparison

---

## Key Features

### 1. Bank Statement Parsing

#### Supported Formats
- **ING (PDF)**: Spanish ING bank statements
- **ING (CSV)**: ING CSV exports with headers "F. VALOR", "CATEGORÍA", "IMPORTE"
- **Sabadell (Excel/CSV)**: "Consulta de movimientos" format
- **Generic CSV**: Date, Description, Amount columns

#### Parsing Logic (`frontend/src/utils/pdfParser.js`)

**PDF Parsing:**
- Uses `pdfjs-dist` for text extraction
- Preserves table structure using y-coordinates
- Detects bank format automatically
- Extracts transactions with date, description, amount

**CSV Parsing:**
- Handles Windows (`\r\n`) and Unix (`\n`) line endings
- Preserves line indices for header detection
- Handles quoted fields with commas
- Auto-detects format (ING, Sabadell, Generic)
- Maps ING categories to system categories

**Date Parsing:**
- Supports: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD
- Validates date formats
- Handles missing dates gracefully

**Amount Parsing:**
- Handles European format (comma as decimal separator)
- Removes currency symbols (€, $)
- Handles negative amounts
- Validates numeric values

### 2. Transaction Categorization

**Auto-Categorization:**
- Based on description keywords
- 57 pre-configured categories
- Category colors and icons
- User can override categories

**Bulk Updates:**
- Update similar transactions (90% description similarity)
- Uses Levenshtein distance for matching
- Updates category for multiple transactions at once

### 3. Financial Calculations

**Dashboard KPIs:**
- **Total Income**: Sum of all income transactions (all-time)
- **Total Expenses**: Sum of all expense transactions (all-time)
- **Net Balance**: Income - Expenses
- **Current Month Income**: Sum of income for current month
- **Current Month Expenses**: Sum of expenses for current month
- **Savings Rate**: (Income - Expenses) / Income * 100

**Budget Calculations:**
- **Spent**: Sum of expenses in category for current month
- **Remaining**: Budget - Spent
- **Usage**: (Spent / Budget) * 100

**Account Balances:**
- Updated automatically on transaction upload
- Supports multiple accounts
- Credit card utilization tracking

### 4. AI Assistant

**Features:**
- Multiple AI providers (OpenAI, Claude, Gemini)
- Comprehensive financial context
- Time period filtering
- Bilingual responses (English/Spanish)
- Chat history
- Suggested questions

**Financial Context:**
- Summary totals (all-time, filtered, current month)
- Budget status (all categories)
- Category breakdown (top 20)
- Account balances (all accounts)
- Recent transactions (last 10)
- Monthly trends (last 6 months)

**Prompt Optimization:**
- Concise summary format (not full JSON)
- Includes transaction counts
- Clear instructions for zero values
- Specific guidance for budget/spending questions

### 5. Multi-Account Management

**Account Types:**
- Checking accounts
- Savings accounts
- Credit cards (with limits, statement dates, due dates)
- Investment accounts
- General accounts

**Features:**
- Account balance tracking
- Credit utilization monitoring
- Exclude from statistics option
- Color coding
- Balance updates on transactions

### 6. Bilingual Support

**Languages:**
- English (en)
- Spanish (es)

**Implementation:**
- Context-based translations (`LanguageContext`)
- Translation files (`i18n/translations.js`)
- Persistent language preference (localStorage)
- Language toggle in header
- AI responses in user's language

**Translated Components:**
- Navigation tabs
- Dashboard labels
- Transaction filters
- AI assistant UI
- Settings pages
- Error messages

---

## Configuration

### Environment Variables

#### Backend (.env)
```bash
# Server
PORT=5000
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this

# CORS (optional)
FRONTEND_URL=https://aifinity.app
```

#### Frontend (.env)
```bash
# API URL (optional, defaults to relative path)
VITE_API_URL=https://aifinity-backend-production.up.railway.app/api

# Clerk (if using)
VITE_CLERK_PUBLISHABLE_KEY=pk_...
```

### Database Configuration

**Connection Pool:**
- Max connections: 20
- Connection timeout: 10 seconds
- SSL: Required for production (Railway)

**Connection String Format:**
```
postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require
```

---

## Deployment

### Backend Deployment (Railway)

1. **Connect Repository:**
   - Link GitHub repository
   - Railway auto-detects Node.js

2. **Environment Variables:**
   - `DATABASE_URL` - PostgreSQL connection string
   - `JWT_SECRET` - Random secret key
   - `NODE_ENV=production`
   - `PORT` - Railway sets automatically

3. **Build Command:**
   ```bash
   npm install
   ```

4. **Start Command:**
   ```bash
   npm start
   ```

5. **Database:**
   - Create PostgreSQL service on Railway
   - Copy connection URL to `DATABASE_URL`
   - Run migrations: `npm run migrate`

### Frontend Deployment (Netlify)

1. **Connect Repository:**
   - Link GitHub repository
   - Set build directory: `frontend`

2. **Build Settings:**
   - Build command: `npm run build`
   - Publish directory: `frontend/dist`
   - Node version: 18.x

3. **Environment Variables:**
   - `VITE_API_URL` - Backend API URL

4. **Netlify Configuration (`netlify.toml`):**
   ```toml
   [build]
     command = "cd frontend && npm install && npm run build"
     publish = "frontend/dist"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

### Database Migration

**Run Migrations:**
```bash
cd backend
npm run migrate
```

**Migration Files:**
- `add-categories-budgets.js` - Categories and budgets tables
- `add-bank-accounts.js` - Accounts table
- `add-ai-tables.js` - AI config and chat history
- `add-computable-field.js` - Computable flag for transactions
- `add-credit-card-fields.js` - Credit card fields

---

## Development Setup

### Prerequisites
- Node.js 16+ and npm
- PostgreSQL 13+
- Git

### Installation

1. **Clone Repository:**
   ```bash
   git clone <repository-url>
   cd Finova
   ```

2. **Install Dependencies:**
   ```bash
   # Root
   npm install

   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

3. **Setup Database:**
   ```bash
   # Create database
   createdb finova

   # Or using psql
   psql -U postgres
   CREATE DATABASE finova;
   \q
   ```

4. **Configure Environment:**
   ```bash
   # Backend .env
   cd backend
   cp .env.example .env
   # Edit .env with your database credentials
   ```

5. **Run Migrations:**
   ```bash
   cd backend
   npm run migrate
   ```

6. **Start Development Servers:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

### Development URLs
- Frontend: http://localhost:5173 (Vite default)
- Backend: http://localhost:5000

### Testing

**Test PDF Upload:**
1. Upload ING or Sabadell PDF statement
2. Verify transactions appear in Dashboard
3. Check categories are assigned

**Test CSV Upload:**
1. Upload CSV file
2. Verify parsing works correctly
3. Check duplicate detection

**Test AI Assistant:**
1. Configure AI provider in Settings
2. Ask financial questions
3. Verify responses are contextual

---

## File Parsing

### PDF Parsing (`frontend/src/utils/pdfParser.js`)

**Function: `parsePDFTransactions(file)`**
- Extracts text from PDF using pdfjs-dist
- Preserves table structure using y-coordinates
- Detects bank format (ING, Sabadell)
- Parses transactions with date, description, amount

**Supported Formats:**
- ING Spanish statements
- Sabadell statements

### CSV Parsing (`frontend/src/utils/pdfParser.js`)

**Function: `parseCSVTransactions(file)`**
- Handles multiple line endings (\r\n, \n)
- Auto-detects format
- Preserves line indices for header detection

**Format Detection:**
- `detectINGSpanishFormat()` - Detects ING CSV format
- `detectSabadellFormat()` - Detects Sabadell format
- Falls back to generic CSV parsing

**ING CSV Format:**
```
Headers: "F. VALOR", "CATEGORÍA", "IMPORTE", "DESCRIPCIÓN"
Contains: "Movimientos de la Cuenta"
```

**Sabadell Format:**
```
Headers: "Fecha", "Concepto", "Importe"
```

**Generic CSV Format:**
```
Headers: Date, Description, Amount (or variations)
```

### Transaction Extraction

**Date Parsing:**
- Supports: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD
- Validates date ranges
- Handles missing dates

**Amount Parsing:**
- European format (comma as decimal): "1.234,56"
- US format (dot as decimal): "1234.56"
- Currency symbols: €, $, etc.
- Negative amounts: "-100.00" or "(100.00)"

**Category Mapping:**
- ING categories mapped to system categories
- Auto-categorization based on description keywords
- User can override categories

---

## AI Assistant

### Configuration

**Supported Providers:**
- OpenAI (gpt-4o)
- Claude (claude-3-haiku-20240307)
- Gemini (gemini-pro)

**Setup:**
1. Go to Settings → AI Assistant
2. Select provider
3. Enter API key
4. Activate configuration

### Chat Endpoint

**Endpoint:** `POST /api/ai/chat`

**Request:**
```json
{
  "message": "How is my budget this month?",
  "timePeriod": "month",
  "language": "en"
}
```

**Time Periods:**
- `day` - Today's transactions
- `week` - This week's transactions
- `month` - This month's transactions
- `year` - This year's transactions
- `null` or `all` - All transactions

**Response Language:**
- `en` - English responses
- `es` - Spanish responses

### Financial Context

The AI receives:
- Summary totals (all-time, filtered, current month)
- Budget status (all categories with usage)
- Category breakdown (top 20)
- Account balances (all accounts)
- Recent transactions (last 10)
- Monthly trends (last 6 months)

**Context Format:**
```
Financial Data Summary:
- All-time: Income €X, Expenses €Y, Net €Z, N transactions
- Current Month: Income €X, Expenses €Y, Net €Z
- Filtered Period (month): Income €X, Expenses €Y, Net €Z, N transactions
- Expected Monthly Income: €X
- N spending categories
- N accounts (N credit cards)
- N recent transactions
- N months of trend data
- N budget categories

Top Spending Categories:
1. Category: €X (N transactions)
...

Budget Status:
- Category: Budget €X, Spent €Y, Remaining €Z, Usage N%

Account Balances:
- Account Name (type): €X, Limit €Y

Recent Transactions:
- Date: Description - €X (Category)
```

### Error Handling

**Common Errors:**
- Invalid API key (401)
- Rate limit exceeded (429)
- Quota exceeded
- Network errors

**Error Messages:**
- Specific error messages for each error type
- Helpful guidance for resolution
- Detailed logging for debugging

---

## Design System

### Colors

**Primary Gradient:**
- Start: `#667eea` (Purple)
- End: `#764ba2` (Violet)
- Pantone equivalents: ~2726 C, ~266 C

**State Colors:**
- Success: `#10b981` (Green)
- Danger: `#ef4444` (Red)
- Warning: `#f59e0b` (Amber)
- Info: `#3b82f6` (Blue)

**Category Colors:**
- Income: `#10b981` (Green)
- Expenses: Various (see `categoryColors.js`)
- Housing: `#8b5cf6` (Purple)
- Transport: `#3b82f6` (Blue)
- Food: `#f59e0b` (Amber)
- And more...

### Typography

**Font Family:** Inter (Google Fonts)
- Weights: 300, 400, 500, 600, 700, 800, 900
- Usage: All UI text

**Font Sizes:**
- Headers: `text-2xl`, `text-3xl`
- Body: `text-base`, `text-sm`
- Small: `text-xs`

### Spacing

**Tailwind Defaults:**
- Padding: `p-2`, `p-4`, `p-6`
- Margin: `m-2`, `m-4`, `m-6`
- Gap: `gap-2`, `gap-4`, `gap-6`

### Components

**Cards:**
- Rounded: `rounded-xl`, `rounded-2xl`
- Shadow: `shadow-lg`, `shadow-premium`
- Border: `border`, `border-2`

**Buttons:**
- Primary: Purple gradient background
- Secondary: Gray background
- Danger: Red background
- Sizes: `px-4 py-2`, `px-6 py-3`

**Inputs:**
- Border: `border-2 border-gray-300`
- Focus: `focus:ring-2 focus:ring-purple-500`
- Rounded: `rounded-lg`, `rounded-xl`

---

## Key Implementation Details

### Authentication Flow

1. User registers/logs in via `/api/auth/register` or `/api/auth/login`
2. Backend returns JWT token
3. Frontend stores token in localStorage
4. Token included in Authorization header for protected routes
5. Middleware validates token on each request

### User ID Handling

**Demo Mode:**
- `user_id` is NULL in database
- Transactions shared across demo users
- No authentication required

**Authenticated Mode:**
- `user_id` is set from JWT token
- Transactions isolated per user
- All queries filter by `user_id`

### Transaction Upload Flow

1. User uploads PDF/CSV file
2. Frontend parses file using `pdfParser.js`
3. Transactions extracted with dates, descriptions, amounts
4. Auto-categorization applied
5. Transactions sent to `/api/transactions/upload`
6. Backend validates and checks for duplicates
7. Transactions inserted into database
8. Account balances updated
9. Summaries recalculated
10. Dashboard refreshes automatically

### Dashboard Refresh Mechanism

**Triggers:**
- Transaction upload complete
- Transaction category update
- Transaction deletion
- Custom event: `transactionUpdated`
- Tab visibility change
- Window focus

**Implementation:**
- `refreshTrigger` state in App.jsx
- Passed as prop to Dashboard
- Dashboard useEffect watches for changes
- Custom events dispatched from Transactions component

### URL Hash Routing

**Implementation:**
- Hash-based routing: `#/dashboard`, `#/transactions`, etc.
- Persists across page refreshes
- Browser back/forward support
- No server-side routing required

**Hash Format:**
- `#/dashboard` - Dashboard tab
- `#/transactions` - Transactions tab
- `#/insights` - Insights tab
- etc.

---

## Known Issues & Limitations

### Current Limitations
1. PDF parsing works best with text-based PDFs (not scanned images)
2. CSV format detection may fail with non-standard formats
3. Duplicate detection uses Levenshtein distance (may miss some variations)
4. Account balance updates are automatic but may need manual correction
5. Budget calculations are monthly (no daily/weekly budgets yet)

### Future Enhancements
- Multi-currency support
- Recurring transaction detection
- Budget alerts and notifications
- Email reports
- Mobile app (React Native)
- Bank API integration (Open Banking)
- Investment tracking
- Tax report generation
- Advanced AI insights with custom models

---

## Code Quality & Best Practices

### Code Style
- ES6+ JavaScript (ES Modules)
- React Hooks for state management
- Functional components
- Async/await for async operations
- Error handling with try-catch
- Console logging for debugging

### Security
- JWT token authentication
- Bcrypt password hashing
- SQL injection prevention (parameterized queries)
- CORS configuration
- Input validation
- API key storage (consider encryption for production)

### Performance
- Database connection pooling
- Indexed database queries
- React memoization where needed
- Lazy loading for large datasets
- Optimized AI prompts (summary format)

---

## Testing

### Manual Testing Checklist

**File Upload:**
- [ ] PDF upload (ING)
- [ ] PDF upload (Sabadell)
- [ ] CSV upload (ING)
- [ ] CSV upload (Sabadell)
- [ ] CSV upload (Generic)
- [ ] Excel upload
- [ ] Multiple files upload
- [ ] Duplicate detection

**Dashboard:**
- [ ] KPIs display correctly
- [ ] Charts render properly
- [ ] Recent transactions show
- [ ] Refresh on transaction update
- [ ] Drag-and-drop widgets

**Transactions:**
- [ ] Filter by type
- [ ] Filter by category
- [ ] Filter by bank
- [ ] Filter by month
- [ ] Search functionality
- [ ] Bulk category update
- [ ] Individual category update
- [ ] Delete transaction

**AI Assistant:**
- [ ] Configure provider
- [ ] Send message
- [ ] Time period filtering
- [ ] Language switching
- [ ] Chat history
- [ ] Error handling

---

## Support & Resources

### Documentation Files
- `README.md` - Basic setup guide
- `API_DOCUMENTATION.md` - API reference
- `FEATURES.md` - Feature list
- `AIFINITY_DESIGN_SYSTEM.md` - Design system
- `DEPLOYMENT.md` - Deployment guide

### External Resources
- **React**: https://react.dev
- **Express**: https://expressjs.com
- **PostgreSQL**: https://www.postgresql.org/docs
- **TailwindCSS**: https://tailwindcss.com/docs
- **Recharts**: https://recharts.org

---

## License

MIT License - See LICENSE file for details

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Maintained by:** AiFinity Development Team

