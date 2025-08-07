#!/bin/bash

echo "🧹 Fortress Modeler - Project Cleanup Script"
echo "============================================"
echo ""

# Create organized folder structure
echo "📁 Creating organized folder structure..."

# Documentation folder
mkdir -p docs/deployment
mkdir -p docs/troubleshooting
mkdir -p docs/architecture
mkdir -p docs/sql

# Scripts folder for utilities
mkdir -p scripts/oauth
mkdir -p scripts/database
mkdir -p scripts/deployment
mkdir -p scripts/testing

# Temporary/debug folder (for files we might want to keep but not in root)
mkdir -p .tmp/debug-scripts

echo "✅ Folder structure created"
echo ""

# Move files to appropriate locations
echo "📦 Organizing files..."

# Move deployment documentation
mv -f DEPLOYMENT_NOTES.md docs/deployment/ 2>/dev/null
mv -f STATUS_REPORT.md docs/deployment/ 2>/dev/null
mv -f OAUTH_FIX_SUMMARY.md docs/deployment/ 2>/dev/null

# Move troubleshooting documentation
mv -f EMERGENCY-FIX-PLAN.md docs/troubleshooting/ 2>/dev/null
mv -f FIND-CLIENT-SECRET.md docs/troubleshooting/ 2>/dev/null
mv -f OAUTH-CHECKLIST.md docs/troubleshooting/ 2>/dev/null
mv -f RLS-COMPLETE-GUIDE.md docs/troubleshooting/ 2>/dev/null
mv -f SECURITY_REMEDIATION_PLAN.md docs/troubleshooting/ 2>/dev/null

# Move architecture documentation
mv -f SPECIAL_EVENTS_*.md docs/architecture/ 2>/dev/null
mv -f SUPABASE_CONFIG.md docs/architecture/ 2>/dev/null
mv -f CLEANUP_SUMMARY.md docs/architecture/ 2>/dev/null

# Move SQL files
mv -f *.sql docs/sql/ 2>/dev/null

# Move OAuth scripts
mv -f *OAUTH*.sh scripts/oauth/ 2>/dev/null
mv -f ADD-CALLBACK-URL.sh scripts/oauth/ 2>/dev/null
mv -f UPDATE-CREDENTIALS.sh scripts/oauth/ 2>/dev/null
mv -f check-oauth.sh scripts/oauth/ 2>/dev/null

# Move database scripts  
mv -f CHECK-RLS-STATUS.sh scripts/database/ 2>/dev/null
mv -f RLS-SETUP-GUIDE.sh scripts/database/ 2>/dev/null

# Move test scripts to temp folder
mv -f test-*.js .tmp/debug-scripts/ 2>/dev/null
mv -f test-*.sh .tmp/debug-scripts/ 2>/dev/null
mv -f check-*.sh .tmp/debug-scripts/ 2>/dev/null
mv -f verify-*.sh .tmp/debug-scripts/ 2>/dev/null
mv -f fix-*.sh .tmp/debug-scripts/ 2>/dev/null
mv -f *diagnosis*.sh .tmp/debug-scripts/ 2>/dev/null
mv -f EMERGENCY-*.sh .tmp/debug-scripts/ 2>/dev/null

# Move other utility scripts
mv -f prepare-deployment.sh scripts/deployment/ 2>/dev/null
mv -f restart-claude-code.sh scripts/deployment/ 2>/dev/null
mv -f publishable-key-complete.sh scripts/deployment/ 2>/dev/null

# Move backup files to temp
mv -f *.backup .tmp/debug-scripts/ 2>/dev/null

# Move JavaScript test files
mv -f check_supabase_schema.js .tmp/debug-scripts/ 2>/dev/null
mv -f test-*.js .tmp/debug-scripts/ 2>/dev/null

echo "✅ Files organized"
echo ""

# Create a proper .gitignore if needed
echo "📝 Updating .gitignore..."
cat >> .gitignore << 'EOF'

# Temporary and debug files
.tmp/
.db-password
*.backup

# Test scripts
test-*.js
test-*.sh

# Local scripts
scripts/local/

# Environment files
.env.local
.env.production

# IDE files
.idea/
*.swp
*.swo

EOF

echo "✅ .gitignore updated"
echo ""

# Create a cleanup summary
echo "📊 Creating cleanup summary..."
cat > docs/CLEANUP_SUMMARY.md << 'EOF'
# Project Cleanup Summary

## Date: $(date)

### Organized Structure:
```
/Applications/fortress-modeler-cloud/
├── docs/
│   ├── deployment/      # Deployment guides and notes
│   ├── troubleshooting/  # Debugging and fix documentation
│   ├── architecture/     # System design and architecture docs
│   └── sql/             # Database schemas and migration scripts
├── scripts/
│   ├── oauth/           # OAuth configuration scripts
│   ├── database/        # Database management scripts
│   ├── deployment/      # Deployment automation scripts
│   └── testing/         # Test utilities
├── src/                 # Application source code
├── public/              # Public assets
└── .tmp/               # Temporary debug files (git-ignored)
```

### Files Kept in Root:
- README.md (main documentation)
- CLAUDE.md (project documentation)
- package.json, package-lock.json
- Configuration files (vite.config.ts, tsconfig.json, etc.)
- .env (git-ignored)
- .gitignore

### Cleanup Actions:
1. Moved 40+ scripts from root to organized folders
2. Created clear folder structure for documentation
3. Separated production scripts from debug scripts
4. Updated .gitignore to exclude temporary files
5. Preserved all important documentation

### Next Steps:
1. Review files in .tmp/debug-scripts/ and delete if not needed
2. Update README.md with new folder structure
3. Commit cleaned structure to Git
EOF

echo "✅ Cleanup summary created"
echo ""

# Show what's left in root
echo "📋 Files remaining in root directory:"
echo "-----------------------------------"
ls -1 | grep -v "^[A-Z].*\.md$" | grep -v "^scripts$" | grep -v "^docs$" | grep -v "^src$" | grep -v "^public$" | grep -v "^node_modules$" | head -20

echo ""
echo "🎉 Cleanup complete!"
echo ""
echo "Next steps:"
echo "1. Review the cleanup: ls -la"
echo "2. Check organized folders: tree docs scripts -L 2"
echo "3. Commit the cleaned structure: git add -A && git commit -m 'chore: organize project structure and clean up debug files'"
