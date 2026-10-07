/** Server-only Tavus gateway. Never import this from browser code. */
import type { Env } from '../../worker'

const TAVUS_API_URL = 'https://tavusapi.com/v2'

export type TavusOperation =
  | 'list-replicas'
  | 'create-persona'
  | 'create-conversation'
  | 'get-conversation'
  | 'end-conversation'

export async function callTavus(
  env: Pick<Env, 'TAVUS_API_KEY'>,
  operation: TavusOperation,
  params: Record<string, unknown> = {},
): Promise<unknown> {
  if (!env.TAVUS_API_KEY) throw new Error('Tavus is not configured')

  let method = 'POST'
  let path = ''
  let body: string | undefined

  switch (operation) {
    case 'list-replicas': {
      method = 'GET'
      const query = new URLSearchParams()
      if (typeof params.replica_type === 'string') query.set('replica_type', params.replica_type)
      if (typeof params.limit === 'number') query.set('limit', String(params.limit))
      path = `/replicas${query.size ? `?${query}` : ''}`
      break
    }
    case 'create-persona':
      path = '/personas'
      body = JSON.stringify(params)
      break
    case 'create-conversation':
      path = '/conversations'
      body = JSON.stringify(params)
      break
    case 'get-conversation': {
      method = 'GET'
      const id = typeof params.conversation_id === 'string' ? params.conversation_id : ''
      if (!id) throw new Error('Missing conversation_id')
      path = `/conversations/${encodeURIComponent(id)}?verbose=true`
      break
    }
    case 'end-conversation': {
      const id = typeof params.conversation_id === 'string' ? params.conversation_id : ''
      if (!id) throw new Error('Missing conversation_id')
      path = `/conversations/${encodeURIComponent(id)}/end`
      body = JSON.stringify({})
      break
    }
  }

  const response = await fetch(`${TAVUS_API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-api-key': env.TAVUS_API_KEY },
    body,
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) : {}
  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message : typeof data?.error === 'string' ? data.error : `Tavus request failed (HTTP ${response.status})`
    throw new Error(message)
  }
  return data
}
