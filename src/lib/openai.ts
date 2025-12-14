import { ChatCompletionMessageParam } from '../types/voice'

interface OpenAIStreamOptions {
  messages: ChatCompletionMessageParam[]
  signal?: AbortSignal
  temperature?: number
  onToken?: (token: string) => void
}

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

export const streamOpenAIResponse = async ({
  messages,
  signal,
  temperature = 0.35,
  onToken,
}: OpenAIStreamOptions): Promise<string> => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  const model = import.meta.env.VITE_OPENAI_MODEL ?? 'gpt-4o-mini'

  if (!apiKey) {
    throw new Error('Missing OpenAI API key. Please set VITE_OPENAI_API_KEY.')
  }

  if (!model) {
    throw new Error('Missing OpenAI model. Please set VITE_OPENAI_MODEL.')
  }

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      temperature,
      messages,
    }),
    signal,
  })

  if (!response.ok || !response.body) {
    const errorText = await response.text()
    throw new Error(
      `OpenAI request failed (${response.status}): ${errorText || response.statusText}`,
    )
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalText = ''

  const processChunk = (chunk: string) => {
    if (!chunk.trim()) {
      return
    }

    if (chunk.startsWith('data:')) {
      const data = chunk.replace(/^data:\s*/, '')

      if (data === '[DONE]') {
        return 'DONE'
      }

      try {
        const payload = JSON.parse(data)
        const delta = payload?.choices?.[0]?.delta?.content ?? ''

        if (delta) {
          finalText += delta
          onToken?.(delta)
        }
      } catch (error) {
        console.warn('Unable to parse OpenAI stream chunk', error)
      }
    }

    return null
  }

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      let boundary = buffer.indexOf('\n\n')
      while (boundary !== -1) {
        const chunk = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)

        const result = processChunk(chunk)
        if (result === 'DONE') {
          reader.cancel().catch(() => { })
          return finalText
        }

        boundary = buffer.indexOf('\n\n')
      }
    }

    if (buffer.length > 0) {
      processChunk(buffer)
    }
  } finally {
    reader.releaseLock()
  }

  return finalText
}

// OpenAI TTS Types
export interface OpenAITtsOptions {
  text: string
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  model?: 'tts-1' | 'tts-1-hd'
  speed?: number
  signal?: AbortSignal
}

const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech'

/**
 * Synthesize speech using OpenAI's TTS API
 * Much faster than DeepInfra (~200-500ms vs 1-3s per sentence)
 */
export const synthesizeSpeechOpenAI = async ({
  text,
  voice = 'alloy',
  model = 'tts-1',
  speed = 1.0,
  signal,
}: OpenAITtsOptions): Promise<{ audioUrl: string; blob: Blob }> => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('Missing OpenAI API key. Please set VITE_OPENAI_API_KEY.')
  }

  const response = await fetch(OPENAI_TTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: text,
      voice,
      speed,
    }),
    signal,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `OpenAI TTS failed (${response.status}): ${errorText || response.statusText}`,
    )
  }

  const blob = await response.blob()
  const audioUrl = URL.createObjectURL(blob)
  return { audioUrl, blob }
}

