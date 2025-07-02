# Migration Implementation Roadmap - Fortress Modeler Cloud

## Overview

This detailed implementation roadmap provides step-by-step instructions for migrating Fortress Modeler Cloud from Google Cloud SQL to Supabase. Each task includes specific code changes, configuration updates, and validation steps.

---

## Pre-Migration Checklist

### Environment Preparation
- [ ] Supabase account created and project initialized
- [ ] Google Cloud credentials backed up
- [ ] Local development environment backed up
- [ ] Git repository backed up with migration branch created
- [ ] Test data prepared for validation

### Team Preparation  
- [ ] Migration team roles assigned
- [ ] Communication plan established
- [ ] Rollback procedures documented and tested
- [ ] Monitoring and alerting configured

---

## Phase 1: Supabase Setup & Configuration (Week 1)

### Day 1: Supabase Project Setup

#### 1.1 Create Supabase Project
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize local Supabase project
npx supabase init

# Start local development stack
npx supabase start
```

#### 1.2 Configure Environment Variables
```bash
# Add to .env.local
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Add to server/.env
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 1.3 Install Supabase Dependencies
```bash
# Frontend dependencies
npm install @supabase/supabase-js

# Server dependencies (if needed)
cd server && npm install @supabase/supabase-js
```

**Validation**: 
- [ ] Supabase project accessible via dashboard
- [ ] Local Supabase instance running
- [ ] Environment variables configured

### Day 2: Database Schema Migration

#### 2.1 Create Schema Migration File
```sql
-- supabase/migrations/20240101000000_initial_schema.sql

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (replaces users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  company_domain TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  product_type TEXT NOT NULL,
  target_audience TEXT,
  timeline JSONB,
  avatar_image TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  shared_by TEXT,
  owner_email TEXT,
  share_count INTEGER DEFAULT 0,
  permission TEXT CHECK (permission IN ('owner', 'view', 'edit')),
  data JSONB DEFAULT '{}'::jsonb,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financial models table
CREATE TABLE IF NOT EXISTS financial_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  assumptions JSONB DEFAULT '{}'::jsonb,
  results_cache JSONB DEFAULT '{}'::jsonb,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actuals table
CREATE TABLE IF NOT EXISTS actuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, period)
);

-- Risks table
CREATE TABLE IF NOT EXISTS risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('financial', 'operational', 'strategic', 'regulatory', 'other')),
  likelihood TEXT CHECK (likelihood IN ('low', 'medium', 'high')),
  impact TEXT CHECK (impact IN ('low', 'medium', 'high')),
  mitigation TEXT,
  notes TEXT,
  status TEXT CHECK (status IN ('identified', 'mitigated', 'accepted', 'transferred')),
  owner_user TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scenarios table
CREATE TABLE IF NOT EXISTS scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  model_id UUID REFERENCES financial_models(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  assumptions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_updated ON projects(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_models_project_id ON financial_models(project_id);
CREATE INDEX IF NOT EXISTS idx_financial_models_user_id ON financial_models(user_id);
CREATE INDEX IF NOT EXISTS idx_actuals_project_period ON actuals(project_id, period);
CREATE INDEX IF NOT EXISTS idx_risks_project_id ON risks(project_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_project_id ON scenarios(project_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_model_id ON scenarios(model_id);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_models_updated_at BEFORE UPDATE ON financial_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_actuals_updated_at BEFORE UPDATE ON actuals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risks_updated_at BEFORE UPDATE ON risks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON scenarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 2.2 Apply Schema Migration
```bash
# Apply migration to local Supabase
npx supabase db push

# Verify schema in local dashboard
npx supabase dashboard db
```

**Validation**:
- [ ] All tables created successfully
- [ ] Indexes properly configured
- [ ] Triggers working correctly

### Day 3: Row Level Security Configuration

#### 3.1 Create RLS Policies File
```sql
-- supabase/migrations/20240101000001_rls_policies.sql

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE actuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can view own or public projects" ON projects
  FOR SELECT USING (
    auth.uid() = user_id OR 
    is_public = true
  );

CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Financial models policies
CREATE POLICY "Users can view models for accessible projects" ON financial_models
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_id 
      AND (projects.user_id = auth.uid() OR projects.is_public = true)
    )
  );

CREATE POLICY "Users can insert models for own projects" ON financial_models
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can update own models" ON financial_models
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own models" ON financial_models
  FOR DELETE USING (auth.uid() = user_id);

-- Actuals policies
CREATE POLICY "Users can view actuals for accessible projects" ON actuals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_id 
      AND (projects.user_id = auth.uid() OR projects.is_public = true)
    )
  );

CREATE POLICY "Users can manage actuals for own projects" ON actuals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.user_id = auth.uid())
  );

-- Risks policies  
CREATE POLICY "Users can view risks for accessible projects" ON risks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_id 
      AND (projects.user_id = auth.uid() OR projects.is_public = true)
    )
  );

CREATE POLICY "Users can manage risks for own projects" ON risks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.user_id = auth.uid())
  );

-- Scenarios policies
CREATE POLICY "Users can view scenarios for accessible projects" ON scenarios
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_id 
      AND (projects.user_id = auth.uid() OR projects.is_public = true)
    )
  );

CREATE POLICY "Users can manage scenarios for own projects" ON scenarios
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.user_id = auth.uid())
  );
```

#### 3.2 Apply RLS Policies
```bash
npx supabase db push
```

**Validation**:
- [ ] RLS enabled on all tables
- [ ] Policies applied correctly
- [ ] Test data access with different user contexts

### Day 4: Authentication Configuration

#### 4.1 Configure Google OAuth in Supabase Dashboard
1. Navigate to Authentication > Settings > External OAuth Providers
2. Enable Google provider
3. Add OAuth credentials:
   - Client ID: (from Google Cloud Console)
   - Client Secret: (from Google Cloud Console)
4. Set redirect URLs:
   - `http://localhost:3000/auth/callback` (development)
   - `https://your-domain.com/auth/callback` (production)

#### 4.2 Create Auth Helper Functions
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Auth helper functions
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
  
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};
```

#### 4.3 Generate TypeScript Types
```bash
# Generate types from Supabase schema
npx supabase gen types typescript --local > src/lib/database.types.ts
```

**Validation**:
- [ ] Google OAuth configured in Supabase
- [ ] TypeScript types generated
- [ ] Auth helper functions created

### Day 5: Local Development Environment

#### 5.1 Update Development Scripts
```json
// package.json
{
  "scripts": {
    "dev": "vite",
    "supabase:start": "npx supabase start",
    "supabase:stop": "npx supabase stop",
    "supabase:reset": "npx supabase db reset",
    "supabase:types": "npx supabase gen types typescript --local > src/lib/database.types.ts"
  }
}
```

#### 5.2 Create Development Setup Documentation
```markdown
# Development Setup with Supabase

## Prerequisites
- Node.js 18+
- Docker (for local Supabase)
- Supabase CLI

## Setup Steps
1. Clone repository
2. Install dependencies: `npm install`
3. Copy environment file: `cp .env.example .env.local`
4. Start Supabase: `npm run supabase:start`
5. Start development server: `npm run dev`

## Environment Variables
- `VITE_SUPABASE_URL`: Local Supabase URL (http://localhost:54321)
- `VITE_SUPABASE_ANON_KEY`: Local anon key (from supabase start output)
```

**Validation**:
- [ ] Local Supabase running successfully
- [ ] Development environment properly configured
- [ ] Documentation updated

---

## Phase 2: Service Layer Implementation (Week 2)

### Day 6-7: SupabaseStorageService Implementation

#### 2.1 Create Base Service Class
```typescript
// src/services/implementations/SupabaseStorageService.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { IStorageService } from '../interfaces/IStorageService';
import { Project, FinancialModel } from '@/lib/db';
import { ActualsPeriodEntry } from '@/types/models';
import { DatabaseError, NotFoundError, ValidationError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Tables = Database['public']['Tables'];
type ProjectRow = Tables['projects']['Row'];
type ProjectInsert = Tables['projects']['Insert'];
type FinancialModelRow = Tables['financial_models']['Row'];
type FinancialModelInsert = Tables['financial_models']['Insert'];

export class SupabaseStorageService implements IStorageService {
  private client: SupabaseClient<Database>;

  constructor() {
    this.client = supabase;
  }

  // Project Methods
  async getProject(projectId: string): Promise<Project | undefined> {
    try {
      const { data, error } = await this.client
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return undefined; // Not found
        throw new DatabaseError('Failed to fetch project', error);
      }

      return this.mapProjectFromSupabase(data);
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to fetch project', error);
    }
  }

  async getAllProjects(): Promise<Project[]> {
    try {
      const { data, error } = await this.client
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        throw new DatabaseError('Failed to fetch projects', error);
      }

      return (data || []).map(project => this.mapProjectFromSupabase(project));
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to fetch projects', error);
    }
  }

  async createProject(projectData: Partial<Project>): Promise<Project> {
    try {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (!projectData.name?.trim()) {
        throw new ValidationError('Project name is required');
      }
      if (!projectData.productType?.trim()) {
        throw new ValidationError('Product type is required');
      }

      const insertData: ProjectInsert = {
        id: crypto.randomUUID(),
        user_id: user.id,
        name: projectData.name,
        description: projectData.description,
        product_type: projectData.productType,
        target_audience: projectData.targetAudience,
        timeline: projectData.timeline as any,
        avatar_image: projectData.avatarImage,
        is_public: projectData.is_public || false,
        data: {} // Additional data can be stored here
      };

      const { data, error } = await this.client
        .from('projects')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw new DatabaseError('Failed to create project', error);
      }

      return this.mapProjectFromSupabase(data);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to create project', error);
    }
  }

  async updateProject(projectId: string, projectData: Partial<Project>): Promise<Project> {
    try {
      const existing = await this.getProject(projectId);
      if (!existing) {
        throw new NotFoundError(`Project with ID ${projectId} not found`);
      }

      const updateData: Partial<ProjectRow> = {
        name: projectData.name,
        description: projectData.description,
        product_type: projectData.productType,
        target_audience: projectData.targetAudience,
        timeline: projectData.timeline as any,
        avatar_image: projectData.avatarImage,
        is_public: projectData.is_public
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData];
        }
      });

      const { data, error } = await this.client
        .from('projects')
        .update(updateData)
        .eq('id', projectId)
        .select()
        .single();

      if (error) {
        throw new DatabaseError('Failed to update project', error);
      }

      return this.mapProjectFromSupabase(data);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to update project', error);
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    try {
      const existing = await this.getProject(projectId);
      if (!existing) {
        throw new NotFoundError(`Project with ID ${projectId} not found`);
      }

      const { error } = await this.client
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        throw new DatabaseError('Failed to delete project', error);
      }
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to delete project', error);
    }
  }

  // Financial Model Methods
  async getModelsForProject(projectId: string): Promise<FinancialModel[]> {
    try {
      const { data, error } = await this.client
        .from('financial_models')
        .select('*')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false });

      if (error) {
        throw new DatabaseError('Failed to fetch models', error);
      }

      return (data || []).map(model => this.mapModelFromSupabase(model));
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to fetch models', error);
    }
  }

  async getModel(modelId: string): Promise<FinancialModel | undefined> {
    try {
      const { data, error } = await this.client
        .from('financial_models')
        .select('*')
        .eq('id', modelId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw new DatabaseError('Failed to fetch model', error);
      }

      return this.mapModelFromSupabase(data);
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to fetch model', error);
    }
  }

  async createModel(modelData: Partial<FinancialModel>): Promise<FinancialModel> {
    try {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (!modelData.projectId?.trim()) {
        throw new ValidationError('Project ID is required');
      }
      if (!modelData.name?.trim()) {
        throw new ValidationError('Model name is required');
      }

      const insertData: FinancialModelInsert = {
        id: crypto.randomUUID(),
        project_id: modelData.projectId,
        user_id: user.id,
        name: modelData.name,
        assumptions: modelData.assumptions || {},
        results_cache: {}
      };

      const { data, error } = await this.client
        .from('financial_models')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw new DatabaseError('Failed to create model', error);
      }

      return this.mapModelFromSupabase(data);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to create model', error);
    }
  }

  async updateModel(modelId: string, modelData: Partial<FinancialModel>): Promise<FinancialModel> {
    try {
      const existing = await this.getModel(modelId);
      if (!existing) {
        throw new NotFoundError(`Model with ID ${modelId} not found`);
      }

      const updateData: Partial<FinancialModelRow> = {
        name: modelData.name,
        assumptions: modelData.assumptions as any
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData];
        }
      });

      const { data, error } = await this.client
        .from('financial_models')
        .update(updateData)
        .eq('id', modelId)
        .select()
        .single();

      if (error) {
        throw new DatabaseError('Failed to update model', error);
      }

      return this.mapModelFromSupabase(data);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to update model', error);
    }
  }

  async deleteModel(modelId: string): Promise<void> {
    try {
      const existing = await this.getModel(modelId);
      if (!existing) {
        throw new NotFoundError(`Model with ID ${modelId} not found`);
      }

      const { error } = await this.client
        .from('financial_models')
        .delete()
        .eq('id', modelId);

      if (error) {
        throw new DatabaseError('Failed to delete model', error);
      }
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to delete model', error);
    }
  }

  // Actuals Methods
  async getActualsForProject(projectId: string): Promise<ActualsPeriodEntry[]> {
    try {
      const { data, error } = await this.client
        .from('actuals')
        .select('*')
        .eq('project_id', projectId)
        .order('period');

      if (error) {
        throw new DatabaseError('Failed to fetch actuals', error);
      }

      return (data || []).map(actual => this.mapActualFromSupabase(actual));
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to fetch actuals', error);
    }
  }

  async upsertActualsPeriod(actualData: Omit<ActualsPeriodEntry, 'id'>): Promise<ActualsPeriodEntry> {
    try {
      const { data, error } = await this.client
        .from('actuals')
        .upsert({
          project_id: actualData.projectId,
          period: actualData.period,
          data: actualData.data || {}
        }, {
          onConflict: 'project_id,period'
        })
        .select()
        .single();

      if (error) {
        throw new DatabaseError('Failed to upsert actual', error);
      }

      return this.mapActualFromSupabase(data);
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to upsert actual', error);
    }
  }

  // Mapping functions
  private mapProjectFromSupabase(data: ProjectRow): Project {
    return {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      productType: data.product_type,
      targetAudience: data.target_audience || undefined,
      timeline: data.timeline as any,
      avatarImage: data.avatar_image || undefined,
      is_public: data.is_public || false,
      shared_by: data.shared_by || undefined,
      owner_email: data.owner_email || undefined,
      share_count: data.share_count || 0,
      permission: data.permission as any,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapModelFromSupabase(data: FinancialModelRow): FinancialModel {
    return {
      id: data.id,
      projectId: data.project_id,
      name: data.name,
      assumptions: data.assumptions as any,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapActualFromSupabase(data: any): ActualsPeriodEntry {
    return {
      id: data.id,
      projectId: data.project_id,
      period: data.period,
      data: data.data || {},
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    } as ActualsPeriodEntry;
  }
}
```

**Validation**:
- [ ] SupabaseStorageService implements all IStorageService methods
- [ ] Type mappings work correctly
- [ ] Error handling implemented

### Day 8: Authentication Service Integration

#### 2.2 Update Auth Context
```typescript
// src/hooks/useAuth.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, signInWithGoogle, signOut as supabaseSignOut } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  handleCallback: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        // Handle user profile creation/update
        if (event === 'SIGNED_IN' && session?.user) {
          await ensureUserProfile(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const ensureUserProfile = async (user: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name,
            avatar_url: user.user_metadata?.avatar_url,
            company_domain: user.email?.split('@')[1] || '',
          });

        if (insertError) {
          console.error('Error creating user profile:', insertError);
        }
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
    }
  };

  const login = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await supabaseSignOut();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const handleCallback = async (code: string) => {
    // This is handled automatically by Supabase
    // but we keep the interface for compatibility
  };

  const value: AuthContextType = {
    user,
    session,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    handleCallback,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

#### 2.3 Create Auth Callback Page
```typescript
// src/pages/AuthCallback.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          navigate('/login?error=auth_failed');
          return;
        }

        if (data.session) {
          navigate('/dashboard');
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/login?error=auth_failed');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
```

**Validation**:
- [ ] Authentication flow works end-to-end
- [ ] User profiles created automatically
- [ ] Auth state properly managed

### Day 9: Real-time Capabilities

#### 2.4 Create Real-time Hooks
```typescript
// src/hooks/useRealtimeProject.ts
import { useEffect, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Project } from '@/lib/db';
import { useQueryClient } from '@tanstack/react-query';

export const useRealtimeProject = (projectId: string) => {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    const projectChannel = supabase
      .channel(`project:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`
        },
        (payload) => {
          console.log('Project realtime update:', payload);
          
          if (payload.eventType === 'UPDATE') {
            // Update React Query cache
            queryClient.setQueryData(['projects', projectId], payload.new);
            queryClient.invalidateQueries({ queryKey: ['projects', 'my'] });
          } else if (payload.eventType === 'DELETE') {
            // Remove from cache
            queryClient.removeQueries({ queryKey: ['projects', projectId] });
            queryClient.invalidateQueries({ queryKey: ['projects', 'my'] });
          }
        }
      )
      .subscribe();

    setChannel(projectChannel);

    return () => {
      if (projectChannel) {
        supabase.removeChannel(projectChannel);
      }
    };
  }, [projectId, queryClient]);

  return channel;
};

// src/hooks/useRealtimeModels.ts
export const useRealtimeModels = (projectId: string) => {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    const modelsChannel = supabase
      .channel(`models:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_models',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('Models realtime update:', payload);
          
          // Invalidate and refetch models for this project
          queryClient.invalidateQueries({ queryKey: ['models', projectId] });
          
          if (payload.eventType === 'INSERT') {
            // Could add optimistic update here
          } else if (payload.eventType === 'UPDATE') {
            // Update specific model in cache
            queryClient.setQueryData(['models', payload.new.id], payload.new);
          } else if (payload.eventType === 'DELETE') {
            // Remove from cache
            queryClient.removeQueries({ queryKey: ['models', payload.old.id] });
          }
        }
      )
      .subscribe();

    setChannel(modelsChannel);

    return () => {
      if (modelsChannel) {
        supabase.removeChannel(modelsChannel);
      }
    };
  }, [projectId, queryClient]);

  return channel;
};
```

#### 2.5 Integration in Components
```typescript
// src/pages/projects/ProjectDetail.tsx
import { useRealtimeProject, useRealtimeModels } from '@/hooks/useRealtime';

export default function ProjectDetail() {
  const { projectId } = useParams();
  
  // Enable real-time updates
  useRealtimeProject(projectId!);
  useRealtimeModels(projectId!);
  
  // Rest of component logic...
}
```

**Validation**:
- [ ] Real-time subscriptions working
- [ ] React Query cache updated correctly
- [ ] Multiple browser windows sync properly

### Day 10: Service Container Configuration

#### 2.6 Update Service Bootstrap
```typescript
// src/services/bootstrap.ts
import { serviceContainer, SERVICE_TOKENS } from './container/ServiceContainer';
import { DexieStorageService } from './implementations/DexieStorageService';
import { SupabaseStorageService } from './implementations/SupabaseStorageService';
import { ErrorService } from './implementations/ErrorService';
import { LogService } from './implementations/LogService';
import { ConfigService } from './implementations/ConfigService';

export function bootstrapServices(): void {
  // Create and register config service first
  const configService = new ConfigService();
  serviceContainer.registerInstance(SERVICE_TOKENS.CONFIG_SERVICE, configService);

  // Register log service
  const logLevel = configService.isDevelopment() ? 'debug' : 'info';
  serviceContainer.register(
    SERVICE_TOKENS.LOG_SERVICE,
    () => new LogService(logLevel),
    true
  );

  // Register error service
  serviceContainer.register(
    SERVICE_TOKENS.ERROR_SERVICE,
    () => new ErrorService(),
    true
  );

  // Register storage service based on environment
  const useSupabase = import.meta.env.VITE_USE_SUPABASE === 'true';
  
  if (useSupabase) {
    serviceContainer.register(
      SERVICE_TOKENS.STORAGE_SERVICE,
      () => new SupabaseStorageService(),
      true
    );
  } else {
    serviceContainer.register(
      SERVICE_TOKENS.STORAGE_SERVICE,
      () => new DexieStorageService(),
      true
    );
  }

  const logService = serviceContainer.resolve(SERVICE_TOKENS.LOG_SERVICE);
  logService.info('Application services bootstrapped successfully', {
    environment: configService.getEnvironment(),
    storageService: useSupabase ? 'Supabase' : 'Dexie',
    services: Object.values(SERVICE_TOKENS),
  });
}
```

#### 2.7 Environment Configuration
```bash
# .env.local for development
VITE_USE_SUPABASE=true
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-anon-key

# .env.production for production
VITE_USE_SUPABASE=true
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Validation**:
- [ ] Service container properly configured
- [ ] Environment-based service selection works
- [ ] Both Dexie and Supabase services available

---

## Phase 3: Data Migration & Sync (Week 3)

### Day 11-12: Migration Scripts Development

#### 3.1 Create Migration Service
```typescript
// scripts/migrate-data.ts
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const googleCloudDB = new Pool({
  connectionString: process.env.GOOGLE_CLOUD_DATABASE_URL,
});

interface MigrationStats {
  users: number;
  projects: number;
  models: number;
  actuals: number;
  errors: string[];
}

export class DataMigrator {
  private stats: MigrationStats = {
    users: 0,
    projects: 0,
    models: 0,
    actuals: 0,
    errors: []
  };

  async migrateAllData(): Promise<MigrationStats> {
    console.log('🚀 Starting data migration from Google Cloud SQL to Supabase...');
    
    try {
      // Step 1: Migrate users (to profiles table)
      await this.migrateUsers();
      
      // Step 2: Migrate projects
      await this.migrateProjects();
      
      // Step 3: Migrate financial models
      await this.migrateModels();
      
      // Step 4: Migrate actuals
      await this.migrateActuals();
      
      // Step 5: Validate migration
      await this.validateMigration();
      
      console.log('✅ Migration completed successfully!');
      console.log('📊 Migration Stats:', this.stats);
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      this.stats.errors.push(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
    
    return this.stats;
  }

  private async migrateUsers(): Promise<void> {
    console.log('👥 Migrating users...');
    
    const { rows: users } = await googleCloudDB.query(
      'SELECT * FROM users ORDER BY created_at'
    );
    
    for (const user of users) {
      try {
        // Check if user already exists in auth.users
        const { data: existingUser } = await supabase.auth.admin.getUserById(user.id);
        
        if (!existingUser.user) {
          // Create user in Supabase auth
          const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            id: user.id,
            email: user.email,
            email_confirm: true,
            user_metadata: {
              full_name: user.name,
              avatar_url: user.picture
            }
          });
          
          if (authError) {
            throw authError;
          }
        }
        
        // Create/update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            full_name: user.name,
            avatar_url: user.picture,
            company_domain: user.company_domain,
            preferences: user.preferences || {},
            created_at: user.created_at,
            updated_at: user.updated_at
          });
        
        if (profileError) {
          throw profileError;
        }
        
        this.stats.users++;
        console.log(`✅ Migrated user: ${user.email}`);
        
      } catch (error) {
        const errorMsg = `Failed to migrate user ${user.email}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        this.stats.errors.push(errorMsg);
      }
    }
    
    console.log(`👥 Migrated ${this.stats.users} users`);
  }

  private async migrateProjects(): Promise<void> {
    console.log('📁 Migrating projects...');
    
    const { rows: projects } = await googleCloudDB.query(
      'SELECT * FROM projects ORDER BY created_at'
    );
    
    for (const project of projects) {
      try {
        const { error } = await supabase
          .from('projects')
          .upsert({
            id: project.id,
            user_id: project.user_id,
            name: project.name,
            description: project.description,
            product_type: project.product_type,
            target_audience: project.target_audience,
            timeline: project.timeline,
            avatar_image: project.avatar_image,
            is_public: project.is_public || false,
            data: project.data || {},
            version: project.version || 1,
            created_at: project.created_at,
            updated_at: project.updated_at
          });
        
        if (error) {
          throw error;
        }
        
        this.stats.projects++;
        console.log(`✅ Migrated project: ${project.name}`);
        
      } catch (error) {
        const errorMsg = `Failed to migrate project ${project.name}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        this.stats.errors.push(errorMsg);
      }
    }
    
    console.log(`📁 Migrated ${this.stats.projects} projects`);
  }

  private async migrateModels(): Promise<void> {
    console.log('🧮 Migrating financial models...');
    
    const { rows: models } = await googleCloudDB.query(
      'SELECT * FROM financial_models ORDER BY created_at'
    );
    
    for (const model of models) {
      try {
        const { error } = await supabase
          .from('financial_models')
          .upsert({
            id: model.id,
            project_id: model.project_id,
            user_id: model.user_id,
            name: model.name,
            assumptions: model.assumptions || {},
            results_cache: model.results_cache || {},
            version: model.version || 1,
            created_at: model.created_at,
            updated_at: model.updated_at
          });
        
        if (error) {
          throw error;
        }
        
        this.stats.models++;
        console.log(`✅ Migrated model: ${model.name}`);
        
      } catch (error) {
        const errorMsg = `Failed to migrate model ${model.name}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        this.stats.errors.push(errorMsg);
      }
    }
    
    console.log(`🧮 Migrated ${this.stats.models} models`);
  }

  private async migrateActuals(): Promise<void> {
    console.log('📊 Migrating actuals data...');
    
    // Note: Google Cloud SQL uses a different table structure, adapt as needed
    const { rows: actuals } = await googleCloudDB.query(
      'SELECT * FROM actuals ORDER BY created_at'
    );
    
    for (const actual of actuals) {
      try {
        const { error } = await supabase
          .from('actuals')
          .upsert({
            id: actual.id,
            project_id: actual.project_id,
            period: actual.period,
            data: actual.data || {},
            created_at: actual.created_at,
            updated_at: actual.updated_at
          });
        
        if (error) {
          throw error;
        }
        
        this.stats.actuals++;
        
      } catch (error) {
        const errorMsg = `Failed to migrate actual for period ${actual.period}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        this.stats.errors.push(errorMsg);
      }
    }
    
    console.log(`📊 Migrated ${this.stats.actuals} actuals records`);
  }

  private async validateMigration(): Promise<void> {
    console.log('🔍 Validating migration...');
    
    // Validate user count
    const { rows: originalUsers } = await googleCloudDB.query('SELECT COUNT(*) FROM users');
    const { count: migratedUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (originalUsers[0].count !== migratedUsers) {
      throw new Error(`User count mismatch: ${originalUsers[0].count} vs ${migratedUsers}`);
    }
    
    // Validate project count
    const { rows: originalProjects } = await googleCloudDB.query('SELECT COUNT(*) FROM projects');
    const { count: migratedProjects } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });
    
    if (originalProjects[0].count !== migratedProjects) {
      throw new Error(`Project count mismatch: ${originalProjects[0].count} vs ${migratedProjects}`);
    }
    
    console.log('✅ Migration validation passed');
  }
}

// CLI execution
if (require.main === module) {
  const migrator = new DataMigrator();
  
  migrator.migrateAllData()
    .then((stats) => {
      console.log('🎉 Migration completed!');
      console.log(JSON.stringify(stats, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}
```

#### 3.2 Create Migration CLI Tool
```bash
# package.json scripts
{
  "scripts": {
    "migrate:all": "tsx scripts/migrate-data.ts",
    "migrate:users": "tsx scripts/migrate-users.ts",
    "migrate:projects": "tsx scripts/migrate-projects.ts",
    "migrate:validate": "tsx scripts/validate-migration.ts"
  }
}
```

**Validation**:
- [ ] Migration scripts created and tested
- [ ] Validation logic implemented
- [ ] CLI tools functional

### Day 13-14: Data Migration Execution

#### 3.3 Execute Migration in Stages
```bash
# Step 1: Backup current data
npm run migrate:backup

# Step 2: Run user migration
npm run migrate:users

# Step 3: Run project migration  
npm run migrate:projects

# Step 4: Run model migration
npm run migrate:models

# Step 5: Validate all migrations
npm run migrate:validate
```

#### 3.4 Create Rollback Scripts
```typescript
// scripts/rollback-migration.ts
export class MigrationRollback {
  async rollbackToGoogleCloud(): Promise<void> {
    console.log('🔄 Rolling back to Google Cloud SQL...');
    
    // Update environment to use Google Cloud
    await this.updateEnvironmentConfig('google-cloud');
    
    // Clear Supabase data if needed
    await this.clearSupabaseData();
    
    // Restart services with Google Cloud config
    await this.restartServices();
    
    console.log('✅ Rollback completed');
  }
  
  private async updateEnvironmentConfig(target: 'google-cloud' | 'supabase'): Promise<void> {
    // Implementation to update environment configuration
  }
  
  private async clearSupabaseData(): Promise<void> {
    // Implementation to clear Supabase tables if needed
  }
  
  private async restartServices(): Promise<void> {
    // Implementation to restart application services
  }
}
```

**Validation**:
- [ ] Data migration completed successfully
- [ ] Data integrity validated
- [ ] Rollback procedures tested

---

## Phase 4: Integration & Testing (Week 4)

### Day 15-16: Frontend Integration

#### 4.1 Update Environment Configuration
```typescript
// src/lib/config.ts
interface AppConfig {
  isDevelopment: boolean;
  isProduction: boolean;
  enableDemoData: boolean;
  enableAnalytics: boolean;
  enableDevTools: boolean;
  useSupabase: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  version: string;
}

export const config: AppConfig = {
  isDevelopment: import.meta.env.MODE === 'development',
  isProduction: import.meta.env.MODE === 'production',
  enableDemoData: import.meta.env.MODE === 'development' || import.meta.env.VITE_ENABLE_DEMO_DATA === 'true',
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  enableDevTools: import.meta.env.MODE === 'development',
  useSupabase: import.meta.env.VITE_USE_SUPABASE === 'true',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  version: '2.0.0',
};
```

#### 4.2 Update App Component
```typescript
// src/App.tsx
import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import { ServiceProvider } from '@/services/providers/ServiceProvider';
import { Toaster } from '@/components/ui/sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { config } from '@/lib/config';
import { bootstrapServices } from '@/services/bootstrap';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  useEffect(() => {
    // Bootstrap services on app startup
    bootstrapServices();
    
    console.log('🚀 Fortress Modeler Cloud v2.0.0');
    console.log(`📊 Storage: ${config.useSupabase ? 'Supabase' : 'Local (Dexie)'}`);
    console.log(`🔧 Environment: ${config.isDevelopment ? 'Development' : 'Production'}`);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ServiceProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppLayout />
            <Toaster position="bottom-right" />
          </BrowserRouter>
        </AuthProvider>
      </ServiceProvider>
    </QueryClientProvider>
  );
}

export default App;
```

#### 4.3 Update Protected Route Component
```typescript
// src/components/ProtectedRoute.tsx
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { config } from '@/lib/config';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // If using local storage (not Supabase), bypass authentication
  if (!config.useSupabase) {
    return <>{children}</>;
  }

  if (isLoading) {
    return <SkeletonLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
```

**Validation**:
- [ ] Frontend properly configured for Supabase
- [ ] Authentication flow working
- [ ] Protected routes functional

### Day 17-18: Testing Implementation

#### 4.4 Unit Tests for Supabase Service
```typescript
// src/services/implementations/__tests__/SupabaseStorageService.test.ts
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { SupabaseStorageService } from '../SupabaseStorageService';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn()
    }
  }
}));

describe('SupabaseStorageService', () => {
  let service: SupabaseStorageService;
  let mockFrom: Mock;

  beforeEach(() => {
    service = new SupabaseStorageService();
    mockFrom = vi.fn();
    (supabase.from as Mock).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis()
    });
  });

  describe('getProject', () => {
    it('should return project when found', async () => {
      const mockProject = {
        id: 'test-id',
        name: 'Test Project',
        product_type: 'Software',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProject, error: null })
      };

      (supabase.from as Mock).mockReturnValue(mockQuery);

      const result = await service.getProject('test-id');

      expect(result).toBeDefined();
      expect(result?.id).toBe('test-id');
      expect(result?.name).toBe('Test Project');
    });

    it('should return undefined when project not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { code: 'PGRST116' } 
        })
      };

      (supabase.from as Mock).mockReturnValue(mockQuery);

      const result = await service.getProject('nonexistent');

      expect(result).toBeUndefined();
    });

    it('should throw DatabaseError on other errors', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { code: 'OTHER_ERROR', message: 'Database error' } 
        })
      };

      (supabase.from as Mock).mockReturnValue(mockQuery);

      await expect(service.getProject('test-id')).rejects.toThrow('Failed to fetch project');
    });
  });

  describe('createProject', () => {
    beforeEach(() => {
      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } }
      });
    });

    it('should create project successfully', async () => {
      const projectData = {
        name: 'New Project',
        productType: 'Software',
        description: 'Test description'
      };

      const mockCreatedProject = {
        id: 'new-project-id',
        user_id: 'user-123',
        name: 'New Project',
        product_type: 'Software',
        description: 'Test description',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCreatedProject, error: null })
      };

      (supabase.from as Mock).mockReturnValue(mockQuery);

      const result = await service.createProject(projectData);

      expect(result).toBeDefined();
      expect(result.name).toBe('New Project');
      expect(result.productType).toBe('Software');
    });

    it('should throw ValidationError for missing required fields', async () => {
      const projectData = {
        name: '', // Empty name should trigger validation error
        productType: 'Software'
      };

      await expect(service.createProject(projectData)).rejects.toThrow('Project name is required');
    });
  });
});
```

#### 4.5 Integration Tests
```typescript
// src/test/integration/supabase-integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { SupabaseStorageService } from '@/services/implementations/SupabaseStorageService';

// Test with actual Supabase instance (local)
const testSupabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

describe('Supabase Integration Tests', () => {
  let service: SupabaseStorageService;
  let testUser: any;
  let testProject: any;

  beforeEach(async () => {
    service = new SupabaseStorageService();
    
    // Create test user
    const { data: authUser } = await testSupabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'testpassword123',
      email_confirm: true
    });
    
    testUser = authUser.user;
    
    // Create test profile
    await testSupabase.from('profiles').insert({
      id: testUser.id,
      email: testUser.email,
      full_name: 'Test User'
    });
  });

  afterEach(async () => {
    // Cleanup: delete test data
    if (testProject) {
      await testSupabase.from('projects').delete().eq('id', testProject.id);
    }
    
    if (testUser) {
      await testSupabase.from('profiles').delete().eq('id', testUser.id);
      await testSupabase.auth.admin.deleteUser(testUser.id);
    }
  });

  it('should perform full CRUD operations on projects', async () => {
    // Mock authentication
    vi.spyOn(testSupabase.auth, 'getUser').mockResolvedValue({
      data: { user: testUser },
      error: null
    });

    // Create project
    const projectData = {
      name: 'Integration Test Project',
      productType: 'Software',
      description: 'Test project for integration testing'
    };

    testProject = await service.createProject(projectData);
    expect(testProject).toBeDefined();
    expect(testProject.name).toBe(projectData.name);

    // Read project
    const retrievedProject = await service.getProject(testProject.id);
    expect(retrievedProject).toBeDefined();
    expect(retrievedProject?.name).toBe(projectData.name);

    // Update project
    const updatedProject = await service.updateProject(testProject.id, {
      name: 'Updated Project Name'
    });
    expect(updatedProject.name).toBe('Updated Project Name');

    // List projects
    const allProjects = await service.getAllProjects();
    expect(allProjects.length).toBeGreaterThan(0);
    expect(allProjects.some(p => p.id === testProject.id)).toBe(true);

    // Delete project
    await service.deleteProject(testProject.id);
    const deletedProject = await service.getProject(testProject.id);
    expect(deletedProject).toBeUndefined();
    
    testProject = null; // Prevent cleanup from trying to delete again
  });
});
```

#### 4.6 End-to-End Tests
```typescript
// src/test/e2e/supabase-e2e.test.ts
import { test, expect } from '@playwright/test';

test.describe('Supabase E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:3000');
  });

  test('should complete full authentication and project management flow', async ({ page }) => {
    // Login flow
    await page.click('button:has-text("Sign In with Google")');
    
    // Wait for redirect back to app (mock or use test Google account)
    await page.waitForURL('**/dashboard');
    
    // Verify authenticated state
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
    
    // Create new project
    await page.click('button:has-text("New Project")');
    await page.fill('input[name="name"]', 'E2E Test Project');
    await page.selectOption('select[name="productType"]', 'Software');
    await page.click('button[type="submit"]');
    
    // Verify project creation
    await expect(page.locator('text=E2E Test Project')).toBeVisible();
    
    // Create financial model
    await page.click('text=E2E Test Project');
    await page.click('button:has-text("New Financial Model")');
    await page.fill('input[name="name"]', 'Test Model');
    await page.click('button[type="submit"]');
    
    // Verify model creation
    await expect(page.locator('text=Test Model')).toBeVisible();
    
    // Test real-time updates (open second tab)
    const secondPage = await page.context().newPage();
    await secondPage.goto(page.url());
    
    // Update project in first tab
    await page.click('button:has-text("Edit Project")');
    await page.fill('input[name="name"]', 'Updated E2E Project');
    await page.click('button[type="submit"]');
    
    // Verify real-time update in second tab
    await expect(secondPage.locator('text=Updated E2E Project')).toBeVisible({ timeout: 5000 });
    
    await secondPage.close();
  });
});
```

**Validation**:
- [ ] Unit tests passing for all services
- [ ] Integration tests working with local Supabase
- [ ] E2E tests covering full user workflows

### Day 19: Performance Testing

#### 4.7 Performance Benchmark Tests
```typescript
// scripts/performance-benchmark.ts
import { performance } from 'perf_hooks';
import { SupabaseStorageService } from '@/services/implementations/SupabaseStorageService';
import { DexieStorageService } from '@/services/implementations/DexieStorageService';

interface BenchmarkResult {
  operation: string;
  supabaseTime: number;
  dexieTime: number;
  difference: number;
  percentageDiff: number;
}

export class PerformanceBenchmark {
  private supabaseService = new SupabaseStorageService();
  private dexieService = new DexieStorageService();
  private results: BenchmarkResult[] = [];

  async runBenchmarks(): Promise<BenchmarkResult[]> {
    console.log('🚀 Starting performance benchmarks...');

    // Benchmark project operations
    await this.benchmarkOperation('getAllProjects', 
      () => this.supabaseService.getAllProjects(),
      () => this.dexieService.getAllProjects()
    );

    await this.benchmarkOperation('getProject',
      () => this.supabaseService.getProject('test-project-id'),
      () => this.dexieService.getProject('test-project-id')
    );

    // Benchmark model operations
    await this.benchmarkOperation('getModelsForProject',
      () => this.supabaseService.getModelsForProject('test-project-id'),
      () => this.dexieService.getModelsForProject('test-project-id')
    );

    console.log('📊 Benchmark Results:');
    this.results.forEach(result => {
      console.log(`${result.operation}:`);
      console.log(`  Supabase: ${result.supabaseTime.toFixed(2)}ms`);
      console.log(`  Dexie: ${result.dexieTime.toFixed(2)}ms`);
      console.log(`  Difference: ${result.difference > 0 ? '+' : ''}${result.difference.toFixed(2)}ms (${result.percentageDiff.toFixed(1)}%)`);
      console.log('');
    });

    return this.results;
  }

  private async benchmarkOperation(
    name: string,
    supabaseOp: () => Promise<any>,
    dexieOp: () => Promise<any>,
    iterations: number = 10
  ): Promise<void> {
    // Warm up
    try {
      await supabaseOp();
      await dexieOp();
    } catch (error) {
      // Ignore warm-up errors
    }

    // Benchmark Supabase
    const supabaseStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      try {
        await supabaseOp();
      } catch (error) {
        // Continue benchmarking even if some calls fail
      }
    }
    const supabaseEnd = performance.now();
    const supabaseTime = (supabaseEnd - supabaseStart) / iterations;

    // Benchmark Dexie
    const dexieStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      try {
        await dexieOp();
      } catch (error) {
        // Continue benchmarking even if some calls fail
      }
    }
    const dexieEnd = performance.now();
    const dexieTime = (dexieEnd - dexieStart) / iterations;

    const difference = supabaseTime - dexieTime;
    const percentageDiff = (difference / dexieTime) * 100;

    this.results.push({
      operation: name,
      supabaseTime,
      dexieTime,
      difference,
      percentageDiff
    });
  }
}

// Run benchmarks
if (require.main === module) {
  const benchmark = new PerformanceBenchmark();
  benchmark.runBenchmarks().then(() => {
    console.log('✅ Benchmarks completed');
  });
}
```

**Validation**:
- [ ] Performance benchmarks show acceptable differences
- [ ] No significant performance regressions
- [ ] Real-time features don't impact performance significantly

---

## Phase 5: Deployment & Cutover (Week 5-6)

### Day 20-21: Production Deployment

#### 5.1 Production Supabase Setup
```bash
# Create production Supabase project
npx supabase projects create "fortress-modeler-prod"

# Link local project to production
npx supabase link --project-ref your-prod-project-ref

# Push database schema to production
npx supabase db push

# Deploy Edge Functions (if any)
npx supabase functions deploy
```

#### 5.2 Environment Configuration
```bash
# Production environment variables
VITE_USE_SUPABASE=true
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key

# Build for production
npm run build

# Deploy to hosting platform (Vercel/Netlify)
vercel --prod
```

#### 5.3 DNS and SSL Configuration
```yaml
# vercel.json
{
  "rewrites": [
    {
      "source": "/auth/callback",
      "destination": "/auth/callback"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

**Validation**:
- [ ] Production Supabase environment configured
- [ ] SSL certificates active
- [ ] DNS routing working correctly

### Day 22-23: Data Migration to Production

#### 5.4 Production Data Migration
```bash
# Set production environment variables
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
export GOOGLE_CLOUD_DATABASE_URL=your-google-cloud-connection

# Run production migration
npm run migrate:production

# Validate production data
npm run migrate:validate:production
```

#### 5.5 Monitoring Setup
```typescript
// src/lib/monitoring.ts
import { supabase } from './supabase';

export class ProductionMonitoring {
  static async logMigrationEvent(
    eventType: 'migration_start' | 'migration_complete' | 'migration_error',
    details: any
  ): Promise<void> {
    try {
      await supabase.from('migration_logs').insert({
        event_type: eventType,
        details,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log migration event:', error);
    }
  }

  static async trackPerformance(
    operation: string,
    duration: number,
    success: boolean
  ): Promise<void> {
    try {
      await supabase.from('performance_logs').insert({
        operation,
        duration,
        success,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to track performance:', error);
    }
  }
}
```

**Validation**:
- [ ] Production data migration completed
- [ ] Monitoring and alerting active
- [ ] Performance tracking working

### Day 24-25: Gradual Rollout

#### 5.6 Feature Flag Implementation
```typescript
// src/lib/feature-flags.ts
export interface FeatureFlags {
  useSupabaseStorage: boolean;
  enableRealtimeFeatures: boolean;
  enablePerformanceMonitoring: boolean;
}

export const getFeatureFlags = (): FeatureFlags => {
  return {
    useSupabaseStorage: import.meta.env.VITE_USE_SUPABASE === 'true',
    enableRealtimeFeatures: import.meta.env.VITE_ENABLE_REALTIME === 'true',
    enablePerformanceMonitoring: import.meta.env.VITE_ENABLE_MONITORING === 'true'
  };
};

// src/hooks/useFeatureFlags.ts
import { useState, useEffect } from 'react';
import { getFeatureFlags, FeatureFlags } from '@/lib/feature-flags';

export const useFeatureFlags = (): FeatureFlags => {
  const [flags, setFlags] = useState<FeatureFlags>(getFeatureFlags());

  useEffect(() => {
    // Could implement remote feature flag fetching here
    setFlags(getFeatureFlags());
  }, []);

  return flags;
};
```

#### 5.7 Rollout Strategy
```typescript
// src/lib/rollout.ts
export class RolloutManager {
  private static rolloutPercentage: number = 0;

  static setRolloutPercentage(percentage: number): void {
    this.rolloutPercentage = percentage;
    localStorage.setItem('rollout_percentage', percentage.toString());
  }

  static shouldUseSupabase(userId?: string): boolean {
    const percentage = this.rolloutPercentage;
    
    if (percentage === 0) return false;
    if (percentage === 100) return true;

    // Use consistent rollout based on user ID
    if (userId) {
      const hash = this.hashUserId(userId);
      return hash % 100 < percentage;
    }

    // Fallback to random for anonymous users
    return Math.random() * 100 < percentage;
  }

  private static hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
```

**Validation**:
- [ ] Feature flags implemented and working
- [ ] Gradual rollout strategy tested
- [ ] Rollback mechanisms validated

### Day 26-27: Monitoring & Optimization

#### 5.8 Real-time Monitoring Dashboard
```typescript
// src/components/admin/MigrationDashboard.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface MigrationStats {
  totalUsers: number;
  migratedUsers: number;
  activeConnections: number;
  errorRate: number;
  averageResponseTime: number;
}

export const MigrationDashboard = () => {
  const [stats, setStats] = useState<MigrationStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch migration statistics
        const { data: migrationData } = await supabase
          .from('migration_stats')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (migrationData) {
          setStats(migrationData);
        }
      } catch (error) {
        console.error('Failed to fetch migration stats:', error);
      }
    };

    fetchStats();
    
    // Set up real-time updates
    const channel = supabase
      .channel('migration_stats')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'migration_stats' },
        fetchStats
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!stats) {
    return <div>Loading migration stats...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold">Migration Progress</h3>
        <p className="text-3xl font-bold text-green-600">
          {((stats.migratedUsers / stats.totalUsers) * 100).toFixed(1)}%
        </p>
        <p className="text-sm text-gray-600">
          {stats.migratedUsers} of {stats.totalUsers} users migrated
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold">Active Connections</h3>
        <p className="text-3xl font-bold text-blue-600">{stats.activeConnections}</p>
        <p className="text-sm text-gray-600">Real-time connections</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold">Error Rate</h3>
        <p className={`text-3xl font-bold ${stats.errorRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
          {stats.errorRate.toFixed(2)}%
        </p>
        <p className="text-sm text-gray-600">Last 24 hours</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold">Response Time</h3>
        <p className="text-3xl font-bold text-purple-600">{stats.averageResponseTime}ms</p>
        <p className="text-sm text-gray-600">Average response time</p>
      </div>
    </div>
  );
};
```

#### 5.9 Error Tracking and Alerting
```typescript
// src/lib/error-tracking.ts
export class ErrorTracker {
  static async logError(
    error: Error,
    context: string,
    userId?: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    try {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        error_stack: error.stack,
        context,
        user_id: userId,
        severity,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        url: window.location.href
      });

      // Send critical errors to monitoring service
      if (severity === 'critical') {
        await this.sendCriticalAlert(error, context, userId);
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  private static async sendCriticalAlert(
    error: Error,
    context: string,
    userId?: string
  ): Promise<void> {
    try {
      // Send to monitoring service (Sentry, DataDog, etc.)
      // Or send to Supabase Edge Function for notifications
      await supabase.functions.invoke('send-alert', {
        body: {
          error: error.message,
          context,
          userId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (alertError) {
      console.error('Failed to send critical alert:', alertError);
    }
  }
}
```

**Validation**:
- [ ] Monitoring dashboard functional
- [ ] Error tracking and alerting working
- [ ] Performance metrics being collected

### Day 28: Legacy System Decommissioning

#### 5.10 Google Cloud Cleanup
```bash
# Backup final state of Google Cloud SQL
gcloud sql export sql fortress-modeler-instance \
  gs://fortress-modeler-backups/final-backup-$(date +%Y%m%d).sql \
  --database=fortress-modeler

# Stop Google Cloud SQL instance
gcloud sql instances patch fortress-modeler-instance --no-backup

# Delete Google Cloud Run service (after traffic verification)
gcloud run services delete fortress-modeler-backend --region=us-central1

# Archive Google Secrets Manager secrets
gcloud secrets versions disable latest --secret="google-client-id"
gcloud secrets versions disable latest --secret="google-client-secret"
gcloud secrets versions disable latest --secret="jwt-secret"
```

#### 5.11 Final Documentation Update
```markdown
# Migration Completion Checklist

## ✅ Completed Tasks
- [x] Supabase project configured and deployed
- [x] Database schema migrated and validated
- [x] User data migrated successfully
- [x] Authentication switched to Supabase Auth
- [x] Real-time features implemented and tested
- [x] Performance monitoring active
- [x] Gradual rollout completed successfully
- [x] Google Cloud services decommissioned

## 📊 Migration Results
- Total users migrated: X
- Total projects migrated: Y
- Total models migrated: Z
- Migration completion rate: 100%
- Data integrity validation: ✅ Passed
- Performance impact: Improved by X%
- Cost reduction: X% monthly savings

## 🚀 New Features Enabled
- Real-time collaboration
- Enhanced security with RLS
- Improved performance
- Simplified deployment process
- Global edge distribution

## 🔧 Maintenance Tasks
- Monitor performance metrics weekly
- Review error logs daily for first month
- Update documentation as needed
- Plan next feature enhancements
```

**Validation**:
- [ ] Google Cloud resources safely decommissioned
- [ ] All data backed up and archived
- [ ] Documentation updated and complete
- [ ] Migration marked as successful

---

## Success Criteria & Validation

### Technical Success Metrics
- [ ] **Data Integrity**: 100% of data migrated without loss
- [ ] **Performance**: Response times within 10% of baseline
- [ ] **Reliability**: 99.9% uptime during migration period
- [ ] **Feature Parity**: All existing features working correctly
- [ ] **Real-time Features**: New collaboration features functional

### Business Success Metrics
- [ ] **Cost Reduction**: 60-80% infrastructure cost savings achieved
- [ ] **User Experience**: No user complaints or satisfaction degradation
- [ ] **Development Velocity**: Simplified deployment and maintenance processes
- [ ] **Scalability**: Improved ability to handle growth

### Post-Migration Tasks
- [ ] Performance monitoring for 30 days
- [ ] User feedback collection and analysis
- [ ] Cost savings validation and reporting
- [ ] Team training on new Supabase workflows
- [ ] Documentation updates and knowledge transfer

---

## Rollback Procedures

### Immediate Rollback (< 1 hour)
```bash
# 1. Switch feature flag
export VITE_USE_SUPABASE=false

# 2. Redeploy with Google Cloud configuration
npm run build
vercel --prod

# 3. Restart Google Cloud SQL instance if stopped
gcloud sql instances patch fortress-modeler-instance --backup
```

### Data Rollback (< 24 hours)
```bash
# 1. Restore Google Cloud SQL from backup
gcloud sql import sql fortress-modeler-instance \
  gs://fortress-modeler-backups/pre-migration-backup.sql

# 2. Validate data integrity
npm run validate:google-cloud

# 3. Update application configuration
npm run config:rollback
```

### Complete Rollback (< 48 hours)
```bash
# 1. Full Google Cloud infrastructure restoration
./scripts/restore-google-cloud.sh

# 2. Application rollback to pre-migration state
git checkout pre-migration-backup
npm install
npm run build
npm run deploy

# 3. DNS and routing updates
./scripts/update-dns-to-google-cloud.sh
```

---

## Conclusion

This implementation roadmap provides a comprehensive, step-by-step approach to migrating Fortress Modeler Cloud from Google Cloud SQL to Supabase. The phased approach minimizes risk while maximizing the benefits of improved functionality and significant cost savings.

### Key Benefits Achieved
- **60-80% cost reduction** in infrastructure expenses
- **Real-time collaboration** features for enhanced user experience
- **Simplified deployment** and maintenance processes
- **Enhanced security** with Row Level Security
- **Global performance** improvements via edge distribution

### Risk Mitigation
- **Comprehensive testing** at each phase
- **Gradual rollout** strategy with feature flags
- **Multiple rollback options** for different scenarios
- **Continuous monitoring** throughout the migration
- **Data integrity validation** at every step

The migration is designed to be executed safely with minimal user impact while delivering significant business value through cost optimization and feature enhancement.