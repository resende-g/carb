create unique index posts_media_path_unique
on public.posts (media_path)
where media_path is not null;

create unique index content_profiles_avatar_path_unique
on public.content_profiles (avatar_path)
where avatar_path is not null;

alter table public.content_profiles
add constraint content_profiles_avatar_path_namespace
check (
  avatar_path is null
  or avatar_path ~ ('^profile-avatars/' || id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[^/]{1,120}$')
);

alter table public.profiles
add column admin_sessions_blocked boolean not null default false;

create or replace function private.revoke_admin_sessions(p_user_id uuid, p_reason text, p_actor uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revoked bigint;
begin
  perform pg_advisory_xact_lock(hashtext('portal-carb:admin-session:' || p_user_id::text));
  update public.admin_sessions
  set revoked_at = now()
  where user_id = p_user_id and revoked_at is null;
  get diagnostics v_revoked = row_count;
  perform private.write_audit('SESSIONS_REVOKED', 'profile', p_user_id,
    jsonb_build_object('reason', p_reason, 'revoked_sessions', v_revoked), p_actor);
  return v_revoked;
end;
$$;

revoke all on function private.revoke_admin_sessions(uuid, text, uuid) from public, anon, authenticated;

create function public.open_admin_session(p_session_id uuid, p_user_id uuid, p_expires_at timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('portal-carb:admin-session:' || p_user_id::text));
  if p_expires_at <= now() or p_expires_at > now() + interval '61 minutes' then
    raise exception 'Prazo de sessão administrativa inválido.';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id and active) then
    raise exception 'Conta administrativa inativa.';
  end if;
  if not exists (
    select 1 from public.role_assignments
    where user_id = p_user_id and active and starts_at <= now() and (ends_at is null or ends_at > now())
  ) then
    raise exception 'Conta administrativa sem função vigente.';
  end if;
  insert into public.admin_sessions (session_id, user_id, expires_at)
  values (p_session_id, p_user_id, p_expires_at);
end;
$$;

revoke all on function public.open_admin_session(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.open_admin_session(uuid, uuid, timestamptz) to service_role;

create function public.begin_mfa_reset(p_user_id uuid, p_actor uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Usuário não encontrado.';
  end if;
  perform pg_advisory_xact_lock(hashtext('portal-carb:admin-session:' || p_user_id::text));
  update public.profiles set admin_sessions_blocked = true where id = p_user_id;
  return private.revoke_admin_sessions(p_user_id, 'mfa_reset', p_actor);
end;
$$;

revoke all on function public.begin_mfa_reset(uuid, uuid) from public, anon, authenticated;
grant execute on function public.begin_mfa_reset(uuid, uuid) to service_role;

create function private.sync_admin_sessions_after_mfa_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  if tg_op = 'INSERT' then
    if new.status::text = 'verified' then
      update public.profiles set admin_sessions_blocked = false where id = new.user_id;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.status::text = 'verified' then
      perform pg_advisory_xact_lock(hashtext('portal-carb:admin-session:' || old.user_id::text));
      update public.profiles
      set admin_sessions_blocked = true
      where id = old.user_id
        and not exists (
          select 1 from auth.mfa_factors f where f.user_id = old.user_id and f.status::text = 'verified'
        );
      perform private.revoke_admin_sessions(old.user_id, 'mfa_factor_changed', (select auth.uid()));
    end if;
    return old;
  end if;

  v_user_id := new.user_id;
  if new.status::text = 'verified' and old.status::text <> 'verified' then
    update public.profiles set admin_sessions_blocked = false where id = v_user_id;
  elsif old.status::text = 'verified' and new.status::text <> 'verified' then
    perform pg_advisory_xact_lock(hashtext('portal-carb:admin-session:' || v_user_id::text));
    update public.profiles
    set admin_sessions_blocked = true
    where id = v_user_id
      and not exists (
        select 1 from auth.mfa_factors f where f.user_id = v_user_id and f.status::text = 'verified'
      );
    perform private.revoke_admin_sessions(v_user_id, 'mfa_factor_changed', (select auth.uid()));
  end if;
  return new;
end;
$$;

revoke all on function private.sync_admin_sessions_after_mfa_change() from public, anon, authenticated;

create trigger portal_sync_admin_sessions_after_mfa_change
after insert or update or delete on auth.mfa_factors
for each row execute function private.sync_admin_sessions_after_mfa_change();

create or replace function private.current_user_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.active and not p.admin_sessions_blocked
    )
    and exists (
      select 1
      from public.admin_sessions s
      where s.session_id = nullif((select auth.jwt()) ->> 'session_id', '')::uuid
        and s.user_id = (select auth.uid())
        and s.revoked_at is null
        and s.expires_at > now()
    );
$$;

create function public.revoke_current_admin_sessions()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null then raise exception 'Sessão obrigatória.'; end if;
  return private.revoke_admin_sessions(v_actor, 'global_logout', v_actor);
end;
$$;

revoke all on function public.revoke_current_admin_sessions() from public, anon;
grant execute on function public.revoke_current_admin_sessions() to authenticated;

create or replace function public.set_user_active(p_user_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_active boolean;
  v_is_superadmin boolean;
begin
  if not private.is_aal2() or not private.can_manage() then raise exception 'Somente SUPERADMIN com MFA pode alterar usuários.'; end if;

  select p.active,
    exists (
      select 1 from public.role_assignments ra
      where ra.user_id = p.id
        and ra.role = 'SUPERADMIN'
        and ra.active
        and ra.starts_at <= now()
        and (ra.ends_at is null or ra.ends_at > now())
    )
  into v_current_active, v_is_superadmin
  from public.profiles p
  where p.id = p_user_id;

  if not found then raise exception 'Usuário não encontrado.'; end if;

  if p_active and not v_current_active and v_is_superadmin then
    perform pg_advisory_xact_lock(hashtext('portal-carb:superadmin-count'));
    if (
      select count(distinct ra.user_id)
      from public.role_assignments ra
      join public.profiles p on p.id = ra.user_id and p.active
      where ra.role = 'SUPERADMIN'
        and ra.active
        and ra.starts_at <= now()
        and (ra.ends_at is null or ra.ends_at > now())
    ) >= 3 then
      raise exception 'A plataforma permite no máximo 3 SUPERADM ativos.';
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtext('portal-carb:admin-session:' || p_user_id::text));
  update public.profiles set active = p_active where id = p_user_id;
  if not p_active then
    perform private.revoke_admin_sessions(p_user_id, 'account_disabled', (select auth.uid()));
  end if;
end;
$$;

create or replace function public.transfer_custody(p_old_assignment_id uuid, p_new_user_id uuid, p_role public.app_role, p_office public.institutional_office)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.role_assignments%rowtype;
  v_old_user_id uuid;
  v_new_id uuid;
  v_disabled boolean := false;
begin
  if not private.is_aal2() or not private.can_manage() then raise exception 'Somente SUPERADMIN com MFA pode transferir custódia.'; end if;
  perform pg_advisory_xact_lock(hashtext('portal-carb:custody-transfer'));
  perform pg_advisory_xact_lock(hashtext('portal-carb:superadmin-count'));
  select user_id into v_old_user_id from public.role_assignments where id = p_old_assignment_id and active;
  if not found then raise exception 'Atribuição anterior ativa não encontrada.'; end if;
  perform pg_advisory_xact_lock(hashtext('portal-carb:admin-session:' || v_old_user_id::text));
  select * into v_old from public.role_assignments where id = p_old_assignment_id and active for update;
  if not found then raise exception 'Atribuição anterior ativa não encontrada.'; end if;
  if v_old.user_id = p_new_user_id then raise exception 'A sucessão exige uma conta individual diferente.'; end if;
  if v_old.role <> p_role or v_old.office <> p_office then raise exception 'A sucessão deve preservar papel e função institucional.'; end if;
  if not exists (select 1 from public.profiles where id = p_new_user_id and active) then raise exception 'Novo usuário inexistente ou inativo.'; end if;
  if p_role = 'SUPERADMIN'
    and not exists (select 1 from public.role_assignments where user_id = p_new_user_id and role = 'SUPERADMIN' and active)
    and exists (select 1 from public.role_assignments where id <> v_old.id and user_id = v_old.user_id and role = 'SUPERADMIN' and active)
    and (
      select count(distinct ra.user_id)
      from public.role_assignments ra
      join public.profiles p on p.id = ra.user_id and p.active
      where ra.role = 'SUPERADMIN' and ra.active
    ) >= 3
  then raise exception 'A plataforma permite no máximo 3 SUPERADM ativos.';
  end if;

  insert into public.role_assignments (user_id, role, office, granted_by)
  values (p_new_user_id, p_role, p_office, (select auth.uid())) returning id into v_new_id;
  update public.role_assignments set active = false, ends_at = now(), revoked_by = (select auth.uid()) where id = v_old.id;
  if not exists (select 1 from public.role_assignments where user_id = v_old.user_id and active) then
    update public.profiles set active = false where id = v_old.user_id;
    v_disabled := true;
  end if;
  perform private.revoke_admin_sessions(v_old.user_id, 'custody_transfer', (select auth.uid()));
  perform private.write_audit('CUSTODY_TRANSFERRED', 'role_assignment', v_new_id,
    jsonb_build_object('old_user_id', v_old.user_id, 'new_user_id', p_new_user_id, 'role', p_role, 'office', p_office, 'old_user_disabled', v_disabled));
  return jsonb_build_object('old_user_id', v_old.user_id, 'new_assignment_id', v_new_id, 'old_user_disabled', v_disabled);
end;
$$;

create or replace function public.save_post_draft(
  p_post_id uuid,
  p_content_profile_id uuid,
  p_title text,
  p_body text,
  p_category text,
  p_hashtag_ids uuid[],
  p_media_path text default null,
  p_media_alt text default null,
  p_media_mime_type text default null,
  p_media_size_bytes bigint default null
)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_post public.posts%rowtype;
begin
  if not private.is_aal2() or not private.can_publish_as(p_content_profile_id) then raise exception 'Sem autorização editorial.'; end if;
  if coalesce(array_length(p_hashtag_ids, 1), 0) = 0 then raise exception 'Selecione ao menos uma hashtag.'; end if;
  if exists (
    select 1 from unnest(p_hashtag_ids) as selected_hashtag(id)
    left join public.hashtags h on h.id = selected_hashtag.id and h.active
    where h.id is null
  ) then raise exception 'Hashtag inexistente ou inativa.'; end if;

  if p_post_id is null then
    if p_media_path is not null and p_media_path !~* format('^posts/%s/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[^/]{1,120}$', v_actor) then
      raise exception 'Caminho de mídia inválido.';
    end if;
    insert into public.posts (content_profile_id, title, body, category, media_path, media_alt, media_mime_type, media_size_bytes, created_by)
    values (p_content_profile_id, trim(p_title), trim(p_body), trim(p_category), p_media_path, nullif(trim(p_media_alt), ''), p_media_mime_type, p_media_size_bytes, v_actor)
    returning * into v_post;
  else
    select p.* into v_post from public.posts p where p.id = p_post_id for update;
    if not found or v_post.status <> 'DRAFT' or v_post.created_by <> v_actor then raise exception 'Rascunho não editável.'; end if;
    if p_media_path is distinct from v_post.media_path
      and p_media_path is not null
      and p_media_path !~* format('^posts/%s/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[^/]{1,120}$', v_actor)
    then raise exception 'Caminho de mídia inválido.';
    end if;
    update public.posts p set content_profile_id = p_content_profile_id, title = trim(p_title), body = trim(p_body), category = trim(p_category),
      media_path = p_media_path, media_alt = nullif(trim(p_media_alt), ''), media_mime_type = p_media_mime_type, media_size_bytes = p_media_size_bytes
    where p.id = p_post_id returning p.* into v_post;
    delete from public.post_hashtags ph where ph.post_id = p_post_id;
  end if;

  insert into public.post_hashtags (post_id, hashtag_id)
  select v_post.id, selected.id from (select distinct unnest(p_hashtag_ids) as id) selected;
  return v_post;
end;
$$;

create or replace function public.create_post_revision(
  p_post_id uuid,
  p_title text,
  p_body text,
  p_category text,
  p_change_summary text,
  p_hashtag_ids uuid[],
  p_media_path text default null,
  p_media_alt text default null,
  p_media_mime_type text default null,
  p_media_size_bytes bigint default null
)
returns public.post_revisions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_post public.posts%rowtype;
  v_revision public.post_revisions%rowtype;
begin
  if not private.is_aal2() then raise exception 'MFA é obrigatório.'; end if;
  select * into v_post from public.posts where id = p_post_id and status = 'PUBLISHED';
  if not found or not private.can_publish_as(v_post.content_profile_id) then raise exception 'Publicação não editável.'; end if;
  if row(p_media_path, nullif(trim(p_media_alt), ''), p_media_mime_type, p_media_size_bytes)
    is distinct from row(v_post.media_path, v_post.media_alt, v_post.media_mime_type, v_post.media_size_bytes)
  then raise exception 'A mídia da revisão deve permanecer vinculada à publicação.';
  end if;
  if exists (select 1 from public.post_revisions where post_id = p_post_id and status = 'PENDING_APPROVAL') then raise exception 'Já existe uma revisão pendente.'; end if;
  if coalesce(array_length(p_hashtag_ids, 1), 0) = 0 or exists (
    select 1 from unnest(p_hashtag_ids) id left join public.hashtags h on h.id = id and h.active where h.id is null
  ) then raise exception 'Hashtags inválidas.'; end if;

  insert into public.post_revisions (post_id, title, body, category, media_path, media_alt, media_mime_type, media_size_bytes, change_summary, created_by)
  values (p_post_id, trim(p_title), trim(p_body), trim(p_category), p_media_path, nullif(trim(p_media_alt), ''), p_media_mime_type, p_media_size_bytes, trim(p_change_summary), v_actor)
  returning * into v_revision;
  insert into public.post_revision_hashtags (revision_id, hashtag_id)
  select v_revision.id, id from (select distinct unnest(p_hashtag_ids) id) selected;
  return v_revision;
end;
$$;

create or replace function public.save_document_draft(
  p_document_id uuid,
  p_content_profile_id uuid,
  p_title text,
  p_description text,
  p_storage_path text,
  p_original_filename text,
  p_mime_type text,
  p_size_bytes bigint
)
returns public.documents
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_document public.documents%rowtype;
begin
  if not private.is_aal2() or not private.can_publish_as(p_content_profile_id) then raise exception 'Sem autorização editorial.'; end if;
  if p_document_id is null then
    if p_storage_path !~* format('^documents/%s/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[^/]{1,120}$', v_actor) then
      raise exception 'Caminho de documento inválido.';
    end if;
    insert into public.documents (content_profile_id, title, description, storage_path, original_filename, mime_type, size_bytes, created_by)
    values (p_content_profile_id, trim(p_title), trim(p_description), p_storage_path, p_original_filename, p_mime_type, p_size_bytes, v_actor)
    returning * into v_document;
  else
    select * into v_document from public.documents where id = p_document_id for update;
    if not found or v_document.status <> 'DRAFT' or v_document.created_by <> v_actor then raise exception 'Documento não editável.'; end if;
    if p_storage_path is distinct from v_document.storage_path
      and p_storage_path !~* format('^documents/%s/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[^/]{1,120}$', v_actor)
    then raise exception 'Caminho de documento inválido.';
    end if;
    update public.documents set content_profile_id = p_content_profile_id, title = trim(p_title), description = trim(p_description),
      storage_path = p_storage_path, original_filename = p_original_filename, mime_type = p_mime_type, size_bytes = p_size_bytes
    where id = p_document_id returning * into v_document;
  end if;
  return v_document;
end;
$$;

create or replace function public.delete_document_draft(p_document_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_document public.documents%rowtype;
begin
  if not private.is_aal2() then raise exception 'MFA é obrigatório.'; end if;
  select * into v_document from public.documents where id = p_document_id for update;
  if not found or v_document.status <> 'DRAFT' or v_document.created_by <> v_actor then raise exception 'Rascunho documental não encontrado.'; end if;
  if not private.can_publish_as(v_document.content_profile_id) then raise exception 'Sem autorização editorial para excluir este rascunho.'; end if;
  delete from public.documents where id = p_document_id;
end;
$$;

create function private.prevent_self_decided_removal()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.decided_by is not null and new.decided_by = new.requested_by then
    raise exception 'Quem solicitou não pode decidir a própria remoção.';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_self_decided_removal() from public, anon, authenticated;

create trigger removal_requests_prevent_self_decision
before insert or update of requested_by, decided_by on public.removal_requests
for each row execute function private.prevent_self_decided_removal();

drop policy if exists editorial_assets_public_read on storage.objects;
create policy editorial_assets_public_read
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'editorial-assets'
  and (
    ((storage.foldername(storage.objects.name))[1] = 'posts' and exists (select 1 from public.posts p where p.media_path = storage.objects.name and p.status = 'PUBLISHED'))
    or ((storage.foldername(storage.objects.name))[1] = 'documents' and exists (select 1 from public.documents d where d.storage_path = storage.objects.name and d.status = 'APPROVED'))
  )
);

drop policy if exists editorial_assets_scoped_read on storage.objects;
create policy editorial_assets_scoped_read
on storage.objects for select to authenticated
using (
  bucket_id = 'editorial-assets'
  and private.is_aal2()
  and (
    ((storage.foldername(storage.objects.name))[1] = 'posts' and exists (select 1 from public.posts p where p.media_path = storage.objects.name and private.can_view_editorial_profile(p.content_profile_id)))
    or ((storage.foldername(storage.objects.name))[1] = 'documents' and exists (select 1 from public.documents d where d.storage_path = storage.objects.name and private.can_view_editorial_profile(d.content_profile_id)))
  )
);

drop policy if exists editorial_assets_insert on storage.objects;
create policy editorial_assets_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'editorial-assets'
  and private.is_aal2()
  and owner_id = (select auth.uid())::text
  and (
    ((storage.foldername(storage.objects.name))[1] = 'posts'
      and (storage.foldername(storage.objects.name))[2] = (select auth.uid())::text
      and exists (select 1 from public.posts p where p.media_path = storage.objects.name and p.status = 'DRAFT' and p.created_by = (select auth.uid()) and private.can_publish_as(p.content_profile_id)))
    or ((storage.foldername(storage.objects.name))[1] = 'documents'
      and (storage.foldername(storage.objects.name))[2] = (select auth.uid())::text
      and exists (select 1 from public.documents d where d.storage_path = storage.objects.name and d.status = 'DRAFT' and d.created_by = (select auth.uid()) and private.can_publish_as(d.content_profile_id)))
  )
);

drop policy if exists editorial_assets_update on storage.objects;
create policy editorial_assets_update
on storage.objects for update to authenticated
using (
  bucket_id = 'editorial-assets'
  and private.is_aal2()
  and owner_id = (select auth.uid())::text
  and (
    ((storage.foldername(storage.objects.name))[1] = 'posts'
      and (storage.foldername(storage.objects.name))[2] = (select auth.uid())::text
      and exists (select 1 from public.posts p where p.media_path = storage.objects.name and p.status = 'DRAFT' and p.created_by = (select auth.uid()) and private.can_publish_as(p.content_profile_id)))
    or ((storage.foldername(storage.objects.name))[1] = 'documents'
      and (storage.foldername(storage.objects.name))[2] = (select auth.uid())::text
      and exists (select 1 from public.documents d where d.storage_path = storage.objects.name and d.status = 'DRAFT' and d.created_by = (select auth.uid()) and private.can_publish_as(d.content_profile_id)))
  )
)
with check (
  bucket_id = 'editorial-assets'
  and owner_id = (select auth.uid())::text
  and (
    ((storage.foldername(storage.objects.name))[1] = 'posts'
      and (storage.foldername(storage.objects.name))[2] = (select auth.uid())::text
      and exists (select 1 from public.posts p where p.media_path = storage.objects.name and p.status = 'DRAFT' and p.created_by = (select auth.uid()) and private.can_publish_as(p.content_profile_id)))
    or ((storage.foldername(storage.objects.name))[1] = 'documents'
      and (storage.foldername(storage.objects.name))[2] = (select auth.uid())::text
      and exists (select 1 from public.documents d where d.storage_path = storage.objects.name and d.status = 'DRAFT' and d.created_by = (select auth.uid()) and private.can_publish_as(d.content_profile_id)))
  )
);

drop policy if exists editorial_assets_delete on storage.objects;
create policy editorial_assets_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'editorial-assets'
  and private.is_aal2()
  and owner_id = (select auth.uid())::text
  and (
    ((storage.foldername(storage.objects.name))[1] = 'posts'
      and (storage.foldername(storage.objects.name))[2] = (select auth.uid())::text
      and exists (select 1 from public.posts p where p.media_path = storage.objects.name and p.status = 'DRAFT' and p.created_by = (select auth.uid()) and private.can_publish_as(p.content_profile_id)))
    or ((storage.foldername(storage.objects.name))[1] = 'documents'
      and (storage.foldername(storage.objects.name))[2] = (select auth.uid())::text
      and exists (select 1 from public.documents d where d.storage_path = storage.objects.name and d.status = 'DRAFT' and d.created_by = (select auth.uid()) and private.can_publish_as(d.content_profile_id)))
  )
);
