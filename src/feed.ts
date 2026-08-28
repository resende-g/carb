import type { Notice, Profile, Tag } from './data'

export type NoticeFilters = { query: string; profile: string; tag: string }

const normalize = (value: string) => value.trim().toLocaleLowerCase('pt-BR')

export function filterNotices(notices: Notice[], profiles: Profile[], tags: Tag[], filters: NoticeFilters) {
  const search = normalize(filters.query)
  return notices.filter((notice) => {
    const profile = profiles.find((item) => item.handle === notice.author)
    const noticeTags = tags.filter((tag) => notice.tagIds.includes(tag.id))
    return (!filters.profile || notice.author === filters.profile)
      && (!filters.tag || notice.tagIds.includes(filters.tag))
      && (!search || [notice.title, notice.text, notice.category, profile?.name || '', notice.author, ...noticeTags.map((tag) => tag.name)].some((value) => normalize(value).includes(search)))
  })
}

export function removeTag(tags: Tag[], notices: Notice[], tagId: string) {
  const affected = notices.filter((notice) => notice.tagIds.includes(tagId)).length
  return {
    tags: tags.filter((tag) => tag.id !== tagId),
    notices: notices.map((notice) => notice.tagIds.includes(tagId) ? { ...notice, tagIds: notice.tagIds.filter((id) => id !== tagId) } : notice),
    affected,
  }
}

export function dataIntegrityErrors(profiles: Profile[], tags: Tag[], notices: Notice[]) {
  const profileIds = new Set(profiles.map((profile) => profile.handle))
  const tagById = new Map(tags.map((tag) => [tag.id, tag]))
  return [
    ...tags.filter((tag) => !profileIds.has(tag.profile)).map((tag) => `Tag ${tag.id} sem perfil válido.`),
    ...notices.flatMap((notice) => {
      if (!profileIds.has(notice.author)) return [`Publicação ${notice.id} sem autor válido.`]
      return notice.tagIds.flatMap((tagId) => {
        const tag = tagById.get(tagId)
        if (!tag) return [`Publicação ${notice.id} usa tag inexistente ${tagId}.`]
        return tag.profile === notice.author ? [] : [`Tag ${tagId} não pertence a @${notice.author}.`]
      })
    }),
  ]
}
