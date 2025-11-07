# Finova - Deployment Guide 🚀

Complete guide for deploying Finova to production environments.

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Database Deployment](#database-deployment)
- [Backend Deployment](#backend-deployment)
- [Frontend Deployment](#frontend-deployment)
- [Environment Variables](#environment-variables)
- [Post-Deployment](#post-deployment)

## Prerequisites

Before deploying, ensure you have:
- ✅ Git repository (GitHub, GitLab, etc.)
- ✅ Domain name (optional but recommended)
- ✅ Cloud provider accounts (Railway, Render, Vercel, etc.)

## Database Deployment

### Option 1: Railway (Recommended)

1. **Create Account**: Go to [Railway.app](https://railway.app)

2. **Create PostgreSQL Instance**:
   ```
   - Click "New Project"
   - Select "Provision PostgreSQL"
   - Wait for provisioning
   ```

3. **Get Connection URL**:
   ```
   - Click on PostgreSQL service
   - Go to "Connect" tab
   - Copy "Postgres Connection URL"
   ```

4. **Run Migrations**:
   ```bash
   # Update backend/.env with Railway database URL
   DATABASE_URL=postgresql://...

   # Run migrations
   cd backend
   npm run migrate
   ```

### Option 2: Supabase

1. Go to [Supabase.com](https://supabase.com)
2. Create new project
3. Get connection string from Settings → Database
4. Update `DATABASE_URL` environment variable
5. Run migrations

### Option 3: Heroku Postgres

1. Create Heroku account
2. Add Heroku Postgres addon to your app
3. Copy `DATABASE_URL` from Heroku config vars
4. Run migrations

## Backend Deployment

### Option 1: Railway (Recommended)

1. **Connect Repository**:
   ```
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   ```

2. **Configure Build**:
   ```
   - Root Directory: /backend
   - Build Command: npm install
   - Start Command: npm start
   ```

3. **Set Environment Variables**:
   ```
   PORT=5000
   DATABASE_URL=your-railway-postgres-url
   JWT_SECRET=your-super-secret-key-min-32-chars
   NODE_ENV=production
   ```

4. **Deploy**:
   ```
   - Click "Deploy"
   - Wait for build to complete
   - Copy the generated URL (e.g., https://your-app.railway.app)
   ```

### Option 2: Render

1. **Create Web Service**:
   ```
   - Go to Render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   ```

2. **Configure**:
   ```
   Name: finova-backend
   Environment: Node
   Region: Choose closest to users
   Branch: main
   Root Directory: backend
   Build Command: npm install
   Start Command: npm start
   ```

3. **Environment Variables**:
   ```
   Add same variables as Railway
   ```

4. **Deploy**: Render will auto-deploy

### Option 3: Heroku

```bash
# Install Heroku CLI
heroku login

# Create app
heroku create finova-backend

# Set buildpack
heroku buildpacks:set heroku/nodejs

# Set environment variables
heroku config:set DATABASE_URL=...
heroku config:set JWT_SECRET=...
heroku config:set NODE_ENV=production

# Deploy
git subtree push --prefix backend heroku main

# Run migrations
heroku run npm run migrate
```

## Frontend Deployment

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy from Terminal**:
   ```bash
   cd frontend
   vercel
   ```

3. **Or Deploy from Dashboard**:
   ```
   - Go to Vercel.com
   - Click "Import Project"
   - Select your GitHub repo
   - Configure:
     - Framework Preset: Vite
     - Root Directory: frontend
     - Build Command: npm run build
     - Output Directory: dist
   ```

4. **Environment Variable**:
   ```
   VITE_API_URL=https://your-backend-url.railway.app/api
   ```

5. **Deploy**: Vercel auto-deploys on push

### Option 2: Netlify

1. **Connect Repository**:
   ```
   - Go to Netlify.com
   - Click "Add new site" → "Import an existing project"
   - Choose your repo
   ```

2. **Configure Build**:
   ```
   Base directory: frontend
   Build command: npm run build
   Publish directory: frontend/dist
   ```

3. **Environment Variables**:
   ```
   VITE_API_URL=https://your-backend-url
   ```

4. **Deploy**: Netlify handles the rest

### Option 3: Manual Static Hosting

```bash
cd frontend

# Build for production
npm run build

# Upload 'dist' folder to:
# - AWS S3 + CloudFront
# - Google Cloud Storage
# - Azure Static Web Apps
# - GitHub Pages
```

## Environment Variables

### Backend (.env)

```env
# Required
PORT=5000
DATABASE_URL=postgresql://user:pass@host:5432/database
JWT_SECRET=minimum-32-character-secret-key-for-production

# Optional
NODE_ENV=production
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

### Frontend (.env)

```env
# Required
VITE_API_URL=https://your-backend.railway.app/api
```

## Post-Deployment

### 1. Test the Application

```bash
# Health check
curl https://your-backend.railway.app/health

# Should return:
# {"status":"ok","message":"Finova API is running"}
```

### 2. Test Frontend

- Visit your frontend URL
- Try uploading a sample CSV
- Verify all tabs work correctly
- Test authentication

### 3. Set Up Custom Domain (Optional)

#### Backend (Railway):
```
- Go to Settings → Domains
- Add custom domain
- Update DNS records
```

#### Frontend (Vercel):
```
- Go to Settings → Domains
- Add custom domain
- Vercel provides DNS instructions
```

### 4. Enable SSL/HTTPS

All platforms mentioned above provide automatic SSL certificates:
- ✅ Railway: Automatic
- ✅ Render: Automatic
- ✅ Vercel: Automatic
- ✅ Netlify: Automatic

### 5. Configure CORS

Update `backend/server.js`:

```javascript
app.use(cors({
  origin: [
    'https://your-frontend.vercel.app',
    'https://your-custom-domain.com'
  ],
  credentials: true
}));
```

### 6. Database Backups

#### Railway:
- Automatic backups included
- Manual backup: Click "Backup" in dashboard

#### Supabase:
- Automatic daily backups
- Point-in-time recovery available

### 7. Monitoring

#### Backend Logs:
```bash
# Railway
railway logs

# Render
View logs in dashboard

# Heroku
heroku logs --tail
```

#### Frontend Logs:
- Vercel: View logs in dashboard
- Netlify: View logs in dashboard

## Production Checklist ✅

Before going live:

- [ ] Database is deployed and accessible
- [ ] Backend is deployed and health check passes
- [ ] Frontend is deployed and accessible
- [ ] Environment variables are set correctly
- [ ] SSL/HTTPS is enabled
- [ ] CORS is configured properly
- [ ] Database migrations are run
- [ ] Sample data test works end-to-end
- [ ] Authentication works
- [ ] All API endpoints respond correctly
- [ ] Charts render properly
- [ ] Export functions work
- [ ] Mobile responsiveness verified
- [ ] Error handling tested
- [ ] Custom domain configured (if applicable)
- [ ] Backups configured
- [ ] Monitoring set up

## Cost Estimates

### Free Tier (Starter)
- **Railway**: $5/month (includes PostgreSQL + Backend)
- **Vercel**: Free (frontend)
- **Total**: ~$5/month

### Paid Tier (Production)
- **Railway**: $20/month (better database + backend)
- **Vercel Pro**: $20/month (better limits)
- **Total**: ~$40/month

## Troubleshooting

### Issue: Backend won't start

**Solution**:
```
1. Check environment variables are set
2. Verify DATABASE_URL is correct
3. Check logs for specific errors
4. Ensure migrations ran successfully
```

### Issue: Frontend can't connect to backend

**Solution**:
```
1. Verify VITE_API_URL is correct
2. Check CORS configuration
3. Ensure backend is running
4. Check browser console for errors
```

### Issue: Database connection timeout

**Solution**:
```
1. Whitelist backend IP in database settings
2. Check connection string format
3. Verify SSL settings
4. Check database is running
```

## Continuous Deployment

### Automatic Deployment on Git Push

**Railway**:
```
- Automatically deploys on push to main branch
- Configure in Settings → Deployments
```

**Vercel**:
```
- Automatically deploys on push to main
- Preview deployments for pull requests
```

### Manual Deployment

```bash
# Railway CLI
railway up

# Vercel CLI
vercel --prod

# Render
git push origin main
```

## Security Best Practices

1. **Use Strong JWT Secret**: Minimum 32 characters, random
2. **Enable HTTPS Only**: No HTTP in production
3. **Set Secure Headers**: Use helmet.js middleware
4. **Rate Limiting**: Add express-rate-limit
5. **Input Validation**: Validate all user inputs
6. **Keep Dependencies Updated**: Run `npm audit` regularly
7. **Environment Variables**: Never commit .env files
8. **Database Security**: Use strong passwords, enable SSL

## Scaling

### When to Scale:
- Response times > 2 seconds
- High CPU/memory usage (>80%)
- Database connections maxed out
- Concurrent users > 1000

### How to Scale:
1. **Vertical Scaling**: Upgrade plan on Railway/Render
2. **Horizontal Scaling**: Add more instances (Railway Pro)
3. **Database Scaling**: Upgrade database plan
4. **CDN**: Use Cloudflare for frontend assets
5. **Caching**: Add Redis for API caching

## Support

For deployment issues:
- Check provider documentation
- Review logs for errors
- Consult community forums
- Contact support if needed

---

Happy Deploying! 🚀
















