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
  if old.user_id = (select auth.uid()) then
    raise exception 'SUPERADMIN não pode revogar a própria atribuição.';
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
  if old.id = (select auth.uid()) then
    raise exception 'SUPERADMIN não pode desativar a própria conta.';
  end if;
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
