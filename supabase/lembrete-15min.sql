-- ============================================================
-- Azero Clean - Lembrete no WhatsApp 15 minutos antes do horário
-- Rode no Supabase > SQL Editor DEPOIS de whatsapp-trigger.sql
-- (usa a função public.notify_whatsapp criada lá). Pode rodar de novo.
--
-- A cada minuto o banco procura agendamentos (pendentes ou confirmados)
-- que começam nos próximos 15 minutos e ainda não receberam lembrete,
-- e chama a Edge Function send-whatsapp com o evento "lembrete".
-- Cada agendamento recebe o lembrete uma vez só; se o admin remarcar,
-- o lembrete volta a valer para o novo horário.
-- Fuso: America/Fortaleza (Ceará, UTC-3).
-- ============================================================

-- Agendador do Supabase. Se der erro aqui, ative em Database > Extensions > pg_cron.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Marca de quando o lembrete foi enviado
alter table public.appointments add column if not exists reminder_sent_at timestamptz;

-- Remarcou (data ou hora mudou)? Libera o lembrete de novo.
create or replace function public.reset_reminder_on_reschedule()
returns trigger
language plpgsql
as $$
begin
  if new.date is distinct from old.date or new.time is distinct from old.time then
    new.reminder_sent_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reset_reminder on public.appointments;
create trigger trg_reset_reminder
  before update on public.appointments
  for each row
  execute function public.reset_reminder_on_reschedule();

-- Procura os agendamentos que começam nos próximos 15 minutos e manda o lembrete.
create or replace function public.send_due_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  due_ids uuid[];
  appointment_id uuid;
begin
  select coalesce(array_agg(a.id), '{}')
  into due_ids
  from public.appointments a
  where a.status in ('pendente', 'confirmado')
    and a.reminder_sent_at is null
    and a.time ~ '^[0-9]{2}:[0-9]{2}$'
    and ((a.date + a.time::time) at time zone 'America/Fortaleza')
        between now() and now() + interval '15 minutes'
    -- quem agendou em cima da hora (menos de 15 min antes) não recebe lembrete
    and a.created_at <= ((a.date + a.time::time) at time zone 'America/Fortaleza') - interval '15 minutes';

  if array_length(due_ids, 1) is null then
    return 0;
  end if;

  update public.appointments set reminder_sent_at = now() where id = any (due_ids);

  foreach appointment_id in array due_ids loop
    perform public.notify_whatsapp(appointment_id, 'lembrete');
  end loop;

  return array_length(due_ids, 1);
end;
$$;

revoke all on function public.send_due_reminders() from public, anon, authenticated;

-- Roda a cada minuto (recriar com o mesmo nome só atualiza o agendamento)
select cron.schedule(
  'azero-lembrete-15min',
  '* * * * *',
  $$select public.send_due_reminders()$$
);

-- Conferência: o agendamento do cron deve aparecer aqui
select jobname, schedule, active from cron.job where jobname = 'azero-lembrete-15min';
