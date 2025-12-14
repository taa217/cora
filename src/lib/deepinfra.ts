export interface TtsOptions {
  text: string
  format?: 'mp3' | 'wav' | 'opus' | 'flac' | 'pcm'
  voice?: string | string[]
  temperature?: number
  maxAudioLengthMs?: number
  signal?: AbortSignal
}

const base64ToArrayBuffer = (base64: string) => {
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

export const synthesizeSpeech = async ({
  text,
  format = 'wav',
  voice = 'none',
  temperature = 0.6,
  maxAudioLengthMs = 60000,
  signal,
}: TtsOptions): Promise<{ audioUrl: string; blob: Blob }> => {
  const apiKey = import.meta.env.VITE_DEEPINFRA_API_KEY
  const modelId = import.meta.env.VITE_DEEPINFRA_MODEL_ID

  if (!apiKey) {
    throw new Error('Missing DeepInfra API key. Please set VITE_DEEPINFRA_API_KEY.')
  }

  if (!modelId) {
    throw new Error('Missing DeepInfra model id. Please set VITE_DEEPINFRA_MODEL_ID.')
  }

  // Workaround for TTS models that cut off the last word:
  // Append extra punctuation to generate trailing silence
  const paddedText = text.trimEnd().endsWith('.') || text.trimEnd().endsWith('!') || text.trimEnd().endsWith('?')
    ? text + ' '
    : text + '. '

  const body = {
    text: paddedText,
    tts_response_format: format,
    sesame_tts_voice: voice,
    temperature,
    stream: false,
    max_audio_length_ms: maxAudioLengthMs,
  }

  const response = await fetch(`https://api.deepinfra.com/v1/inference/${modelId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `DeepInfra TTS failed (${response.status}): ${errorText || response.statusText}`,
    )
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const payload = await response.json()
    const audioBase64 =
      payload?.output?.[0] ??
      payload?.output ??
      payload?.results?.[0]?.audio ??
      payload?.audio

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      throw new Error('DeepInfra response did not include audio data.')
    }

    const buffer = base64ToArrayBuffer(audioBase64.replace(/^data:audio\/\w+;base64,/, ''))
    const blob = new Blob([buffer], { type: `audio/${format}` })
    const audioUrl = URL.createObjectURL(blob)
    return { audioUrl, blob }
  }

  const blob = await response.blob()
  const audioUrl = URL.createObjectURL(
    blob.type ? blob : new Blob([await blob.arrayBuffer()], { type: `audio/${format}` }),
  )
  return { audioUrl, blob }
}

