# 🧪 Hospital POS System - Testing Checklist

## 📋 Pre-Testing Setup

### ✅ Deployment Status Check
- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Netlify  
- [ ] PostgreSQL database connected
- [ ] Environment variables configured

### 🔗 Update URLs
After deployment, update these in your testing:
- **Backend URL**: `https://[your-project].up.railway.app`
- **Frontend URL**: `https://[your-app].netlify.app`

## 🧪 Backend API Testing

### 1. Basic Connectivity
```bash
# Health Check
curl https://[your-backend-url]/api/health

# Expected Response:
{
  "message": "Hospital POS API is running!",
  "database": {"status": "healthy"},
  "uptime": 123.45
}
```

### 2. Authentication Tests

#### Admin Login:
```bash
curl -X POST https://[your-backend-url]/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Expected: {"token":"jwt_token_here","user":{"role":"admin",...}}
```

#### Test Other Roles:
- [ ] Doctor login (`doctor` / `doctor123`)
- [ ] Cashier login (`cashier` / `cashier123`) 
- [ ] Lab login (`lab` / `lab123`)
- [ ] Pharmacy login (`pharmacy` / `pharmacy123`)

### 3. Protected Endpoints
```bash
# Use token from login response
curl https://[your-backend-url]/api/patients \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test other endpoints:
# /api/services
# /api/users
# /api/transactions
```

## 🖥️ Frontend Testing

### 1. Access and Load
- [ ] Frontend loads without errors
- [ ] Login page displays correctly
- [ ] No console errors in browser

### 2. Role-Based Dashboard Access

#### Admin Dashboard:
- [ ] Login with `admin` / `admin123`
- [ ] Dashboard loads with admin features
- [ ] Can access user management
- [ ] Can view all system sections

#### Doctor Dashboard:
- [ ] Login with `doctor` / `doctor123` 
- [ ] Patient consultation interface
- [ ] Prescription management
- [ ] Service ordering capabilities

#### Cashier Dashboard:
- [ ] Login with `cashier` / `cashier123`
- [ ] Payment processing interface
- [ ] Transaction history
- [ ] Receipt generation

#### Lab Dashboard:
- [ ] Login with `lab` / `lab123`
- [ ] Lab test management
- [ ] Result entry interface
- [ ] Test request processing

#### Pharmacy Dashboard:
- [ ] Login with `pharmacy` / `pharmacy123`
- [ ] Prescription processing
- [ ] Medication dispensing
- [ ] Inventory interface

## 🏥 End-to-End Workflow Testing

### Patient Registration Flow:
1. [ ] Admin/Cashier registers new patient
2. [ ] Patient gets hospital number
3. [ ] Patient data saved correctly

### Consultation Flow:
1. [ ] Doctor searches for patient
2. [ ] Doctor creates consultation record
3. [ ] Doctor prescribes services/medications
4. [ ] Services appear in payment queue

### Payment Flow:
1. [ ] Cashier processes patient payment
2. [ ] Payment recorded in system
3. [ ] Receipt generated successfully
4. [ ] Transaction visible in reports

### Lab Services Flow:
1. [ ] Lab receives test requests
2. [ ] Lab updates test results
3. [ ] Results accessible to doctors

### Pharmacy Flow:
1. [ ] Pharmacy receives prescription orders
2. [ ] Pharmacy dispenses medications
3. [ ] Inventory updated automatically

## 🔧 Performance & Security Tests

### Performance:
- [ ] Pages load in under 3 seconds
- [ ] API responses in under 1 second
- [ ] No memory leaks in browser
- [ ] Database queries optimized

### Security:
- [ ] HTTPS enabled (green lock icon)
- [ ] No sensitive data in URLs
- [ ] Authentication required for protected routes
- [ ] Role-based access working
- [ ] SQL injection protection active

## 📊 Production Readiness

### Database:
- [ ] All tables created successfully
- [ ] Default data populated
- [ ] Indexes performing well
- [ ] Backup strategy in place

### Configuration:
- [ ] Environment variables secure
- [ ] JWT secret is strong
- [ ] CORS configured for frontend domain
- [ ] Error handling working

### Monitoring:
- [ ] Health endpoint responding
- [ ] Error logs accessible
- [ ] Performance metrics available
- [ ] Uptime monitoring setup

## 🎯 Go-Live Checklist

### Final Steps:
- [ ] Change all default passwords
- [ ] Add real hospital services & pricing
- [ ] Configure hospital-specific settings
- [ ] Train staff on system usage
- [ ] Backup database before production use
- [ ] Document admin procedures

### Staff Training Topics:
- [ ] Login and role switching
- [ ] Patient registration process
- [ ] Payment processing workflow
- [ ] Report generation
- [ ] Troubleshooting common issues

## 🚨 Issue Resolution

### Common Issues:
1. **Backend not responding**: Check Railway deployment logs
2. **Frontend can't connect**: Verify REACT_APP_API_URL environment variable
3. **Database errors**: Check PostgreSQL connection in Railway
4. **Login fails**: Verify user data populated correctly
5. **CORS errors**: Check backend CORS configuration

### Support Resources:
- Railway docs: https://docs.railway.app/
- Netlify docs: https://docs.netlify.com/
- System logs available in deployment dashboards

---

## ✅ Testing Complete!

When all items are checked:
🎉 **Your Hospital POS System is LIVE and ready for production use!**

Users can access the system at: `https://[your-app].netlify.app`