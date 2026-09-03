export type ReactionsByPost = { post_id: string; title: string; total: number; heart: number; point: number; skull: number; dance: number }
export type Metrics = { window_days: number | null; posts: number; pending_posts: number; approved_posts: number; rejected_posts: number; documents: number; removal_requests: number; reactions: number; reactions_by_post: ReactionsByPost[] }

// As contagens chegam como JSON; a conversão explícita evita comparar string com número na escala das barras.
export const reactionRows = (metrics: Metrics | null): ReactionsByPost[] => (metrics?.reactions_by_post || []).map((item) => ({ ...item, total: Number(item.total), heart: Number(item.heart), point: Number(item.point), skull: Number(item.skull), dance: Number(item.dance) }))
