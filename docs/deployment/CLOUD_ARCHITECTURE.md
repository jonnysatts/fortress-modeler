# Cloud Architecture Diagrams & Technical Details

## 🏗️ **System Architecture Evolution**

### **Phase 1: Current State (100% Local)**
```mermaid
graph TB
    User[User Browser]
    
    subgraph "Local Only"
        UI[React UI]
        State[Zustand Store]
        DB[(IndexedDB/Dexie)]
    end
    
    User --> UI
    UI <--> State
    State <--> DB
    
    style User fill:#f9f,stroke:#333,stroke-width:4px
    style DB fill:#bbf,stroke:#333,stroke-width:2px
```

### **Phase 2: Hybrid Architecture (Local + Optional Cloud)**
```mermaid
graph TB
    User[User Browser]
    GoogleAuth[Google OAuth]
    
    subgraph "Frontend (Always Works)"
        UI[React UI]
        State[Zustand Store]
        LocalDB[(IndexedDB)]
        SyncEngine[Sync Engine]
        AuthState[Auth State]
    end
    
    subgraph "Cloud Backend (Optional)"
        Gateway[API Gateway]
        AuthService[Auth Service]
        AppServer[App Server]
        CloudDB[(PostgreSQL)]
        SyncService[Sync Service]
    end
    
    User --> UI
    UI <--> State
    State <--> LocalDB
    
    User -.->|Optional Login| GoogleAuth
    GoogleAuth -.-> AuthService
    AuthService -.-> AuthState
    
    AuthState -.->|If Authenticated| SyncEngine
    SyncEngine -.->|Bi-directional Sync| SyncService
    SyncService <--> CloudDB
    
    UI -.->|If Online| Gateway
    Gateway --> AppServer
    AppServer <--> CloudDB
    
    style User fill:#f9f,stroke:#333,stroke-width:4px
    style LocalDB fill:#bbf,stroke:#333,stroke-width:2px
    style CloudDB fill:#bfb,stroke:#333,stroke-width:2px
    style GoogleAuth fill:#ea4335,stroke:#333,stroke-width:2px
```

## 🔄 **Data Sync Flow**

### **Sync State Machine**
```mermaid
stateDiagram-v2
    [*] --> LocalOnly: App Starts
    
    LocalOnly --> Authenticating: User Clicks Login
    Authenticating --> CloudReady: Auth Success
    Authenticating --> LocalOnly: Auth Failed
    
    CloudReady --> Syncing: Auto/Manual Sync
    Syncing --> CloudReady: Sync Complete
    Syncing --> ConflictResolution: Conflicts Detected
    ConflictResolution --> CloudReady: Resolved
    
    CloudReady --> LocalOnly: Logout/Offline
    Syncing --> LocalOnly: Network Error
    
    note right of LocalOnly
        - All features work
        - No cloud dependency
        - Default state
    end note
    
    note right of CloudReady
        - Local changes queued
        - Background sync
        - Conflict detection
    end note
```

### **Conflict Resolution Strategy**
```mermaid
graph TD
    Change[Change Detected]
    
    Change --> Check{Same Field?}
    Check -->|No| AutoMerge[Auto Merge]
    Check -->|Yes| Compare{Compare Timestamps}
    
    Compare --> LastWrite[Last Write Wins]
    Compare --> UserPrompt{Critical Data?}
    
    UserPrompt -->|Yes| ShowBoth[Show Both Versions]
    UserPrompt -->|No| LastWrite
    
    ShowBoth --> UserChoice[User Chooses]
    
    AutoMerge --> Apply[Apply Changes]
    LastWrite --> Apply
    UserChoice --> Apply
    
    Apply --> UpdateLocal[Update Local]
    Apply --> UpdateCloud[Update Cloud]
```

## 🔐 **Security Architecture**

### **Authentication Flow**
```mermaid
sequenceDiagram
    participant User
    participant App
    participant Google
    participant Backend
    participant Database
    
    User->>App: Click "Sign in with Google"
    App->>Google: Redirect to OAuth
    Google->>User: Show consent screen
    User->>Google: Approve
    Google->>App: Return with ID token
    App->>Backend: Send ID token
    Backend->>Google: Verify token
    Google->>Backend: Token valid + user info
    Backend->>Database: Create/update user
    Backend->>App: Return JWT + user data
    App->>App: Store JWT + enable cloud
    
    Note over App: All future requests include JWT
    App->>Backend: API requests with JWT
    Backend->>Backend: Verify JWT
    Backend->>Database: Query user data
    Database->>Backend: Return data
    Backend->>App: Return response
```

### **Data Access Control**
```sql
-- Row Level Security (RLS) in PostgreSQL
CREATE POLICY "Users can only see own projects"
ON projects FOR ALL
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can see shared projects"
ON projects FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() 
    OR 
    id IN (
        SELECT project_id FROM project_shares 
        WHERE shared_with_email = auth.email()
    )
);
```

## 💾 **Database Schema Design**

### **Complete ERD**
```mermaid
erDiagram
    users ||--o{ projects : owns
    users ||--o{ sync_status : has
    projects ||--o{ financial_models : contains
    projects ||--o{ project_shares : shared
    projects ||--o{ project_versions : versioned
    financial_models ||--o{ model_scenarios : has
    
    users {
        uuid id PK
        string google_id UK
        string email UK
        string name
        string company_domain
        timestamp created_at
        jsonb preferences
    }
    
    projects {
        uuid id PK
        uuid user_id FK
        integer local_id
        string name
        string description
        jsonb data
        integer version
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }
    
    financial_models {
        uuid id PK
        uuid project_id FK
        integer local_id
        string name
        jsonb assumptions
        jsonb results_cache
        integer version
        timestamp created_at
        timestamp updated_at
    }
    
    sync_status {
        uuid id PK
        uuid user_id FK
        timestamp last_sync
        string sync_token
        jsonb pending_changes
        boolean sync_in_progress
    }
    
    project_shares {
        uuid id PK
        uuid project_id FK
        uuid owner_id FK
        string shared_with_email
        string permission
        timestamp created_at
        timestamp expires_at
    }
    
    project_versions {
        uuid id PK
        uuid project_id FK
        integer version_number
        jsonb data_snapshot
        string change_description
        uuid changed_by FK
        timestamp created_at
    }
```

## 🚀 **Deployment Architecture**

### **Option 1: Vercel + Supabase (Recommended)**
```mermaid
graph TB
    subgraph "Vercel"
        Static[Static Assets<br/>React App]
        Functions[Serverless Functions<br/>API Endpoints]
    end
    
    subgraph "Supabase"
        Auth[Supabase Auth<br/>+ Google OAuth]
        DB[(PostgreSQL<br/>with RLS)]
        Realtime[Realtime<br/>Subscriptions]
        Storage[File Storage<br/>for Exports]
    end
    
    subgraph "CDN"
        CF[Cloudflare<br/>Global CDN]
    end
    
    Users[Users Worldwide]
    
    Users --> CF
    CF --> Static
    Static <--> Functions
    Functions <--> Auth
    Functions <--> DB
    Functions <--> Storage
    
    DB -.-> Realtime
    Realtime -.->|WebSocket| Users
    
    style Vercel fill:#000,stroke:#fff,color:#fff
    style Supabase fill:#3ECF8E,stroke:#333,color:#fff
```

### **Option 2: AWS Architecture**
```mermaid
graph TB
    subgraph "AWS Cloud"
        subgraph "Frontend"
            S3[S3 Bucket<br/>Static Files]
            CF[CloudFront<br/>CDN]
        end
        
        subgraph "Backend"
            ALB[Application<br/>Load Balancer]
            ECS[ECS Fargate<br/>Container Service]
            Lambda[Lambda Functions<br/>for Sync]
        end
        
        subgraph "Data Layer"
            RDS[(RDS PostgreSQL<br/>Multi-AZ)]
            ElastiCache[(ElastiCache<br/>Redis)]
            S3Storage[S3 Bucket<br/>File Storage]
        end
        
        subgraph "Auth"
            Cognito[Cognito<br/>User Pools]
        end
    end
    
    Users[Users] --> CF
    CF --> S3
    CF --> ALB
    ALB --> ECS
    ECS <--> RDS
    ECS <--> ElastiCache
    ECS <--> S3Storage
    ECS <--> Cognito
    Lambda <--> RDS
    
    style AWS Cloud fill:#FF9900,stroke:#333,color:#fff
```

## 📊 **Performance Considerations**

### **Caching Strategy**
```typescript
// Multi-layer caching
class CacheManager {
  // L1: In-memory cache (fastest)
  private memoryCache = new Map();
  
  // L2: IndexedDB cache (persistent)
  private localCache = db.cache;
  
  // L3: Redis cache (shared)
  private redisCache = redis.client;
  
  async get(key: string) {
    // Check L1
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }
    
    // Check L2
    const local = await this.localCache.get(key);
    if (local && !this.isExpired(local)) {
      this.memoryCache.set(key, local.data);
      return local.data;
    }
    
    // Check L3 (if online)
    if (this.isOnline()) {
      const remote = await this.redisCache.get(key);
      if (remote) {
        await this.localCache.put({ key, data: remote });
        this.memoryCache.set(key, remote);
        return remote;
      }
    }
    
    return null;
  }
}
```

### **Sync Optimization**
```typescript
// Efficient delta sync
interface SyncDelta {
  added: any[];
  modified: any[];
  deleted: string[];
  lastSyncToken: string;
}

class DeltaSync {
  async prepareDelta(lastSyncTime: Date): Promise<SyncDelta> {
    const changes = await db.changes
      .where('timestamp')
      .above(lastSyncTime)
      .toArray();
    
    return {
      added: changes.filter(c => c.action === 'create'),
      modified: changes.filter(c => c.action === 'update'),
      deleted: changes.filter(c => c.action === 'delete').map(c => c.entityId),
      lastSyncToken: generateSyncToken()
    };
  }
}
```

## 🔍 **Monitoring & Observability**

### **Key Metrics to Track**
```typescript
// Client-side metrics
const metrics = {
  // Performance
  syncDuration: new Histogram('sync_duration_ms'),
  apiLatency: new Histogram('api_latency_ms'),
  cacheHitRate: new Counter('cache_hits'),
  
  // Reliability
  syncFailures: new Counter('sync_failures'),
  conflictCount: new Counter('sync_conflicts'),
  offlineTime: new Gauge('offline_duration_ms'),
  
  // Usage
  activeUsers: new Gauge('active_users'),
  projectsPerUser: new Histogram('projects_per_user'),
  cloudStorageBytes: new Gauge('cloud_storage_bytes')
};
```

### **Health Check Endpoints**
```typescript
// GET /health/detailed
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "components": {
    "database": {
      "status": "healthy",
      "latency_ms": 5,
      "connections": {
        "active": 10,
        "idle": 40,
        "max": 50
      }
    },
    "cache": {
      "status": "healthy",
      "hit_rate": 0.85,
      "memory_used_mb": 124
    },
    "sync": {
      "status": "healthy",
      "queue_length": 3,
      "last_sync": "2024-01-15T10:29:45Z"
    },
    "auth": {
      "status": "healthy",
      "provider": "google",
      "active_sessions": 245
    }
  }
}
```

## 🎯 **Success Metrics**

### **Migration Success Criteria**
1. **Zero Data Loss**: 100% of local data migrated successfully
2. **Performance**: Cloud sync < 2s for typical operations
3. **Reliability**: 99.9% uptime for cloud services
4. **Adoption**: 80% of users opt-in to cloud within 3 months
5. **Cost**: < $1 per user per month at scale

### **Rollback Triggers**
- Data loss incident
- Performance degradation > 50%
- Security vulnerability discovered
- User satisfaction drops below 70%
- Sync conflicts > 5% of operations

---

This architecture ensures a **safe, gradual migration** where every step is reversible and the local experience is never compromised.