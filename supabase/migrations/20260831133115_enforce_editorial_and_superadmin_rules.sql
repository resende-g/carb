create or replace function private.protect_last_superadmin_assignment()
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

  perform pg_advisory_xact_lock(hashtext('portal-carb:superadmin-count'));
  if (
    select count(distinct ra.user_id)
    from public.role_assignments ra
    join public.profiles p on p.id = ra.user_id and p.active
    where ra.id <> old.id
      and ra.role = 'SUPERADMIN'
      and ra.active
      and ra.starts_at <= now()
      and (ra.ends_at is null or ra.ends_at > now())
  ) < 2 then
    raise exception 'A plataforma deve manter ao menos 2 SUPERADM ativos.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function private.protect_last_superadmin_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (old.active and not new.active) then return new; end if;
  if not exists (select 1 from public.role_assignments where user_id = old.id and role = 'SUPERADMIN' and active) then return new; end if;
  perform pg_advisory_xact_lock(hashtext('portal-carb:superadmin-count'));
  if (
    select count(distinct ra.user_id)
    from public.role_assignments ra
    join public.profiles p on p.id = ra.user_id and p.active
    where ra.user_id <> old.id
      and ra.role = 'SUPERADMIN'
      and ra.active
      and ra.starts_at <= now()
      and (ra.ends_at is null or ra.ends_at > now())
  ) < 2 then
    raise exception 'A plataforma deve manter ao menos 2 SUPERADM ativos.';
  end if;
  return new;
end;
$$;

create or replace function public.grant_role(p_user_id uuid, p_role public.app_role, p_office public.institutional_office)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  if not private.is_aal2() or not private.can_manage() then raise exception 'Somente SUPERADMIN com MFA pode conceder papéis.'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id and active) then raise exception 'Perfil de pessoa inexistente ou inativo.'; end if;
  perform pg_advisory_xact_lock(hashtext('portal-carb:superadmin-count'));
  if p_role = 'SUPERADMIN'
    and not exists (
      select 1 from public.role_assignments
      where user_id = p_user_id and role = 'SUPERADMIN' and active
        and starts_at <= now() and (ends_at is null or ends_at > now())
    )
    and (
      select count(distinct ra.user_id)
      from public.role_assignments ra
      join public.profiles p on p.id = ra.user_id and p.active
      where ra.role = 'SUPERADMIN' and ra.active
        and ra.starts_at <= now() and (ra.ends_at is null or ra.ends_at > now())
    ) >= 3
  then raise exception 'A plataforma permite no máximo 3 SUPERADM ativos.';
  end if;
  insert into public.role_assignments (user_id, role, office, granted_by)
  values (p_user_id, p_role, p_office, (select auth.uid())) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.delete_post_draft(p_post_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_post public.posts%rowtype;
begin
  if not private.is_aal2() then raise exception 'MFA é obrigatório.'; end if;
  select * into v_post from public.posts where id = p_post_id for update;
  if not found or v_post.status <> 'DRAFT' then raise exception 'Rascunho não encontrado.'; end if;
  if not ((v_post.created_by = v_actor and private.can_publish_as(v_post.content_profile_id)) or private.can_moderate()) then
    raise exception 'Sem autorização editorial para excluir este rascunho.';
  end if;
  delete from public.posts where id = p_post_id;
  return v_post.media_path;
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
  v_new_id uuid;
  v_disabled boolean := false;
begin
  if not private.is_aal2() or not private.can_manage() then raise exception 'Somente SUPERADMIN com MFA pode transferir custódia.'; end if;
  perform pg_advisory_xact_lock(hashtext('portal-carb:custody-transfer'));
  perform pg_advisory_xact_lock(hashtext('portal-carb:superadmin-count'));
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
  perform private.write_audit('CUSTODY_TRANSFERRED', 'role_assignment', v_new_id,
    jsonb_build_object('old_user_id', v_old.user_id, 'new_user_id', p_new_user_id, 'role', p_role, 'office', p_office, 'old_user_disabled', v_disabled));
  return jsonb_build_object('old_user_id', v_old.user_id, 'new_assignment_id', v_new_id, 'old_user_disabled', v_disabled);
end;
$$;

revoke all on function public.delete_post_draft(uuid) from public;
grant execute on function public.delete_post_draft(uuid) to authenticated;
