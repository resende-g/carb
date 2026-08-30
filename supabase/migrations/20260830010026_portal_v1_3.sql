create schema if not exists private;

create type public.app_role as enum ('EDITOR', 'ADMIN', 'SUPERADMIN');
create type public.institutional_office as enum ('COMMUNICATION_DIRECTOR', 'CARB_PRESIDENT', 'TECHNICAL_CUSTODIAN', 'STI_ADMIN');
create type public.post_status as enum ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'REJECTED', 'REMOVAL_REQUESTED', 'REMOVED');
create type public.revision_status as enum ('PENDING_APPROVAL', 'APPROVED', 'REJECTED');
create type public.document_status as enum ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'REMOVED');
create type public.reaction_type as enum ('heart', 'point', 'skull', 'dance');
create type public.removal_request_status as enum ('PENDING', 'APPROVED', 'REJECTED');
create type public.audit_event as enum (
  'LOGIN_SUCCESS', 'LOGIN_FAILED',
  'POST_CREATED', 'POST_UPDATED', 'POST_SUBMITTED', 'POST_APPROVED', 'POST_REJECTED', 'POST_PUBLISHED', 'POST_REMOVAL_REQUESTED', 'POST_REMOVED',
  'DOCUMENT_UPLOADED', 'DOCUMENT_APPROVED', 'DOCUMENT_REJECTED',
  'HASHTAG_CREATED', 'HASHTAG_UPDATED', 'HASHTAG_DISABLED',
  'CONTENT_PROFILE_CREATED', 'CONTENT_PROFILE_UPDATED',
  'ROLE_GRANTED', 'ROLE_REVOKED', 'USER_DISABLED',
  'MFA_RESET_REQUESTED', 'SESSIONS_REVOKED', 'CUSTODY_TRANSFERRED'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  role public.app_role not null,
  office public.institutional_office not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  granted_by uuid references public.profiles (id) on delete set null,
  revoked_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint role_assignments_dates_check check (ends_at is null or ends_at > starts_at),
  constraint role_assignments_active_check check ((active and ends_at is null) or (not active and ends_at is not null)),
  constraint role_assignments_office_role_check check (
    (office = 'COMMUNICATION_DIRECTOR' and role = 'EDITOR')
    or (office = 'CARB_PRESIDENT' and role = 'ADMIN')
    or (office in ('TECHNICAL_CUSTODIAN', 'STI_ADMIN') and role = 'SUPERADMIN')
  )
);

create unique index role_assignments_active_unique
  on public.role_assignments (user_id, role, office)
  where active;

create table public.content_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  avatar_path text,
  description text not null default '' check (char_length(description) <= 500),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_profile_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  content_profile_id uuid not null references public.content_profiles (id) on delete restrict,
  can_publish boolean not null default false,
  active boolean not null default true,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, content_profile_id)
);

create table public.hashtags (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 60),
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  color text not null check (color in ('blue', 'green', 'gold', 'violet', 'red', 'gray')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index hashtags_name_ci_unique on public.hashtags (lower(name));

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  content_profile_id uuid not null references public.content_profiles (id) on delete restrict,
  title text not null check (char_length(trim(title)) between 3 and 180),
  body text not null check (char_length(trim(body)) between 1 and 10000),
  category text not null check (char_length(trim(category)) between 2 and 80),
  status public.post_status not null default 'DRAFT',
  media_path text,
  media_alt text,
  media_mime_type text,
  media_size_bytes bigint,
  created_by uuid references public.profiles (id) on delete restrict,
  submitted_by uuid references public.profiles (id) on delete restrict,
  approved_by uuid references public.profiles (id) on delete restrict,
  rejection_reason text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_media_check check (
    (media_path is null and media_alt is null and media_mime_type is null and media_size_bytes is null)
    or (
      media_path is not null
      and char_length(trim(media_alt)) > 0
      and media_mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')
      and media_size_bytes between 1 and 8388608
    )
  ),
  constraint posts_publication_check check (
    (status = 'PUBLISHED' and published_at is not null)
    or (status <> 'PUBLISHED')
  ),
  constraint posts_creator_check check (created_by is not null or status = 'PUBLISHED')
);

create table public.post_hashtags (
  post_id uuid not null references public.posts (id) on delete cascade,
  hashtag_id uuid not null references public.hashtags (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (post_id, hashtag_id)
);

create table public.post_revisions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete restrict,
  title text not null check (char_length(trim(title)) between 3 and 180),
  body text not null check (char_length(trim(body)) between 1 and 10000),
  category text not null check (char_length(trim(category)) between 2 and 80),
  media_path text,
  media_alt text,
  media_mime_type text,
  media_size_bytes bigint,
  change_summary text not null check (char_length(trim(change_summary)) between 3 and 500),
  status public.revision_status not null default 'PENDING_APPROVAL',
  created_by uuid not null references public.profiles (id) on delete restrict,
  reviewed_by uuid references public.profiles (id) on delete restrict,
  decision_reason text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint post_revisions_media_check check (
    (media_path is null and media_alt is null and media_mime_type is null and media_size_bytes is null)
    or (
      media_path is not null
      and char_length(trim(media_alt)) > 0
      and media_mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')
      and media_size_bytes between 1 and 8388608
    )
  )
);

create table public.post_revision_hashtags (
  revision_id uuid not null references public.post_revisions (id) on delete cascade,
  hashtag_id uuid not null references public.hashtags (id) on delete restrict,
  primary key (revision_id, hashtag_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  content_profile_id uuid not null references public.content_profiles (id) on delete restrict,
  title text not null check (char_length(trim(title)) between 3 and 180),
  description text not null check (char_length(trim(description)) between 3 and 1000),
  storage_path text not null unique,
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  mime_type text not null check (mime_type = 'application/pdf'),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  status public.document_status not null default 'DRAFT',
  created_by uuid not null references public.profiles (id) on delete restrict,
  approved_by uuid references public.profiles (id) on delete restrict,
  decision_reason text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reactions (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts (id) on delete cascade,
  anonymous_id uuid not null,
  reaction public.reaction_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, anonymous_id)
);

create table public.removal_requests (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete restrict,
  requested_by uuid not null references public.profiles (id) on delete restrict,
  justification text not null check (char_length(trim(justification)) between 10 and 1000),
  status public.removal_request_status not null default 'PENDING',
  decided_by uuid references public.profiles (id) on delete restrict,
  decision_reason text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create unique index removal_requests_one_pending_per_post
  on public.removal_requests (post_id)
  where status = 'PENDING';

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.profiles (id) on delete set null,
  event public.audit_event not null,
  entity_type text not null check (char_length(entity_type) between 2 and 80),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index role_assignments_user_active_idx on public.role_assignments (user_id, role) where active;
create index role_assignments_granted_by_idx on public.role_assignments (granted_by);
create index role_assignments_revoked_by_idx on public.role_assignments (revoked_by);
create index content_profile_permissions_user_active_idx on public.content_profile_permissions (user_id, content_profile_id) where active;
create index content_profile_permissions_profile_idx on public.content_profile_permissions (content_profile_id);
create index content_profile_permissions_granted_by_idx on public.content_profile_permissions (granted_by);
create index posts_public_feed_idx on public.posts (published_at desc) where status = 'PUBLISHED';
create index posts_profile_status_idx on public.posts (content_profile_id, status, created_at desc);
create index posts_created_by_idx on public.posts (created_by);
create index posts_submitted_by_idx on public.posts (submitted_by);
create index posts_approved_by_idx on public.posts (approved_by);
create index post_hashtags_hashtag_idx on public.post_hashtags (hashtag_id, post_id);
create index post_revisions_post_status_idx on public.post_revisions (post_id, status, created_at desc);
create unique index post_revisions_one_pending_per_post
  on public.post_revisions (post_id)
  where status = 'PENDING_APPROVAL';
create index post_revisions_created_by_idx on public.post_revisions (created_by);
create index post_revisions_reviewed_by_idx on public.post_revisions (reviewed_by);
create index post_revision_hashtags_hashtag_idx on public.post_revision_hashtags (hashtag_id);
create index documents_profile_status_idx on public.documents (content_profile_id, status, created_at desc);
create index documents_created_by_idx on public.documents (created_by);
create index documents_approved_by_idx on public.documents (approved_by);
create index reactions_post_idx on public.reactions (post_id, updated_at desc);
create index removal_requests_requested_by_idx on public.removal_requests (requested_by);
create index removal_requests_decided_by_idx on public.removal_requests (decided_by);
create index audit_logs_actor_created_idx on public.audit_logs (actor_user_id, created_at desc);
create index audit_logs_entity_created_idx on public.audit_logs (entity_type, entity_id, created_at desc);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger role_assignments_set_updated_at before update on public.role_assignments for each row execute function private.set_updated_at();
create trigger content_profiles_set_updated_at before update on public.content_profiles for each row execute function private.set_updated_at();
create trigger content_profile_permissions_set_updated_at before update on public.content_profile_permissions for each row execute function private.set_updated_at();
create trigger hashtags_set_updated_at before update on public.hashtags for each row execute function private.set_updated_at();
create trigger posts_set_updated_at before update on public.posts for each row execute function private.set_updated_at();
create trigger documents_set_updated_at before update on public.documents for each row execute function private.set_updated_at();
create trigger reactions_set_updated_at before update on public.reactions for each row execute function private.set_updated_at();

comment on table public.profiles is 'Pessoas autenticadas; e-mail e senha permanecem no Supabase Auth.';
comment on table public.content_profiles is 'Identidades públicas de conteúdo; nunca representam contas de acesso.';
comment on table public.reactions is 'Uma reação atual por publicação e identificador aleatório do navegador; não identifica estudantes.';
comment on table public.audit_logs is 'Trilha administrativa append-only, sem senhas, tokens, segredos MFA ou conteúdo integral.';
