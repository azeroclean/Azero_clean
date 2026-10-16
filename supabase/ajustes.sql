-- ============================================================
-- Azero Clean - Ajustes de RLS e colunas (rode no SQL Editor)
-- Não apaga dados. Corrige as políticas da tabela appointments.
-- ============================================================

-- Garante as colunas necessárias
alter table public.appointments add column if not exists vehicle_type text default 'carro';
alter table public.appointments add column if not exists service_ids uuid[] not null default '{}';

-- Placa/marca/modelo passam a ser opcionais (o cliente só informa nome e telefone)
alter table public.appointments alter column vehicle_make drop not null;
alter table public.appointments alter column vehicle_model drop not null;

-- Habilita RLS
alter table public.appointments enable row level security;

-- Remove TODAS as políticas antigas de appointments (evita conflito)
do $$
declare pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'appointments'
  loop
    execute format('drop policy if exists %I on public.appointments', pol.policyname);
  end loop;
end $$;

-- Qualquer visitante pode CRIAR um agendamento
create policy "appointments_public_insert"
  on public.appointments for insert
  to anon, authenticated
  with check (true);

-- Qualquer visitante pode LER os agendamentos (necessário para bloquear horários ocupados)
create policy "appointments_public_select"
  on public.appointments for select
  to anon, authenticated
  using (true);
