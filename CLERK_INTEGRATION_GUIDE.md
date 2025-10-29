# 🔐 Clerk Authentication Integration Guide

## Overview

AiFinity.app now uses **Clerk** for authentication instead of custom JWT-based auth. This provides:

- ✅ **Social Login** (Google, GitHub, Microsoft, etc.)
- ✅ **Email/Password** with verification
- ✅ **Password Reset** built-in
- ✅ **User Profiles** with avatars
- ✅ **Session Management**
- ✅ **MFA Support**
- ✅ **Better Security**

---

## 📦 Changes Made

### **1. Frontend Changes**

#### **Installed Packages**
```bash
npm install @clerk/clerk-react
```

#### **Files Modified**
- `frontend/src/main.jsx` - Wrapped app with `ClerkProvider`
- `frontend/src/App.jsx` - Replaced custom Auth with Clerk components
- `frontend/src/components/Header.jsx` - Integrated `UserButton`
- `frontend/src/utils/api.js` - Updated to use Clerk tokens

#### **New Components Used**
- `SignIn` - Clerk's login component
- `SignUp` - Clerk's registration component
- `UserButton` - User profile dropdown
- `SignedIn` / `SignedOut` - Conditional rendering

---

### **2. Backend Changes**

#### **Installed Packages**
```bash
npm install @clerk/clerk-sdk-node
```

#### **Files Modified**
- `backend/middleware/auth.js` - Added Clerk token verification

#### **New Middleware**
- `authenticateClerk` - Verifies Clerk session tokens
- `optionalClerkAuth` - Optional authentication

---

## 🔑 Environment Variables

### **Frontend** (`.env` or `.env.local`)
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_aW4tcm9iaW4tODEuY2xlcmsuYWNjb3VudHMuZGV2JA
```

### **Backend** (`.env`)
```env
CLERK_SECRET_KEY=sk_test_iGtgDhvwU8yxFmMmelzLNELUvxRBncp6WSLeCP1vnc
```

---

## 🚀 Testing Locally

1. **Start Backend:**
```bash
cd backend
npm start
```

2. **Start Frontend:**
```bash
cd frontend
npm run dev
```

3. **Open Browser:**
```
http://localhost:5173
```

4. **Test Features:**
   - ✅ Should see Clerk login screen
   - ✅ Sign up with email/password
   - ✅ Login with existing account
   - ✅ User profile button in header
   - ✅ Sign out functionality

---

## 🌐 Production Deployment

### **1. Update Environment Variables**

#### **Netlify** (Frontend)
Add in **Site settings → Environment variables**:
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_aW4tcm9iaW4tODEuY2xlcmsuYWNjb3VudHMuZGV2JA
```

#### **Railway** (Backend)
Add in **Variables** tab:
```
CLERK_SECRET_KEY=sk_test_iGtgDhvwU8yxFmMmelzLNELUvxRBncp6WSLeCP1vnc
```

---

### **2. Configure Clerk Dashboard**

Go to **https://dashboard.clerk.com/apps/[your-app]**

#### **Domain Settings**
1. Click **"Domains"** in sidebar
2. Add production domain: `https://aifinity.app`
3. Add development domain: `http://localhost:5173`

#### **Social Providers** (Optional)
1. Click **"Social Connections"**
2. Enable:
   - Google
   - GitHub
   - Microsoft
   - Facebook
   - Twitter/X
3. Configure OAuth credentials for each

#### **Email Settings**
1. Click **"Email & SMS"**
2. Customize email templates
3. Add your logo
4. Configure sender email

---

### **3. Deploy Changes**

```bash
# Commit all changes
git add .
git commit -m "feat: Integrate Clerk authentication"
git push origin main
```

**Netlify** and **Railway** will auto-deploy!

---

## 🎨 Customizing Clerk UI

### **In App.jsx**
```javascript
<SignIn 
  appearance={{
    elements: {
      formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
      card: 'shadow-none',
      headerTitle: 'text-2xl',
      headerSubtitle: 'text-gray-600'
    }
  }}
/>
```

### **In Clerk Dashboard**
1. Go to **"Customization"**
2. Upload logo
3. Set brand colors
4. Customize email templates

---

## 🔐 Security Features

### **Enabled by Default**
- ✅ Email verification
- ✅ Password strength requirements
- ✅ Rate limiting
- ✅ Session management
- ✅ CSRF protection

### **Optional (Can Enable)**
- 🔒 Two-factor authentication (MFA)
- 🔒 Social login
- 🔒 Passwordless (magic links)
- 🔒 Biometric authentication

---

## 📊 User Management

### **Clerk Dashboard**
Access at: **https://dashboard.clerk.com/apps/[your-app]/users**

**Features:**
- View all users
- Search & filter
- Ban/unban users
- Delete users
- View user sessions
- Send password reset emails
- Export user data

---

## 🛠️ Troubleshooting

### **Issue: "Missing Clerk Publishable Key"**
**Solution:** Add `VITE_CLERK_PUBLISHABLE_KEY` to frontend `.env` file

### **Issue: Backend returns 401**
**Solution:** 
1. Check `CLERK_SECRET_KEY` is set in backend `.env`
2. Ensure frontend is sending Bearer token
3. Check Clerk dashboard for API key status

### **Issue: "Invalid Token"**
**Solution:**
1. Check API keys match your Clerk app
2. Ensure no extra spaces in keys
3. Restart frontend and backend servers

### **Issue: Login redirects to wrong domain**
**Solution:**
1. Go to Clerk Dashboard → Domains
2. Add your production domain
3. Set correct redirect URLs

---

## 🔄 Migration from Old Auth

### **Database**
No migration needed! Clerk users are separate from old JWT users.

### **Old Users**
Users will need to create new accounts with Clerk.

**To migrate users:**
1. Export users from database
2. Use Clerk's **Bulk User Import** API
3. Send password reset emails

---

## 📚 Resources

- **Clerk Docs:** https://clerk.com/docs
- **React SDK:** https://clerk.com/docs/references/react/overview
- **Node SDK:** https://clerk.com/docs/references/nodejs/overview
- **Dashboard:** https://dashboard.clerk.com

---

## ✅ Checklist

- [x] Install Clerk packages
- [x] Configure frontend with ClerkProvider
- [x] Replace Auth component with Clerk
- [x] Update API to use Clerk tokens
- [x] Configure backend middleware
- [ ] Add environment variables
- [ ] Test login/signup locally
- [ ] Configure Clerk dashboard domains
- [ ] Enable social providers (optional)
- [ ] Deploy to production
- [ ] Test production login

---

## 🎉 Benefits

### **For Users**
- 🚀 Faster login with social providers
- 🔒 More secure authentication
- 📧 Email verification
- 🔑 Easy password reset
- 👤 Profile management

### **For Developers**
- 🛠️ Less auth code to maintain
- 📊 Built-in user analytics
- 🔐 Industry-standard security
- 🌐 Multi-device sessions
- 📱 Mobile-ready

---

**Last Updated:** October 29, 2025
**Version:** 1.0.0
**Status:** ✅ Integrated & Ready for Testing

