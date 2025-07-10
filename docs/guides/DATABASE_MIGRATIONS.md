# Fortress Modeler - Database Migration Guide

This document explains how to manage database schema changes for the Fortress Modeler project using the Supabase CLI. All database changes should be handled through this migration workflow to ensure consistency across all environments.

## 1. Overview

We use Supabase's built-in migration system, which is powered by `pgroll` and the Supabase CLI. This system allows us to make incremental, version-controlled changes to the database schema.

The core principles are:
-   **Migrations are SQL files:** Each change is represented by a new SQL file in the `supabase/migrations` directory.
-   **Timestamped:** Each migration file is timestamped to define the order of execution.
-   **Non-destructive:** Migrations should be written in a way that they can be applied without losing existing data.

## 2. Local Development Setup

Before creating migrations, ensure your local development environment is set up.

1.  **Install the Supabase CLI:**
    ```bash
    npm install -g supabase
    ```

2.  **Start the local Supabase services:**
    From the project root, run:
    ```bash
    supabase start
    ```
    This will spin up a local instance of Supabase, including a Postgres database, using Docker.

3.  **Apply existing migrations:**
    When you first start the local services, the CLI should automatically apply all existing migrations from the `supabase/migrations` folder. If you need to do it manually, you can run:
    ```bash
    supabase db reset
    ```
    This command resets the local database and re-applies all migrations from the beginning.

## 3. Creating a New Migration

When you need to make a change to the database schema (e.g., add a table, alter a column, create a policy), follow these steps.

1.  **Ensure your local database is running:**
    ```bash
    supabase start
    ```

2.  **Create a new migration file:**
    Use the `supabase migration new` command to create a new, empty migration file with the correct timestamp.

    ```bash
    # Example: Creating a migration to add an 'is_archived' column to projects
    supabase migration new add_archived_flag_to_projects
    ```

    This will create a new file in `supabase/migrations` with a name like `20250710171500_add_archived_flag_to_projects.sql`.

3.  **Write the SQL for your change:**
    Open the newly created SQL file and add the necessary SQL commands. For example:

    ```sql
    -- supabase/migrations/20250710171500_add_archived_flag_to_projects.sql

    ALTER TABLE public.projects
    ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
    ```

4.  **Apply the migration to your local database:**
    To apply the new migration and test it locally, run:
    ```bash
    supabase db push
    ```
    This command is deprecated but useful for quick development. The recommended way is to reset and apply all migrations:
    ```bash
    supabase db reset
    ```
    **Note:** `db reset` is safe for local development as it will also re-apply your seed data (`supabase/seed.sql`).

## 4. Deploying Migrations

When you are ready to deploy your changes to the production Supabase project:

1.  **Link your project (if you haven't already):**
    ```bash
    supabase link --project-ref <your-project-ref>
    ```

2.  **Push the migrations to production:**
    This command will apply any new migrations from your local `supabase/migrations` folder that have not yet been run on the remote database.

    ```bash
    supabase db push
    ```
    **Important:** The `db push` command for remote databases can be risky if you have manually edited your production database schema. The recommended approach for production is to use a CI/CD pipeline that manages deployments.

## 5. Best Practices

-   **One change per migration:** Keep migrations small and focused on a single logical change.
-   **Never edit an existing migration file:** Once a migration has been applied (especially to production), it should be considered immutable. To undo a change, create a *new* migration that reverses it.
-   **Write idempotent SQL:** Use `IF NOT EXISTS` or `IF EXISTS` where possible to prevent errors if a migration is accidentally run more than once.
-   **Test locally:** Always run and test your migrations on your local Supabase instance before committing the code.
