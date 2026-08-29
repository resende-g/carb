import type { Hashtag, Notice, Profile } from './data'
import { hashtagCatalogErrors, uniqueHashtagIds } from './hashtags'

export type NoticeFilters = { query: string; profile: string }

const normalize = (value: string) => value.trim().toLocaleLowerCase('pt-BR')

export function filterNotices(notices: Notice[], profiles: Profile[], hashtags: Hashtag[], filters: NoticeFilters) {
  const search = normalize(filters.query)
  return notices.filter((notice) => {
    const profile = profiles.find((item) => item.handle === notice.author)
    const noticeHashtags = hashtags.filter((hashtag) => notice.hashtagIds.includes(hashtag.id))
    return (!filters.profile || notice.author === filters.profile)
      && (!search || [notice.title, notice.text, notice.category, profile?.name || '', notice.author, ...noticeHashtags.flatMap((hashtag) => [hashtag.name, `#${hashtag.name}`, `#${hashtag.slug}`])].some((value) => normalize(value).includes(search)))
  })
}

export function recentPostingProfiles(notices: Notice[], profiles: Profile[], limit = 5) {
  const profileByHandle = new Map(profiles.map((profile) => [profile.handle, profile]))
  const seen = new Set<string>()
  return notices.flatMap((notice) => {
    if (seen.has(notice.author)) return []
    seen.add(notice.author)
    const profile = profileByHandle.get(notice.author)
    return profile ? [profile] : []
  }).slice(0, limit)
}

export function trendingHashtags(notices: Notice[], hashtags: Hashtag[], postLimit = 10, resultLimit = 5) {
  const hashtagById = new Map(hashtags.map((hashtag) => [hashtag.id, hashtag]))
  const counts = new Map<string, { count: number; firstSeen: number }>()
  notices.slice(0, postLimit).forEach((notice, postIndex) => uniqueHashtagIds(notice.hashtagIds).forEach((id) => {
    if (!hashtagById.has(id)) return
    const current = counts.get(id)
    counts.set(id, { count: (current?.count || 0) + 1, firstSeen: current?.firstSeen ?? postIndex })
  }))
  return [...counts].sort(([, first], [, second]) => second.count - first.count || first.firstSeen - second.firstSeen)
    .slice(0, resultLimit)
    .map(([id, metric]) => ({ hashtag: hashtagById.get(id) as Hashtag, count: metric.count }))
}

export function removeHashtag(hashtags: Hashtag[], notices: Notice[], hashtagId: string) {
  const affected = notices.filter((notice) => notice.hashtagIds.includes(hashtagId)).length
  return {
    hashtags: hashtags.filter((hashtag) => hashtag.id !== hashtagId),
    notices: notices.map((notice) => notice.hashtagIds.includes(hashtagId) ? { ...notice, hashtagIds: notice.hashtagIds.filter((id) => id !== hashtagId) } : notice),
    affected,
  }
}

export function dataIntegrityErrors(profiles: Profile[], hashtags: Hashtag[], notices: Notice[]) {
  const profileIds = new Set(profiles.map((profile) => profile.handle))
  const hashtagIds = new Set(hashtags.map((hashtag) => hashtag.id))
  return [
    ...hashtagCatalogErrors(hashtags),
    ...notices.flatMap((notice) => {
      const authorErrors = profileIds.has(notice.author) ? [] : [`Publicação ${notice.id} sem autor válido.`]
      const invalid = notice.hashtagIds.filter((id) => !hashtagIds.has(id)).map((id) => `Publicação ${notice.id} usa hashtag inexistente ${id}.`)
      const duplicateErrors = notice.hashtagIds.length === uniqueHashtagIds(notice.hashtagIds).length ? [] : [`Publicação ${notice.id} repete hashtags.`]
      return [...authorErrors, ...invalid, ...duplicateErrors]
    }),
  ]
}
