#!/usr/bin/env node

/**
 * Legacy Data Migration Script
 * 
 * Migrates projects, risks, and other data from old Supabase instance to new one
 * Handles schema differences, missing fields, and data transformation
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env file
config();

// Configuration
const CONFIG = {
  // Old Database (source) - issmshemlkrucmxcvibs has the data
  OLD_DB: {
    url: 'https://issmshemlkrucmxcvibs.supabase.co',
    serviceKey: process.env.OLD_SUPABASE_SERVICE_ROLE_KEY || '',
    anonKey: process.env.OLD_SUPABASE_ANON_KEY || '',
  },
  
  // New Database (destination) - jjearfzmvmpohbebcnju is the target
  NEW_DB: {
    url: process.env.VITE_SUPABASE_URL || 'https://jjearfzmvmpohbebcnju.supabase.co',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    anonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
  },
  
  // Migration settings
  DRY_RUN: process.argv.includes('--dry-run'),
  VERBOSE: process.argv.includes('--verbose'),
  PROJECTS_ONLY: process.argv.includes('--projects-only'),
  BATCH_SIZE: 10,
  TARGET_USER_EMAIL: process.env.TARGET_USER_EMAIL || '',
};

// Initialize Supabase clients - use service role key for old DB to bypass RLS issues
const oldSupabase = createClient(
  CONFIG.OLD_DB.url, 
  CONFIG.OLD_DB.serviceKey || CONFIG.OLD_DB.anonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
// Use service role key for new database to bypass RLS during migration
const newSupabase = createClient(
  CONFIG.NEW_DB.url, 
  CONFIG.NEW_DB.serviceKey || CONFIG.NEW_DB.anonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Logging utilities
const log = (message, level = 'INFO') => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
};

const verbose = (message) => {
  if (CONFIG.VERBOSE) log(message, 'DEBUG');
};

// Schema mapping for projects table
const PROJECT_SCHEMA_MAPPING = {
  // Direct field mappings (old_field -> new_field)
  id: 'id',
  name: 'name', 
  description: 'description',
  created_at: 'created_at',
  updated_at: 'updated_at',
  
  // Transform and map fields to new schema
  transformData: (oldProject, currentUserId) => {
    // Handle the 'data' column - ensure it's valid JSON
    let projectData = oldProject.data;
    
    if (typeof projectData === 'string') {
      try {
        projectData = JSON.parse(projectData);
      } catch (e) {
        log(`Warning: Invalid JSON in project ${oldProject.id}, using default structure`, 'WARN');
        projectData = {};
      }
    }
    
    // Build new project structure
    const newProject = {
      id: oldProject.id,
      user_id: currentUserId, // Assign to current user
      name: oldProject.name || 'Untitled Project',
      description: oldProject.description || '',
      product_type: oldProject.product_type || projectData?.product_type || 'saas', // Default to SaaS
      target_audience: oldProject.target_audience || projectData?.target_audience || '',
      
      // Transform data column to match new schema
      data: {
        ...projectData,
        version: projectData?.version || '1.0',
        metadata: projectData?.metadata || {},
        settings: projectData?.settings || {},
        // Preserve any other legacy data
        legacy_data: projectData
      },
      
      // Timeline handling
      timeline: projectData?.timeline || {
        startDate: oldProject.created_at,
        endDate: null
      },
      
      // Avatar and visual
      avatar_image: oldProject.avatar_image || projectData?.avatar_image || null,
      
      // Sharing settings (map from old schema)
      is_public: oldProject.is_public || oldProject.sharing_enabled || false,
      owner_email: oldProject.owner_email || null,
      share_count: oldProject.share_count || 0,
      
      // Versioning
      version: oldProject.version || 1,
      
      // Timestamps
      created_at: oldProject.created_at,
      updated_at: oldProject.updated_at || oldProject.created_at,
      deleted_at: null // No soft deletes in old data
    };
    
    return newProject;
  }
};

// Schema mapping for risks table
const RISK_SCHEMA_MAPPING = {
  transformData: (oldRisk, currentUserId, newProjectId) => {
    // Map old risk structure to new schema
    const newRisk = {
      id: oldRisk.id,
      project_id: newProjectId, // Use mapped project ID
      user_id: currentUserId,
      name: oldRisk.name || 'Untitled Risk',
      
      // Map risk type/category
      type: mapRiskType(oldRisk.category || oldRisk.type),
      
      // Map probability and impact
      likelihood: mapRiskLevel(oldRisk.probability || oldRisk.likelihood),
      impact: mapRiskLevel(oldRisk.impact),
      
      // Status mapping
      status: mapRiskStatus(oldRisk.status),
      
      // Text fields
      mitigation: oldRisk.mitigation_strategy || oldRisk.mitigation || '',
      notes: oldRisk.description || oldRisk.notes || '',
      owner_email: oldRisk.owner_email || null,
      
      // Timestamps
      created_at: oldRisk.created_at,
      updated_at: oldRisk.updated_at || oldRisk.created_at
    };
    
    return newRisk;
  }
};

// Helper functions for risk mapping
const mapRiskType = (oldType) => {
  const typeMap = {
    'financial': 'financial',
    'operational': 'operational', 
    'strategic': 'strategic',
    'regulatory': 'regulatory',
    'compliance': 'regulatory',
    'technical': 'operational',
    'market': 'strategic',
    'business': 'strategic',
    'technology': 'operational'
  };
  
  return typeMap[oldType?.toLowerCase()] || 'other';
};

const mapRiskLevel = (oldLevel) => {
  if (typeof oldLevel === 'number') {
    // Convert numeric to text
    if (oldLevel <= 3) return 'low';
    if (oldLevel <= 7) return 'medium';
    return 'high';
  }
  
  const levelMap = {
    'low': 'low',
    'medium': 'medium',
    'med': 'medium',
    'high': 'high',
    'very high': 'high',
    'critical': 'high'
  };
  
  return levelMap[oldLevel?.toLowerCase()] || 'medium';
};

const mapRiskStatus = (oldStatus) => {
  const statusMap = {
    'identified': 'identified',
    'active': 'identified',
    'mitigated': 'mitigated',
    'resolved': 'mitigated',
    'accepted': 'accepted',
    'transferred': 'transferred',
    'closed': 'mitigated'
  };
  
  return statusMap[oldStatus?.toLowerCase()] || 'identified';
};

// Get target user for migration
const getTargetUser = async () => {
  // If we have a service role key, we can query users directly
  if (CONFIG.NEW_DB.serviceKey) {
    if (CONFIG.TARGET_USER_EMAIL) {
      // Look up user by email
      const { data: user, error } = await newSupabase.auth.admin.getUserByEmail(CONFIG.TARGET_USER_EMAIL);
      if (error || !user) {
        throw new Error(`Target user not found: ${CONFIG.TARGET_USER_EMAIL}. Please ensure this user exists in the new database.`);
      }
      return user;
    } else {
      // Get the first user (for single-user migrations)
      const { data: { users }, error } = await newSupabase.auth.admin.listUsers();
      if (error || !users || users.length === 0) {
        throw new Error('No users found in the new database. Please create a user account first.');
      }
      if (users.length > 1) {
        throw new Error(`Multiple users found (${users.length}). Please specify TARGET_USER_EMAIL in your .env file.`);
      }
      return users[0];
    }
  } else {
    // Fallback: try to get current authenticated user (won't work with anon key)
    const { data: { user }, error } = await newSupabase.auth.getUser();
    if (error || !user) {
      throw new Error('Not authenticated and no service role key provided. Please add SUPABASE_SERVICE_ROLE_KEY to your .env file.');
    }
    return user;
  }
};

// Fetch all projects from old database
const fetchLegacyProjects = async () => {
  log('Fetching legacy projects from old database...');
  
  try {
    const { data: projects, error } = await oldSupabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: true });
      
    if (error) {
      throw new Error(`Failed to fetch legacy projects: ${error.message}`);
    }
    
    log(`Found ${projects?.length || 0} legacy projects`);
    return projects || [];
  } catch (error) {
    log(`Error fetching projects: ${error.message}`, 'ERROR');
    return [];
  }
};

// Fetch risks for a project from old database
const fetchLegacyRisks = async (projectId) => {
  try {
    const { data: risks, error } = await oldSupabase
      .from('risks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
      
    if (error) {
      log(`Warning: Failed to fetch risks for project ${projectId}: ${error.message}`, 'WARN');
      return [];
    }
    
    return risks || [];
  } catch (error) {
    log(`Error fetching risks for project ${projectId}: ${error.message}`, 'WARN');
    return [];
  }
};

// Check if project already exists in new database
const projectExists = async (projectId, projectName) => {
  try {
    const { data, error } = await newSupabase
      .from('projects')
      .select('id, name')
      .or(`id.eq.${projectId},name.eq.${projectName}`)
      .maybeSingle();
      
    return !!data;
  } catch (error) {
    log(`Error checking project existence: ${error.message}`, 'WARN');
    return false;
  }
};

// Insert project into new database
const insertProject = async (project) => {
  if (CONFIG.DRY_RUN) {
    log(`[DRY RUN] Would insert project: ${project.name}`, 'INFO');
    return { data: project, error: null };
  }
  
  try {
    const { data, error } = await newSupabase
      .from('projects')
      .insert([project])
      .select()
      .single();
      
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Insert risks into new database
const insertRisks = async (risks) => {
  if (CONFIG.DRY_RUN || !risks.length) {
    log(`[DRY RUN] Would insert ${risks.length} risks`, 'INFO');
    return { data: risks, error: null };
  }
  
  try {
    const { data, error } = await newSupabase
      .from('risks')
      .insert(risks)
      .select();
      
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Main migration function
const migrateProjects = async () => {
  try {
    log('🚀 Starting legacy data migration...');
    
    // Get target user for migration
    const targetUser = await getTargetUser();
    log(`Target user for migration: ${targetUser.id} (${targetUser.email})`);
    
    // Fetch legacy projects
    const legacyProjects = await fetchLegacyProjects();
    
    if (legacyProjects.length === 0) {
      log('No legacy projects found to migrate.');
      return;
    }
    
    // Migration statistics
    const stats = {
      projectsProcessed: 0,
      projectsSkipped: 0,
      projectsMigrated: 0,
      risksProcessed: 0,
      risksMigrated: 0,
      errors: [],
    };
    
    const projectIdMappings = new Map(); // old_id -> new_id
    
    // Process projects in batches
    for (let i = 0; i < legacyProjects.length; i += CONFIG.BATCH_SIZE) {
      const batch = legacyProjects.slice(i, i + CONFIG.BATCH_SIZE);
      log(`Processing batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1} (${batch.length} projects)`);
      
      for (const oldProject of batch) {
        stats.projectsProcessed++;
        
        try {
          // Check if project already exists
          const exists = await projectExists(oldProject.id, oldProject.name);
          if (exists) {
            log(`Skipping project "${oldProject.name}" - already exists`, 'WARN');
            stats.projectsSkipped++;
            continue;
          }
          
          // Transform project data
          const transformedProject = PROJECT_SCHEMA_MAPPING.transformData(
            oldProject, 
            targetUser.id
          );
          
          verbose(`Transformed project: ${JSON.stringify(transformedProject, null, 2)}`);
          
          // Insert project
          const { data: newProject, error: projectError } = await insertProject(transformedProject);
          
          if (projectError) {
            throw new Error(`Failed to insert project: ${projectError.message}`);
          }
          
          stats.projectsMigrated++;
          log(`✅ Migrated project: "${oldProject.name}" (${oldProject.id})`);
          
          // Store project ID mapping
          projectIdMappings.set(oldProject.id, newProject?.id || oldProject.id);
          
          // Migrate risks for this project (if not projects-only mode)
          if (!CONFIG.PROJECTS_ONLY) {
            const legacyRisks = await fetchLegacyRisks(oldProject.id);
            
            if (legacyRisks.length > 0) {
              const transformedRisks = legacyRisks.map(risk => 
                RISK_SCHEMA_MAPPING.transformData(
                  risk, 
                  targetUser.id, 
                  projectIdMappings.get(oldProject.id)
                )
              );
              
              verbose(`Transformed risks: ${JSON.stringify(transformedRisks, null, 2)}`);
              
              const { data: newRisks, error: risksError } = await insertRisks(transformedRisks);
              
              if (risksError) {
                log(`Warning: Failed to migrate risks for project ${oldProject.name}: ${risksError.message}`, 'WARN');
                stats.errors.push(`Risks for ${oldProject.name}: ${risksError.message}`);
              } else {
                stats.risksProcessed += legacyRisks.length;
                stats.risksMigrated += newRisks?.length || 0;
                log(`✅ Migrated ${newRisks?.length || 0} risks for project: "${oldProject.name}"`);
              }
            }
          }
          
        } catch (error) {
          log(`❌ Failed to migrate project "${oldProject.name}": ${error.message}`, 'ERROR');
          stats.errors.push(`${oldProject.name}: ${error.message}`);
        }
      }
      
      // Brief pause between batches
      if (i + CONFIG.BATCH_SIZE < legacyProjects.length) {
        log('Pausing between batches...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Migration summary
    log('\n🎉 Migration completed!');
    log('📊 Migration Statistics:');
    log(`   Projects processed: ${stats.projectsProcessed}`);
    log(`   Projects migrated: ${stats.projectsMigrated}`);
    log(`   Projects skipped: ${stats.projectsSkipped}`);
    
    if (!CONFIG.PROJECTS_ONLY) {
      log(`   Risks processed: ${stats.risksProcessed}`);
      log(`   Risks migrated: ${stats.risksMigrated}`);
    }
    
    if (stats.errors.length > 0) {
      log(`   Errors encountered: ${stats.errors.length}`);
      log('\n❌ Errors:');
      stats.errors.forEach(error => log(`   - ${error}`, 'ERROR'));
    }
    
    if (CONFIG.DRY_RUN) {
      log('\n🔍 This was a dry run - no data was actually migrated.');
      log('Remove --dry-run flag to perform actual migration.');
    }
    
  } catch (error) {
    log(`💥 Migration failed: ${error.message}`, 'ERROR');
    process.exit(1);
  }
};

// CLI help
const showHelp = () => {
  console.log(`
🚀 Legacy Data Migration Script

Usage: node scripts/migrate-legacy-data.js [options]

Options:
  --dry-run         Preview migration without making changes
  --verbose         Show detailed debug information  
  --projects-only   Migrate only projects (skip risks and other data)
  --help           Show this help message

Environment Variables Required:
  OLD_SUPABASE_ANON_KEY    Anonymous key for old database
  VITE_SUPABASE_ANON_KEY   Anonymous key for new database (current .env)

Examples:
  # Preview what would be migrated
  node scripts/migrate-legacy-data.js --dry-run --verbose
  
  # Migrate only projects first (safer)
  node scripts/migrate-legacy-data.js --projects-only
  
  # Full migration with detailed logging
  node scripts/migrate-legacy-data.js --verbose
`);
};

// Main execution
if (process.argv.includes('--help')) {
  showHelp();
  process.exit(0);
}

// Validate environment
if (!CONFIG.OLD_DB.anonKey) {
  log('❌ OLD_SUPABASE_ANON_KEY environment variable is required', 'ERROR');
  log('Set it to the anonymous key from your old Supabase project', 'ERROR');
  process.exit(1);
}

if (!CONFIG.NEW_DB.anonKey) {
  log('❌ VITE_SUPABASE_ANON_KEY environment variable is required', 'ERROR');
  log('This should already be set in your .env file', 'ERROR');
  process.exit(1);
}

// Run migration
migrateProjects().catch(error => {
  log(`💥 Unexpected error: ${error.message}`, 'ERROR');
  process.exit(1);
});
