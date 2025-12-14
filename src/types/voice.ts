export interface VoiceRecorderState {
  isRecording: boolean
  isPaused: boolean
  audioBlob: Blob | null
  audioUrl: string | null
  transcript: string
  error: string | null
}

export interface VoiceRecorderHook {
  state: VoiceRecorderState
  startRecording: () => Promise<void>
  stopRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  clearRecording: () => void
  playAudio: () => void
  stopAudio: () => void
  resetTranscript: () => void
}

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  timestamp: number
  isStreaming?: boolean
  isError?: boolean
  audioUrl?: string
}

export type ChatCompletionMessageParam = {
  role: 'system' | 'user' | 'assistant'
  content: string
}


