# Active Migrations

Last Updated: January 2025
Cleanup Performed: Yes (removed 8 superseded migrations)

## Migration Execution Order

For fresh deployments, apply in this order:

1. `20250101_base_schema_complete.sql` - Core schema foundation
2. `20250114_enhance_special_events_comprehensive_FIXED.sql` - Add special event fields
3. `20250711062225_change_success_rating_check.sql` - Change rating to 1-5 (SUPERSEDED by 20250724)
4. `20250715_eliminate_circular_rls_dependency.sql` - Fix RLS circular deps
5. `20250719_fix_get_shared_projects_ambiguity_join.sql` - Fix shared projects function
6. `20250720_fix_get_user_projects_ambiguity.sql` - Fix user projects function
7. `20250721055950_add_cogs_standardization_to_special_events.sql` - Add COGS fields
8. `20250722_fix_special_events_rls_policies.sql` - Fix special events RLS
9. `20250723_add_configurable_categories.sql` - Phase 2 categories
10. `20250724_standardize_success_rating_1_to_10.sql` - Standardize rating to 1-10 scale

## Superseded Migrations (Deleted)

The following migrations were removed during consolidation:
- `20250114_enhance_special_events_comprehensive.sql` (non-FIXED version)
- `20250712_fix_rls_recursion_comprehensive.sql` (RLS attempt #1)
- `20250713_ultimate_rls_fix_final.sql` (RLS attempt #2)
- `20250714_add_updated_at_to_special_events.sql` (duplicate triggers)
- `20250716_fix_shared_projects_access.sql` (ambiguity fix #1)
- `20250717_fix_get_shared_projects_ambiguity.sql` (ambiguity fix #2)
- `20250718_fix_get_shared_projects_ambiguity_final.sql` (ambiguity fix #3)
- `20250102_add_special_events_support.sql` (duplicates base schema)

## Notes

- All migrations listed above have been applied to production
- Deleted files are safe to remove from repo
- For rollbacks, refer to git history
- Migration #3 (20250711) is superseded by migration #10 (20250724) for success_rating constraint
