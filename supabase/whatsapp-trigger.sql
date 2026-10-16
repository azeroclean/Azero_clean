-- ============================================================
-- Azero Clean - Trigger de WhatsApp
-- Dispara a Edge Function "send-whatsapp" quando o agendamento
-- é confirmado (status muda para 'confirmado').
-- Rode no Supabase > SQL Editor.
-- ============================================================

-- Necessário para fazer chamadas HTTP a partir do banco
create extension if not exists pg_net;

-- ATENÇÃO: confira a URL do projeto e a chave anon abaixo
-- (a anon key é pública, já vai no site)
create or replace function public.notify_appointment_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'confirmado' and (old.status is distinct from 'confirmado') then
    perform net.http_post(
      url := 'https://vicrmbzgpmzfmehklzrf.supabase.co/functions/v1/send-whatsapp',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpY3JtYnpncG16Zm1laGtsenJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTYwOTQsImV4cCI6MjEwNzY3MjA5NH0.MJL2lnpkAoOhrjQpEggw6-TRUuHPI-32KKMhlDHVV9I'
      ),
      body := jsonb_build_object('id', new.id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_appointment_confirmed on public.appointments;
create trigger trg_appointment_confirmed
  after update on public.appointments
  for each row
  execute function public.notify_appointment_confirmed();
