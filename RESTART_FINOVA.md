# 🔄 Restart Finova (No Port Conflicts)

## ✅ Updated Configuration

Your Finova is now configured to avoid ALL port conflicts:

| Service | Port | Status |
|---------|------|--------|
| **Finova Frontend** | **3004** | Ready |
| **Finova Backend** | **5002** | Ready |
| Your Other Project (Frontend) | 3000 | No conflict |
| Your Other Project (Backend) | 5001 | No conflict |

---

## 🛑 Step 1: Stop All Finova Processes

Since you have old backend processes running, let's stop them:

### Option A: Using Task Manager (Easiest)
1. Press `Ctrl + Shift + Esc` to open Task Manager
2. Go to "Details" tab
3. Find all **"node.exe"** processes
4. Right-click each → "End task"
5. Close Task Manager

### Option B: Using PowerShell
```powershell
# Kill all node processes (will stop BOTH your projects)
taskkill /F /IM node.exe
```

**⚠️ Warning:** This will stop ALL Node.js apps including your other project!

---

## 🚀 Step 2: Start Finova Backend (Port 5002)

Open **PowerShell Terminal 1**:

```powershell
cd C:\Users\joe_freightos\Desktop\Finova\backend
npm run dev
```

You should see:
```
🚀 Finova API server running on http://localhost:5002
📊 Database: Connected
🔒 JWT: Configured
```

✅ If you see port 5002, you're good!

---

## 🎨 Step 3: Start Finova Frontend (Port 3004)

Open **PowerShell Terminal 2** (NEW terminal):

```powershell
cd C:\Users\joe_freightos\Desktop\Finova\frontend
npm run dev
```

You should see:
```
VITE v5.4.20 ready in xxx ms
➜ Local: http://localhost:3004/
```

✅ If you see port 3004, you're good!

---

## 🌐 Step 4: Open Finova

Visit in your browser:
```
http://localhost:3004
```

---

## 🎯 Step 5: Test It

1. Go to **Upload** tab
2. Upload `sample_transactions.csv`
3. See dashboard with charts!

---

## 📊 Final Port Configuration

After restart, you'll have:

```
Port 3000 → Your Other Frontend
Port 3004 → Finova Frontend ✅
Port 5001 → Your Other Backend
Port 5002 → Finova Backend ✅
```

**No conflicts!** 🎉

---

## 🆘 Troubleshooting

### Backend won't start on 5002?
- Make sure you killed old processes
- Check `backend/.env` has `PORT=5002`
- Try: `cd backend; npm run dev`

### Frontend won't connect to backend?
- Make sure backend is running on 5002
- Check `frontend/.env` has `VITE_API_URL=http://localhost:5002/api`
- Check `frontend/vite.config.js` has `target: 'http://localhost:5002'`

### Still seeing port conflicts?
Run this to see what's using ports:
```powershell
netstat -ano | findstr ":3004 :5002"
```

---

## 🎉 Once Running

You'll have both projects running simultaneously:
- Your original project (ports 3000 & 5001)
- Finova (ports 3004 & 5002)

**No interference between projects!**

---

**Need help?** Come back and let me know which step isn't working!











