# Cloud Migration Quick Start Guide
*Practical steps to begin the migration safely*

## 🚀 **Week 1: Immediate Actions**

### **Day 1: Project Setup**
```bash
# 1. Create backend structure
mkdir -p server/src/{api,auth,db,sync,types}
cd server
npm init -y
npm install express cors helmet dotenv jsonwebtoken
npm install @types/node @types/express typescript ts-node-dev --save-dev

# 2. Create shared types
mkdir -p ../shared/types
```

### **Day 2: Database Setup**
```bash
# Using Supabase (recommended for quick start)
# 1. Create account at supabase.com
# 2. Create new project
# 3. Get connection string

# OR Local PostgreSQL
docker run --name fortress-db \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=fortress \
  -p 5432:5432 \
  -d postgres:15
```

### **Day 3: Basic API**
```typescript
// server/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Placeholder routes
app.get('/api/projects', (req, res) => {
  res.json({ projects: [], message: 'Cloud API ready' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### **Day 4-5: Google OAuth**
```typescript
// server/src/auth/google.ts
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function verifyGoogleToken(token: string) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  
  const payload = ticket.getPayload();
  return {
    googleId: payload?.sub,
    email: payload?.email,
    name: payload?.name,
    picture: payload?.picture,
    domain: payload?.hd // Company domain if G Suite
  };
}

export function generateJWT(user: any) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
}
```

---

## 🏗️ **Safe Implementation Pattern**

### **1. Environment Variables**
```env
# .env.local (React app)
VITE_API_URL=http://localhost:4000
VITE_GOOGLE_CLIENT_ID=your-client-id
VITE_ENABLE_CLOUD=false  # Start with cloud disabled!

# .env (Backend)
DATABASE_URL=postgresql://user:pass@localhost:5432/fortress
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-secret
JWT_SECRET=your-jwt-secret
CLIENT_URL=http://localhost:5173
```

### **2. Feature Flag System**
```typescript
// src/config/features.ts
export const features = {
  cloud: {
    enabled: import.meta.env.VITE_ENABLE_CLOUD === 'true',
    auth: import.meta.env.VITE_ENABLE_AUTH === 'true',
    sync: import.meta.env.VITE_ENABLE_SYNC === 'true',
  }
};

// Usage in components
import { features } from '@/config/features';

function SettingsPage() {
  return (
    <div>
      {/* Always show local settings */}
      <LocalSettings />
      
      {/* Only show if cloud enabled */}
      {features.cloud.enabled && <CloudSettings />}
    </div>
  );
}
```

### **3. API Service with Fallback**
```typescript
// src/services/api.ts
class APIService {
  private baseURL = import.meta.env.VITE_API_URL;
  private token: string | null = null;
  
  async request(endpoint: string, options?: RequestInit) {
    // If cloud is disabled, return null immediately
    if (!features.cloud.enabled) {
      return null;
    }
    
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.token ? `Bearer ${this.token}` : '',
          ...options?.headers
        }
      });
      
      if (!response.ok) throw new Error('API Error');
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      // Don't break the app - just work locally
      return null;
    }
  }
}
```

---

## 🧪 **Testing Without Breaking Production**

### **1. Parallel Development**
```nginx
# nginx.conf for testing
server {
  listen 80;
  server_name app.fortress.com;
  location / {
    # Existing local-only version
    proxy_pass http://localhost:5173;
  }
}

server {
  listen 80;
  server_name beta.fortress.com;
  location / {
    # New cloud-enabled version
    proxy_pass http://localhost:5174;
    proxy_set_header X-Cloud-Enabled "true";
  }
}
```

### **2. Test Data Generator**
```typescript
// scripts/generate-test-data.ts
import { db } from '../src/lib/db';

async function generateTestData() {
  // Create 10 test projects
  for (let i = 0; i < 10; i++) {
    await db.projects.add({
      name: `Test Project ${i}`,
      description: `Test data for cloud migration ${i}`,
      productType: 'SaaS',
      targetAudience: 'Developers',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  console.log('Test data generated');
}
```

### **3. Migration Validator**
```typescript
// scripts/validate-migration.ts
async function validateMigration() {
  // 1. Count local records
  const localProjects = await db.projects.count();
  const localModels = await db.financialModels.count();
  
  // 2. Count cloud records
  const cloudProjects = await api.get('/api/projects/count');
  const cloudModels = await api.get('/api/models/count');
  
  // 3. Compare
  console.log('Migration Validation:');
  console.log(`Local Projects: ${localProjects}`);
  console.log(`Cloud Projects: ${cloudProjects}`);
  console.log(`Match: ${localProjects === cloudProjects ? '✅' : '❌'}`);
  
  return localProjects === cloudProjects;
}
```

---

## 🛠️ **Emergency Rollback Procedures**

### **If Something Goes Wrong**

#### **1. Instant Rollback (< 1 minute)**
```bash
# In .env.local
VITE_ENABLE_CLOUD=false  # Disables all cloud features instantly
```

#### **2. Data Recovery**
```typescript
// Emergency data export button
const EmergencyExport = () => {
  const exportAllData = async () => {
    const data = {
      projects: await db.projects.toArray(),
      models: await db.financialModels.toArray(),
      scenarios: await db.scenarios.toArray(),
      exported: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], 
      { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fortress-backup-${Date.now()}.json`;
    a.click();
  };
  
  return (
    <Button variant="destructive" onClick={exportAllData}>
      🚨 Emergency Export All Data
    </Button>
  );
};
```

#### **3. Version Rollback**
```bash
# If deployed version has issues
git checkout v1.9.0-local-stable
npm install
npm run build
# Deploy stable version
```

---

## 📱 **Monitoring & Alerts**

### **1. Cloud Health Dashboard**
```typescript
// src/components/CloudHealthDashboard.tsx
const CloudHealthDashboard = () => {
  const [health, setHealth] = useState({
    api: 'unknown',
    database: 'unknown',
    sync: 'unknown',
    lastCheck: null
  });
  
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${API_URL}/health`);
        const data = await response.json();
        setHealth(data);
      } catch (error) {
        setHealth(prev => ({ ...prev, api: 'error' }));
      }
    };
    
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Every 30s
    return () => clearInterval(interval);
  }, []);
  
  return (
    <Card>
      <CardHeader>Cloud Status</CardHeader>
      <CardContent>
        <div>API: {health.api === 'ok' ? '🟢' : '🔴'}</div>
        <div>Database: {health.database === 'ok' ? '🟢' : '🔴'}</div>
        <div>Sync: {health.sync === 'ok' ? '🟢' : '🔴'}</div>
      </CardContent>
    </Card>
  );
};
```

### **2. Error Boundary for Cloud Features**
```typescript
// src/components/CloudErrorBoundary.tsx
class CloudErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Cloud feature error:', error, errorInfo);
    // Disable cloud features on error
    localStorage.setItem('cloud_disabled_due_to_error', 'true');
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="warning">
          <AlertTitle>Cloud features temporarily disabled</AlertTitle>
          <AlertDescription>
            The app is working in local mode. Your data is safe.
          </AlertDescription>
        </Alert>
      );
    }
    
    return this.props.children;
  }
}
```

---

## ✅ **Success Checklist**

### **Before Each Phase**
- [ ] All local features working
- [ ] Full backup completed
- [ ] Rollback tested
- [ ] Team notified

### **After Each Phase**
- [ ] No breaking changes
- [ ] Performance unchanged
- [ ] Users can opt-out
- [ ] Data integrity verified

### **Final Launch**
- [ ] 2 weeks parallel running
- [ ] 100% data migration verified
- [ ] All users trained
- [ ] Support documentation ready

---

## 🎯 **Remember**
1. **Local mode is the default** - Cloud is opt-in
2. **Every change is reversible** - Feature flags control everything
3. **Data safety first** - Multiple backups always
4. **Gradual rollout** - Start with tech team, then expand
5. **Monitor everything** - Know immediately if something's wrong

This approach has worked for many successful migrations because it respects the existing system while gradually introducing improvements.