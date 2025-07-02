# 🏗️ Windows Installer Guide

This guide shows how to create a **single-file Windows installer** for Fortress Financial Modeler that works like modern apps.

## 📋 What You Get

- **Single `.exe` installer file** (~150MB)
- **Professional installer experience** with NSIS
- **Auto-updater functionality** via GitHub releases
- **Desktop shortcuts** and Start Menu entries
- **Zero dependencies** - includes Node.js and everything needed

## 🛠️ Building the Installer

### Step 1: Prepare Icons (Important!)

1. **Create your logo** (1024x1024 px PNG with transparent background)
2. **Convert to required formats**:
   - Visit https://convertico.com/
   - Upload your PNG logo
   - Download as ICO format
   - Save as `electron/assets/icon.ico`
   - Also save PNG version as `electron/assets/icon.png`

### Step 2: Build the Installer

**Option A: Using the build script (Recommended)**
```bash
# Run the automated build script
./build-installer.bat
```

**Option B: Manual build**
```bash
# Install dependencies
npm install

# Build the web app
npm run build

# Build Windows installer
npm run dist:win
```

## 📦 Output Files

After building, you'll find in `dist-electron/`:

- `Fortress Financial Modeler-1.0.0-Setup.exe` - **This is the file you distribute!**
- `latest.yml` - Update metadata for auto-updater

## 🚀 Distribution

### For Users:
1. **Send them the `.exe` file**
2. **They double-click to install** (no additional setup needed)
3. **App appears in Start Menu and Desktop**
4. **Automatic updates** when you release new versions

### For You (Releases):
1. **Upload the `.exe` to GitHub Releases**
2. **Auto-updater will notify users** of new versions
3. **Users get seamless updates**

## 🔧 Configuration Options

### Customizing the Installer

Edit `electron-builder.config.js` to customize:

```javascript
nsis: {
  oneClick: false,              // Allow users to choose install location
  allowToChangeInstallationDirectory: true,
  createDesktopShortcut: true,  // Desktop shortcut
  createStartMenuShortcut: true // Start menu entry
}
```

### Auto-Updates

Auto-updates work via GitHub releases:

1. **Build and upload** new version to GitHub releases
2. **Users automatically get notified** when they start the app
3. **One-click update** downloads and installs

## 📊 Comparison: Installer vs Manual Setup

| Method | User Experience | File Size | Dependencies |
|--------|-----------------|-----------|--------------|
| **Windows Installer** | Double-click → Works | ~150MB | None |
| **Manual Setup** | Clone, install Node, npm install, configure | ~50MB | Node.js, Git |

## 🎯 Target Scenarios

### Perfect For:
- **Non-technical users**
- **Business stakeholders**
- **Demo/presentation environments**
- **Client installations**

### Use Manual Setup For:
- **Development work**
- **Technical users**
- **When users already have Node.js**

## 🐛 Troubleshooting

### Common Issues:

**"Windows protected your PC" warning:**
- This is normal for unsigned executables
- Users click "More info" → "Run anyway"
- For production: Consider code signing certificate

**Installer too large:**
- Normal for Electron apps (includes Chrome + Node.js)
- Alternative: Use Tauri for ~10MB installers

**Auto-updater not working:**
- Ensure GitHub repository is public
- Check `electron-builder.config.js` publish settings
- Verify GitHub releases are properly formatted

## 🔒 Security Notes

- **Installer is not code-signed** (requires certificate)
- **Users will see security warning** - this is normal
- **For production**: Consider purchasing code signing certificate
- **App runs with user permissions** (not admin required)

## 📈 Next Steps

1. **Test installer** on clean Windows machine
2. **Create your actual app icon** (replace placeholders)
3. **Set up GitHub releases** for auto-updates
4. **Consider code signing** for production

The installer creates a professional installation experience that matches what users expect from modern applications!