import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite, type Transaction } from '@electric-sql/pglite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

/**
 * Minimal Supabase GoTrue / PostgREST compatibility bootstrap so the repository's
 * real SQL migrations, RLS policies, role grants, and SECURITY DEFINER RPCs run
 * unmodified on an isolated in-memory PostgreSQL instance without Docker.
 */
const SUPABASE_AUTH_BOOTSTRAP_SQL = `
create schema if not exists auth;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    current_user
  )::text;
$$;

grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.role() to anon, authenticated, service_role;
`;

export type AccountRole = 'guest' | 'partner' | 'admin';

export async function createMigratedTestDb(): Promise<PGlite> {
  const db = await PGlite.create();
  await db.exec(SUPABASE_AUTH_BOOTSTRAP_SQL);

  const entries = await readdir(MIGRATIONS_DIR);
  const migrationFiles = entries.filter(name => name.endsWith('.sql')).sort();

  for (const file of migrationFiles) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    await db.exec(sql);
  }

  return db;
}

export async function resetTestData(db: PGlite): Promise<void> {
  await db.exec(`
    truncate table
      public.booking_notifications,
      public.booking_feedback,
      public.booking_payment_records,
      public.booking_issues,
      public.bookings,
      public.property_private_records,
      public.property_access,
      public.properties,
      public.partner_applications,
      public.admin_audit_log,
      public.profiles,
      auth.users
    restart identity cascade;
  `);
}

export async function createTestUser(
  db: PGlite,
  input: {
    id?: string;
    email: string;
    fullName: string;
    role?: AccountRole;
  },
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into auth.users (id, email, raw_user_meta_data)
     values (coalesce($1::uuid, gen_random_uuid()), $2, jsonb_build_object('full_name', $3::text))
     returning id`,
    [input.id ?? null, input.email, input.fullName],
  );
  const userId = rows[0].id;

  if (input.role && input.role !== 'guest') {
    await db.query(
      `update public.profiles set role = $2 where id = $1::uuid`,
      [userId, input.role],
    );
  }

  return userId;
}

/**
 * Executes a callback inside a PostgREST-like authenticated transaction with
 * `ROLE authenticated` and `auth.uid() = userId`.
 */
export async function asUser<T>(
  db: PGlite,
  userId: string,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async tx => {
    const claims = JSON.stringify({ sub: userId, role: 'authenticated' });
    await tx.query(
      `select
         set_config('request.jwt.claims', $1, true),
         set_config('request.jwt.claim.sub', $2, true),
         set_config('request.jwt.claim.role', 'authenticated', true)`,
      [claims, userId],
    );
    await tx.exec('set local role authenticated');
    return fn(tx);
  });
}

/**
 * Executes a callback with `ROLE authenticated` without a JWT `sub` claim
 * (`auth.uid()` resolves to `null`).
 */
export async function asAuthenticatedWithoutUid<T>(
  db: PGlite,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async tx => {
    await tx.exec(`
      select
        set_config('request.jwt.claims', '{"role":"authenticated"}', true),
        set_config('request.jwt.claim.sub', '', true),
        set_config('request.jwt.claim.role', 'authenticated', true);
      set local role authenticated;
    `);
    return fn(tx);
  });
}

/**
 * Executes a callback inside a PostgREST-like anonymous transaction (`ROLE anon`).
 */
export async function asAnon<T>(
  db: PGlite,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async tx => {
    await tx.exec(`
      select
        set_config('request.jwt.claims', '{"role":"anon"}', true),
        set_config('request.jwt.claim.sub', '', true),
        set_config('request.jwt.claim.role', 'anon', true);
      set local role anon;
    `);
    return fn(tx);
  });
}

/**
 * Executes a callback inside a server-side `service_role` transaction (used by
 * verified Edge Function webhook handlers, never exposed to browser clients).
 */
export async function asServiceRole<T>(
  db: PGlite,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async tx => {
    await tx.exec(`
      select
        set_config('request.jwt.claims', '{"role":"service_role"}', true),
        set_config('request.jwt.claim.sub', '', true),
        set_config('request.jwt.claim.role', 'service_role', true);
      set local role service_role;
    `);
    return fn(tx);
  });
}
