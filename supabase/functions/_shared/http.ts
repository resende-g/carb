const defaultOrigins = [
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'https://carb.portal-carb-prototipo.workers.dev',
  'https://carb-v1-3.portal-carb-prototipo.workers.dev',
]

export function corsHeaders(request: Request) {
  const origin = request.headers.get('origin') || ''
  const configured = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map((value) => value.trim()).filter(Boolean)
  const allowed = configured.length ? configured : defaultOrigins
  if (origin && !allowed.includes(origin)) throw new Error('Origem não autorizada.')
  return {
    'Access-Control-Allow-Origin': origin || allowed[0],
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

export function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
