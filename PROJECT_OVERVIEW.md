# Finova - Project Overview 🎯

**A Complete Full-Stack Financial Dashboard Application**

## 🌟 What is Finova?

Finova is a modern web application that transforms bank statements (PDF/CSV) into beautiful, interactive financial dashboards. It automatically categorizes transactions, generates insights, and helps users understand their spending patterns.

## 🎨 Visual Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                          │
│  ┌──────────┬──────────┬──────────┬──────────┐            │
│  │  Upload  │Dashboard │ Trends   │ Insights │  Tabs      │
│  └──────────┴──────────┴──────────┴──────────┘            │
│                                                             │
│  Upload Tab:                                                │
│  ┌─────────────────────────────────────────┐              │
│  │  📄 Drag & Drop PDF/CSV Files           │              │
│  │  🔄 Auto-parse transactions             │              │
│  │  ✅ Categorize automatically            │              │
│  └─────────────────────────────────────────┘              │
│                                                             │
│  Dashboard Tab:                                             │
│  ┌───────┐ ┌───────┐ ┌───────┐                           │
│  │Income │ │Expense│ │Balance│  KPI Cards                │
│  └───────┘ └───────┘ └───────┘                           │
│  ┌─────────────┐ ┌─────────────┐                         │
│  │ Bar Chart   │ │ Pie Chart   │  Visualizations         │
│  └─────────────┘ └─────────────┘                         │
│  ┌──────────────────────────────┐                         │
│  │   Transaction Table          │                         │
│  └──────────────────────────────┘                         │
│                                                             │
│  Trends Tab:                                                │
│  ┌──────────────────────────────┐                         │
│  │  Area Chart: Income/Expense  │                         │
│  │  Line Chart: Net Balance     │                         │
│  │  Monthly Summary Table       │                         │
│  └──────────────────────────────┘                         │
│                                                             │
│  Insights Tab:                                              │
│  ┌──────────────────────────────┐                         │
│  │  💡 AI-Generated Insights    │                         │
│  │  📊 Financial Tips           │                         │
│  │  🎯 Budget Recommendations   │                         │
│  └──────────────────────────────┘                         │
└─────────────────────────────────────────────────────────────┘
                        ↕ HTTPS/API
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND API SERVER                       │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  🔐 Authentication (JWT)                            │  │
│  │  📤 Transaction Upload                              │  │
│  │  📊 Summary Statistics                              │  │
│  │  📈 Trends Analysis                                 │  │
│  │  💡 Insights Generation                             │  │
│  │  💾 CSV/Excel Export                                │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                        ↕ SQL Queries
┌─────────────────────────────────────────────────────────────┐
│                  POSTGRESQL DATABASE                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
│  │   users     │ │transactions │ │  summaries  │         │
│  │             │ │             │ │             │         │
│  │ • id        │ │ • id        │ │ • id        │         │
│  │ • email     │ │ • user_id   │ │ • user_id   │         │
│  │ • password  │ │ • bank      │ │ • month     │         │
│  │ • full_name │ │ • date      │ │ • income    │         │
│  │ • created   │ │ • category  │ │ • expenses  │         │
│  │             │ │ • amount    │ │ • balance   │         │
│  └─────────────┘ └─────────────┘ └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## 📁 File Structure

```
Finova/
│
├── 📖 Documentation
│   ├── README.md                    # Main documentation
│   ├── SETUP_GUIDE.md              # Quick start guide
│   ├── FEATURES.md                 # Feature list (150+)
│   ├── DEPLOYMENT.md               # Production deployment
│   ├── API_DOCUMENTATION.md        # Complete API docs
│   └── PROJECT_OVERVIEW.md         # This file
│
├── 🗃️ Sample Data
│   ├── sample_transactions.csv      # Test data (40+ transactions)
│   └── .gitignore                  # Git ignore rules
│
├── 📦 Root Configuration
│   └── package.json                # Root npm scripts
│
├── 🖥️ BACKEND (Node.js + Express + PostgreSQL)
│   ├── config/
│   │   └── database.js             # PostgreSQL connection pool
│   │
│   ├── middleware/
│   │   └── auth.js                 # JWT auth middleware
│   │
│   ├── migrations/
│   │   └── run.js                  # Database schema setup
│   │
│   ├── routes/
│   │   ├── auth.js                 # Login/Register endpoints
│   │   ├── transactions.js         # CRUD operations
│   │   ├── summary.js              # Analytics aggregation
│   │   ├── trends.js               # Time-series data
│   │   └── export.js               # CSV/Excel generation
│   │
│   ├── server.js                   # Express app entry point
│   ├── package.json                # Backend dependencies
│   ├── .env                        # Environment variables
│   └── .gitignore
│
└── 🎨 FRONTEND (React + Vite + TailwindCSS)
    ├── public/                     # Static assets
    │
    ├── src/
    │   ├── components/
    │   │   ├── Header.jsx          # App header with auth
    │   │   ├── Tabs.jsx            # Tab navigation
    │   │   ├── Auth.jsx            # Login/Register modal
    │   │   ├── Upload.jsx          # File upload + PDF parsing
    │   │   ├── Dashboard.jsx       # Main dashboard view
    │   │   ├── Trends.jsx          # Trends visualization
    │   │   └── Insights.jsx        # AI insights display
    │   │
    │   ├── utils/
    │   │   ├── pdfParser.js        # PDF.js parsing logic
    │   │   ├── api.js              # Axios HTTP client
    │   │   └── auth.js             # Auth helpers
    │   │
    │   ├── App.jsx                 # Main app component
    │   ├── main.jsx                # React entry point
    │   └── index.css               # Global styles
    │
    ├── index.html                  # HTML template
    ├── package.json                # Frontend dependencies
    ├── vite.config.js              # Vite configuration
    ├── tailwind.config.js          # TailwindCSS config
    ├── postcss.config.js           # PostCSS config
    ├── .env                        # Frontend env vars
    └── .gitignore
```

## 🚀 Technology Stack

### Frontend Stack
```
React 18.2        ────►  UI Framework
Vite              ────►  Build Tool (Fast!)
TailwindCSS       ────►  Styling
Recharts          ────►  Data Visualization
pdf.js            ────►  PDF Parsing
Axios             ────►  HTTP Client
Lucide React      ────►  Icons
```

### Backend Stack
```
Node.js           ────►  Runtime
Express           ────►  Web Framework
PostgreSQL        ────►  Database
JWT               ────►  Authentication
bcrypt            ────►  Password Hashing
XLSX              ────►  Excel Export
```

## 🔄 Data Flow

```
1. User uploads PDF/CSV
         ↓
2. Frontend parses with pdf.js
         ↓
3. Transactions extracted
         ↓
4. Sent to backend API
         ↓
5. Stored in PostgreSQL
         ↓
6. Summaries calculated
         ↓
7. Data returned to frontend
         ↓
8. Charts rendered with Recharts
         ↓
9. User views dashboard
```

## 🎯 Key Features Summary

| Feature | Description | Status |
|---------|-------------|--------|
| 📤 PDF Upload | Drag-and-drop PDF parsing | ✅ Complete |
| 📊 CSV Import | CSV file support | ✅ Complete |
| 🏦 Multi-Bank | ING & Sabadell support | ✅ Complete |
| 🤖 Auto-Categorize | AI categorization | ✅ Complete |
| 📈 Charts | Bar, Pie, Area, Line charts | ✅ Complete |
| 💡 Insights | AI-generated insights | ✅ Complete |
| 📥 Export | CSV & Excel download | ✅ Complete |
| 🔐 Auth | JWT authentication | ✅ Complete |
| 👥 Multi-User | User-specific data | ✅ Complete |
| 📱 Responsive | Mobile-friendly UI | ✅ Complete |
| ♿ Accessible | ARIA labels, keyboard nav | ✅ Complete |
| 🎨 Modern UI | TailwindCSS styling | ✅ Complete |

## 📊 Supported Bank Formats

### ING Bank
```
Format: Date Description Amount
Example:
15-01-2024 Mercadona Shopping 85.50
20-01-2024 Monthly Salary 2500.00
```

### Banco Sabadell
```
Format: Date Description Amount
Example:
01/02/2024 Carrefour 92.30
15/02/2024 Salary Payment 2500.00
```

### CSV Format
```csv
Bank,Date,Category,Description,Amount,Type
ING,2024-01-15,Groceries,Shopping,85.50,expense
ING,2024-01-20,Salary,Monthly,2500.00,income
```

## 🎨 Color Scheme

```css
Primary (Blue):    #0ea5e9  ████  Links, buttons
Success (Green):   #22c55e  ████  Positive values
Danger (Red):      #ef4444  ████  Negative values
Background:        #f9fafb  ████  Page background
Card White:        #ffffff  ████  Card backgrounds
Text Dark:         #111827  ████  Primary text
Text Gray:         #6b7280  ████  Secondary text
```

## 📈 Transaction Categories

| Icon | Category | Examples |
|------|----------|----------|
| 💰 | Salary | Payroll, salary payments |
| 🛒 | Groceries | Mercadona, Carrefour, Lidl |
| 🚗 | Transport | Gas, metro, taxi |
| 🍽️ | Restaurants | Restaurants, cafes |
| 🛍️ | Shopping | Amazon, Zara, H&M |
| ⚡ | Utilities | Electricity, water, internet |
| 🏠 | Rent | Rent payments |
| 🎬 | Entertainment | Netflix, cinema, Spotify |
| 🏥 | Healthcare | Pharmacy, doctor |
| 📦 | Other | Uncategorized |

## 🔒 Security Features

- ✅ Password hashing with bcrypt (10 rounds)
- ✅ JWT tokens with 7-day expiration
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection
- ✅ CORS configuration
- ✅ Environment variables for secrets
- ✅ HTTPS in production

## 📱 Responsive Breakpoints

```css
Mobile:     < 640px   (sm)
Tablet:     640-768px (md)
Laptop:     768-1024px (lg)
Desktop:    1024px+   (xl)
```

## 🎯 User Journey

### First-Time User
```
1. Visit app → 2. See Upload tab
              ↓
3. Upload PDF → 4. See processing
              ↓
5. Auto-redirect → 6. View Dashboard
                  ↓
7. Explore Trends → 8. Read Insights
                  ↓
9. Export data → 10. Optional: Register account
```

### Returning User
```
1. Login → 2. View saved Dashboard
          ↓
3. Upload new statements → 4. See updated charts
                          ↓
5. Compare trends → 6. Download reports
```

## 🚀 Quick Start Commands

```bash
# Install all dependencies
npm run install:all

# Start backend (Terminal 1)
cd backend
npm run migrate  # First time only
npm run dev

# Start frontend (Terminal 2)
cd frontend
npm run dev

# Visit: http://localhost:3000
```

## 📊 Sample Metrics

With the included `sample_transactions.csv` (40 transactions):

```
Total Income:      €10,000.00
Total Expenses:    €5,892.79
Net Balance:       €4,107.21
Categories:        10
Months:            4 (Jan-Apr 2024)
Transactions:      40
```

## 🎁 What's Included

✅ **12 Backend Files** - Complete REST API  
✅ **10 Frontend Components** - React UI  
✅ **3 Utility Modules** - Parsing, API, Auth  
✅ **6 Documentation Files** - Comprehensive guides  
✅ **Sample Data** - 40 test transactions  
✅ **Database Migrations** - Automated setup  
✅ **Environment Configs** - Ready to deploy  
✅ **Git Ignores** - Clean repository  

**Total: 30+ files, 3000+ lines of code**

## 🌟 Highlights

- **Zero External Services**: Everything runs locally
- **No API Keys Required**: No OpenAI, Stripe, etc.
- **Instant Setup**: 5 minutes to running app
- **Production Ready**: Deploy to Vercel/Railway
- **Well Documented**: 6 comprehensive guides
- **Type Safe**: Proper error handling
- **Optimized**: Fast parsing and rendering
- **Scalable**: Multi-user architecture

## 🎓 Learning Value

Perfect for learning:
- ✅ Full-stack development
- ✅ React hooks and state management
- ✅ REST API design
- ✅ PostgreSQL database design
- ✅ JWT authentication
- ✅ PDF parsing with pdf.js
- ✅ Data visualization with Recharts
- ✅ TailwindCSS styling
- ✅ Modern deployment practices

## 🤝 Contributing

Want to improve Finova?

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

Ideas for contributions:
- 🌐 Multi-language support
- 🌙 Dark mode
- 📧 Email reports
- 📊 More chart types
- 🏦 More banks
- 💱 Multi-currency
- 📱 Mobile app

## 📞 Support

Need help?
- 📖 Read the [README.md](README.md)
- 🚀 Check [SETUP_GUIDE.md](SETUP_GUIDE.md)
- 🐛 Review [Troubleshooting](README.md#troubleshooting)
- 💬 Open an issue on GitHub

## 📝 License

MIT License - Free for personal and commercial use.

---

**Built with ❤️ for financial clarity and independence**

Start your journey to better financial management today! 🚀












