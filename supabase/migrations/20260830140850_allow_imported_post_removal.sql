alter table public.posts
  drop constraint posts_creator_check,
  add constraint posts_creator_check check (
    created_by is not null
    or status in ('PUBLISHED', 'REMOVAL_REQUESTED', 'REMOVED')
  );
