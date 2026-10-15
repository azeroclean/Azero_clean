-- ============================================================
-- Azero Clean - Schema Supabase
-- Cole este arquivo no Supabase > SQL Editor > New query > Run
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- SERVICES
-- ------------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  duration text not null default '',
  price numeric(10, 2) not null default 0,
  price_label text,
  category text not null default '',
  image_url text not null default '',
  benefits text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- APPOINTMENTS
-- ------------------------------------------------------------
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_phone text not null,
  client_email text,
  vehicle_make text not null,
  vehicle_model text not null,
  vehicle_plate text,
  service_ids uuid[] not null default '{}',
  date date not null,
  time text not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'confirmado', 'cancelado', 'concluido')),
  notes text,
  total numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- ADMINS (vinculado ao Supabase Auth)
-- ------------------------------------------------------------
create table if not exists public.admins (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.admins enable row level security;

-- Helper: verifica se o usuario logado e admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins where id = auth.uid()
  );
$$;

-- SERVICES: leitura publica, escrita apenas admin
drop policy if exists "services_public_read" on public.services;
create policy "services_public_read"
  on public.services for select
  using (active = true);

drop policy if exists "services_admin_all" on public.services;
create policy "services_admin_all"
  on public.services for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- APPOINTMENTS: qualquer um pode criar, admin gerencia
drop policy if exists "appointments_public_insert" on public.appointments;
create policy "appointments_public_insert"
  on public.appointments for insert
  to anon, authenticated
  with check (true);

drop policy if exists "appointments_admin_all" on public.appointments;
create policy "appointments_admin_all"
  on public.appointments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ADMINS: apenas admins enxergam
drop policy if exists "admins_admin_all" on public.admins;
create policy "admins_admin_all"
  on public.admins for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- SEED: servicos iniciais
-- ============================================================
insert into public.services (title, description, duration, price, price_label, category, image_url, benefits)
values
  (
    'Lavagem Completa',
    'Ducha alta pressão, detalhamento de chassi, rodas, limpeza externa completa e acabamento.',
    '50 min',
    60.00,
    'R$ 60,00',
    'Lavagem',
    '/images/hero.png',
    array['Ducha alta pressão', 'Detalhamento de chassi e rodas', 'Limpeza externa completa', 'Acabamento profissional']
  ),
  (
    'Higienização Interna',
    'Extração a seco de estofados, dutos de A/C, painel, porta-malas e neutralização de odores.',
    '2h',
    150.00,
    'R$ 150,00',
    'Higienização',
    '/images/hero.png',
    array['Extração a seco de estofados', 'Higienização dos dutos de A/C', 'Limpeza de painel e revestimentos', 'Neutralização de odores']
  ),
  (
    'Proteção de Pintura / Vitrificação',
    'Descontaminação da pintura, aplicação de selante cerâmico para máximo brilho, repelência e proteção.',
    '3h30',
    280.00,
    'R$ 280,00',
    'Proteção',
    '/images/hero.png',
    array['Proteção contra raios UV', 'Resistente a fezes de pássaros e chuva ácida', 'Efeito hidrofóbico (repelência à água)', 'Brilho espelhado e durabilidade superior']
  )
on conflict do nothing;
