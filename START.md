# Quick Start Instructions 🚀

## You're Almost There!

### ✅ What's Done:
- Frontend dependencies installed
- Backend dependencies installed

### 📝 What You Need to Do:

#### 1. Get Your Database URL from Railway or Supabase

**Railway** (opened in your browser):
- Click on PostgreSQL service
- Copy the DATABASE_URL
- It looks like: `postgresql://postgres:password@region.railway.app:5432/railway`

**OR Supabase**:
- Create new project
- Go to Settings → Database
- Copy "Connection string" (URI format)

#### 2. Update Backend Configuration

Once you have the DATABASE_URL, run these commands:

```powershell
# Go to backend folder
cd backend

# Update .env file with your DATABASE_URL
# (Replace YOUR_DATABASE_URL_HERE with your actual URL)
notepad .env
```

In the .env file, update this line:
```
DATABASE_URL=YOUR_DATABASE_URL_HERE
```

#### 3. Run Database Migrations

```powershell
npm run migrate
```

#### 4. Start Backend Server (Keep this running)

```powershell
npm run dev
```

Backend will run on: http://localhost:5000

#### 5. Start Frontend (Open NEW Terminal)

```powershell
cd frontend
npm run dev
```

Frontend will run on: http://localhost:3000

#### 6. Open in Browser

Visit: http://localhost:3000

### 🎉 You're Done!

Upload the `sample_transactions.csv` file to see the magic!

---

## Having Issues?

### Backend won't start?
- Check DATABASE_URL is correct in backend/.env
- Make sure database is accessible
- Try running migrations again

### Frontend won't connect?
- Make sure backend is running on port 5000
- Check VITE_API_URL in frontend/.env

### Need help?
Read README.md or SETUP_GUIDE.md for detailed instructions.











