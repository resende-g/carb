import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { edgeFunctionFailure, invokeEdge, safeEdgeMessage } from './edgeFunctions'

describe('erros seguros de Edge Functions', () => {
  it('recupera a mensagem útil de uma resposta 4xx', async () => {
    const response = new Response(JSON.stringify({ error: 'Conta administrativa inativa ou sem função.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
    const failure = await edgeFunctionFailure(new FunctionsHttpError(response), 'Falha segura.')
    expect(failure.message).toBe('Conta administrativa inativa ou sem função.')
  })

  it('não vaza detalhes internos, tokens ou stack traces', async () => {
    const response = new Response(JSON.stringify({ error: 'service_role token abc stack at handler()' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
    const failure = await edgeFunctionFailure(new FunctionsHttpError(response), 'Falha segura.')
    expect(failure.message).toBe('Falha segura.')
    expect(safeEdgeMessage('relation auth.users does not exist', 'Falha segura.')).toBe('Falha segura.')
  })

  it('usa mensagem genérica para falha de transporte', async () => {
    const failure = await edgeFunctionFailure(new FunctionsFetchError(new Error('token secreto')), 'Falha segura.')
    expect(failure.message).toBe('O serviço administrativo está temporariamente indisponível.')
  })

  it('preserva dados seguros de uma resposta parcial não-2xx', async () => {
    const response = new Response(JSON.stringify({ error: 'Limpeza pendente.', transfer_complete: true }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
    const result = await invokeEdge(async () => ({ data: null, error: new FunctionsHttpError(response) }), 'Falha segura.')
    expect(result.error).toBe('Limpeza pendente.')
    expect(result.data?.transfer_complete).toBe(true)
  })
})
