-- ============================================================
-- Azero Clean - Zerar dados de teste antes de entregar
-- Rode no Supabase > SQL Editor.
-- ATENÇÃO: apaga de verdade, não tem como desfazer.
-- ============================================================

-- 1) Agendamentos de teste (clientes, telefones, histórico).
--    Também remove os nomes que o site preenche automaticamente.
truncate table public.appointments restart identity;

-- 2) OPCIONAL: serviços cadastrados no admin.
--    Se apagar, o site mostra os 3 serviços de exemplo até o dono
--    cadastrar os dele pelo painel. Para usar, apague o "--" abaixo.
-- truncate table public.services cascade;

--    O horário de funcionamento (business_hours) não precisa ser apagado:
--    o dono só ajusta no painel.

-- 3) NÃO mexemos em public.admins: é ela que libera o login do painel.

-- 4) Fotos dos serviços (bucket "service-images"): o Supabase não deixa
--    apagar arquivos por SQL. Se quiser limpar, vá em
--    Storage > service-images, selecione tudo e clique em Delete.

-- Conferência: deve mostrar 0 agendamentos
select
  (select count(*) from public.appointments) as agendamentos,
  (select count(*) from public.services)     as servicos,
  (select count(*) from public.admins)       as admins;
