import type { Notice } from './data'

export function noticeShareData(notice: Pick<Notice, 'id' | 'title'>, location: Pick<Location, 'origin' | 'pathname'>): ShareData {
  const isSubpage = location.pathname === '/sistemas' || location.pathname === '/planejador' || location.pathname === '/acervo' || location.pathname.startsWith('/admin')
  const basePath = isSubpage ? '/' : location.pathname
  const cleanPath = basePath.endsWith('/') ? basePath : `${basePath}/`
  return {
    title: notice.title,
    text: 'Confira este aviso no Portal CARB.',
    url: `${location.origin}${cleanPath}#aviso-${notice.id}`,
  }
}
