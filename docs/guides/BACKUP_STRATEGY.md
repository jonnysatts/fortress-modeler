# Fortress Modeler - Database Backup & Restore Strategy

This document outlines the strategy for backing up and restoring the Fortress Modeler cloud database hosted on Supabase. While Supabase provides automated daily backups, this guide covers manual procedures for additional safety, especially before major updates or for versioned snapshots.

## 1. Overview

Our backup strategy combines two approaches:
1.  **Automated Supabase Backups:** (Managed by Supabase) Provides point-in-time recovery. This is our primary disaster recovery method.
2.  **Manual Logical Backups:** (Managed by Developers) Creates SQL dump files that can be version-controlled, stored externally, and used for granular restores or for setting up new development environments.

This guide focuses on the **Manual Logical Backup** process.

## 2. Prerequisites

- You must have the [Supabase CLI](https://supabase.com/docs/guides/cli) installed and authenticated.
- You must have your project linked to the Supabase CLI (`supabase link --project-ref <your-project-ref>`).
- You must have `pg_dump` installed locally. This is typically included with a standard PostgreSQL installation.

## 3. Performing a Manual Backup

A manual backup consists of dumping the database schema and data into SQL files.

### Step 3.1: Create a Backup Directory

It's best practice to store backups in a dedicated, git-ignored directory.

```bash
# From the project root
mkdir -p .backups
echo ".backups/" >> .gitignore
```

### Step 3.2: Dump the Database

The `supabase db dump` command is a wrapper around `pg_dump` that uses the connection details from your linked project.

```bash
# Navigate to the supabase directory
cd supabase

# Dump the entire database to a single file
supabase db dump -f ../.backups/dump-$(date +%Y-%m-%d).sql

# Or, for more granular control, dump schema and data separately
# Dump only the schema (structure)
supabase db dump --schema-only -f ../.backups/schema-$(date +%Y-%m-%d).sql

# Dump only the data
supabase db dump --data-only -f ../.backups/data-$(date +%Y-%m-%d).sql
```

**Recommendation:** For most cases, a full dump is sufficient. For version control, dumping the schema separately can be useful to track structural changes over time.

## 4. Backup Schedule & Best Practices

- **Before Major Deployments:** Always perform a manual backup before deploying significant application changes or running a large database migration.
- **Regular Snapshots:** For active development, consider weekly or bi-weekly manual backups.
- **Storage:** Store the backup files in a secure, access-controlled location (e.g., a private cloud storage bucket, a secure internal server). **Do not commit unencrypted backup files containing sensitive user data to a public Git repository.**

## 5. Restoring from a Manual Backup

Restoring will overwrite the data in the target database. **This is a destructive operation. Proceed with extreme caution.** It's highly recommended to test restores on a new, empty Supabase project first.

### Step 5.1: Reset the Target Database

Before restoring, it's best to start with a clean slate. You can reset your remote database using the Supabase CLI.

```bash
# WARNING: This will delete all data in your remote database.
supabase db reset
```

### Step 5.2: Restore from the Dump File

Use `psql` to execute the SQL dump file against your database. You can get your database connection string from the Supabase dashboard (Project Settings > Database).

```bash
# Restore from a full dump file
psql '<your-supabase-db-connection-string>' < .backups/dump-YYYY-MM-DD.sql
```

If you have separate schema and data files, restore the schema first, then the data.

```bash
# 1. Restore schema
psql '<your-supabase-db-connection-string>' < .backups/schema-YYYY-MM-DD.sql

# 2. Restore data
psql '<your-supabase-db-connection-string>' < .backups/data-YYYY-MM-DD.sql
```

## 6. Automating Backups (Optional)

For production environments, you can automate this process using a GitHub Action.

Create a file at `.github/workflows/backup.yml`:

```yaml
name: 'Database Backup'

on:
  workflow_dispatch:
  schedule:
    - cron: '0 1 * * *' # Runs every day at 1 AM UTC

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Run Supabase DB Dump
        run: |
          supabase db dump --project-ref ${{ secrets.SUPABASE_PROJECT_ID }} --password ${{ secrets.SUPABASE_DB_PASSWORD }} -f dump.sql
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: database-backup
          path: dump.sql
```

You will need to add the following secrets to your GitHub repository settings:
- `SUPABASE_PROJECT_ID`: Your Supabase project reference.
- `SUPABASE_DB_PASSWORD`: Your database password.
- `SUPABASE_ACCESS_TOKEN`: A Supabase personal access token.

This action will create a downloadable artifact with the database dump. For a more robust solution, you would modify the action to upload the dump to a secure cloud storage provider like AWS S3 or Google Cloud Storage.
