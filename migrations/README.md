# Database Migrations

Versioned SQL migrations for the Article Engine Supabase schema.

## Convention

- Files: `NNN_description.sql` (zero-padded 3-digit sequence)
- Each file is idempotent (`IF NOT EXISTS`, `IF EXISTS` guards)
- Applied manually via Supabase SQL Editor or CLI

## Applying Migrations

1. Open your Supabase project dashboard → SQL Editor
2. Run each migration file in order, starting from the first unapplied one
3. Record the applied migration in the `_migrations` table (created by migration 002)

## Current Migrations

| # | File | Description | Status |
|---|------|-------------|--------|
| 001 | `001_baseline.sql` | Documents existing schema | Applied (existing) |
| 002 | `002_migrations_table.sql` | Adds migration tracking table | Pending |

## Future Migrations

When adding schema changes:
1. Create `NNN_description.sql` with the next sequence number
2. Include `IF NOT EXISTS` / `IF EXISTS` guards for idempotency
3. Add an `INSERT INTO _migrations` at the end of the file
4. Update this table
5. Apply via Supabase SQL Editor
