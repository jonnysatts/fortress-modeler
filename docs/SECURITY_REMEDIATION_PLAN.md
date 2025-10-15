# 🔒 Security Remediation Plan - Fortress Modeler Cloud

*Critical security issues identified by Gemini code review*

## 🚨 CRITICAL PRIORITY - Immediate Action Required

### **1. Exposed Credentials in Repository**

#### **Issue**: Supabase credentials exposed in committed files
- **`.env.production`** contains actual Supabase URL and anon key
- **`netlify.toml`** contains hardcoded Supabase credentials
- These credentials are now part of git history

#### **Impact**: 
- Credentials are visible to anyone with repository access
- If repository becomes public, credentials are exposed
- Sets dangerous precedent for credential management

#### **Remediation Steps**:

##### **Step 1: Rotate Compromised Credentials** (DO THIS FIRST!)
```bash
# 1. Go to Supabase Dashboard
# 2. Generate new anon key
# 3. Update all deployments with new credentials
# 4. Invalidate old credentials
```

##### **Step 2: Remove Credentials from Git History**
```bash
# Install BFG Repo-Cleaner
brew install bfg

# Remove .env.production from history
bfg --delete-files .env.production

# Clean up netlify.toml
# First, create a clean version without credentials
cp netlify.toml netlify.toml.clean
# Edit netlify.toml.clean to remove credentials

# Replace the file in history
bfg --replace-text <(echo 'VITE_SUPABASE_URL=*==>VITE_SUPABASE_URL="REDACTED"') 
bfg --replace-text <(echo 'VITE_SUPABASE_ANON_KEY=*==>VITE_SUPABASE_ANON_KEY="REDACTED"')

# Force push cleaned history
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

##### **Step 3: Update .gitignore**
```bash
# Add to .gitignore
.env.production
.env.staging
.env.local
.env*.local
```

##### **Step 4: Implement Proper Secret Management**

**For Netlify:**
1. Remove credentials from `netlify.toml`
2. Add environment variables in Netlify UI:
   - Go to Site settings → Build & deploy → Environment
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

**For Local Development:**
1. Create `.env.example` with placeholder values
2. Document in README that developers need to copy and fill in values
3. Never commit actual credentials

---

## 🔧 HIGH PRIORITY - Cloud Run Health

### **2. Missing Docker HEALTHCHECK**

#### **Issue**: Dockerfile missing HEALTHCHECK instruction
- Cloud Run needs health checks for proper container management
- Without it, unhealthy containers may receive traffic

#### **Remediation**:
Add to `server/Dockerfile`:
```dockerfile
# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1
```

---

## 📝 MEDIUM PRIORITY - Code Quality

### **3. RTF Files in Repository**

#### **Issue**: Binary RTF files make version control difficult
- Can't view diffs
- Can't merge changes
- Takes up unnecessary space

#### **Files to Convert**:
- `Dashboard & Risk Improvements.rtf` → `docs/DASHBOARD_RISK_IMPROVEMENTS.md`
- `Gemini Code Review.rtf` → `docs/archive/GEMINI_CODE_REVIEW.md`

#### **Remediation**:
1. Convert RTF files to Markdown
2. Remove RTF files from repository
3. Add `*.rtf` to `.gitignore`

### **4. Hardcoded Configuration in deploy.sh**

#### **Issue**: Deployment script has hardcoded values
- Makes script less flexible
- Harder to use across environments

#### **Remediation**:
Update `server/deploy.sh`:
```bash
# Use environment variables with defaults
PROJECT_ID="${GCP_PROJECT_ID:-yield-dashboard}"
SERVICE_NAME="${SERVICE_NAME:-fortress-modeler-backend}"
REGION="${GCP_REGION:-australia-southeast2}"

# Add validation
if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID not set"
  exit 1
fi
```

---

## 📋 Implementation Checklist

### **Immediate Actions (Today)**
- [ ] **ROTATE SUPABASE CREDENTIALS** in Supabase dashboard
- [ ] Update all deployments with new credentials
- [ ] Remove credentials from git history using BFG
- [ ] Update `.gitignore` to prevent future credential commits
- [ ] Configure Netlify environment variables

### **Short-term Actions (This Week)**
- [ ] Add HEALTHCHECK to Dockerfile
- [ ] Convert RTF files to Markdown
- [ ] Update deploy.sh to use environment variables
- [ ] Document proper secret management in README

### **Long-term Actions (Next Sprint)**
- [ ] Implement secret scanning in CI/CD pipeline
- [ ] Add pre-commit hooks to prevent credential commits
- [ ] Consider using Google Secret Manager for production
- [ ] Set up automated security scanning

---

## 🛡️ Security Best Practices Going Forward

### **1. Never Commit Secrets**
- Use `.env.example` files with placeholders
- Configure secrets in deployment platforms
- Use secret management services for production

### **2. Environment-Specific Configuration**
- Local: `.env.local` (gitignored)
- Staging: Environment variables in deployment platform
- Production: Secret management service

### **3. Regular Security Audits**
- Scan repository for exposed secrets
- Rotate credentials periodically
- Review deployment configurations

### **4. Documentation**
- Document where each secret should be configured
- Provide clear setup instructions without exposing secrets
- Maintain security runbook for incident response

---

## 🚨 CRITICAL: First Steps

**DO THESE IMMEDIATELY:**

1. **Go to Supabase Dashboard NOW**
2. **Generate new anon key**
3. **Update Netlify with new credentials**
4. **Then proceed with git history cleanup**

The exposed credentials are the most critical issue and need immediate attention before any other work proceeds.

---

**Security Status**: 🔴 **CRITICAL - IMMEDIATE ACTION REQUIRED**