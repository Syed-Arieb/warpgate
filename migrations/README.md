# Migrations

SQL migration files for Warpgate.

## Usage

Run migrations with:

	make migrate

This runs AutoMigrate to sync all GORM models with the database schema.
For production, replace with actual SQL migration files.

## Convention

- Files are prefixed with timestamp: YYYYMMDD_HHMMSS_description.sql
- Never edit a migration that has already been applied
