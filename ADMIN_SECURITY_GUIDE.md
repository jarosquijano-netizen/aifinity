# 🔒 Admin Security Guide

## Overview

AiFinity.app now has a **secure, standalone Admin Portal** accessible only to authorized super administrators. The admin interface is completely separate from the main user application.

---

## 🎯 Key Features

### ✅ **Separation of Concerns**
- **Main App**: https://aifinity.app (regular users)
- **Admin Portal**: https://aifinity.app/admin (super admin only)

### ✅ **Role-Based Access Control (RBAC)**
- Database field: `is_admin` (boolean)
- Only users with `is_admin = TRUE` can access admin portal
- Regular users get **403 Forbidden** if they try to access admin routes

### ✅ **Secure Authentication**
- Separate admin login page
- Validates admin status during login
- Non-admin users are rejected immediately
- JWT tokens include admin status verification

### ✅ **Protected API Endpoints**
All `/api/admin/*` endpoints are protected with:
1. **JWT Authentication** (`authenticateToken`)
2. **Admin Role Check** (`requireAdmin`)

### ✅ **Visual Distinction**
- Admin portal has unique gradient header (blue/purple/pink)
- Crown icon (👑) throughout admin interface
- Security warnings and badges
- Separate branding from main app

---

## 🚀 How to Access Admin Portal

### **For Super Admin (You)**

1. **Go to**: https://aifinity.app/admin
2. **Login with your credentials**:
   - Email: `jarosquijano@gmail.com`
   - Password: (your password)
3. **Access granted!** 👑

### **For Regular Users**
- Regular users **cannot** access `/admin`
- They will see "Access Denied" message
- They can only use the main app at `/`

---

## 👥 Managing Admins

### **Current Super Admin**
```
👑 jarosquijano@gmail.com - Joe Quijano
```

### **How to Add More Admins**

#### Option 1: Using the Script
```bash
cd backend
node set-admin.js
```

Edit `set-admin.js` to change the email address:
```javascript
const adminEmail = 'new-admin@example.com'; // Change this
```

#### Option 2: Direct Database Query
```sql
UPDATE users 
SET is_admin = TRUE 
WHERE email = 'new-admin@example.com';
```

#### Option 3: Via Railway Dashboard
1. Go to https://railway.app
2. Open your PostgreSQL database
3. Click "Data" tab
4. Find `users` table
5. Edit the user and set `is_admin` to `true`

### **How to Remove Admin Privileges**
```sql
UPDATE users 
SET is_admin = FALSE 
WHERE email = 'user@example.com';
```

---

## 🔐 Security Architecture

### **Database Layer**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  is_admin BOOLEAN DEFAULT FALSE,  -- ✨ Admin flag
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **Backend Middleware**
```javascript
// backend/routes/admin.js

const requireAdmin = async (req, res, next) => {
  // Check if user exists
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check if user is admin
  const result = await pool.query(
    'SELECT is_admin FROM users WHERE id = $1',
    [req.user.id]
  );

  if (!result.rows[0] || !result.rows[0].is_admin) {
    return res.status(403).json({ 
      error: 'Access denied. Admin privileges required.' 
    });
  }

  next();
};

// All admin routes are protected
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  // Only admins can reach this
});
```

### **Frontend Routing**
```javascript
// frontend/src/main.jsx

<BrowserRouter>
  <Routes>
    <Route path="/admin" element={<AdminApp />} />  {/* Separate admin app */}
    <Route path="/*" element={<App />} />           {/* Main user app */}
  </Routes>
</BrowserRouter>
```

### **Admin Login Validation**
```javascript
// frontend/src/components/AdminLogin.jsx

const handleSubmit = async (e) => {
  const data = await login(email, password);
  
  // Check if user is admin
  if (!data.user.isAdmin) {
    setError('🚫 Access Denied: Admin privileges required');
    return; // Reject non-admin users
  }
  
  // Only admins proceed
  onAdminLogin(data.user);
};
```

---

## 🛡️ Security Best Practices

### ✅ **Implemented**
- [x] Separate admin interface (not a tab in main app)
- [x] Role-based access control in database
- [x] Backend API route protection
- [x] Admin status validation on login
- [x] JWT token authentication
- [x] 403 Forbidden for unauthorized access
- [x] Secure password hashing (bcrypt)
- [x] HTTPS in production

### 🔄 **Future Enhancements (Optional)**

1. **Audit Logging**
   ```sql
   CREATE TABLE admin_audit_logs (
     id SERIAL PRIMARY KEY,
     admin_id INTEGER REFERENCES users(id),
     action VARCHAR(255),
     target_user_id INTEGER,
     details JSONB,
     ip_address VARCHAR(50),
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. **Two-Factor Authentication (2FA)**
   - Add TOTP for admin accounts
   - Require 2FA for admin login
   - Libraries: `speakeasy`, `qrcode`

3. **Rate Limiting**
   ```javascript
   import rateLimit from 'express-rate-limit';
   
   const adminLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 5, // 5 attempts
     message: 'Too many login attempts'
   });
   
   router.post('/admin/login', adminLimiter, ...);
   ```

4. **IP Whitelist**
   ```javascript
   const ADMIN_WHITELIST = process.env.ADMIN_IP_WHITELIST?.split(',') || [];
   
   const checkIP = (req, res, next) => {
     const ip = req.ip;
     if (!ADMIN_WHITELIST.includes(ip)) {
       return res.status(403).json({ error: 'IP not whitelisted' });
     }
     next();
   };
   ```

5. **Session Expiry**
   - Reduce JWT expiry for admin tokens
   - Require re-authentication after 1 hour

---

## 🧪 Testing

### **Test 1: Regular User Cannot Access Admin**
1. Register/login as regular user
2. Try to access `/admin`
3. Should see login page
4. Login should fail with "Access Denied"

### **Test 2: Admin Can Access**
1. Go to `/admin`
2. Login with `jarosquijano@gmail.com`
3. Should see admin dashboard
4. Can view all users
5. Can delete users

### **Test 3: API Protection**
```bash
# Try to access admin endpoint without token
curl https://aifinity-production.up.railway.app/api/admin/users

# Response: 401 Unauthorized

# Try with regular user token
curl -H "Authorization: Bearer <regular-user-token>" \
     https://aifinity-production.up.railway.app/api/admin/users

# Response: 403 Forbidden (not admin)

# Try with admin token
curl -H "Authorization: Bearer <admin-token>" \
     https://aifinity-production.up.railway.app/api/admin/users

# Response: 200 OK with user data
```

---

## 📋 Admin Capabilities

The super admin can:

### **View System Statistics**
- Total users
- New users (7 days)
- Total transactions
- Total accounts
- Total balance

### **Manage Users**
- View all registered users
- See user details:
  - Email, name, registration date
  - Bank accounts
  - Transaction history
  - Balances
- Delete users (with cascade)
- Search/filter users

### **Cannot Do (Yet)**
- Edit user data directly
- Reset user passwords
- Send emails to users
- View AI chat history
- Modify budgets
- Export data

---

## 🚨 Important Notes

### ⚠️ **Critical**
- Only ONE admin account exists: `jarosquijano@gmail.com`
- Guard your credentials carefully
- Delete operation is **irreversible**
- All user data is removed on delete (accounts, transactions, etc.)

### 📝 **Recommendations**
1. Never share admin credentials
2. Use a strong, unique password
3. Enable 2FA when available
4. Regularly review user accounts
5. Monitor admin activity (when logging is added)
6. Keep admin email private
7. Don't access admin panel on public WiFi

### 🔄 **Regular Maintenance**
- Review user accounts monthly
- Check for suspicious activity
- Update admin password quarterly
- Backup database before major admin operations

---

## 🆘 Troubleshooting

### **Problem: Cannot login to admin**
**Solution:**
1. Check email is correct: `jarosquijano@gmail.com`
2. Verify admin status in database:
   ```sql
   SELECT email, is_admin FROM users WHERE email = 'jarosquijano@gmail.com';
   ```
3. If `is_admin` is `false`, run:
   ```bash
   cd backend
   node set-admin.js
   ```

### **Problem: Getting 403 Forbidden**
**Cause:** User doesn't have admin privileges
**Solution:** Set `is_admin = TRUE` in database

### **Problem: Admin page shows regular login**
**Cause:** Not accessing `/admin` route
**Solution:** Ensure URL is `https://aifinity.app/admin`

### **Problem: Can't see admin tab in main app**
**This is correct!** Admin is not a tab. It's a separate page at `/admin`

---

## 📊 Current System Status

### **Production**
- ✅ Backend deployed to Railway
- ✅ Frontend deployed to Netlify
- ✅ Admin routes protected
- ✅ Database migration complete
- ✅ Super admin set

### **URLs**
- **Main App**: https://aifinity.app
- **Admin Portal**: https://aifinity.app/admin
- **API**: https://aifinity-production.up.railway.app/api

### **Admin**
- **Email**: jarosquijano@gmail.com
- **Status**: Super Admin ✅
- **Privileges**: Full Access

---

## 🎯 Quick Reference

### **Access Admin Portal**
```
URL: https://aifinity.app/admin
Login: jarosquijano@gmail.com
```

### **Add New Admin**
```bash
cd backend
# Edit email in set-admin.js
node set-admin.js
```

### **Check Admin Status**
```sql
SELECT email, is_admin FROM users WHERE is_admin = TRUE;
```

### **Remove Admin**
```sql
UPDATE users SET is_admin = FALSE WHERE email = 'user@example.com';
```

---

**Created:** October 30, 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Security Level:** 🔒 High

