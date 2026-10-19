-- ============================================================
-- Azero Clean - Triggers de WhatsApp (Evolution API)
-- Chama a Edge Function "send-whatsapp":
--   * novo agendamento (insert)        -> avisa o dono
--   * status muda para 'confirmado'    -> avisa o cliente
-- Rode no Supabase > SQL Editor (pode rodar de novo sem problema).
-- Passo a passo: supabase/EVOLUTION-SETUP.md
-- ============================================================

-- Necessário para fazer chamadas HTTP a partir do banco
create extension if not exists pg_net;

-- ATENÇÃO: confira a URL do projeto e a chave anon abaixo
-- (a anon key é pública, já vai no site).
-- Se você definiu o secret WEBHOOK_SECRET na função, troque
-- 'COLOQUE_AQUI_O_WEBHOOK_SECRET' pelo mesmo valor. Se não definiu, pode deixar.
create or replace function public.notify_whatsapp(appointment_id uuid, event text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://vicrmbzgpmzfmehklzrf.supabase.co/functions/v1/send-whatsapp',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpY3JtYnpncG16Zm1laGtsenJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTYwOTQsImV4cCI6MjEwNzY3MjA5NH0.MJL2lnpkAoOhrjQpEggw6-TRUuHPI-32KKMhlDHVV9I',
      'x-webhook-secret', 'COLOQUE_AQUI_O_WEBHOOK_SECRET'
    ),
    body := jsonb_build_object('id', appointment_id, 'event', event)
  );
end;
$$;

-- só o próprio banco chama essa função
revoke all on function public.notify_whatsapp(uuid, text) from public, anon, authenticated;

create or replace function public.notify_appointment_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_whatsapp(new.id, 'novo');
  return new;
end;
$$;

create or replace function public.notify_appointment_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'confirmado' and (old.status is distinct from 'confirmado') then
    perform public.notify_whatsapp(new.id, 'confirmado');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_appointment_created on public.appointments;
create trigger trg_appointment_created
  after insert on public.appointments
  for each row
  execute function public.notify_appointment_created();

drop trigger if exists trg_appointment_confirmed on public.appointments;
create trigger trg_appointment_confirmed
  after update on public.appointments
  for each row
  execute function public.notify_appointment_confirmed();
