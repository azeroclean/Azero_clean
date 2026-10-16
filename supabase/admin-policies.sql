-- ============================================================
-- Azero Clean - Acesso do painel administrativo (/admin)
-- Rode no Supabase > SQL Editor DEPOIS de schema.sql / fix.sql / ajustes.sql.
-- Não apaga dados.
--
-- Por que este arquivo existe: ajustes.sql remove TODAS as políticas de
-- appointments e recria só as públicas (insert/select). Com isso a política
-- appointments_admin_all some e o painel não consegue mudar o status
-- (o update é bloqueado pelo RLS sem dar erro, só não altera nenhuma linha).
-- ============================================================

-- Tabela de administradores (vinculada ao Supabase Auth)
create table if not exists public.admins (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Helper: verifica se o usuário logado é admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins where id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- ADMINS: cada admin enxerga a própria linha; admins gerenciam a tabela
drop policy if exists "admins_self_select" on public.admins;
create policy "admins_self_select"
  on public.admins for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "admins_admin_all" on public.admins;
create policy "admins_admin_all"
  on public.admins for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- APPOINTMENTS: admin pode ler, alterar status e apagar
drop policy if exists "appointments_admin_all" on public.appointments;
create policy "appointments_admin_all"
  on public.appointments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- Cadastrar um administrador
-- 1. Supabase > Authentication > Users > Add user (email + senha,
--    marque "Auto Confirm User").
-- 2. Rode o insert abaixo trocando o email:
-- ------------------------------------------------------------
-- insert into public.admins (id, email, name)
-- select id, email, 'Administrador'
-- from auth.users
-- where email = 'admin@exemplo.com'
-- on conflict (id) do nothing;
