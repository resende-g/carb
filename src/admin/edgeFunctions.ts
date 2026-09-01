import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js'

type EdgePayload = Record<string, unknown>

const unsafeMessage = /(?:service[_ -]?role|authorization|bearer\s|access[_ -]?token|refresh[_ -]?token|secret|stack(?:trace)?|sqlstate|postgres|relation\s+[^ ]+|column\s+[^ ]+|at\s+\w+\s*\()/i

export function safeEdgeMessage(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  const message = value.replace(/\s+/g, ' ').trim()
  if (!message || message.length > 240 || unsafeMessage.test(message)) return fallback
  return message
}

async function httpPayload(error: FunctionsHttpError): Promise<EdgePayload | null> {
  if (!(error.context instanceof Response)) return null
  try {
    const value = await error.context.clone().json()
    return value && typeof value === 'object' && !Array.isArray(value) ? value as EdgePayload : null
  } catch {
    return null
  }
}

export async function edgeFunctionFailure(error: unknown, fallback: string) {
  if (error instanceof FunctionsHttpError) {
    const payload = await httpPayload(error)
    return { message: safeEdgeMessage(payload?.error, fallback), payload }
  }
  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
    return { message: 'O serviço administrativo está temporariamente indisponível.', payload: null }
  }
  return { message: fallback, payload: null }
}

export async function invokeEdge<T extends EdgePayload>(
  invoke: () => Promise<{ data: T | null; error: unknown }>,
  fallback: string,
): Promise<{ data: T | null; error: string | null }> {
  const result = await invoke()
  if (result.error) {
    const failure = await edgeFunctionFailure(result.error, fallback)
    return { data: failure.payload as T | null, error: failure.message }
  }
  if (result.data?.error) return { data: result.data, error: safeEdgeMessage(result.data.error, fallback) }
  return { data: result.data, error: null }
}
