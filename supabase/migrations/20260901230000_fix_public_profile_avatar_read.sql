-- Corrige a resolução ambígua da coluna "name" na policy original.
-- A referência deve apontar explicitamente para storage.objects.name.

drop policy if exists editorial_profile_avatars_public_read
on storage.objects;

create policy editorial_profile_avatars_public_read
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'editorial-assets'
  and exists (
    select 1
    from public.content_profiles cp
    where cp.avatar_path = storage.objects.name
      and cp.active
  )
);