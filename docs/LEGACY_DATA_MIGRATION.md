# Legacy Data Migration Guide

## Overview

This guide helps you migrate projects and data from your old Supabase database (`vplafscpcsxdxbyoxfhq`) to your new database (`issmshemlkrucmxcvibs`).

The migration script handles:
- ✅ **Schema differences** - Automatically transforms old data to match new structure
- ✅ **Missing fields** - Fills in required fields with sensible defaults
- ✅ **Data validation** - Ensures data integrity during migration
- ✅ **User mapping** - Assigns all migrated data to your current user account
- ✅ **Safe execution** - Dry-run mode and error handling
- ✅ **Incremental migration** - Can migrate projects first, then risks separately

## Prerequisites

### 1. Get Your Old Database Key

1. Go to [your old Supabase project](https://supabase.com/dashboard/project/vplafscpcsxdxbyoxfhq)
2. Navigate to **Settings > API**
3. Copy the **"anon public"** key (starts with `eyJ...`)

### 2. Configure Environment

Run the setup script:
```bash
npm run setup-migration
```

Then edit your `.env` file and add:
```env
OLD_SUPABASE_ANON_KEY=your_old_anonymous_key_here
```

## Migration Process

### Step 1: Test Migration (Dry Run)

**Always start with a dry run** to see what will be migrated:

```bash
npm run migrate-legacy -- --dry-run --verbose
```

This will:
- ✅ Connect to both databases
- ✅ Show you all projects that would be migrated
- ✅ Display any potential issues
- ❌ **NOT actually migrate anything**

### Step 2: Migrate Projects Only (Recommended)

Start by migrating just projects to test the process:

```bash
npm run migrate-legacy -- --projects-only --verbose
```

This will:
- ✅ Migrate all your legacy projects
- ✅ Transform data to match new schema
- ✅ Assign all projects to your current user
- ❌ Skip risks and other data for now

### Step 3: Full Migration

Once projects look good, run the full migration:

```bash
npm run migrate-legacy -- --verbose
```

This will:
- ✅ Migrate any remaining projects
- ✅ Migrate all risks associated with projects
- ✅ Transform all data to new schema
- ✅ Provide detailed progress reporting

## Command Line Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Preview migration without making changes |
| `--verbose` | Show detailed debug information |
| `--projects-only` | Migrate only projects (skip risks) |
| `--help` | Show all available options |

## What Gets Migrated

### Projects Table
- ✅ **Basic fields**: name, description, created_at, updated_at
- ✅ **Data column**: JSON project data with validation and defaults
- ✅ **Product type**: Maps to new schema requirements
- ✅ **Timeline**: Transforms to new timeline structure
- ✅ **Sharing settings**: Maps is_public from old sharing_enabled
- ✅ **User assignment**: All projects assigned to your current user

### Risks Table  
- ✅ **Risk details**: name, type (mapped to new categories), likelihood, impact
- ✅ **Status mapping**: Converts old status values to new schema
- ✅ **Text fields**: Mitigation strategies, notes, descriptions
- ✅ **Project linking**: Risks properly linked to migrated projects
- ✅ **User assignment**: All risks assigned to your current user

## Schema Transformations

The migration automatically handles common schema differences:

### Projects
- **Missing data column**: Creates proper JSON structure with metadata, settings, version
- **Invalid JSON**: Replaces with valid default structure  
- **Product type**: Defaults to 'saas' if not specified
- **User ID mapping**: Changes to your current user ID
- **Timeline**: Creates timeline structure from dates
- **Sharing**: Maps old sharing_enabled to new is_public

### Risks
- **Type mapping**: Maps old categories to new type constraints:
  - `technical` → `operational`
  - `market` → `strategic` 
  - `compliance` → `regulatory`
  - `business` → `strategic`
- **Level mapping**: Converts numeric or text levels to `low/medium/high`
- **Status normalization**: Maps old statuses to new schema constraints
- **Text consolidation**: Combines description and notes fields

## Safety Features

### Duplicate Prevention
- ✅ **ID checking**: Won't migrate projects that already exist
- ✅ **Name checking**: Warns about projects with same names
- ✅ **Idempotent**: Safe to run multiple times

### Error Handling
- ✅ **Graceful failures**: Continues migration if one project fails
- ✅ **Detailed logging**: Shows exactly what succeeded/failed
- ✅ **Rollback info**: Provides info for manual cleanup if needed

### Batch Processing
- ✅ **Small batches**: Processes 10 projects at a time
- ✅ **Progress updates**: Shows real-time progress
- ✅ **Rate limiting**: Pauses between batches to avoid overload

## Troubleshooting

### Authentication Issues
```
Error: Not authenticated. Please log in to the new database first.
```
**Solution**: Make sure you're logged into your app in the browser first.

### Old Database Connection
```
Error: Failed to fetch legacy projects: Invalid API key
```
**Solution**: Double-check your `OLD_SUPABASE_ANON_KEY` in `.env` file.

### Schema Errors
```
Warning: Invalid JSON in project XYZ, using default structure
```
**Solution**: This is normal - the script handles it automatically.

### Duplicate Projects
```
Skipping project "My Project" - already exists
```
**Solution**: This is expected behavior - the script won't create duplicates.

### Network Issues
```
Error fetching projects: fetch failed
```
**Solution**: Check your internet connection and that the old Supabase project is still accessible.

## Post-Migration Verification

After migration, verify your data:

1. **Check project count**: Compare old vs new database project counts
2. **Test functionality**: Create a new project, add risks, etc.
3. **Verify data integrity**: Open migrated projects and check data
4. **Test sharing**: Ensure sharing features work with migrated projects
5. **Check risk data**: Verify risks are properly linked and categorized

## Migration Examples

### Example 1: Conservative Migration
```bash
# 1. Preview everything
npm run migrate-legacy -- --dry-run --verbose

# 2. Migrate just projects
npm run migrate-legacy -- --projects-only

# 3. Check results in app, then migrate risks
npm run migrate-legacy -- --verbose
```

### Example 2: Full Migration (Advanced)
```bash
# Migrate everything at once with detailed logging
npm run migrate-legacy -- --verbose
```

### Example 3: Debugging Issues
```bash
# Run dry-run with maximum verbosity to diagnose issues
npm run migrate-legacy -- --dry-run --verbose
```

## Data Mapping Reference

### Project Field Mapping
| Old Field | New Field | Transformation |
|-----------|-----------|----------------|
| `id` | `id` | Direct copy |
| `name` | `name` | Direct copy, defaults to "Untitled Project" |
| `description` | `description` | Direct copy |
| `data` | `data` | JSON validation and structure enhancement |
| `product_type` | `product_type` | Defaults to "saas" if missing |
| `sharing_enabled` | `is_public` | Boolean mapping |
| `user_id` | `user_id` | Mapped to current authenticated user |

### Risk Field Mapping
| Old Field | New Field | Transformation |
|-----------|-----------|----------------|
| `category`/`type` | `type` | Mapped to enum constraints |
| `probability`/`likelihood` | `likelihood` | Normalized to low/medium/high |
| `impact` | `impact` | Normalized to low/medium/high |
| `status` | `status` | Mapped to new status constraints |
| `mitigation_strategy` | `mitigation` | Direct copy |
| `description` | `notes` | Combined with existing notes |

## Support

If you encounter issues:

1. **Check logs**: The script provides detailed error messages
2. **Try dry-run**: Use `--dry-run` to diagnose issues
3. **Incremental approach**: Use `--projects-only` first
4. **Manual cleanup**: The script is safe to run multiple times
5. **Check authentication**: Ensure you're logged into the new database

## Migration Statistics

The script provides detailed statistics:
- 📊 Projects processed/migrated/skipped
- 📊 Risks processed/migrated  
- 📊 Errors encountered with details
- 📊 Execution time and performance

Your legacy data will be safely preserved and transformed for the new database structure! 🚀

## Advanced Usage

### Environment Variables
```bash
# Required for migration
OLD_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Script Parameters
```bash
# Batch size (default: 10)
# Modify in scripts/migrate-legacy-data.js if needed
BATCH_SIZE: 10

# Database URLs (configured in script)
OLD_DB: https://vplafscpcsxdxbyoxfhq.supabase.co
NEW_DB: https://issmshemlkrucmxcvibs.supabase.co
```

Ready to recover your legacy projects? The migration system is designed to handle any schema differences and data inconsistencies automatically! 🎯
