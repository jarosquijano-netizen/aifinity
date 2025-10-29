# 🔐 Environment Variables Guide

Configuration for AiFinity.app production deployment.

---

## 📦 **Backend Environment Variables**

Create a `.env` file in the `backend` folder with these variables:

```bash
# Database Connection (PostgreSQL)
DATABASE_URL=postgresql://username:password@host:5432/database_name

# JWT Secret - MUST CHANGE FOR PRODUCTION!
JWT_SECRET=your_super_secret_random_string_here_change_this

# Server Configuration
NODE_ENV=production
PORT=5002

# CORS (automatically configured, but can override)
# CORS_ORIGIN=https://aifinity.app,https://www.aifinity.app
```

### **Where to Get These Values:**

#### **DATABASE_URL**
- **Railway**: Click PostgreSQL service → "Connect" → Copy connection string
- **ElephantSQL**: Dashboard → Instance → Copy URL
- **Format**: `postgresql://user:password@host:port/database`

#### **JWT_SECRET**
Generate a strong random string:
```bash
# On Mac/Linux:
openssl rand -base64 32

# On Windows PowerShell:
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})

# Or use online generator:
# https://randomkeygen.com/
```

---

## 🎨 **Frontend Environment Variables**

### **Development (.env.development)**
Create in `frontend` folder:
```bash
VITE_API_URL=http://localhost:5002/api
```

### **Production**

#### **Option 1: Build-time (recommended)**
Set in your deployment platform (Netlify/Vercel):
```bash
VITE_API_URL=https://your-backend-url.railway.app/api
```

#### **Option 2: Hardcode in api.js**
Update `frontend/src/utils/api.js`:
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'https://your-backend.railway.app/api';
```

---

## 🚀 **Platform-Specific Configuration**

### **Railway**

1. Go to your project
2. Click on service (backend or frontend)
3. Go to **"Variables"** tab
4. Click **"+ New Variable"**
5. Add each variable

**Backend Variables:**
```
DATABASE_URL = (auto-filled if you add Railway PostgreSQL)
JWT_SECRET = your_random_secret
NODE_ENV = production
PORT = 5002
```

### **Netlify**

1. Go to **"Site settings"**
2. Click **"Environment variables"**
3. Add:

**Frontend Variables:**
```
VITE_API_URL = https://your-backend.railway.app/api
```

### **Vercel**

1. Go to **"Project Settings"**
2. Click **"Environment Variables"**
3. Add:

**Frontend Variables:**
```
VITE_API_URL = https://your-backend.railway.app/api
```

---

## ✅ **Required Variables Checklist**

### Backend (Required)
- [x] `DATABASE_URL` - PostgreSQL connection string
- [x] `JWT_SECRET` - Random secret for JWT tokens
- [x] `NODE_ENV` - Set to "production"
- [x] `PORT` - Usually 5002 or Railway assigns

### Frontend (Required)
- [x] `VITE_API_URL` - Your backend API URL

### Optional Variables
- [ ] `OPENAI_API_KEY` - For AI features (if implementing)
- [ ] `SENTRY_DSN` - For error tracking
- [ ] `GOOGLE_ANALYTICS_ID` - For analytics

---

## 🔍 **Testing Your Configuration**

### Test Backend
```bash
# Check health endpoint
curl https://your-backend.railway.app/health

# Should return:
# {
#   "status": "ok",
#   "message": "AiFinity.app API is running",
#   "version": "2.0.0",
#   "environment": "production"
# }
```

### Test Frontend-Backend Connection
1. Open browser console
2. Visit your deployed frontend
3. Try to login
4. Check Network tab for API calls
5. Should call your backend URL

---

## 🚨 **Common Errors**

### **"Database connection failed"**
- Check `DATABASE_URL` format
- Ensure database allows external connections
- Verify username/password are correct

### **"CORS error"**
- Backend CORS is configured for `aifinity.app`
- If using different domain, update `server.js`
- In development, CORS allows all origins

### **"JWT token invalid"**
- Ensure `JWT_SECRET` is the same across deploys
- Don't change `JWT_SECRET` after users sign up
- Users will need to re-login if you change it

### **"API calls to localhost"**
- Check `VITE_API_URL` in frontend env vars
- Rebuild frontend after changing env vars
- Clear browser cache

---

## 🔐 **Security Best Practices**

1. **Never commit .env files to Git**
   - Already in `.gitignore`
   - Keep secrets secret!

2. **Use strong JWT_SECRET**
   - Minimum 32 characters
   - Random alphanumeric + symbols
   - Never use "secret" or "password"

3. **Use HTTPS in production**
   - All API URLs should be `https://`
   - Netlify/Vercel provide free SSL

4. **Rotate secrets periodically**
   - Change `JWT_SECRET` every 6-12 months
   - Users will need to re-login

5. **Limit CORS origins**
   - Only allow your domain
   - Don't use `*` in production

---

## 📋 **Quick Copy-Paste Templates**

### Railway Backend Variables
```
DATABASE_URL={RAILWAY_PROVIDED}
JWT_SECRET=CHANGE_THIS_TO_RANDOM_STRING_32_CHARS_OR_MORE
NODE_ENV=production
PORT=5002
```

### Netlify Frontend Variables
```
VITE_API_URL=https://aifinity-backend.up.railway.app/api
```

### Vercel Frontend Variables
```
VITE_API_URL=https://aifinity-backend.up.railway.app/api
```

---

## 🆘 **Need Help?**

1. Check deployment logs on your platform
2. Use browser DevTools → Console
3. Check Network tab for failed requests
4. Verify all variables are set correctly
5. Test health endpoint first

---

**Remember**: Change all secrets before going to production! 🔐

