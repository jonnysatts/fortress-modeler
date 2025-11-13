# 🔒 Why Port 8081 is REQUIRED

## ⚠️ Critical: The App MUST Use Port 8081

**You cannot use alternative ports** - here's why:

### 🔐 OAuth Authentication Dependency

1. **Google OAuth Configuration**
   - Redirect URL: `http://localhost:8081/auth/callback`
   - **Hard-coded in Google Console**
   - **Cannot be changed without breaking existing setup**

2. **Supabase OAuth Provider**
   - Configured for port 8081 specifically
   - **Production OAuth settings expect this port**

3. **Security Configuration**
   - CORS settings configured for port 8081
   - **Cookie domains tied to this port**

### 🚫 What Happens on Other Ports

| Port | OAuth Status | Result |
|------|-------------|--------|
| **8081** | ✅ Works | Full functionality |
| 3000 | ❌ Breaks | Login fails |
| 5173 | ❌ Breaks | Login fails |
| 8080 | ❌ Breaks | Login fails |

### 🛠️ The ONLY Solution: Fix Port 8081

**Don't use alternative ports** - they break authentication.
**Instead, fix port 8081:**

```bash
# Use the dedicated port 8081 fixer
fix-port-8081.bat
```

## 🔍 Most Common Port 8081 Conflicts

### **1. Other Development Servers**
- **Webpack Dev Server** on some projects
- **Other Node.js apps** running in background
- **Previous instances** that didn't close properly

### **2. Enterprise Software**
- **Proxy software** (corporate environments)
- **Security tools** using common dev ports
- **VPN clients** with port conflicts

### **3. Windows Issues**
- **Zombie Node processes** from crashes
- **Windows Firewall** blocking the port
- **Antivirus software** interference

## ⚡ Immediate Fixes (In Order)

### **1. Run the Port 8081 Fixer**
```bash
fix-port-8081.bat
```

### **2. Nuclear Option**
```bash
# Kill everything Node.js
taskkill /F /IM node.exe

# Restart computer (clears all port bindings)
# Then: npm run dev
```

### **3. Find the Culprit**
```bash
# See what's using port 8081
netstat -ano | findstr ":8081"

# Kill specific process by PID
taskkill /PID [PID_NUMBER] /F
```

## 🚨 If Port 8081 Still Won't Work

### **Temporary Workaround (Breaks OAuth)**
If you absolutely cannot get port 8081 working, you can run without OAuth:

1. **Use local mode only** (no cloud features)
2. **Run on alternative port** for local development
3. **Reconfigure OAuth** (advanced, requires Google Console changes)

But **this breaks the core functionality** of the app.

## 🎯 The Bottom Line

**Port 8081 is not optional** - it's required for:
- ✅ OAuth authentication
- ✅ Cloud mode functionality  
- ✅ Production deployment
- ✅ Full app features

**Focus on fixing port 8081, not working around it.**

Use `fix-port-8081.bat` to solve this permanently.