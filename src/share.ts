import type { Notice } from './data'

export function noticeShareData(notice: Pick<Notice, 'id' | 'title'>, location: Pick<Location, 'origin' | 'pathname'>): ShareData {
  return {
    title: notice.title,
    text: 'Confira este aviso no Portal CARB.',
    url: `${location.origin}${location.pathname}#aviso-${notice.id}`,
  }
}
