-- ============================================================
-- Azero Clean - Fotos dos serviços (Supabase Storage)
-- Rode no Supabase > SQL Editor DEPOIS de admin-policies.sql.
-- Cria o bucket "service-images": qualquer um vê as fotos,
-- só administradores enviam, trocam ou apagam.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-images',
  'service-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "service_images_public_read" on storage.objects;
create policy "service_images_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'service-images');

drop policy if exists "service_images_admin_insert" on storage.objects;
create policy "service_images_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'service-images' and public.is_admin());

drop policy if exists "service_images_admin_update" on storage.objects;
create policy "service_images_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'service-images' and public.is_admin())
  with check (bucket_id = 'service-images' and public.is_admin());

drop policy if exists "service_images_admin_delete" on storage.objects;
create policy "service_images_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'service-images' and public.is_admin());
