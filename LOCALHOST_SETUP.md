# 🏠 AiFinity.app - Localhost Setup Guide

**Last Updated:** October 30, 2025  
**Status:** ✅ Stable & Working

---

## 🚀 Quick Start (3 Easy Ways)

### **Option 1: Double-Click Startup Script (EASIEST)**
1. Double-click **`START_LOCALHOST.bat`**
2. Wait 10 seconds
3. Browser opens automatically to http://localhost:5173
4. Done! 🎉

### **Option 2: Manual Start**
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Then open: http://localhost:5173

### **Option 3: VS Code Tasks**
1. Press `Ctrl+Shift+P`
2. Type: "Run Task"
3. Select: "Start AiFinity Dev Servers"

---

## 📊 Server Configuration

| Service | Port | URL | Status |
|---------|------|-----|--------|
| **Backend API** | 5002 | http://localhost:5002 | 🟢 Running |
| **Frontend** | 5173 | http://localhost:5173 | 🟢 Running |
| **Database** | Railway | (remote) | 🟢 Connected |

---

## 🔧 Environment Variables

### **Frontend** (`frontend/.env.local`)
```env
VITE_API_URL=http://localhost:5002/api
```

### **Backend** (`backend/.env`)
```env
PORT=5002
NODE_ENV=development
DATABASE_URL=postgresql://postgres:***@maglev.proxy.rlwy.net:31201/railway
JWT_SECRET=finova-super-secret-jwt-key-change-in-production-2024
```

---

## ✅ How to Test

### 1. **Register a User**
- Open http://localhost:5173
- Click "Don't have an account? Register"
- Fill in details:
  - Name: `Test User`
  - Email: `test@localhost.dev`
  - Password: `Test123!@#`
- Click "Register"
- Should login automatically! ✅

### 2. **Test Features**
- ✅ Upload CSV file
- ✅ Create bank account
- ✅ View transactions
- ✅ Check dashboard
- ✅ Test budget

---

## 🐛 Troubleshooting

### **Issue 1: Port Already in Use**
```bash
# Kill all Node processes
taskkill /F /IM node.exe

# Or use the startup script (it does this automatically)
```

### **Issue 2: Backend Not Connecting**
**Check:**
1. Backend terminal shows: `✅ Connected to AiFinity.app PostgreSQL database`
2. Port 5002 is listening: `netstat -an | findstr 5002`
3. Database URL is correct in `backend/.env`

**Fix:**
```bash
cd backend
npm start
```

### **Issue 3: Frontend Blank Screen**
**Cause:** Service Worker cache

**Fix:**
1. Open Chrome Incognito: `Ctrl+Shift+N`
2. Go to http://localhost:5173
3. Or clear cache:
   - Press `F12`
   - Go to "Application" tab
   - Click "Clear storage"
   - Refresh page

### **Issue 4: "Authentication Failed"**
**Cause:** Backend not running or database not connected

**Fix:**
1. Check backend terminal for errors
2. Verify database URL in `backend/.env`
3. Restart backend: `cd backend && npm start`

---

## 🔄 Restart Servers

### **Stop Everything**
```bash
# Windows
taskkill /F /IM node.exe

# Or close the PowerShell windows
```

### **Start Fresh**
```bash
# Use the startup script
START_LOCALHOST.bat

# Or manually
cd backend && npm start
cd frontend && npm run dev
```

---

## 📁 File Structure

```
AiFinity/
├── backend/
│   ├── .env              ← Backend configuration
│   ├── server.js         ← API server
│   └── package.json
├── frontend/
│   ├── .env.local        ← Frontend configuration
│   ├── vite.config.js    ← Port: 5173
│   └── package.json
├── START_LOCALHOST.bat   ← Easy startup script
└── LOCALHOST_SETUP.md    ← This file
```

---

## ⚙️ Configuration Details

### **Port 5173** (Frontend)
- Standard Vite development port
- Configured in `frontend/vite.config.js`
- Auto-opens in browser

### **Port 5002** (Backend)
- Express API server
- Configured in `backend/.env`
- Connects to Railway PostgreSQL

### **Database**
- **Production Railway PostgreSQL** (shared)
- Connection string in `backend/.env`
- Data persists across restarts

---

## 🎯 Best Practices

### **Always Use:**
1. ✅ The startup script (`START_LOCALHOST.bat`)
2. ✅ Incognito mode for testing
3. ✅ Same database as production (Railway)

### **Avoid:**
1. ❌ Running multiple instances
2. ❌ Changing ports randomly
3. ❌ Editing `.env` manually (use startup script)

---

## 🚀 Production vs Localhost

| Feature | Localhost | Production |
|---------|-----------|------------|
| **URL** | localhost:5173 | aifinity.app |
| **Backend** | localhost:5002 | Railway |
| **Database** | Railway (shared) | Railway |
| **Auth** | JWT | JWT |
| **Hot Reload** | ✅ Yes | ❌ No |
| **Service Worker** | ❌ Disabled | ❌ Disabled |

---

## 📚 Useful Commands

### **Check if servers are running:**
```bash
netstat -an | findstr "5002 5173"
```

### **View backend logs:**
```bash
cd backend
npm start
# Watch the console output
```

### **Build frontend:**
```bash
cd frontend
npm run build
```

### **Test backend API:**
```bash
curl http://localhost:5002/api/health
```

---

## ✅ Checklist

Before you start coding:
- [ ] Servers running (5002 & 5173)
- [ ] No port conflicts
- [ ] Database connected (check backend logs)
- [ ] Can register/login
- [ ] All features work

---

## 🆘 Need Help?

**Common Questions:**

**Q: Why is database on Railway, not localhost?**  
A: Easier! No need to run PostgreSQL locally. Same data as production.

**Q: Can I use a different port?**  
A: Yes, but 5173 is standard. Change in `vite.config.js` if needed.

**Q: Service worker keeps breaking things!**  
A: It's disabled now. Use Incognito mode to avoid any cached version.

**Q: How do I reset everything?**  
A: 
```bash
taskkill /F /IM node.exe
START_LOCALHOST.bat
```

---

## 🎉 Success Checklist

You'll know everything is working when:
- ✅ Both terminal windows are open
- ✅ Backend shows: `🚀 AiFinity.app API server running`
- ✅ Frontend shows: `➜ Local: http://localhost:5173/`
- ✅ Browser opens to login page
- ✅ Can register new user
- ✅ Can upload CSV files
- ✅ Dashboard shows data

---

**Your localhost is now stable and permanent!** 🎉

Just use **`START_LOCALHOST.bat`** every time you want to code!

---

**Last tested:** October 30, 2025  
**Status:** ✅ All systems operational  
**Database:** 🟢 Connected to Railway Production  
**Ports:** 5002 (Backend), 5173 (Frontend)

