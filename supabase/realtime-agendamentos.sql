-- ============================================================
-- Azero Clean - Agendamentos em tempo real no painel admin
-- Rode no Supabase > SQL Editor. Pode rodar de novo sem problema.
--
-- Liga o Supabase Realtime na tabela de agendamentos: o painel
-- recebe na hora cada novo pedido (e mudanças), sem recarregar.
-- Só administradores recebem, por causa da política
-- appointments_admin_all (supabase/admin-policies.sql).
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'appointments'
  ) then
    alter publication supabase_realtime add table public.appointments;
  end if;
end $$;

-- Envia a linha antiga inteira em updates/exclusões (o painel usa o id)
alter table public.appointments replica identity full;
