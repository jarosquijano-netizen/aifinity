# Finova API Documentation 📚

Complete REST API documentation for Finova backend.

**Base URL**: `http://localhost:5000/api` (development)

## 📋 Table of Contents
- [Authentication](#authentication)
- [Transactions](#transactions)
- [Summary](#summary)
- [Trends](#trends)
- [Export](#export)
- [Error Handling](#error-handling)

---

## Authentication

### Register User

Create a new user account.

**Endpoint**: `POST /api/auth/register`

**Headers**:
```json
{
  "Content-Type": "application/json"
}
```

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "fullName": "John Doe"
}
```

**Response** (201 Created):
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

**Error Responses**:
- `400` - Email and password required
- `400` - User already exists
- `500` - Registration failed

---

### Login User

Authenticate existing user.

**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response** (200 OK):
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

**Error Responses**:
- `400` - Email and password required
- `401` - Invalid credentials
- `500` - Login failed

---

## Transactions

### Upload Transactions

Upload parsed transaction data from PDF/CSV files.

**Endpoint**: `POST /api/transactions/upload`

**Headers**:
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <token>" // Optional
}
```

**Request Body**:
```json
{
  "transactions": [
    {
      "bank": "ING",
      "date": "2024-01-15",
      "category": "Groceries",
      "description": "Mercadona Shopping",
      "amount": 85.50,
      "type": "expense"
    },
    {
      "bank": "ING",
      "date": "2024-01-20",
      "category": "Salary",
      "description": "Monthly Salary",
      "amount": 2500.00,
      "type": "income"
    }
  ]
}
```

**Response** (201 Created):
```json
{
  "message": "Transactions uploaded successfully",
  "count": 2,
  "transactions": [
    {
      "id": 1,
      "user_id": 1,
      "bank": "ING",
      "date": "2024-01-15",
      "category": "Groceries",
      "description": "Mercadona Shopping",
      "amount": "85.50",
      "type": "expense",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**Error Responses**:
- `400` - Invalid transaction data
- `500` - Failed to upload transactions

---

### Get All Transactions

Retrieve all transactions for the authenticated user.

**Endpoint**: `GET /api/transactions`

**Headers**:
```json
{
  "Authorization": "Bearer <token>" // Optional
}
```

**Response** (200 OK):
```json
{
  "transactions": [
    {
      "id": 1,
      "user_id": 1,
      "bank": "ING",
      "date": "2024-01-15",
      "category": "Groceries",
      "description": "Mercadona Shopping",
      "amount": "85.50",
      "type": "expense",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**Error Responses**:
- `500` - Failed to fetch transactions

---

### Delete All Transactions

Delete all transactions for the authenticated user (or demo account).

**Endpoint**: `DELETE /api/transactions/all`

**Headers**:
```json
{
  "Authorization": "Bearer <token>" // Optional
}
```

**Response** (200 OK):
```json
{
  "message": "All transactions deleted successfully"
}
```

**Error Responses**:
- `500` - Failed to delete transactions

---

## Summary

### Get Summary Statistics

Retrieve aggregated financial statistics.

**Endpoint**: `GET /api/summary`

**Headers**:
```json
{
  "Authorization": "Bearer <token>" // Optional
}
```

**Response** (200 OK):
```json
{
  "totalIncome": 5000.00,
  "totalExpenses": 3250.75,
  "netBalance": 1749.25,
  "transactionCount": 45,
  "categories": [
    {
      "category": "Groceries",
      "total": "450.50",
      "count": "12",
      "type": "expense"
    },
    {
      "category": "Salary",
      "total": "5000.00",
      "count": "2",
      "type": "income"
    }
  ],
  "recentTransactions": [
    {
      "id": 45,
      "bank": "ING",
      "date": "2024-03-20",
      "category": "Groceries",
      "description": "Carrefour",
      "amount": "92.30",
      "type": "expense"
    }
  ]
}
```

**Error Responses**:
- `500` - Failed to fetch summary

---

## Trends

### Get Monthly Trends

Retrieve month-by-month financial trends.

**Endpoint**: `GET /api/trends`

**Headers**:
```json
{
  "Authorization": "Bearer <token>" // Optional
}
```

**Response** (200 OK):
```json
{
  "monthlyTrends": [
    {
      "month": "2024-01",
      "income": 2500.00,
      "expenses": 1850.50,
      "netBalance": 649.50,
      "transactionCount": 25
    },
    {
      "month": "2024-02",
      "income": 2500.00,
      "expenses": 2100.30,
      "netBalance": 399.70,
      "transactionCount": 28
    }
  ],
  "categoryTrends": [
    {
      "month": "2024-01",
      "category": "Groceries",
      "total": "450.50",
      "type": "expense"
    }
  ]
}
```

**Error Responses**:
- `500` - Failed to fetch trends

---

### Get Insights

Retrieve AI-generated financial insights.

**Endpoint**: `GET /api/trends/insights`

**Headers**:
```json
{
  "Authorization": "Bearer <token>" // Optional
}
```

**Response** (200 OK):
```json
{
  "insights": [
    {
      "type": "success",
      "message": "Great! Your spending decreased by 12.5% this month."
    },
    {
      "type": "warning",
      "message": "Your spending increased by 8.3% this month compared to last month."
    },
    {
      "type": "info",
      "message": "Your highest spending category is \"Groceries\" with €450.50."
    }
  ]
}
```

**Insight Types**:
- `success` - Positive financial behavior
- `warning` - Concerning trends
- `info` - General information

**Error Responses**:
- `500` - Failed to generate insights

---

## Export

### Export as CSV

Download all transactions as CSV file.

**Endpoint**: `GET /api/export/csv`

**Headers**:
```json
{
  "Authorization": "Bearer <token>" // Optional
}
```

**Response** (200 OK):
```
Content-Type: text/csv
Content-Disposition: attachment; filename=transactions.csv

Bank,Date,Category,Description,Amount,Type
ING,2024-01-15,Groceries,"Mercadona Shopping",85.50,expense
ING,2024-01-20,Salary,"Monthly Salary",2500.00,income
```

**Error Responses**:
- `500` - Failed to export CSV

---

### Export as Excel

Download all transactions as Excel (.xlsx) file.

**Endpoint**: `GET /api/export/excel`

**Headers**:
```json
{
  "Authorization": "Bearer <token>" // Optional
}
```

**Response** (200 OK):
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename=transactions.xlsx

[Binary Excel file]
```

**Error Responses**:
- `500` - Failed to export Excel

---

## Error Handling

### Standard Error Response

All endpoints return errors in this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET request |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Token expired or insufficient permissions |
| 404 | Not Found | Endpoint doesn't exist |
| 500 | Internal Server Error | Server-side error |

---

## Authentication

### JWT Token

After login/register, include JWT token in all protected requests:

```javascript
headers: {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}
```

### Token Expiration

- Tokens expire after **7 days**
- After expiration, user must login again
- No token refresh mechanism (logout and login required)

### Optional Authentication

Most endpoints support optional authentication:
- **With token**: User-specific data
- **Without token**: Demo/shared data

---

## Request Examples

### Using cURL

**Register**:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","fullName":"Test User"}'
```

**Upload Transactions**:
```bash
curl -X POST http://localhost:5000/api/transactions/upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"transactions":[{"bank":"ING","date":"2024-01-15","category":"Groceries","description":"Shopping","amount":85.50,"type":"expense"}]}'
```

**Get Summary**:
```bash
curl -X GET http://localhost:5000/api/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Using JavaScript (Axios)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Login
const loginResponse = await api.post('/auth/login', {
  email: 'user@example.com',
  password: 'password123'
});

const token = loginResponse.data.token;

// Upload transactions with token
const uploadResponse = await api.post('/transactions/upload', 
  { transactions: [...] },
  { headers: { Authorization: `Bearer ${token}` }}
);

// Get summary
const summaryResponse = await api.get('/summary', {
  headers: { Authorization: `Bearer ${token}` }
});
```

### Using Postman

1. **Import Collection**: Create new collection
2. **Set Base URL**: `http://localhost:5000/api`
3. **Add Requests**: Create requests for each endpoint
4. **Set Token**: Use Bearer token in Authorization tab
5. **Test**: Send requests and verify responses

---

## Rate Limiting

Currently **no rate limiting** is implemented. For production:

```javascript
// Recommended: express-rate-limit
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## CORS Configuration

Default CORS settings allow all origins in development:

```javascript
// backend/server.js
app.use(cors());
```

For production, restrict to frontend domain:

```javascript
app.use(cors({
  origin: 'https://your-frontend.vercel.app',
  credentials: true
}));
```

---

## Database Schema Reference

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Transactions Table
```sql
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  bank VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  category VARCHAR(100),
  description TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('income', 'expense')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Summaries Table
```sql
CREATE TABLE summaries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL,
  total_income DECIMAL(12, 2) DEFAULT 0,
  total_expenses DECIMAL(12, 2) DEFAULT 0,
  net_balance DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, month)
);
```

---

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- Authentication endpoints
- Transaction CRUD operations
- Summary and trends analytics
- CSV/Excel export functionality
- Optional authentication support

---

**Last Updated**: October 2025  
**API Version**: 1.0.0  
**Maintained By**: Finova Team
















