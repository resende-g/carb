-- Substitui public.dashboard_metrics de forma compatível: mantém a assinatura, a autorização
-- e as demais chaves, e passa a expor a distribuição de reações por emoji em reactions_by_post.
-- Contrato de reactions_by_post: uma linha por post_id (chave única post_id), incluindo
-- publicações sem reação; total = heart + point + skull + dance; a janela filtra
-- reactions.updated_at, como já ocorria em reactions; ordenação total desc, title, post_id.
create or replace function public.dashboard_metrics(p_days integer default null)
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
      select jsonb_agg(jsonb_build_object(
        'post_id', grouped.post_id,
        'title', grouped.title,
        'total', grouped.total,
        'heart', grouped.heart,
        'point', grouped.point,
        'skull', grouped.skull,
        'dance', grouped.dance
      ) order by grouped.total desc, grouped.title, grouped.post_id)
      from (
        select p.id post_id, p.title,
          count(r.id)::int total,
          count(r.id) filter (where r.reaction = 'heart')::int heart,
          count(r.id) filter (where r.reaction = 'point')::int point,
          count(r.id) filter (where r.reaction = 'skull')::int skull,
          count(r.id) filter (where r.reaction = 'dance')::int dance
        from public.posts p left join public.reactions r on r.post_id = p.id and (v_since is null or r.updated_at >= v_since)
        where private.can_moderate() or private.can_view_editorial_profile(p.content_profile_id)
        group by p.id, p.title
      ) grouped
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

comment on function public.dashboard_metrics(integer) is
  'Métricas do painel. reactions_by_post: uma linha por post_id, total = heart + point + skull + dance, janela sobre reactions.updated_at, publicações sem reação incluídas.';
