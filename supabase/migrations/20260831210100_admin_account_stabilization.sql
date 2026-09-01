create table public.admin_sessions (
  session_id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete restrict,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  constraint admin_sessions_expiry_check check (expires_at > started_at),
  constraint admin_sessions_revocation_check check (revoked_at is null or revoked_at >= started_at)
);

create index admin_sessions_user_expiry_idx on public.admin_sessions (user_id, expires_at desc);

alter table public.admin_sessions enable row level security;
revoke all on public.admin_sessions from public, anon, authenticated;
grant select, insert, update on public.admin_sessions to service_role;

comment on table public.admin_sessions is 'Limite absoluto server-side das sessões administrativas; não armazena tokens.';

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
      where p.id = (select auth.uid()) and p.active
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

create or replace function private.audit_profile_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.active and not new.active then
    perform private.write_audit('USER_DISABLED', 'profile', new.id);
  elsif not old.active and new.active then
    perform private.write_audit('USER_REACTIVATED', 'profile', new.id);
  end if;
  return new;
end;
$$;

create or replace function private.audit_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.write_audit(
      'ROLE_GRANTED',
      'role_assignment',
      new.id,
      jsonb_build_object('user_id', new.user_id, 'role', new.role, 'office', new.office),
      new.granted_by
    );
  elsif old.active and not new.active then
    perform private.write_audit(
      'ROLE_REVOKED',
      'role_assignment',
      new.id,
      jsonb_build_object('user_id', new.user_id, 'role', new.role, 'office', new.office),
      new.revoked_by
    );
  end if;
  return new;
end;
$$;

create function public.complete_admin_onboarding(
  p_user_id uuid,
  p_full_name text,
  p_role public.app_role,
  p_office public.institutional_office,
  p_actor_id uuid
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_assignment_id uuid;
begin
  if not exists (
    select 1
    from public.profiles p
    join public.role_assignments ra on ra.user_id = p.id
    where p.id = p_actor_id
      and p.active
      and ra.role = 'SUPERADMIN'
      and ra.active
      and ra.starts_at <= now()
      and (ra.ends_at is null or ra.ends_at > now())
  ) then
    raise exception 'Ator administrativo inválido.';
  end if;

  if char_length(trim(p_full_name)) not between 2 and 120 then
    raise exception 'Nome inválido.';
  end if;

  if not (
    (p_role = 'EDITOR' and p_office = 'COMMUNICATION_DIRECTOR')
    or (p_role = 'ADMIN' and p_office = 'CARB_PRESIDENT')
    or (p_role = 'SUPERADMIN' and p_office in ('TECHNICAL_CUSTODIAN', 'STI_ADMIN'))
  ) then
    raise exception 'Combinação de papel e função institucional inválida.';
  end if;

  if exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Perfil administrativo já existente.';
  end if;

  perform pg_advisory_xact_lock(hashtext('portal-carb:superadmin-count'));
  if p_role = 'SUPERADMIN' and (
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

  insert into public.profiles (id, full_name, active)
  values (p_user_id, trim(p_full_name), true);

  insert into public.role_assignments (user_id, role, office, granted_by)
  values (p_user_id, p_role, p_office, p_actor_id)
  returning id into v_assignment_id;

  return v_assignment_id;
end;
$$;

revoke all on function public.complete_admin_onboarding(uuid, text, public.app_role, public.institutional_office, uuid) from public, anon, authenticated;
grant execute on function public.complete_admin_onboarding(uuid, text, public.app_role, public.institutional_office, uuid) to service_role;

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

  update public.profiles set active = p_active where id = p_user_id;
end;
$$;

alter policy profiles_mfa_required on public.profiles
  using (private.is_aal2() and private.current_user_active())
  with check (private.is_aal2() and private.current_user_active());
alter policy role_assignments_mfa_required on public.role_assignments
  using (private.is_aal2() and private.current_user_active())
  with check (private.is_aal2() and private.current_user_active());
alter policy content_profiles_mfa_required on public.content_profiles
  using (private.is_aal2() and private.current_user_active())
  with check (private.is_aal2() and private.current_user_active());
alter policy content_profile_permissions_mfa_required on public.content_profile_permissions
  using (private.is_aal2() and private.current_user_active())
  with check (private.is_aal2() and private.current_user_active());
alter policy hashtags_mfa_required on public.hashtags
  using (private.is_aal2() and private.current_user_active())
  with check (private.is_aal2() and private.current_user_active());
alter policy posts_mfa_required on public.posts
  using (private.is_aal2() and private.current_user_active())
  with check (private.is_aal2() and private.current_user_active());
alter policy post_hashtags_mfa_required on public.post_hashtags
  using (private.is_aal2() and private.current_user_active())
  with check (private.is_aal2() and private.current_user_active());
alter policy post_revisions_mfa_required on public.post_revisions
  using (private.is_aal2() and private.current_user_active())
  with check (private.is_aal2() and private.current_user_active());
alter policy post_revision_hashtags_mfa_required on public.post_revision_hashtags
  using (private.is_aal2() and private.current_user_active())
  with check (private.is_aal2() and private.current_user_active());
alter policy documents_mfa_required on public.documents
  using (private.is_aal2() and private.current_user_active())
  with check (private.is_aal2() and private.current_user_active());
alter policy removal_requests_mfa_required on public.removal_requests
  using (private.is_aal2() and private.current_user_active())
  with check (private.is_aal2() and private.current_user_active());
alter policy audit_logs_mfa_required on public.audit_logs
  using (private.is_aal2() and private.current_user_active())
  with check (private.is_aal2() and private.current_user_active());
