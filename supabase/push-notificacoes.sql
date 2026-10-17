-- ============================================================
-- Azero Clean - Notificações push para o admin (site fechado)
-- Rode no Supabase > SQL Editor DEPOIS de admin-policies.sql.
-- Pode rodar de novo sem problema. Passo a passo: supabase/PUSH-SETUP.md
-- ============================================================

-- Aparelhos/navegadores do admin que ativaram as notificações
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- Cada admin gerencia só os próprios aparelhos
drop policy if exists "push_subscriptions_admin_own" on public.push_subscriptions;
create policy "push_subscriptions_admin_own"
  on public.push_subscriptions for all
  to authenticated
  using (public.is_admin() and user_id = auth.uid())
  with check (public.is_admin() and user_id = auth.uid());

-- Chama a Edge Function "notify-admin-push" a cada novo agendamento.
create extension if not exists pg_net;

-- ATENÇÃO: confira a URL do projeto e a chave anon (a mesma de whatsapp-trigger.sql).
-- Se você usa WEBHOOK_SECRET, troque 'COLOQUE_AQUI_O_WEBHOOK_SECRET' pelo mesmo valor.
create or replace function public.notify_admin_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://vicrmbzgpmzfmehklzrf.supabase.co/functions/v1/notify-admin-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpY3JtYnpncG16Zm1laGtsenJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTYwOTQsImV4cCI6MjEwNzY3MjA5NH0.MJL2lnpkAoOhrjQpEggw6-TRUuHPI-32KKMhlDHVV9I',
      'x-webhook-secret', 'COLOQUE_AQUI_O_WEBHOOK_SECRET'
    ),
    body := jsonb_build_object('id', new.id)
  );
  return new;
end;
$$;

drop trigger if exists trg_appointment_push on public.appointments;
create trigger trg_appointment_push
  after insert on public.appointments
  for each row
  execute function public.notify_admin_push();
