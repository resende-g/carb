import type { Hashtag, Notice, Profile } from './data'
import { hashtagCatalogErrors, uniqueHashtagIds } from './hashtags'

export type NoticeFilters = { query: string; profile: string; hashtag: string }

const normalize = (value: string) => value.trim().toLocaleLowerCase('pt-BR')

export function filterNotices(notices: Notice[], profiles: Profile[], hashtags: Hashtag[], filters: NoticeFilters) {
  const search = normalize(filters.query)
  return notices.filter((notice) => {
    const profile = profiles.find((item) => item.handle === notice.author)
    const noticeHashtags = hashtags.filter((hashtag) => notice.hashtagIds.includes(hashtag.id))
    return (!filters.profile || notice.author === filters.profile)
      && (!filters.hashtag || notice.hashtagIds.includes(filters.hashtag))
      && (!search || [notice.title, notice.text, notice.category, profile?.name || '', notice.author, ...noticeHashtags.map((hashtag) => hashtag.name)].some((value) => normalize(value).includes(search)))
  })
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
