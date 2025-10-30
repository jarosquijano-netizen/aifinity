# 👑 Admin Panel - User Management Guide

## Overview

The Admin Panel provides comprehensive user management and system monitoring capabilities for AiFinity.app. It allows administrators to view all registered users, monitor system statistics, and manage user accounts.

---

## 🎯 Features

### 1. **System Statistics Dashboard**
- **Total Users**: Complete count of registered users
- **New Users (7d)**: Users registered in the last 7 days
- **Total Transactions**: Aggregate transaction count across all users
- **Total Accounts**: All bank accounts in the system
- **Total Balance**: Sum of all account balances

### 2. **User Management Table**
Display all registered users with:
- User avatar (first letter of name)
- Full name and user ID
- Email address
- Number of bank accounts
- Transaction count
- Total balance
- Credit card debt
- Registration date
- Quick action buttons (View/Delete)

### 3. **User Details Modal**
Detailed view of individual users:
- User profile information
- Statistics (accounts, transactions)
- List of all bank accounts with balances
- Recent transactions (last 10)
- Account types and currencies

### 4. **Search & Filter**
- Real-time search by email or name
- Instant filtering of user list

### 5. **User Deletion**
- Delete user accounts with confirmation modal
- Cascading deletion (removes all user data):
  - Bank accounts
  - Transactions
  - All related records
- Warning system to prevent accidental deletions

---

## 🚀 Access

### How to Access the Admin Panel

1. **Login** to AiFinity.app
2. Navigate to the **"👑 Admin"** tab in the navigation bar
3. The admin panel will load automatically

### URL
- **Production**: `https://aifinity.app` (click Admin tab)
- **Local**: `http://localhost:5173` (click Admin tab)

---

## 📊 API Endpoints

### Backend Routes: `/api/admin`

#### 1. Get All Users
```javascript
GET /api/admin/users
```

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "full_name": "John Doe",
      "created_at": "2025-10-30T12:00:00Z",
      "transaction_count": 150,
      "account_count": 3,
      "total_credit_debt": -1251.36,
      "total_balance": 5430.50
    }
  ],
  "total": 1
}
```

#### 2. Get User Details
```javascript
GET /api/admin/users/:id
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "created_at": "2025-10-30T12:00:00Z"
  },
  "accounts": [
    {
      "id": 1,
      "name": "Main Account",
      "account_type": "checking",
      "balance": 5430.50,
      "currency": "EUR",
      "created_at": "2025-10-30T12:00:00Z"
    }
  ],
  "transaction_count": 150,
  "recent_transactions": [...]
}
```

#### 3. Get System Statistics
```javascript
GET /api/admin/stats
```

**Response:**
```json
{
  "total_users": 25,
  "total_transactions": 3500,
  "total_accounts": 75,
  "recent_users": 5,
  "total_balance": 125430.50
}
```

#### 4. Delete User
```javascript
DELETE /api/admin/users/:id
```

**Response:**
```json
{
  "message": "User deleted successfully",
  "email": "user@example.com"
}
```

---

## 🔒 Security

### Current Implementation
- Uses existing JWT authentication
- Available to all logged-in users
- No separate admin role system

### Recommendations for Production

#### Option 1: Add Admin Role
1. Add `is_admin` boolean field to `users` table:
```sql
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
```

2. Update first user to admin:
```sql
UPDATE users SET is_admin = TRUE WHERE email = 'your-admin@email.com';
```

3. Modify `backend/routes/admin.js` to check admin status:
```javascript
router.get('/users', authenticateToken, async (req, res) => {
  // Check if user is admin
  const userResult = await pool.query(
    'SELECT is_admin FROM users WHERE id = $1',
    [req.user.id]
  );
  
  if (!userResult.rows[0]?.is_admin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // ... rest of the code
});
```

4. Update `frontend/src/App.jsx` to conditionally show Admin tab:
```javascript
const tabs = [
  { id: 'dashboard', label: t('dashboard') },
  // ... other tabs
  ...(user?.is_admin ? [{ id: 'admin', label: '👑 Admin' }] : []),
];
```

#### Option 2: Environment-Based Access
Restrict admin panel to specific email addresses via environment variables:
```javascript
// backend/routes/admin.js
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || [];

router.get('/users', authenticateToken, async (req, res) => {
  if (!ADMIN_EMAILS.includes(req.user.email)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  // ... rest of the code
});
```

---

## 🎨 UI Components

### Technology Stack
- **React** + **Hooks** (useState, useEffect)
- **Lucide Icons** for visual elements
- **Tailwind CSS** for styling
- **Axios** for API calls

### Key Components

#### Statistics Cards
```jsx
<div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6">
  <Users className="w-12 h-12" />
  <p className="text-3xl font-bold">{stats.total_users}</p>
  <p className="text-sm">Total Users</p>
</div>
```

#### User Table
- Responsive design
- Hover effects
- Color-coded balances (green/red)
- Badge indicators for counts

#### Modals
- User Details Modal (full-screen overlay)
- Delete Confirmation Modal (centered, warning style)

---

## 🧪 Testing

### Manual Tests

1. **View Statistics**
   - Navigate to Admin panel
   - Verify all 5 stat cards display correct numbers
   - Check that numbers match database

2. **View Users**
   - Verify all users are listed
   - Check that account counts are accurate
   - Verify transaction counts
   - Check balance calculations

3. **Search Users**
   - Enter email address
   - Enter partial name
   - Verify instant filtering

4. **View User Details**
   - Click "View" (eye icon) on any user
   - Verify modal opens
   - Check all sections load correctly
   - Close modal

5. **Delete User**
   - Click "Delete" (trash icon)
   - Verify warning modal appears
   - Cancel deletion
   - Try again and confirm deletion
   - Verify user is removed from list
   - Verify stats are updated

### Database Verification

After deletion, verify cascade:
```sql
-- Check user is deleted
SELECT * FROM users WHERE id = [deleted_id];

-- Verify accounts deleted
SELECT * FROM bank_accounts WHERE user_id = [deleted_id];

-- Verify transactions deleted
SELECT * FROM transactions WHERE user_id = [deleted_id];
```

---

## 📈 Future Enhancements

### Potential Features

1. **Bulk Operations**
   - Select multiple users
   - Bulk delete
   - Bulk export

2. **Advanced Filters**
   - Filter by date range
   - Filter by transaction count
   - Filter by balance range

3. **User Activity Logs**
   - Login history
   - Action tracking
   - IP addresses

4. **Export Capabilities**
   - Export user list to CSV
   - Export user data (GDPR compliance)

5. **User Impersonation**
   - Admin can view app as specific user
   - Helpful for debugging

6. **Email Notifications**
   - Welcome emails
   - Alerts to users
   - Newsletter system

7. **Analytics Dashboard**
   - User growth charts
   - Transaction volume over time
   - Popular features
   - Revenue tracking (if applicable)

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "Failed to load admin data"
- **Cause**: Backend not running or API error
- **Solution**: Check backend logs, verify DATABASE_URL

#### 2. Users table empty
- **Cause**: No users registered yet
- **Solution**: Create test users via registration

#### 3. Stats showing 0
- **Cause**: Database connection issue
- **Solution**: Verify PostgreSQL is running and accessible

#### 4. Can't delete user
- **Cause**: Database constraint error
- **Solution**: Check backend logs for specific error

---

## 📝 Notes

- Admin panel has full access to all user data
- Be careful with delete operations (irreversible)
- Always verify before deleting users
- Consider implementing role-based access control (RBAC)
- Monitor admin actions in production
- Implement audit logging for compliance

---

## 🎯 Quick Start Checklist

- [x] Backend admin routes created (`/api/admin`)
- [x] Frontend Admin component built
- [x] Added to navigation tabs
- [x] Statistics dashboard implemented
- [x] User table with search
- [x] User details modal
- [x] Delete functionality with confirmation
- [x] Deployed to production
- [ ] Add role-based access control (recommended)
- [ ] Add audit logging (recommended)
- [ ] Add email notifications (optional)

---

## 🔗 Related Files

### Backend
- `backend/routes/admin.js` - Admin API routes
- `backend/server.js` - Route registration

### Frontend
- `frontend/src/components/Admin.jsx` - Main admin component
- `frontend/src/utils/api.js` - API functions
- `frontend/src/App.jsx` - Tab integration

---

**Created:** October 30, 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready

