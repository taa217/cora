import { useEffect, useState } from 'react'
import ErrorMessage from './ErrorMessage'
import useVoiceAssistant, { VoiceProvider } from '../../hooks/useVoiceAssistant'
import CoraWave, { CoraWaveState } from '../CoraWave'
import CoraLogo from '../CoraLogo'
import ConversationTimer from './ConversationTimer'

const VoiceRecorder = () => {
  const [provider] = useState<VoiceProvider>('elevenlabs') // Keep state but remove UI
  const {
    recorder,
    isStreaming,
    connectionError,
    resetConversation,
    isAssistantSpeaking,
  } = useVoiceAssistant(provider)

  const {
    state,
    startRecording,
    stopRecording,
  } = recorder

  const [conversationStartTime, setConversationStartTime] = useState<number | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  // Explicitly handle start to avoid race conditions with state.isRecording
  const handleStart = async () => {
    setIsConnecting(true)
    try {
      await startRecording()
      setConversationStartTime(Date.now())
    } catch (error) {
      console.error('Failed to start conversation:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleReset = () => {
    stopRecording()
    resetConversation()
    setConversationStartTime(null)
  }

  useEffect(() => {
    return () => {
      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl)
      }
    }
  }, [state.audioUrl])

  const waveState: CoraWaveState = state.isRecording
    ? 'listening'
    : isAssistantSpeaking
      ? 'speaking'
      : isStreaming
        ? 'thinking'
        : 'idle'

  const statusCopy = isConnecting ? 'Connecting to Cora...' : ''

  const hasStarted = conversationStartTime !== null

  return (
    <section className="glass-effect relative overflow-hidden rounded-[36px] p-6 sm:p-10 min-h-[600px] flex flex-col w-full max-w-md md:max-w-3xl lg:max-w-4xl transition-all duration-500">
      <div className="absolute inset-0 opacity-30 blur-3xl pointer-events-none">
        <div className="h-1/2 w-1/2 bg-[radial-gradient(circle,_rgba(46,196,182,0.35)_0%,_transparent_70%)]" />
      </div>

      {/* Header */}
      <div className="relative flex items-center justify-between w-full h-16 z-10">
        <div className="flex-shrink-0">
          <CoraLogo />
        </div>

        {/* Timer on the right side to avoid overlap */}
        <div className="flex-shrink-0">
          <ConversationTimer startTime={conversationStartTime} />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center gap-8 py-12">
        {(state.error || connectionError) && (
          <ErrorMessage message={connectionError || state.error!} />
        )}

        <div className="flex flex-col items-center gap-6">
          <CoraWave state={waveState} size="lg" />
          {statusCopy && (
            <p className="text-sm text-brand-ivory/70 animate-pulse">{statusCopy}</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="relative flex justify-center pt-4 border-t border-brand-ivory/10 h-20 items-center">
        {!hasStarted && !isConnecting && (
          <button
            onClick={handleStart}
            className="group flex items-center gap-2 px-6 py-3 text-xs uppercase tracking-[0.2em] text-brand-ivory/80 hover:text-brand-ivory transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 transition-transform group-hover:scale-110"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            Begin Conversation
          </button>
        )}

        {hasStarted && (
          <button
            onClick={handleReset}
            className="group flex items-center gap-2 px-6 py-3 text-xs uppercase tracking-[0.2em] text-brand-coral/80 hover:text-brand-coral transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 transition-transform group-hover:rotate-180"
            >
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
            End Conversation
          </button>
        )}
      </div>
    </section>
  )
}

export default VoiceRecorder
