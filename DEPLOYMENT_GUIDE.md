# 🚀 Hospital POS System - Complete Deployment Guide

## 📋 Overview
This guide will help you deploy your Hospital POS System with:
- **Frontend**: Netlify (React app)
- **Backend**: Render (Node.js API)
- **Database**: PostgreSQL (Render)

## 🔧 Backend Deployment (Render)

### Step 1: Create Render Account
1. Go to **[render.com](https://render.com)**
2. Click **"Get Started for Free"**
3. Sign up with your GitHub account
4. Authorize Render to access your repositories

### Step 2: Deploy Web Service
1. **Dashboard** → **"New +"** → **"Web Service"**
2. **Select Repository**: `activism4ever/POS1`
3. **Configure Service**:
   ```
   Name: iceman-hospital-pos-api
   Root Directory: backend
   Environment: Node
   Region: US East (or closest to you)
   Branch: main
   Build Command: npm install
   Start Command: npm start
   ```

### Step 3: Environment Variables
Add these environment variables in Render:
```env
NODE_ENV=production
JWT_SECRET=hospital_pos_secret_key_2025_change_this
DB_TYPE=postgres
DB_POOL_MAX=20
DB_POOL_MIN=2
PORT=10000
```

### Step 4: Create PostgreSQL Database
1. **Dashboard** → **"New +"** → **"PostgreSQL"**
2. **Configure Database**:
   ```
   Name: iceman-hospital-pos-db
   Database: hospital_pos
   User: hospital_user
   Region: US East (same as web service)
   PostgreSQL Version: 15
   ```

### Step 5: Connect Database
1. **Go to your PostgreSQL database** → **Info**
2. **Copy the "Internal Database URL"**
3. **Go to your web service** → **Environment**
4. **Add environment variable**:
   ```
   DATABASE_URL=[paste the internal database URL]
   ```

### Step 6: Deploy
1. **Click "Create Web Service"**
2. **Wait for deployment** (3-5 minutes)
3. **Your API URL**: `https://iceman-hospital-pos-api.onrender.com`

## 🌐 Frontend Deployment (Netlify)

### Step 1: Create Netlify Account
1. Go to **[netlify.com](https://netlify.com)**
2. Sign up with your GitHub account
3. Authorize Netlify to access your repositories

### Step 2: Deploy Site
1. **Dashboard** → **"Add new site"** → **"Import an existing project"**
2. **Choose GitHub** → **Select repository**: `activism4ever/POS1`
3. **Configure Build Settings**:
   ```
   Base directory: frontend
   Build command: npm run build
   Publish directory: frontend/build
   Production branch: main
   ```

### Step 3: Environment Variables
In **Site settings** → **Environment variables**, add:
```env
REACT_APP_API_URL=https://iceman-hospital-pos-api.onrender.com/api
GENERATE_SOURCEMAP=false
```

### Step 4: Deploy
1. **Click "Deploy site"**
2. **Wait for build** (2-3 minutes)
3. **Your site URL**: `https://[random-name].netlify.app`

## 🧪 Testing Your Deployment

### Test Backend API
```bash
# Health check
curl https://iceman-hospital-pos-api.onrender.com/api/health

# Login test
curl -X POST https://iceman-hospital-pos-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Test Frontend
1. Visit your Netlify URL
2. Try logging in with default credentials:
   - **Username**: `admin`
   - **Password**: `admin123`

## 🔄 Update Process

### When you make code changes:

**Backend Updates:**
1. Push to GitHub: `git push origin main`
2. Render auto-deploys from GitHub

**Frontend Updates:**
1. Push to GitHub: `git push origin main`
2. Netlify auto-builds and deploys

## 🔒 Security Checklist

### After Deployment:
- [ ] Change default admin password
- [ ] Update JWT_SECRET to a strong value
- [ ] Enable HTTPS (automatic on both platforms)
- [ ] Configure CORS for your domain
- [ ] Set up database backups
- [ ] Enable monitoring/alerts

## 📱 Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Doctor | doctor | doctor123 |
| Cashier | cashier | cashier123 |
| Lab | lab | lab123 |
| Pharmacy | pharmacy | pharmacy123 |

⚠️ **IMPORTANT**: Change these passwords immediately after deployment!

## 🆘 Troubleshooting

### Common Issues:

**Backend not starting:**
- Check Render logs for Node.js errors
- Verify environment variables are set
- Ensure PostgreSQL database is running

**Frontend can't connect to backend:**
- Verify REACT_APP_API_URL is correct
- Check CORS settings in backend
- Ensure backend is deployed and running

**Database connection issues:**
- Verify DATABASE_URL is correct
- Check PostgreSQL database status
- Ensure database is in same region as web service

## 📞 Support Resources

- **Render Docs**: https://render.com/docs
- **Netlify Docs**: https://docs.netlify.com
- **PostgreSQL on Render**: https://render.com/docs/databases

---

## 🎯 Quick Deployment Summary

1. ✅ Code is on GitHub
2. 🔄 Deploy backend to Render
3. 🔄 Deploy frontend to Netlify
4. 🔄 Connect services with environment variables
5. 🧪 Test complete system
6. 🔒 Secure with proper passwords

**Your Hospital POS System will be live and accessible to users worldwide!** 🌍