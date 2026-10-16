-- ============================================================
-- Azero Clean - Correção / Migração
-- Cole no Supabase > SQL Editor > New query > Run
-- Corrige a tabela appointments e adiciona preços por tipo de veículo
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Helper is_admin (garante que existe)
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- APPOINTMENTS: recria com as colunas corretas
-- ATENÇÃO: apaga os agendamentos existentes.
-- ------------------------------------------------------------
drop table if exists public.appointments cascade;

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_phone text not null,
  client_email text,
  vehicle_type text not null default 'carro'
    check (vehicle_type in ('moto', 'carro', 'caminhonete')),
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

alter table public.appointments enable row level security;

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

-- ------------------------------------------------------------
-- SERVICES: preços por tipo de veículo (definidos pelo admin)
-- ------------------------------------------------------------
alter table public.services add column if not exists price_moto numeric(10, 2);
alter table public.services add column if not exists price_carro numeric(10, 2);
alter table public.services add column if not exists price_caminhonete numeric(10, 2);

-- Preenche o preço do carro com o preço base, se estiver vazio
update public.services
set price_carro = coalesce(price_carro, price)
where price_carro is null;
