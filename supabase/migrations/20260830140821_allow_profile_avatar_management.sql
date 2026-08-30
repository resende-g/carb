create policy editorial_profile_avatars_manage
on storage.objects
for all
to authenticated
using (
  bucket_id = 'editorial-assets'
  and (storage.foldername(name))[1] = 'profile-avatars'
  and (select private.is_aal2())
  and (select private.can_manage())
)
with check (
  bucket_id = 'editorial-assets'
  and (storage.foldername(name))[1] = 'profile-avatars'
  and (select private.is_aal2())
  and (select private.can_manage())
);
