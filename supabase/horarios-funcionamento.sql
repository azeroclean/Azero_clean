-- ============================================================
-- Azero Clean - Horário de funcionamento (substitui time_slots)
-- Rode no Supabase > SQL Editor DEPOIS de admin-policies.sql.
-- Não apaga dados. Pode rodar de novo sem problema.
--
-- O dono informa só o expediente de cada dia (abre, fecha e um
-- intervalo opcional). O site gera os horários de 30 em 30 minutos
-- e só mostra os que cabem a duração do serviço escolhido.
-- ============================================================

create table if not exists public.business_hours (
  weekday     smallint primary key check (weekday between 0 and 6), -- 0 = domingo
  is_open     boolean not null default true,
  open_time   text not null default '08:00' check (open_time  ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  close_time  text not null default '18:00' check (close_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  break_start text check (break_start is null or break_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  break_end   text check (break_end   is null or break_end   ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  updated_at  timestamptz not null default now(),
  check (open_time < close_time),
  check ((break_start is null) = (break_end is null)),
  check (break_start is null or (break_start < break_end and break_start >= open_time and break_end <= close_time))
);

alter table public.business_hours enable row level security;

drop policy if exists "business_hours_public_read" on public.business_hours;
create policy "business_hours_public_read"
  on public.business_hours for select
  to anon, authenticated
  using (true);

drop policy if exists "business_hours_admin_all" on public.business_hours;
create policy "business_hours_admin_all"
  on public.business_hours for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Expediente inicial (o dono ajusta pelo painel).
-- Se já existirem horários no formato antigo (time_slots), eles são convertidos:
-- cada dia vai do primeiro horário cadastrado até 1h depois do último; dia sem horário = fechado.
-- Sem horários antigos: seg a sex 08:00-18:00, sábado 08:00-13:00, domingo fechado.
-- Não sobrescreve dias que já estão em business_hours.
do $$
begin
  if to_regclass('public.time_slots') is not null
     and exists (select 1 from public.time_slots) then
    insert into public.business_hours (weekday, is_open, open_time, close_time)
    with mins as (
      select weekday,
             split_part(time, ':', 1)::int * 60 + split_part(time, ':', 2)::int as m
      from public.time_slots
      where time ~ '^[0-9]{2}:[0-9]{2}'
    ),
    agg as (
      select weekday,
             (min(m) / 30) * 30 as o,
             least(((max(m) + 29) / 30) * 30 + 60, 23 * 60 + 30) as c
      from mins
      group by weekday
    )
    select d.weekday,
           agg.weekday is not null,
           coalesce(lpad((agg.o / 60)::text, 2, '0') || ':' || lpad((agg.o % 60)::text, 2, '0'), '08:00'),
           coalesce(lpad((agg.c / 60)::text, 2, '0') || ':' || lpad((agg.c % 60)::text, 2, '0'), '18:00')
    from generate_series(0, 6) as d (weekday)
    left join agg on agg.weekday = d.weekday
    on conflict (weekday) do nothing;
  else
    insert into public.business_hours (weekday, is_open, open_time, close_time)
    values
      (0, false, '08:00', '18:00'),
      (1, true,  '08:00', '18:00'),
      (2, true,  '08:00', '18:00'),
      (3, true,  '08:00', '18:00'),
      (4, true,  '08:00', '18:00'),
      (5, true,  '08:00', '18:00'),
      (6, true,  '08:00', '13:00')
    on conflict (weekday) do nothing;
  end if;
end $$;

-- Conferência: como ficou o expediente de cada dia (0 = domingo)
select weekday, is_open, open_time, close_time, break_start, break_end
from public.business_hours
order by weekday;
