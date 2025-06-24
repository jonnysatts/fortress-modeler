# 🏰 Fortress Financial Modeler - Quick Launch Guide

## One-Click Launch Scripts

Three launch scripts are provided for easy startup across different platforms:

### 🍎 **macOS Users**
**File:** `launch-fortress.command`

**How to use:**
1. **Double-click** `launch-fortress.command` in Finder
2. macOS may ask for permission to run the script
3. If prompted, click "Open" to allow the script to run
4. Terminal will open and start the application automatically
5. Your browser will open to `http://localhost:8080`

**First-time setup:**
- If macOS blocks the script, go to System Preferences → Security & Privacy → General
- Click "Open Anyway" next to the blocked script message

### 🪟 **Windows Users**
**File:** `launch-fortress.bat`

**How to use:**
1. **Double-click** `launch-fortress.bat` in File Explorer
2. Command Prompt will open and start the application
3. Your browser should automatically open to `http://localhost:8080`
4. If browser doesn't open automatically, visit `http://localhost:8080`

### 🐧 **Linux Users**
**File:** `launch-fortress.sh`

**How to use:**
1. **Double-click** `launch-fortress.sh` in your file manager
2. If double-click doesn't work, open terminal and run: `./launch-fortress.sh`
3. The application will start and attempt to open your browser
4. Visit `http://localhost:8080` if browser doesn't open automatically

## What These Scripts Do

1. **Check Dependencies** - Verify Node.js and npm are installed
2. **Install Packages** - Run `npm install` if needed (first time only)
3. **Start Server** - Launch the development server with `npm run dev`
4. **Open Browser** - Automatically open the app in your default browser
5. **Provide Feedback** - Show clear status messages and instructions

## Troubleshooting

### ❌ "Node.js not found"
- **Solution:** Install Node.js from [nodejs.org](https://nodejs.org/)
- Choose the LTS (Long Term Support) version
- Restart your computer after installation

### ❌ "Permission denied" (macOS/Linux)
- **Solution:** Run this command in terminal from the project folder:
  ```bash
  chmod +x launch-fortress.command launch-fortress.sh
  ```

### ❌ Script won't run (Windows)
- **Solution:** Make sure you have Node.js installed
- Try running as Administrator if needed
- Check that the file hasn't been blocked by antivirus

### ❌ Browser doesn't open automatically
- **Solution:** Manually open your browser and go to:
  ```
  http://localhost:8080
  ```

### ❌ Port 8080 already in use
- **Solution:** The script will automatically try another port (like 8081)
- Check the terminal output for the actual URL to use

## Stopping the Application

To stop the Fortress Financial Modeler:
1. Go to the terminal window that opened when you ran the script
2. Press `Ctrl+C` (Windows/Linux) or `Cmd+C` (macOS)
3. The server will stop and you can close the terminal

## Development Mode Features

When launched via these scripts, the app runs in development mode with:
- **Hot Reload** - Changes to code automatically refresh the browser
- **Debug Information** - Detailed error messages and logs
- **Fast Startup** - Optimized for development workflow

## Alternative Manual Launch

If the scripts don't work, you can always launch manually:

1. Open terminal/command prompt
2. Navigate to the fortress-modeler folder
3. Run these commands:
   ```bash
   npm install
   npm run dev
   ```
4. Open browser to `http://localhost:8080`

---

**Need Help?** If you encounter issues:
1. Check that Node.js is properly installed: `node --version`
2. Verify npm is working: `npm --version`
3. Try the manual launch method above
4. Check the terminal output for specific error messages