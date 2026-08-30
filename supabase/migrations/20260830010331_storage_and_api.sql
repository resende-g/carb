insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'editorial-assets',
  'editorial-assets',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy editorial_assets_public_read
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'editorial-assets'
  and (
    exists (select 1 from public.posts p where p.media_path = name and p.status = 'PUBLISHED')
    or exists (select 1 from public.documents d where d.storage_path = name and d.status = 'APPROVED')
    or exists (select 1 from public.content_profiles cp where cp.avatar_path = name and cp.active)
  )
);

create policy editorial_assets_scoped_read
on storage.objects for select to authenticated
using (
  bucket_id = 'editorial-assets'
  and private.is_aal2()
  and (
    exists (select 1 from public.posts p where p.media_path = name and private.can_view_editorial_profile(p.content_profile_id))
    or exists (select 1 from public.documents d where d.storage_path = name and private.can_view_editorial_profile(d.content_profile_id))
    or exists (select 1 from public.content_profiles cp where cp.avatar_path = name and private.can_manage())
  )
);

create policy editorial_assets_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'editorial-assets'
  and private.is_aal2()
  and (
    exists (
      select 1 from public.posts p
      where p.media_path = name and p.status = 'DRAFT' and p.created_by = (select auth.uid())
        and private.can_publish_as(p.content_profile_id)
    )
    or exists (
      select 1 from public.documents d
      where d.storage_path = name and d.status = 'DRAFT' and d.created_by = (select auth.uid())
        and private.can_publish_as(d.content_profile_id)
    )
    or exists (
      select 1 from public.content_profiles cp
      where cp.avatar_path = name and private.can_manage()
    )
  )
);

create policy editorial_assets_update
on storage.objects for update to authenticated
using (
  bucket_id = 'editorial-assets'
  and private.is_aal2()
  and (
    exists (select 1 from public.posts p where p.media_path = name and p.status = 'DRAFT' and p.created_by = (select auth.uid()))
    or exists (select 1 from public.documents d where d.storage_path = name and d.status = 'DRAFT' and d.created_by = (select auth.uid()))
    or exists (select 1 from public.content_profiles cp where cp.avatar_path = name and private.can_manage())
  )
)
with check (bucket_id = 'editorial-assets');

create policy editorial_assets_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'editorial-assets'
  and private.is_aal2()
  and (
    exists (select 1 from public.posts p where p.media_path = name and p.status = 'DRAFT' and p.created_by = (select auth.uid()))
    or exists (select 1 from public.documents d where d.storage_path = name and d.status = 'DRAFT' and d.created_by = (select auth.uid()))
    or exists (select 1 from public.content_profiles cp where cp.avatar_path = name and private.can_manage())
  )
);
