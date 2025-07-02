# ⚡ Quick Fixes for Port 8081 Issues

## 🚨 IMPORTANT: Port 8081 is REQUIRED (OAuth won't work on other ports)

### **1. Use the Port 8081 Fixer (BEST SOLUTION)**
```bash
fix-port-8081.bat
```
This specifically fixes port 8081 conflicts and starts the app.

### **2. Kill Node Processes**
```bash
taskkill /F /IM node.exe
npm run dev
```

### **3. Nuclear Option (Restart Computer)**
Sometimes the simplest solution - restart your PC and run `npm run dev`

### **4. Diagnose the Issue**
```bash
scripts\diagnose-port.bat
```

### **5. Nuclear Option**
```bash
taskkill /F /IM node.exe
npm cache clean --force
# Restart computer
npm run dev
```

## 🔧 Available Commands

| Command | Purpose |
|---------|---------|
| `start-app-any-port.bat` | **AUTO-FIND PORT** (recommended) |
| `npm run dev:3000` | Force port 3000 |
| `npm run dev:5173` | Force port 5173 |
| `npm run dev:8080` | Force port 8080 |
| `scripts\diagnose-port.bat` | Diagnose port issues |
| `taskkill /F /IM node.exe` | Kill all Node processes |

## 💡 Most Common Solutions

**95% of port issues are solved by one of these:**

1. **`start-app-any-port.bat`** ← Try this first
2. **`taskkill /F /IM node.exe`** then `npm run dev`
3. **Restart computer** then `npm run dev`
4. **Use port 3000:** `npm run dev:3000`

## ⚠️ CRITICAL: Only Port 8081 Works

- **Port 8081**: OAuth works ✅ (REQUIRED)
- **Other ports**: OAuth completely broken ❌

**Do not use alternative ports** - they break authentication.
**Fix port 8081 instead** using `fix-port-8081.bat`

## 📞 Still Not Working?

Read the full guide: `docs\PORT_TROUBLESHOOTING.md`