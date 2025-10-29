# AiFinity.app - AI-Powered Financial Intelligence 🤖💰

A cutting-edge full-stack financial intelligence platform powered by AI that automatically analyzes and visualizes financial data extracted from PDF statements and CSV files (ING & Sabadell banks).

🌐 **Official Website**: [aifinity.app](https://aifinity.app)

![Tech Stack](https://img.shields.io/badge/React-18.2-blue)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-Styling-cyan)

## ✨ Features

### 🎯 Core Features
- **PDF & CSV Upload**: Drag-and-drop interface for uploading bank statements
- **Automatic Parsing**: Extracts transactions from ING and Sabadell bank statements using pdf.js
- **Smart Categorization**: AI-powered transaction categorization (Groceries, Transport, Entertainment, etc.)
- **Real-time Analytics**: Interactive charts and KPIs using Recharts
- **Multi-view Dashboard**: Upload, Dashboard, Trends, and Insights tabs
- **Data Export**: Download your data as CSV or Excel files

### 📊 Visualizations
- **KPI Cards**: Total Income, Total Expenses, Net Balance
- **Bar Charts**: Expense breakdown by category
- **Pie Charts**: Income vs Expenses comparison
- **Area Charts**: Monthly income and expense trends
- **Line Charts**: Net balance over time
- **Transaction Tables**: Detailed transaction history

### 🔐 Security & User Management
- **JWT Authentication**: Secure user authentication
- **Multi-user Support**: Each user's data stored separately
- **Demo Mode**: Use without login (shared demo account)
- **Protected Routes**: API endpoints secured with JWT middleware

### 🎨 Design
- **Premium UI**: Revolut-style modern interface
- **Dark Mode**: Beautiful dark theme with smooth transitions
- **Responsive**: Mobile-first design
- **Accessible**: ARIA labels and keyboard navigation
- **Bilingual**: Full English and Spanish support

## 🛠️ Tech Stack

### Frontend
- **React 18.2** with Vite
- **TailwindCSS** for styling
- **Recharts** for data visualization
- **pdf.js** for PDF parsing
- **Lucide React** for icons
- **Axios** for API calls

### Backend
- **Node.js** with Express
- **PostgreSQL** database
- **JWT** for authentication
- **bcrypt** for password hashing
- **XLSX** for Excel export

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v13 or higher) - [Download](https://www.postgresql.org/download/)
- **npm** or **yarn** package manager

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd AiFinity
```

> **Note**: The project folder is currently named "Finova" - you can rename it to "AiFinity" if desired.

### 2. Backend Setup

#### Install Dependencies
```bash
cd backend
npm install
```

#### Configure Environment Variables
Create a `.env` file in the `backend` directory:
```bash
cp .env.example .env
```

Edit `.env` with your database credentials:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/finova
JWT_SECRET=your-super-secret-jwt-key-change-this
NODE_ENV=development
```

#### Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE finova;

# Exit psql
\q
```

#### Run Migrations
```bash
npm run migrate
```

#### Start Backend Server
```bash
npm run dev
```

The backend server will run on `http://localhost:5000`

### 3. Frontend Setup

#### Install Dependencies
```bash
cd ../frontend
npm install
```

#### Configure Environment (Optional)
Create a `.env` file in the `frontend` directory if you need to customize the API URL:
```env
VITE_API_URL=http://localhost:5000/api
```

#### Start Frontend Development Server
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## 📖 Usage Guide

### 1. Register/Login (Optional)
- Click the "Login" button in the header
- Register a new account or login with existing credentials
- You can also use the app without logging in (demo mode)

### 2. Upload Bank Statements
1. Navigate to the **Upload** tab
2. Drag and drop your PDF or CSV files from ING or Sabadell
3. Click "Process and Upload"
4. Wait for the parsing to complete

### 3. View Dashboard
- **Dashboard Tab**: View KPIs, charts, and recent transactions
- **Trends Tab**: Analyze monthly income/expense trends
- **Insights Tab**: Get AI-generated financial insights

### 4. Export Data
- Click "Export CSV" or "Export Excel" to download your transaction data
- Use "Reset Data" to clear all transactions (irreversible)

## 🏗️ Project Structure

```
Finova/
├── backend/
│   ├── config/
│   │   └── database.js          # PostgreSQL connection
│   ├── middleware/
│   │   └── auth.js              # JWT authentication middleware
│   ├── migrations/
│   │   └── run.js               # Database schema migrations
│   ├── routes/
│   │   ├── auth.js              # Authentication endpoints
│   │   ├── transactions.js      # Transaction CRUD operations
│   │   ├── summary.js           # Summary statistics
│   │   ├── trends.js            # Trends and insights
│   │   └── export.js            # CSV/Excel export
│   ├── .env                     # Environment variables
│   ├── package.json
│   └── server.js                # Express server
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth.jsx         # Login/Register modal
│   │   │   ├── Dashboard.jsx    # Main dashboard view
│   │   │   ├── Header.jsx       # App header
│   │   │   ├── Insights.jsx     # Insights view
│   │   │   ├── Tabs.jsx         # Tab navigation
│   │   │   ├── Trends.jsx       # Trends view
│   │   │   └── Upload.jsx       # File upload component
│   │   ├── utils/
│   │   │   ├── api.js           # API client
│   │   │   ├── auth.js          # Auth helpers
│   │   │   └── pdfParser.js     # PDF/CSV parsing logic
│   │   ├── App.jsx              # Main app component
│   │   ├── index.css            # Global styles
│   │   └── main.jsx             # App entry point
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
└── README.md                     # This file
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Transactions
- `POST /api/transactions/upload` - Upload transactions
- `GET /api/transactions` - Get all transactions
- `DELETE /api/transactions/all` - Delete all transactions

### Analytics
- `GET /api/summary` - Get summary statistics
- `GET /api/trends` - Get monthly trends
- `GET /api/trends/insights` - Get AI insights

### Export
- `GET /api/export/csv` - Export as CSV
- `GET /api/export/excel` - Export as Excel

## 🎨 Customization

### Colors
Edit `frontend/tailwind.config.js`:
```javascript
colors: {
  primary: '#0ea5e9',    // Blue
  success: '#22c55e',    // Green
  danger: '#ef4444',     // Red
}
```

### Categories
Add or modify categories in `frontend/src/utils/pdfParser.js` in the `categorizeTransaction` function.

## 🧪 Testing

### Test PDF Upload
1. Download a bank statement PDF from ING or Sabadell
2. Upload it via the Upload tab
3. Verify transactions appear in Dashboard

### Test CSV Import
Create a CSV file with this format:
```csv
Bank,Date,Category,Description,Amount,Type
ING,2024-01-15,Groceries,Supermarket purchase,45.50,expense
ING,2024-01-16,Salary,Monthly salary,2500.00,income
```

## 🐛 Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running: `pg_ctl status`
- Check database credentials in `.env`
- Verify database exists: `psql -U postgres -l`

### PDF Parsing Issues
- Ensure the PDF contains text (not scanned images)
- Check browser console for parsing errors
- Try with a different PDF file

### Port Already in Use
- Backend: Change `PORT` in `backend/.env`
- Frontend: Change `server.port` in `frontend/vite.config.js`

## 🚀 Deployment

### Backend (Render/Railway)
1. Push code to GitHub
2. Create new Web Service
3. Set environment variables (DATABASE_URL, JWT_SECRET)
4. Deploy from GitHub repo

### Frontend (Vercel/Netlify)
1. Push code to GitHub
2. Connect repo to Vercel/Netlify
3. Set `VITE_API_URL` to your backend URL
4. Deploy

### Database (Railway/Supabase)
1. Create PostgreSQL instance
2. Copy connection URL
3. Update `DATABASE_URL` in backend `.env`
4. Run migrations

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues or questions, please open an issue on GitHub.

## 🌟 Features Roadmap

- [ ] Multi-currency support
- [ ] Budget planning and alerts
- [ ] Scheduled reports via email
- [ ] Mobile app (React Native)
- [ ] Advanced AI insights using OpenAI
- [ ] Bank API integration
- [ ] Recurring transaction detection
- [ ] Investment tracking
- [ ] Tax report generation

---

Built with ❤️ using React, Node.js, and PostgreSQL


