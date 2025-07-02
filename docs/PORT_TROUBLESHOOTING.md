# 🔧 Port 8081 Troubleshooting Guide

## 🚨 Problem: "Port 8081 never works/opens"

This is a common issue on Windows. Here are the most effective solutions:

## 🔍 Step 1: Diagnose the Issue

**Run the diagnostic script:**
```bash
scripts\diagnose-port.bat
```

This will check for:
- Port conflicts
- Firewall issues  
- Network problems
- Running processes

## 🛠️ Step 2: Quick Fixes (Try These First)

### **Option A: Use Alternative Port (Recommended)**
```bash
# Try the smart launcher (finds available port automatically)
start-app-any-port.bat

# Or manually specify a port
npm run dev -- --port 3000
```

### **Option B: Kill Conflicting Processes**
```bash
# Kill all Node.js processes
taskkill /F /IM node.exe

# Then restart
npm run dev
```

### **Option C: Restart Computer**
Sometimes the simplest solution - restart your PC and try again.

## 🔥 Step 3: Advanced Solutions

### **Windows Firewall Fix**
```bash
# Add Node.js to Windows Firewall (run as Administrator)
netsh advfirewall firewall add rule name="Node.js" dir=in action=allow program="node.exe" enable=yes
```

### **Network Stack Reset**
```bash
# Reset Windows network stack (run as Administrator)
netsh winsock reset
netsh int ip reset
# Then restart computer
```

### **Alternative IP Address**
Try accessing via IP instead of localhost:
- `http://127.0.0.1:8081` instead of `http://localhost:8081`

## 🎯 Step 4: Port-Specific Solutions

### **Port 8081 Issues (OAuth Compatible)**
```bash
# Check what's using port 8081
netstat -ano | findstr ":8081"

# Kill specific process by PID
taskkill /PID [PID_NUMBER] /F
```

### **Use Alternative OAuth-Safe Ports**
If 8081 doesn't work, try these (you'll need to update OAuth settings):
- Port 3000: `npm run dev -- --port 3000`
- Port 8080: `npm run dev -- --port 8080`
- Port 5173: `npm run dev -- --port 5173`

## 🔐 OAuth Considerations

**Important:** OAuth only works on port 8081 by default!

If you must use a different port:

1. **Update OAuth settings** in your Google Console
2. **Add the new port** to allowed redirect URLs
3. **Run the port fixer:**
   ```bash
   node scripts/fix-oauth-port.cjs 3000
   ```

## 🏥 Emergency Solutions

### **Nuclear Option: Process Cleanup**
```bash
# Kill everything Node.js related
taskkill /F /IM node.exe
taskkill /F /IM npm.exe
taskkill /F /IM npx.exe

# Clear npm cache
npm cache clean --force

# Restart and try again
npm run dev
```

### **Different Launch Method**
```bash
# Try launching with explicit host binding
npm run dev -- --host 0.0.0.0 --port 8081

# Or try Vite directly
npx vite --port 8081 --host
```

## 🔍 Common Causes & Solutions

| Problem | Cause | Solution |
|---------|-------|----------|
| **Port already in use** | Another app using 8081 | Use `start-app-any-port.bat` |
| **Firewall blocking** | Windows Firewall | Add Node.js exception |
| **VPN interference** | VPN software | Disconnect VPN temporarily |
| **Antivirus blocking** | Security software | Add Node.js to whitelist |
| **Corporate network** | IT restrictions | Use alternative port |
| **Previous crash** | Zombie Node process | Kill all Node processes |

## 🧪 Testing Connectivity

### **Test 1: Basic Port Test**
```bash
# Test if you can connect to the port
telnet localhost 8081
```

### **Test 2: Alternative Browser**
- Try Chrome, Firefox, Edge
- Try incognito/private mode
- Clear browser cache

### **Test 3: Network Interface**
```bash
# Check network interfaces
ipconfig /all

# Try binding to specific interface
npm run dev -- --host 127.0.0.1 --port 8081
```

## ⚡ Quick Reference Commands

```bash
# Diagnostic
scripts\diagnose-port.bat

# Auto-find port
start-app-any-port.bat

# Force port 3000
npm run dev -- --port 3000

# Kill Node processes
taskkill /F /IM node.exe

# Check port usage
netstat -ano | findstr ":8081"

# Add firewall rule (as admin)
netsh advfirewall firewall add rule name="Node.js" dir=in action=allow program="node.exe" enable=yes
```

## 🎯 Most Likely Solutions

**90% of port issues are solved by:**

1. **Using `start-app-any-port.bat`** (finds working port automatically)
2. **Killing Node processes:** `taskkill /F /IM node.exe`
3. **Adding firewall exception** for Node.js
4. **Restarting the computer**

Try these in order, and your port issues should be resolved!