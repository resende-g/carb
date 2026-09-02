import { createClient } from '@supabase/supabase-js'
import type { DocumentItem, Hashtag, HashtagColor, Notice, Profile, ReactionCounts } from './data'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const supabaseConfigured = Boolean(url && anonKey)
export const supabase = supabaseConfigured ? createClient(url, anonKey) : null
const publicSupabase = supabaseConfigured ? createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }) : null
export const anonymousReactionId = () => {
  const key = 'carb:anonymous-reaction-id'
  const stored = localStorage.getItem(key)
  if (stored) return stored
  const created = crypto.randomUUID()
  localStorage.setItem(key, created)
  return created
}

type ContentProfileRow = { id: string; name: string; slug: string; avatar_path: string | null; description: string }
type HashtagRow = { id: string; name: string; slug: string; color: HashtagColor; active: boolean }
type PostRow = { id: string; content_profile_id: string; title: string; body: string; category: string; media_path: string | null; media_alt: string | null; published_at: string }
type DocumentRow = { id: string; title: string; description: string; storage_path: string; approved_at: string | null; updated_at: string }
type ReactionRow = { post_id: string; heart: number; point: number; skull: number; dance: number; selected: keyof ReactionCounts | null }

export const SIGNED_URL_TTL_SECONDS = 60 * 60
export const PUBLIC_DATA_REFRESH_MS = 50 * 60 * 1000

export async function signedUrl(path: string | null) {
  if (!supabase || !path) return ''
  const { data, error } = await supabase.storage.from('editorial-assets').createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (error) throw error
  return data?.signedUrl || ''
}

export function alignSignedUrls(paths: (string | null)[], signed: { path: string | null; signedUrl: string | null }[]) {
  const byPath = new Map(signed.map(({ path, signedUrl }) => [path, signedUrl || '']))
  return paths.map((path) => path ? byPath.get(path) || '' : '')
}

async function signedUrls(paths: (string | null)[]) {
  if (!publicSupabase) return paths.map(() => '')
  const presentPaths = paths.filter((path): path is string => Boolean(path))
  if (!presentPaths.length) return paths.map(() => '')
  const { data, error } = await publicSupabase.storage.from('editorial-assets').createSignedUrls(presentPaths, SIGNED_URL_TTL_SECONDS)
  if (error) throw error
  return alignSignedUrls(paths, data)
}

export async function loadPublicData(anonymousId: string) {
  if (!publicSupabase) throw new Error('Supabase não configurado.')
  const [profileResult, hashtagResult, postResult, associationResult, documentResult] = await Promise.all([
    publicSupabase.from('content_profiles').select('id,name,slug,avatar_path,description').eq('active', true).order('name'),
    publicSupabase.from('hashtags').select('id,name,slug,color,active').eq('active', true).order('name'),
    publicSupabase.from('posts').select('id,content_profile_id,title,body,category,media_path,media_alt,published_at').eq('status', 'PUBLISHED').order('published_at', { ascending: false }),
    publicSupabase.from('post_hashtags').select('post_id,hashtag_id'),
    publicSupabase.from('documents').select('id,title,description,storage_path,approved_at,updated_at').eq('status', 'APPROVED').order('approved_at', { ascending: false }),
  ])
  const firstError = [profileResult, hashtagResult, postResult, associationResult, documentResult].find((result) => result.error)?.error
  if (firstError) throw firstError

  const profileRows = profileResult.data as ContentProfileRow[]
  const hashtagRows = hashtagResult.data as HashtagRow[]
  const postRows = postResult.data as PostRow[]
  const documentRows = documentResult.data as DocumentRow[]
  const { data: reactionData, error: reactionError } = await publicSupabase.rpc('get_reaction_totals', { p_post_ids: postRows.map(({ id }) => id), p_anonymous_id: anonymousId })
  if (reactionError) throw reactionError

  const profilePaths = profileRows.map(({ avatar_path }) => avatar_path)
  const postPaths = postRows.map(({ media_path }) => media_path)
  const assetUrls = await signedUrls([...profilePaths, ...postPaths, ...documentRows.map(({ storage_path }) => storage_path)])
  const profileAvatars = assetUrls.slice(0, profilePaths.length)
  const postMedia = assetUrls.slice(profilePaths.length, profilePaths.length + postPaths.length)
  const documentUrls = assetUrls.slice(profilePaths.length + postPaths.length)
  const profileById = new Map(profileRows.map((profile) => [profile.id, profile.slug]))
  const hashtagIds = new Map<string, string[]>()
  for (const row of associationResult.data as { post_id: string; hashtag_id: string }[]) hashtagIds.set(row.post_id, [...(hashtagIds.get(row.post_id) || []), row.hashtag_id])
  const reactionsByPost = new Map((reactionData as ReactionRow[]).map((row) => [row.post_id, row]))
  const selectedReactions: Record<string, keyof ReactionCounts> = {}
  const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  const profiles: Profile[] = profileRows.map((profile, index) => ({
    handle: profile.slug,
    name: profile.name,
    shortName: profile.name.slice(0, 2).toLocaleUpperCase('pt-BR'),
    bio: profile.description,
    avatar: profileAvatars[index] || '/og.png',
    avatarPosition: profileAvatars[index] ? 'center' : '30% 76%',
    avatarSize: profileAvatars[index] ? 'cover' : undefined,
  }))
  const hashtags: Hashtag[] = hashtagRows
  const notices: Notice[] = postRows.map((post, index) => {
    const totals = reactionsByPost.get(post.id)
    if (totals?.selected) selectedReactions[post.id] = totals.selected
    const base = { heart: Number(totals?.heart || 0), point: Number(totals?.point || 0), skull: Number(totals?.skull || 0), dance: Number(totals?.dance || 0) }
    if (totals?.selected) base[totals.selected] = Math.max(0, base[totals.selected] - 1)
    return {
      id: post.id,
      title: post.title,
      text: post.body,
      ...(postMedia[index] ? { media: { src: postMedia[index], alt: post.media_alt || '' } } : {}),
      category: post.category,
      date: date.format(new Date(post.published_at)),
      state: 'publicado',
      author: profileById.get(post.content_profile_id) || '',
      hashtagIds: hashtagIds.get(post.id) || [],
      base,
    }
  })
  const documents: DocumentItem[] = documentRows.map((document, index) => ({
    id: document.id,
    title: document.title,
    description: document.description,
    updatedAt: `Aprovado em ${date.format(new Date(document.approved_at || document.updated_at))}`,
    file: documentUrls[index],
  }))
  return { profiles, hashtags, notices, documents, selectedReactions }
}

export async function persistReaction(postId: string, anonymousId: string, reaction: keyof ReactionCounts | null) {
  if (!publicSupabase) return
  const { error } = await publicSupabase.rpc('set_reaction', { p_post_id: postId, p_anonymous_id: anonymousId, p_reaction: reaction })
  if (error) throw error
}
