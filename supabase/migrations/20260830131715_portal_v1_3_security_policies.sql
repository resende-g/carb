create function private.is_aal2()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal') = 'aal2', false);
$$;

create function private.current_user_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.active
    );
$$;

create function private.has_any_role(p_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_user_active()
    and exists (
      select 1
      from public.role_assignments ra
      where ra.user_id = (select auth.uid())
        and ra.role = any (p_roles)
        and ra.active
        and ra.starts_at <= now()
        and (ra.ends_at is null or ra.ends_at > now())
    );
$$;

create function private.can_moderate()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_any_role(array['ADMIN'::public.app_role, 'SUPERADMIN'::public.app_role]);
$$;

create function private.can_manage()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_any_role(array['SUPERADMIN'::public.app_role]);
$$;

create function private.can_publish_as(p_content_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_manage()
    or (
      private.has_any_role(array['EDITOR'::public.app_role, 'ADMIN'::public.app_role])
      and exists (
        select 1
        from public.content_profile_permissions cpp
        join public.content_profiles cp on cp.id = cpp.content_profile_id and cp.active
        where cpp.user_id = (select auth.uid())
          and cpp.content_profile_id = p_content_profile_id
          and cpp.active
          and cpp.can_publish
      )
    );
$$;

create function private.can_view_editorial_profile(p_content_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_moderate()
    or exists (
      select 1 from public.content_profile_permissions cpp
      where cpp.user_id = (select auth.uid())
        and cpp.content_profile_id = p_content_profile_id
        and cpp.active
    );
$$;

revoke all on function private.is_aal2() from public;
revoke all on function private.current_user_active() from public;
revoke all on function private.has_any_role(public.app_role[]) from public;
revoke all on function private.can_moderate() from public;
revoke all on function private.can_manage() from public;
revoke all on function private.can_publish_as(uuid) from public;
revoke all on function private.can_view_editorial_profile(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_aal2(), private.current_user_active(), private.has_any_role(public.app_role[]), private.can_moderate(), private.can_manage(), private.can_publish_as(uuid), private.can_view_editorial_profile(uuid) to authenticated;

create function private.write_audit(
  p_event public.audit_event,
  p_entity_type text,
  p_entity_id uuid default null,
  p_metadata jsonb default '{}'::jsonb,
  p_actor uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs (actor_user_id, event, entity_type, entity_id, metadata)
  values (coalesce(p_actor, (select auth.uid())), p_event, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

revoke all on function private.write_audit(public.audit_event, text, uuid, jsonb, uuid) from public, anon, authenticated;

create function private.block_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_logs é append-only';
end;
$$;

create trigger audit_logs_append_only
before update or delete on public.audit_logs
for each row execute function private.block_audit_mutation();

create function private.audit_profile_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.active and not new.active then
    perform private.write_audit('USER_DISABLED', 'profile', new.id);
  end if;
  return new;
end;
$$;

create function private.audit_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.write_audit('ROLE_GRANTED', 'role_assignment', new.id, jsonb_build_object('user_id', new.user_id, 'role', new.role, 'office', new.office));
  elsif old.active and not new.active then
    perform private.write_audit('ROLE_REVOKED', 'role_assignment', new.id, jsonb_build_object('user_id', new.user_id, 'role', new.role, 'office', new.office));
  end if;
  return new;
end;
$$;

create function private.audit_content_profile_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.write_audit(
    case when tg_op = 'INSERT' then 'CONTENT_PROFILE_CREATED'::public.audit_event else 'CONTENT_PROFILE_UPDATED'::public.audit_event end,
    'content_profile', new.id, jsonb_build_object('slug', new.slug)
  );
  return new;
end;
$$;

create function private.audit_hashtag_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.audit_event;
begin
  v_event := case
    when tg_op = 'INSERT' then 'HASHTAG_CREATED'::public.audit_event
    when old.active and not new.active then 'HASHTAG_DISABLED'::public.audit_event
    else 'HASHTAG_UPDATED'::public.audit_event
  end;
  perform private.write_audit(v_event, 'hashtag', new.id, jsonb_build_object('slug', new.slug));
  return new;
end;
$$;

create function private.audit_post_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.audit_event;
begin
  if tg_op = 'INSERT' then
    v_event := 'POST_CREATED';
  elsif old.status is distinct from new.status then
    v_event := case new.status
      when 'PENDING_APPROVAL' then 'POST_SUBMITTED'::public.audit_event
      when 'APPROVED' then 'POST_APPROVED'::public.audit_event
      when 'REJECTED' then 'POST_REJECTED'::public.audit_event
      when 'PUBLISHED' then 'POST_PUBLISHED'::public.audit_event
      when 'REMOVAL_REQUESTED' then 'POST_REMOVAL_REQUESTED'::public.audit_event
      when 'REMOVED' then 'POST_REMOVED'::public.audit_event
      else 'POST_UPDATED'::public.audit_event
    end;
  else
    v_event := 'POST_UPDATED';
  end if;
  perform private.write_audit(v_event, 'post', new.id, jsonb_build_object('status', new.status, 'content_profile_id', new.content_profile_id));
  return new;
end;
$$;

create function private.audit_revision_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.write_audit('POST_UPDATED', 'post_revision', new.id, jsonb_build_object('post_id', new.post_id, 'status', new.status));
  return new;
end;
$$;

create function private.audit_document_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.audit_event;
begin
  if tg_op = 'INSERT' then
    v_event := 'DOCUMENT_UPLOADED';
  elsif old.status is distinct from new.status and new.status = 'APPROVED' then
    v_event := 'DOCUMENT_APPROVED';
  elsif old.status is distinct from new.status and new.status = 'REJECTED' then
    v_event := 'DOCUMENT_REJECTED';
  else
    return new;
  end if;
  perform private.write_audit(v_event, 'document', new.id, jsonb_build_object('status', new.status, 'content_profile_id', new.content_profile_id));
  return new;
end;
$$;

create trigger profiles_audit after update on public.profiles for each row execute function private.audit_profile_change();
create trigger role_assignments_audit after insert or update on public.role_assignments for each row execute function private.audit_role_change();
create trigger content_profiles_audit after insert or update on public.content_profiles for each row execute function private.audit_content_profile_change();
create trigger hashtags_audit after insert or update on public.hashtags for each row execute function private.audit_hashtag_change();
create trigger posts_audit after insert or update on public.posts for each row execute function private.audit_post_change();
create trigger post_revisions_audit after insert on public.post_revisions for each row execute function private.audit_revision_created();
create trigger documents_audit after insert or update on public.documents for each row execute function private.audit_document_change();

create function private.protect_last_superadmin_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_removing boolean;
begin
  if tg_op = 'UPDATE' and (
    new.user_id is distinct from old.user_id
    or new.role is distinct from old.role
    or new.office is distinct from old.office
    or new.starts_at is distinct from old.starts_at
    or new.granted_by is distinct from old.granted_by
  ) then
    raise exception 'Atribuições são imutáveis; revogue e crie uma nova.';
  end if;

  v_removing := old.role = 'SUPERADMIN' and old.active;
  if v_removing and tg_op = 'UPDATE' then v_removing := not new.active; end if;
  if not v_removing then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('portal-carb:last-superadmin'));
  if not exists (
    select 1
    from public.role_assignments ra
    join public.profiles p on p.id = ra.user_id and p.active
    where ra.id <> old.id
      and ra.role = 'SUPERADMIN'
      and ra.active
      and ra.starts_at <= now()
      and (ra.ends_at is null or ra.ends_at > now())
  ) then
    raise exception 'Não é permitido revogar o último SUPERADMIN ativo.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create function private.protect_last_superadmin_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (old.active and not new.active) then return new; end if;
  if not exists (select 1 from public.role_assignments where user_id = old.id and role = 'SUPERADMIN' and active) then return new; end if;
  perform pg_advisory_xact_lock(hashtext('portal-carb:last-superadmin'));
  if not exists (
    select 1
    from public.role_assignments ra
    join public.profiles p on p.id = ra.user_id and p.active
    where ra.user_id <> old.id and ra.role = 'SUPERADMIN' and ra.active
      and ra.starts_at <= now() and (ra.ends_at is null or ra.ends_at > now())
  ) then
    raise exception 'Não é permitido desativar o último SUPERADMIN ativo.';
  end if;
  return new;
end;
$$;

create trigger role_assignments_protect_last_superadmin
before update or delete on public.role_assignments
for each row execute function private.protect_last_superadmin_assignment();

create trigger profiles_protect_last_superadmin
before update on public.profiles
for each row execute function private.protect_last_superadmin_profile();

create function private.protect_content_profile_history()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.active and not new.active and exists (
    select 1 from public.posts where content_profile_id = old.id and status <> 'REMOVED'
  ) then raise exception 'Desative as autorizações editoriais; perfis com histórico público devem permanecer ativos.';
  end if;
  return new;
end;
$$;

create trigger content_profiles_protect_history
before update on public.content_profiles
for each row execute function private.protect_content_profile_history();

create function public.save_post_draft(
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
    insert into public.posts (content_profile_id, title, body, category, media_path, media_alt, media_mime_type, media_size_bytes, created_by)
    values (p_content_profile_id, trim(p_title), trim(p_body), trim(p_category), p_media_path, nullif(trim(p_media_alt), ''), p_media_mime_type, p_media_size_bytes, v_actor)
    returning * into v_post;
  else
    select p.* into v_post from public.posts p where p.id = p_post_id for update;
    if not found or v_post.status <> 'DRAFT' or v_post.created_by <> v_actor then raise exception 'Rascunho não editável.'; end if;
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

create function public.transition_post(p_post_id uuid, p_target_status public.post_status, p_reason text default null)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_post public.posts%rowtype;
  v_request public.removal_requests%rowtype;
begin
  if not private.is_aal2() or not private.current_user_active() then raise exception 'MFA e conta ativa são obrigatórios.'; end if;
  select * into v_post from public.posts where id = p_post_id for update;
  if not found then raise exception 'Publicação não encontrada.'; end if;

  if v_post.status = 'DRAFT' and p_target_status = 'PENDING_APPROVAL' then
    if v_post.created_by <> v_actor or not private.can_publish_as(v_post.content_profile_id) then raise exception 'Sem autorização para submeter.'; end if;
    update public.posts set status = p_target_status, submitted_by = v_actor, rejection_reason = null where id = p_post_id returning * into v_post;
  elsif v_post.status = 'PENDING_APPROVAL' and p_target_status in ('APPROVED', 'REJECTED') then
    if not private.can_moderate() or v_post.created_by = v_actor then raise exception 'Quem criou não pode decidir o próprio conteúdo.'; end if;
    if p_target_status = 'REJECTED' and char_length(trim(coalesce(p_reason, ''))) < 10 then raise exception 'Justifique a rejeição.'; end if;
    update public.posts set status = p_target_status, approved_by = case when p_target_status = 'APPROVED' then v_actor else null end,
      rejection_reason = case when p_target_status = 'REJECTED' then trim(p_reason) else null end
    where id = p_post_id returning * into v_post;
  elsif v_post.status = 'APPROVED' and p_target_status = 'PUBLISHED' then
    if not private.can_moderate() then raise exception 'Somente ADMIN ou SUPERADMIN pode publicar.'; end if;
    update public.posts set status = p_target_status, published_at = now() where id = p_post_id returning * into v_post;
  elsif v_post.status = 'PUBLISHED' and p_target_status = 'REMOVAL_REQUESTED' then
    if not (private.can_moderate() or private.can_publish_as(v_post.content_profile_id)) then raise exception 'Sem autorização para solicitar remoção.'; end if;
    if char_length(trim(coalesce(p_reason, ''))) < 10 then raise exception 'Justifique a solicitação de remoção.'; end if;
    insert into public.removal_requests (post_id, requested_by, justification) values (p_post_id, v_actor, trim(p_reason));
    update public.posts set status = p_target_status where id = p_post_id returning * into v_post;
  elsif v_post.status = 'REMOVAL_REQUESTED' and p_target_status in ('REMOVED', 'PUBLISHED') then
    if not private.can_moderate() then raise exception 'Somente ADMIN ou SUPERADMIN pode decidir a remoção.'; end if;
    select * into v_request from public.removal_requests where post_id = p_post_id and status = 'PENDING' for update;
    if not found then raise exception 'Solicitação pendente não encontrada.'; end if;
    if p_target_status = 'PUBLISHED' and char_length(trim(coalesce(p_reason, ''))) < 10 then raise exception 'Justifique a rejeição da remoção.'; end if;
    update public.removal_requests set status = case when p_target_status = 'REMOVED' then 'APPROVED'::public.removal_request_status else 'REJECTED'::public.removal_request_status end,
      decided_by = v_actor, decision_reason = nullif(trim(p_reason), ''), decided_at = now() where id = v_request.id;
    update public.posts set status = p_target_status where id = p_post_id returning * into v_post;
  elsif v_post.status = 'REJECTED' and p_target_status = 'DRAFT' then
    if v_post.created_by <> v_actor or not private.can_publish_as(v_post.content_profile_id) then raise exception 'Somente o autor autorizado pode reabrir.'; end if;
    update public.posts set status = p_target_status, submitted_by = null, approved_by = null, rejection_reason = null where id = p_post_id returning * into v_post;
  else
    raise exception 'Transição editorial inválida: % -> %.', v_post.status, p_target_status;
  end if;
  return v_post;
end;
$$;

create function public.create_post_revision(
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

create function public.decide_post_revision(p_revision_id uuid, p_approve boolean, p_reason text default null)
returns public.post_revisions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_revision public.post_revisions%rowtype;
begin
  if not private.is_aal2() or not private.can_moderate() then raise exception 'Somente ADMIN ou SUPERADMIN com MFA pode revisar.'; end if;
  select * into v_revision from public.post_revisions where id = p_revision_id for update;
  if not found or v_revision.status <> 'PENDING_APPROVAL' then raise exception 'Revisão pendente não encontrada.'; end if;
  if v_revision.created_by = v_actor then raise exception 'Quem criou não pode aprovar a própria revisão.'; end if;
  if not p_approve and char_length(trim(coalesce(p_reason, ''))) < 10 then raise exception 'Justifique a rejeição.'; end if;

  if p_approve then
    update public.posts set title = v_revision.title, body = v_revision.body, category = v_revision.category,
      media_path = v_revision.media_path, media_alt = v_revision.media_alt, media_mime_type = v_revision.media_mime_type, media_size_bytes = v_revision.media_size_bytes
    where id = v_revision.post_id and status = 'PUBLISHED';
    delete from public.post_hashtags where post_id = v_revision.post_id;
    insert into public.post_hashtags (post_id, hashtag_id)
    select v_revision.post_id, hashtag_id from public.post_revision_hashtags where revision_id = v_revision.id;
  end if;
  update public.post_revisions set status = case when p_approve then 'APPROVED'::public.revision_status else 'REJECTED'::public.revision_status end,
    reviewed_by = v_actor, decision_reason = nullif(trim(p_reason), ''), reviewed_at = now()
  where id = p_revision_id returning * into v_revision;
  return v_revision;
end;
$$;

create function public.save_document_draft(
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
    insert into public.documents (content_profile_id, title, description, storage_path, original_filename, mime_type, size_bytes, created_by)
    values (p_content_profile_id, trim(p_title), trim(p_description), p_storage_path, p_original_filename, p_mime_type, p_size_bytes, v_actor)
    returning * into v_document;
  else
    select * into v_document from public.documents where id = p_document_id for update;
    if not found or v_document.status <> 'DRAFT' or v_document.created_by <> v_actor then raise exception 'Documento não editável.'; end if;
    update public.documents set content_profile_id = p_content_profile_id, title = trim(p_title), description = trim(p_description),
      storage_path = p_storage_path, original_filename = p_original_filename, mime_type = p_mime_type, size_bytes = p_size_bytes
    where id = p_document_id returning * into v_document;
  end if;
  return v_document;
end;
$$;

create function public.transition_document(p_document_id uuid, p_target_status public.document_status, p_reason text default null)
returns public.documents
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
  if not found then raise exception 'Documento não encontrado.'; end if;
  if v_document.status = 'DRAFT' and p_target_status = 'PENDING_APPROVAL' and v_document.created_by = v_actor and private.can_publish_as(v_document.content_profile_id) then
    update public.documents set status = p_target_status, decision_reason = null where id = p_document_id returning * into v_document;
  elsif v_document.status = 'PENDING_APPROVAL' and p_target_status in ('APPROVED', 'REJECTED') and private.can_moderate() and v_document.created_by <> v_actor then
    if p_target_status = 'REJECTED' and char_length(trim(coalesce(p_reason, ''))) < 10 then raise exception 'Justifique a rejeição.'; end if;
    update public.documents set status = p_target_status, approved_by = case when p_target_status = 'APPROVED' then v_actor else null end,
      approved_at = case when p_target_status = 'APPROVED' then now() else null end, decision_reason = nullif(trim(p_reason), '')
    where id = p_document_id returning * into v_document;
  else
    raise exception 'Transição de documento inválida.';
  end if;
  return v_document;
end;
$$;

create function public.delete_document_draft(p_document_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_aal2() then raise exception 'MFA é obrigatório.'; end if;
  delete from public.documents where id = p_document_id and status = 'DRAFT' and created_by = (select auth.uid());
  if not found then raise exception 'Rascunho documental não encontrado.'; end if;
end;
$$;

create function public.grant_role(p_user_id uuid, p_role public.app_role, p_office public.institutional_office)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  if not private.is_aal2() or not private.can_manage() then raise exception 'Somente SUPERADMIN com MFA pode conceder papéis.'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id and active) then raise exception 'Perfil de pessoa inexistente ou inativo.'; end if;
  insert into public.role_assignments (user_id, role, office, granted_by)
  values (p_user_id, p_role, p_office, (select auth.uid())) returning id into v_id;
  return v_id;
end;
$$;

create function public.revoke_role(p_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_aal2() or not private.can_manage() then raise exception 'Somente SUPERADMIN com MFA pode revogar papéis.'; end if;
  update public.role_assignments set active = false, ends_at = now(), revoked_by = (select auth.uid())
  where id = p_assignment_id and active;
  if not found then raise exception 'Atribuição ativa não encontrada.'; end if;
end;
$$;

create function public.set_content_profile_permission(p_user_id uuid, p_content_profile_id uuid, p_can_publish boolean, p_active boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  if not private.is_aal2() or not private.can_manage() then raise exception 'Somente SUPERADMIN com MFA pode alterar autorizações.'; end if;
  insert into public.content_profile_permissions (user_id, content_profile_id, can_publish, active, granted_by)
  values (p_user_id, p_content_profile_id, p_can_publish, p_active, (select auth.uid()))
  on conflict (user_id, content_profile_id) do update set can_publish = excluded.can_publish, active = excluded.active, granted_by = excluded.granted_by
  returning id into v_id;
  return v_id;
end;
$$;

create function public.set_user_active(p_user_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_aal2() or not private.can_manage() then raise exception 'Somente SUPERADMIN com MFA pode alterar usuários.'; end if;
  update public.profiles set active = p_active where id = p_user_id;
  if not found then raise exception 'Usuário não encontrado.'; end if;
end;
$$;

create function public.transfer_custody(p_old_assignment_id uuid, p_new_user_id uuid, p_role public.app_role, p_office public.institutional_office)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.role_assignments%rowtype;
  v_new_id uuid;
  v_disabled boolean := false;
begin
  if not private.is_aal2() or not private.can_manage() then raise exception 'Somente SUPERADMIN com MFA pode transferir custódia.'; end if;
  perform pg_advisory_xact_lock(hashtext('portal-carb:custody-transfer'));
  select * into v_old from public.role_assignments where id = p_old_assignment_id and active for update;
  if not found then raise exception 'Atribuição anterior ativa não encontrada.'; end if;
  if v_old.user_id = p_new_user_id then raise exception 'A sucessão exige uma conta individual diferente.'; end if;
  if v_old.role <> p_role or v_old.office <> p_office then raise exception 'A sucessão deve preservar papel e função institucional.'; end if;
  if not exists (select 1 from public.profiles where id = p_new_user_id and active) then raise exception 'Novo usuário inexistente ou inativo.'; end if;

  insert into public.role_assignments (user_id, role, office, granted_by)
  values (p_new_user_id, p_role, p_office, (select auth.uid())) returning id into v_new_id;
  update public.role_assignments set active = false, ends_at = now(), revoked_by = (select auth.uid()) where id = v_old.id;
  if not exists (select 1 from public.role_assignments where user_id = v_old.user_id and active) then
    update public.profiles set active = false where id = v_old.user_id;
    v_disabled := true;
  end if;
  perform private.write_audit('CUSTODY_TRANSFERRED', 'role_assignment', v_new_id,
    jsonb_build_object('old_user_id', v_old.user_id, 'new_user_id', p_new_user_id, 'role', p_role, 'office', p_office, 'old_user_disabled', v_disabled));
  return jsonb_build_object('old_user_id', v_old.user_id, 'new_assignment_id', v_new_id, 'old_user_disabled', v_disabled);
end;
$$;

create function public.set_reaction(p_post_id uuid, p_anonymous_id uuid, p_reaction public.reaction_type)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.posts where id = p_post_id and status = 'PUBLISHED') then raise exception 'Publicação indisponível.'; end if;
  if p_reaction is null then
    delete from public.reactions where post_id = p_post_id and anonymous_id = p_anonymous_id;
  else
    insert into public.reactions (post_id, anonymous_id, reaction) values (p_post_id, p_anonymous_id, p_reaction)
    on conflict (post_id, anonymous_id) do update set reaction = excluded.reaction;
  end if;
end;
$$;

create function public.get_reaction_totals(p_post_ids uuid[] default null, p_anonymous_id uuid default null)
returns table (post_id uuid, heart bigint, point bigint, skull bigint, dance bigint, selected public.reaction_type)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id,
    count(r.id) filter (where r.reaction = 'heart'),
    count(r.id) filter (where r.reaction = 'point'),
    count(r.id) filter (where r.reaction = 'skull'),
    count(r.id) filter (where r.reaction = 'dance'),
    (select own.reaction from public.reactions own where own.post_id = p.id and own.anonymous_id = p_anonymous_id)
  from public.posts p
  left join public.reactions r on r.post_id = p.id
  where p.status = 'PUBLISHED' and (p_post_ids is null or p.id = any (p_post_ids))
  group by p.id;
$$;

create function public.dashboard_metrics(p_days integer default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_since timestamptz;
  v_result jsonb;
begin
  if not private.is_aal2() or not private.has_any_role(array['EDITOR'::public.app_role, 'ADMIN'::public.app_role, 'SUPERADMIN'::public.app_role]) then
    raise exception 'Sem acesso ao dashboard.';
  end if;
  if p_days is not null and p_days not in (7, 30) then raise exception 'Janela deve ser 7, 30 ou total.'; end if;
  v_since := case when p_days is null then null else now() - make_interval(days => p_days) end;

  select jsonb_build_object(
    'window_days', p_days,
    'posts', (select count(*) from public.posts p where (v_since is null or p.created_at >= v_since) and (private.can_moderate() or private.can_view_editorial_profile(p.content_profile_id))),
    'pending_posts', (select count(*) from public.posts p where p.status = 'PENDING_APPROVAL' and (v_since is null or p.created_at >= v_since) and (private.can_moderate() or private.can_view_editorial_profile(p.content_profile_id))),
    'approved_posts', (select count(*) from public.posts p where p.status in ('APPROVED', 'PUBLISHED') and (v_since is null or p.created_at >= v_since) and (private.can_moderate() or private.can_view_editorial_profile(p.content_profile_id))),
    'rejected_posts', (select count(*) from public.posts p where p.status = 'REJECTED' and (v_since is null or p.created_at >= v_since) and (private.can_moderate() or private.can_view_editorial_profile(p.content_profile_id))),
    'documents', (select count(*) from public.documents d where (v_since is null or d.created_at >= v_since) and (private.can_moderate() or private.can_view_editorial_profile(d.content_profile_id))),
    'removal_requests', (select count(*) from public.removal_requests rr join public.posts p on p.id = rr.post_id where (v_since is null or rr.created_at >= v_since) and (private.can_moderate() or private.can_view_editorial_profile(p.content_profile_id))),
    'reactions', (select count(*) from public.reactions r join public.posts p on p.id = r.post_id where (v_since is null or r.updated_at >= v_since) and (private.can_moderate() or private.can_view_editorial_profile(p.content_profile_id))),
    'reactions_by_post', coalesce((
      select jsonb_agg(jsonb_build_object('post_id', grouped.post_id, 'title', grouped.title, 'total', grouped.total) order by grouped.total desc)
      from (
        select p.id post_id, p.title, count(r.id) total
        from public.posts p left join public.reactions r on r.post_id = p.id and (v_since is null or r.updated_at >= v_since)
        where private.can_moderate() or private.can_view_editorial_profile(p.content_profile_id)
        group by p.id, p.title
      ) grouped
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

create function public.record_login_success()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_aal2() or not private.has_any_role(array['EDITOR'::public.app_role, 'ADMIN'::public.app_role, 'SUPERADMIN'::public.app_role]) then
    raise exception 'Sessão administrativa com MFA obrigatória.';
  end if;
  perform private.write_audit('LOGIN_SUCCESS', 'auth_session', null, '{}'::jsonb);
end;
$$;

revoke all on function public.save_post_draft(uuid, uuid, text, text, text, uuid[], text, text, text, bigint) from public;
revoke all on function public.transition_post(uuid, public.post_status, text) from public;
revoke all on function public.create_post_revision(uuid, text, text, text, text, uuid[], text, text, text, bigint) from public;
revoke all on function public.decide_post_revision(uuid, boolean, text) from public;
revoke all on function public.save_document_draft(uuid, uuid, text, text, text, text, text, bigint) from public;
revoke all on function public.transition_document(uuid, public.document_status, text) from public;
revoke all on function public.delete_document_draft(uuid) from public;
revoke all on function public.grant_role(uuid, public.app_role, public.institutional_office) from public;
revoke all on function public.revoke_role(uuid) from public;
revoke all on function public.set_content_profile_permission(uuid, uuid, boolean, boolean) from public;
revoke all on function public.set_user_active(uuid, boolean) from public;
revoke all on function public.transfer_custody(uuid, uuid, public.app_role, public.institutional_office) from public;
revoke all on function public.set_reaction(uuid, uuid, public.reaction_type) from public;
revoke all on function public.get_reaction_totals(uuid[], uuid) from public;
revoke all on function public.dashboard_metrics(integer) from public;
revoke all on function public.record_login_success() from public;

grant execute on function public.save_post_draft(uuid, uuid, text, text, text, uuid[], text, text, text, bigint), public.transition_post(uuid, public.post_status, text),
  public.create_post_revision(uuid, text, text, text, text, uuid[], text, text, text, bigint), public.decide_post_revision(uuid, boolean, text),
  public.save_document_draft(uuid, uuid, text, text, text, text, text, bigint), public.transition_document(uuid, public.document_status, text), public.delete_document_draft(uuid),
  public.grant_role(uuid, public.app_role, public.institutional_office), public.revoke_role(uuid),
  public.set_content_profile_permission(uuid, uuid, boolean, boolean), public.set_user_active(uuid, boolean),
  public.transfer_custody(uuid, uuid, public.app_role, public.institutional_office), public.dashboard_metrics(integer), public.record_login_success()
to authenticated;
grant execute on function public.set_reaction(uuid, uuid, public.reaction_type), public.get_reaction_totals(uuid[], uuid) to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.role_assignments enable row level security;
alter table public.content_profiles enable row level security;
alter table public.content_profile_permissions enable row level security;
alter table public.hashtags enable row level security;
alter table public.posts enable row level security;
alter table public.post_hashtags enable row level security;
alter table public.post_revisions enable row level security;
alter table public.post_revision_hashtags enable row level security;
alter table public.documents enable row level security;
alter table public.reactions enable row level security;
alter table public.removal_requests enable row level security;
alter table public.audit_logs enable row level security;

revoke all on public.profiles, public.role_assignments, public.content_profiles, public.content_profile_permissions, public.hashtags, public.posts,
  public.post_hashtags, public.post_revisions, public.post_revision_hashtags, public.documents, public.reactions, public.removal_requests, public.audit_logs
from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

grant select on public.content_profiles, public.hashtags, public.posts, public.post_hashtags, public.documents to anon;
grant select on public.profiles, public.role_assignments, public.content_profiles, public.content_profile_permissions, public.hashtags, public.posts, public.post_hashtags,
  public.post_revisions, public.post_revision_hashtags, public.documents, public.removal_requests, public.audit_logs to authenticated;
grant insert, update on public.content_profiles, public.hashtags to authenticated;
grant update (full_name) on public.profiles to authenticated;

grant all on public.profiles, public.role_assignments, public.content_profiles, public.content_profile_permissions, public.hashtags, public.posts,
  public.post_hashtags, public.post_revisions, public.post_revision_hashtags, public.documents, public.reactions, public.removal_requests, public.audit_logs
to service_role;
grant usage, select on all sequences in schema public to service_role;
grant usage on schema private to service_role;
grant execute on all functions in schema private to service_role;

create policy profiles_mfa_required on public.profiles as restrictive for all to authenticated using (private.is_aal2()) with check (private.is_aal2());
create policy role_assignments_mfa_required on public.role_assignments as restrictive for all to authenticated using (private.is_aal2()) with check (private.is_aal2());
create policy content_profiles_mfa_required on public.content_profiles as restrictive for all to authenticated using (private.is_aal2()) with check (private.is_aal2());
create policy content_profile_permissions_mfa_required on public.content_profile_permissions as restrictive for all to authenticated using (private.is_aal2()) with check (private.is_aal2());
create policy hashtags_mfa_required on public.hashtags as restrictive for all to authenticated using (private.is_aal2()) with check (private.is_aal2());
create policy posts_mfa_required on public.posts as restrictive for all to authenticated using (private.is_aal2()) with check (private.is_aal2());
create policy post_hashtags_mfa_required on public.post_hashtags as restrictive for all to authenticated using (private.is_aal2()) with check (private.is_aal2());
create policy post_revisions_mfa_required on public.post_revisions as restrictive for all to authenticated using (private.is_aal2()) with check (private.is_aal2());
create policy post_revision_hashtags_mfa_required on public.post_revision_hashtags as restrictive for all to authenticated using (private.is_aal2()) with check (private.is_aal2());
create policy documents_mfa_required on public.documents as restrictive for all to authenticated using (private.is_aal2()) with check (private.is_aal2());
create policy removal_requests_mfa_required on public.removal_requests as restrictive for all to authenticated using (private.is_aal2()) with check (private.is_aal2());
create policy audit_logs_mfa_required on public.audit_logs as restrictive for all to authenticated using (private.is_aal2()) with check (private.is_aal2());

create policy profiles_self_or_superadmin_read on public.profiles for select to authenticated
using (id = (select auth.uid()) or private.can_manage());
create policy profiles_self_update on public.profiles for update to authenticated
using (id = (select auth.uid()) and active) with check (id = (select auth.uid()) and active);

create policy role_assignments_self_or_superadmin_read on public.role_assignments for select to authenticated
using (user_id = (select auth.uid()) or private.can_manage());

create policy content_profiles_public_read on public.content_profiles for select to anon, authenticated
using (active);
create policy content_profiles_superadmin_read on public.content_profiles for select to authenticated
using (private.can_manage());
create policy content_profiles_superadmin_insert on public.content_profiles for insert to authenticated
with check (private.can_manage());
create policy content_profiles_superadmin_update on public.content_profiles for update to authenticated
using (private.can_manage()) with check (private.can_manage());

create policy content_profile_permissions_scoped_read on public.content_profile_permissions for select to authenticated
using (user_id = (select auth.uid()) or private.can_manage());

create policy hashtags_public_read on public.hashtags for select to anon, authenticated
using (active);
create policy hashtags_admin_read on public.hashtags for select to authenticated
using (private.can_moderate());
create policy hashtags_admin_insert on public.hashtags for insert to authenticated
with check (private.can_moderate());
create policy hashtags_admin_update on public.hashtags for update to authenticated
using (private.can_moderate()) with check (private.can_moderate());

create policy posts_public_read on public.posts for select to anon
using (status = 'PUBLISHED');
create policy posts_authenticated_read on public.posts for select to authenticated
using (status = 'PUBLISHED' or private.can_view_editorial_profile(content_profile_id));

create policy post_hashtags_public_read on public.post_hashtags for select to anon
using (exists (select 1 from public.posts p where p.id = post_id and p.status = 'PUBLISHED'));
create policy post_hashtags_authenticated_read on public.post_hashtags for select to authenticated
using (exists (select 1 from public.posts p where p.id = post_id and (p.status = 'PUBLISHED' or private.can_view_editorial_profile(p.content_profile_id))));

create policy post_revisions_scoped_read on public.post_revisions for select to authenticated
using (exists (select 1 from public.posts p where p.id = post_id and private.can_view_editorial_profile(p.content_profile_id)));
create policy post_revision_hashtags_scoped_read on public.post_revision_hashtags for select to authenticated
using (exists (
  select 1 from public.post_revisions pr join public.posts p on p.id = pr.post_id
  where pr.id = revision_id and private.can_view_editorial_profile(p.content_profile_id)
));

create policy documents_public_read on public.documents for select to anon
using (status = 'APPROVED');
create policy documents_authenticated_read on public.documents for select to authenticated
using (status = 'APPROVED' or private.can_view_editorial_profile(content_profile_id));

create policy removal_requests_scoped_read on public.removal_requests for select to authenticated
using (requested_by = (select auth.uid()) or exists (
  select 1 from public.posts p where p.id = post_id and private.can_view_editorial_profile(p.content_profile_id)
));

create policy audit_logs_scoped_read on public.audit_logs for select to authenticated
using (actor_user_id = (select auth.uid()) or private.can_moderate());
