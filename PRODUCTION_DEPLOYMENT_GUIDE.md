# 🚀 AiFinity.app Production Deployment Guide

Complete guide to deploy AiFinity.app to production with your **aifinity.app** domain from GoDaddy.

---

## 📱 **Mobile App - DONE!**

✅ **Your app is now a Progressive Web App (PWA)**

### What This Means:
- 📲 **Installable** on smartphones (iOS & Android)
- 📴 **Works offline** with service worker
- ⚡ **Fast loading** with caching
- 🏠 **Home screen icon** like native apps
- 🔔 **Push notifications** ready (optional)

### How Users Install:
**On Android:**
1. Open aifinity.app in Chrome
2. Tap "Add to Home Screen"
3. App installs like native app

**On iPhone:**
1. Open aifinity.app in Safari
2. Tap Share button
3. Tap "Add to Home Screen"
4. App installs to home screen

---

## 🌐 **Deployment Options**

You have **3 main options** for deploying to aifinity.app:

### **Option 1: GoDaddy Hosting (Simplest)** ⭐ RECOMMENDED
- Best for: Simple deployment
- Cost: Included with your domain
- Difficulty: Easy

### **Option 2: Netlify + Railway (Most Popular)**
- Best for: Automatic deployments
- Cost: Free tier available
- Difficulty: Medium

### **Option 3: Vercel + Railway (Developer Favorite)**
- Best for: Best performance
- Cost: Free tier available
- Difficulty: Medium

---

## 📦 **Option 1: Deploy to GoDaddy Hosting**

### **What You Need:**
- ✅ Domain: aifinity.app (you have this!)
- ✅ GoDaddy hosting plan (check if you have one)
- ✅ Backend server (Node.js hosting)

### **Step 1: Build Your Frontend**

```bash
cd frontend
npm run build
```

This creates a `dist` folder with your production files.

### **Step 2: Upload to GoDaddy**

#### Option A: Using cPanel File Manager
1. Log into your GoDaddy account
2. Go to **My Products** → **Web Hosting**
3. Click **cPanel** button
4. Open **File Manager**
5. Navigate to `public_html` folder
6. Delete everything inside
7. Upload **all files** from `frontend/dist` folder
8. Make sure `index.html` is in the root

#### Option B: Using FTP (Recommended)
1. Download FileZilla: https://filezilla-project.org/
2. Get FTP credentials from GoDaddy cPanel
3. Connect via FTP
4. Navigate to `public_html`
5. Upload all files from `frontend/dist`

### **Step 3: Configure .htaccess for React Router**

Create this file in `public_html/.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>

# Enable GZIP compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
</IfModule>

# Leverage browser caching
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access 1 year"
  ExpiresByType image/jpeg "access 1 year"
  ExpiresByType image/gif "access 1 year"
  ExpiresByType image/png "access 1 year"
  ExpiresByType text/css "access 1 month"
  ExpiresByType application/javascript "access 1 month"
</IfModule>
```

### **Step 4: Backend Deployment (Node.js)**

**Problem:** GoDaddy shared hosting doesn't support Node.js well.

**Solution:** Use a separate service for backend:

#### Railway (Recommended for Backend)
1. Go to https://railway.app
2. Sign up with GitHub
3. Click **"New Project"**
4. Click **"Deploy from GitHub repo"**
5. Connect your repo (or upload backend folder)
6. Railway will auto-detect Node.js
7. Add environment variables:
   ```
   DATABASE_URL=your_postgres_url
   JWT_SECRET=your_secret_key
   NODE_ENV=production
   PORT=5002
   ```
8. Deploy!
9. Railway gives you a URL like: `aifinity-backend.up.railway.app`

### **Step 5: Database Setup**

**Option A: Railway PostgreSQL**
1. In Railway, click **"New"** → **"Database"** → **"PostgreSQL"**
2. Copy the `DATABASE_URL`
3. Add to backend environment variables

**Option B: ElephantSQL (Free Tier)**
1. Go to https://www.elephantsql.com
2. Create free account
3. Create new instance
4. Copy connection string
5. Add to backend environment variables

### **Step 6: Connect Frontend to Backend**

Update your API URL:

1. In `frontend/src/utils/api.js`, update line 4:
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'https://your-railway-url.up.railway.app/api';
```

2. Rebuild frontend:
```bash
cd frontend
npm run build
```

3. Re-upload to GoDaddy

### **Step 7: Configure DNS & SSL**

1. In GoDaddy, go to **DNS Management**
2. Ensure these records exist:
   ```
   Type    Name    Value               TTL
   A       @       [Your GoDaddy IP]   600
   CNAME   www     aifinity.app        1 Hour
   ```

3. Enable SSL:
   - GoDaddy → My Products → Web Hosting
   - Click **"Manage"**
   - Find **SSL Certificates**
   - Enable **Free SSL with Let's Encrypt**

---

## 📦 **Option 2: Deploy to Netlify + Railway**

### **Frontend on Netlify**

1. Push your code to GitHub
2. Go to https://netlify.com
3. Click **"Add new site"** → **"Import existing project"**
4. Connect GitHub
5. Select your repository
6. Configure build:
   ```
   Base directory: frontend
   Build command: npm run build
   Publish directory: frontend/dist
   ```
7. Add environment variable:
   ```
   VITE_API_URL=https://your-railway-backend.up.railway.app/api
   ```
8. Deploy!

### **Custom Domain on Netlify**
1. In Netlify site settings
2. Go to **Domain management**
3. Click **"Add custom domain"**
4. Enter: `aifinity.app`
5. Netlify will give you DNS records
6. Update in GoDaddy:
   ```
   Type     Name    Value
   A        @       75.2.60.5 (Netlify IP)
   CNAME    www     your-site.netlify.app
   ```
7. SSL is automatic!

---

## 📦 **Option 3: Deploy to Vercel + Railway**

### **Frontend on Vercel**

1. Push code to GitHub
2. Go to https://vercel.com
3. Click **"New Project"**
4. Import from GitHub
5. Framework: **Vite**
6. Root directory: `frontend`
7. Add environment variable:
   ```
   VITE_API_URL=https://your-railway-backend.up.railway.app/api
   ```
8. Deploy!

### **Custom Domain on Vercel**
1. Go to **Project Settings** → **Domains**
2. Add `aifinity.app`
3. Vercel provides DNS records
4. Update in GoDaddy:
   ```
   Type    Name    Value
   A       @       76.76.21.21 (Vercel IP)
   CNAME   www     cname.vercel-dns.com
   ```

---

## 🗄️ **Database Migration**

Before going live, run migrations:

```bash
cd backend
node migrations/run.js
```

This creates all necessary tables in your production database.

---

## ✅ **Pre-Launch Checklist**

### **Security**
- [ ] Environment variables set correctly
- [ ] JWT_SECRET is strong and unique
- [ ] Database has strong password
- [ ] CORS configured for your domain only
- [ ] SSL/HTTPS enabled

### **Performance**
- [ ] Frontend built with `npm run build`
- [ ] Images optimized
- [ ] Service worker registered
- [ ] GZIP compression enabled
- [ ] Browser caching configured

### **Functionality**
- [ ] Test login/register
- [ ] Test file upload
- [ ] Test all pages load
- [ ] Test on mobile device
- [ ] Test in incognito mode
- [ ] Test different browsers

### **Mobile App (PWA)**
- [ ] Manifest.json accessible
- [ ] Service worker registered
- [ ] Can install on Android
- [ ] Can install on iOS
- [ ] Works offline (basic features)

### **Domain & DNS**
- [ ] Domain points to hosting
- [ ] SSL certificate active
- [ ] www redirects to non-www (or vice versa)
- [ ] All pages load via HTTPS

---

## 📊 **Monitoring & Analytics**

### Add Google Analytics (Optional)

Add to `frontend/index.html` before `</head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

---

## 🚨 **Troubleshooting**

### **Frontend loads but API fails**
- Check CORS settings in backend
- Verify API_URL is correct
- Check backend logs on Railway

### **"Cannot GET /" on refresh**
- Add .htaccess (GoDaddy)
- Or add `_redirects` file (Netlify): `/* /index.html 200`
- Or configure rewrites in Vercel

### **PWA not installing**
- Check manifest.json is accessible
- Verify service-worker.js loads
- Must be served over HTTPS
- Check browser console for errors

### **Database connection fails**
- Verify DATABASE_URL is correct
- Check database allows external connections
- Ensure migrations have run

---

## 💰 **Cost Estimate**

### Option 1: GoDaddy + Railway
- **GoDaddy hosting**: $5-10/month (you may have this)
- **Railway backend**: $5/month (free tier: $5 credit)
- **Railway database**: Free tier (1GB)
- **Total**: ~$10/month

### Option 2: Netlify + Railway
- **Netlify**: Free
- **Railway backend**: $5/month
- **Railway database**: Free
- **Total**: ~$5/month

### Option 3: Vercel + Railway
- **Vercel**: Free
- **Railway backend**: $5/month  
- **Railway database**: Free
- **Total**: ~$5/month

---

## 🎯 **Recommended Setup**

For **aifinity.app** with GoDaddy domain:

1. **Frontend**: Netlify (free, automatic deployments, SSL)
2. **Backend**: Railway (easy Node.js hosting)
3. **Database**: Railway PostgreSQL (included)
4. **Domain**: Point aifinity.app to Netlify

### Why?
- ✅ Free (except $5/mo for backend)
- ✅ Automatic SSL
- ✅ Auto-deploys on git push
- ✅ Easy scaling
- ✅ Reliable uptime

---

## 📝 **Quick Start Commands**

### Build for Production
```bash
# Frontend
cd frontend
npm run build

# Backend (if needed)
cd backend
npm install --production
```

### Test Production Build Locally
```bash
cd frontend
npm run preview
```

### Run Migrations on Production DB
```bash
cd backend
DATABASE_URL="your_production_db_url" node migrations/run.js
```

---

## 🆘 **Need Help?**

Common issues:
1. **CORS errors**: Update backend CORS to allow aifinity.app
2. **Routes not working**: Configure .htaccess or rewrites
3. **API not connecting**: Check VITE_API_URL
4. **Database errors**: Run migrations
5. **PWA not installing**: Must use HTTPS

---

## 🎉 **You're Ready!**

Your AiFinity.app is now:
- ✅ **Mobile-ready** (PWA installable)
- ✅ **Production-ready** (optimized build)
- ✅ **Domain-ready** (configured for aifinity.app)

Choose your deployment option and follow the steps above!

**Recommended**: Start with **Netlify + Railway** for easiest setup.

---

**Next Step**: Choose Option 1, 2, or 3 and start deploying! 🚀

