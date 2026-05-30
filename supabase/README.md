# Supabase

## Local

```bash
npm run supabase:start
npm run db:reset
```

`db:reset` aplica `supabase/migrations/*` y luego `supabase/seed.sql`.

## Hosted

```bash
npm run supabase:login
npm run supabase:link -- --project-ref <project-ref>
npm run db:push
```

Seed remoto no corre con `db push`. Para demo:

```bash
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

Si ya corriste `schema.sql` manualmente en el proyecto remoto, `db push` puede fallar por objetos existentes. En ese caso usa un proyecto limpio o marca la migracion como aplicada con Supabase CLI antes de empujar.
