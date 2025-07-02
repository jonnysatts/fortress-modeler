module.exports = {
  productName: "Fortress Financial Modeler",
  appId: "com.fortress.financial-modeler",
  directories: {
    output: "dist-electron"
  },
  files: [
    "dist/**/*",
    "electron/main.js",
    "electron/preload.js",
    "package.json"
  ],
  extraResources: [
    {
      from: "electron/assets",
      to: "assets",
      filter: ["**/*"]
    }
  ],
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"]
      }
    ],
    icon: "electron/assets/icon.ico",
    publisherName: "Fortress Financial",
    verifyUpdateCodeSignature: false
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "Fortress Financial Modeler",
    artifactName: "${productName}-${version}-Setup.${ext}",
    // Custom installer script for professional look
    include: "electron/installer.nsh"
  },
  publish: {
    provider: "github",
    owner: "jonnysatts",
    repo: "fortress-modeler",
    private: false
  },
  // Auto-updater configuration
  autoUpdater: {
    provider: "github",
    owner: "jonnysatts", 
    repo: "fortress-modeler"
  }
};