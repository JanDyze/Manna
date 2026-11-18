# Manna's database lives with Might's

All the apps share one Supabase project (OneDyze), so they share one local stack too: the one in
`../../MigraineTracker/supabase`. Manna's schema is the migration
`MigraineTracker/supabase/migrations/20261117000000_manna_schema.sql`, and `config.toml` there exposes the
`manna` schema next to `might`.

Change Manna's tables by adding a new migration in that folder, not here.
