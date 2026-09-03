import type { Hashtag } from './data'

const comparable = (value: string) => value.trim().toLocaleLowerCase('pt-BR')

export function normalizeHashtagName(value: string) {
  return value.trim().replace(/^#+/, '').trim().replace(/\s+/g, ' ')
}

export function hashtagSlug(value: string) {
  return normalizeHashtagName(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const uniqueHashtagIds = (ids: string[]) => [...new Set(ids)]

export function hashtagCatalogErrors(hashtags: Hashtag[]) {
  const duplicates = (field: 'id' | 'name' | 'slug') => hashtags
    .filter((hashtag, index) => hashtags.findIndex((candidate) => comparable(candidate[field]) === comparable(hashtag[field])) !== index)
    .map((hashtag) => `Hashtag ${hashtag.id} repete ${field}.`)
  return [
    ...hashtags.filter((hashtag) => !hashtag.id || !normalizeHashtagName(hashtag.name) || !hashtag.slug).map((hashtag) => `Hashtag ${hashtag.id || 'sem ID'} está incompleta.`),
    ...hashtags.filter((hashtag) => hashtag.slug !== hashtagSlug(hashtag.name)).map((hashtag) => `Hashtag ${hashtag.id} tem slug imprevisível.`),
    ...duplicates('id'),
    ...duplicates('name'),
    ...duplicates('slug'),
  ]
}
