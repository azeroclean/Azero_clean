-- ============================================================
-- Azero Clean - Horários disponíveis e duração dos serviços
-- Rode no Supabase > SQL Editor DEPOIS de admin-policies.sql.
-- Não apaga dados.
-- ============================================================

-- ------------------------------------------------------------
-- TIME_SLOTS: horários que o cliente pode escolher, por dia da semana
-- weekday: 0 = domingo ... 6 = sábado. Dia sem horários = fechado.
-- ------------------------------------------------------------
create table if not exists public.time_slots (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 0 and 6),
  time text not null check (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  created_at timestamptz not null default now(),
  unique (weekday, time)
);

alter table public.time_slots enable row level security;

drop policy if exists "time_slots_public_read" on public.time_slots;
create policy "time_slots_public_read"
  on public.time_slots for select
  to anon, authenticated
  using (true);

drop policy if exists "time_slots_admin_all" on public.time_slots;
create policy "time_slots_admin_all"
  on public.time_slots for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Preenche com os horários que o site usava até agora (só se a tabela estiver vazia)
insert into public.time_slots (weekday, time)
select d.weekday, t.time
from (values (1), (2), (3), (4), (5)) as d (weekday)
cross join (values ('08:30'), ('09:30'), ('11:00'), ('14:00'), ('15:30'), ('16:30')) as t (time)
where not exists (select 1 from public.time_slots)
union all
select 6, t.time
from (values ('08:30'), ('09:30'), ('11:00')) as t (time)
where not exists (select 1 from public.time_slots);

-- ------------------------------------------------------------
-- SERVICES: duração em minutos (usada para bloquear horários)
-- ------------------------------------------------------------
alter table public.services add column if not exists duration_minutes integer
  check (duration_minutes is null or duration_minutes > 0);

-- Converte durações simples já cadastradas ("50 min", "2h", "1h30")
update public.services
set duration_minutes = nullif(
  coalesce(substring(duration from '(\d+)\s*h')::int, 0) * 60
    + coalesce(substring(duration from '(\d+)\s*min')::int,
               substring(duration from '\d+\s*h\s*(\d+)')::int, 0),
  0)
where duration_minutes is null
  and duration ~ '\d'
  and (duration ~ '\d+\s*h' or duration ~ '\d+\s*min');

-- Garante que o admin pode criar/editar serviços (inclusive os inativos)
drop policy if exists "services_admin_all" on public.services;
create policy "services_admin_all"
  on public.services for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
