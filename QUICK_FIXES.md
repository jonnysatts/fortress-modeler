# ⚡ Quick Fixes for Port 8081 Issues

## 🚨 Port 8081 Won't Work? Try These (In Order):

### **1. Use the Smart Launcher (EASIEST)**
```bash
start-app-any-port.bat
```
This automatically finds a working port and starts the app.

### **2. Kill Node Processes**
```bash
taskkill /F /IM node.exe
npm run dev
```

### **3. Try Alternative Ports**
```bash
npm run dev:3000    # Port 3000
npm run dev:5173    # Port 5173
npm run dev:8080    # Port 8080
```

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

## ⚠️ OAuth Warning

- **Port 8081**: OAuth works ✅
- **Other ports**: OAuth needs configuration ⚠️

If using a different port, run:
```bash
node scripts/fix-oauth-port.cjs [PORT_NUMBER]
```

## 📞 Still Not Working?

Read the full guide: `docs\PORT_TROUBLESHOOTING.md`