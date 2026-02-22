import { useEffect, useState } from 'react'
import { useAuth } from '@workos-inc/authkit-react'
import ErrorMessage from './ErrorMessage'
import useVoiceAssistant, { VoiceProvider } from '../../hooks/useVoiceAssistant'
import { useTrialTimer } from '../../hooks/useTrialTimer'
import CoraWave, { CoraWaveState } from '../CoraWave'
import CoraLogo from '../CoraLogo'
import ConversationTimer from './ConversationTimer'
import AuthGateOverlay from '../AuthGateOverlay'

const VoiceRecorder = () => {
  const [provider] = useState<VoiceProvider>('elevenlabs') // Keep state but remove UI
  const { user, signIn, signOut } = useAuth()
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

  const hasStarted = conversationStartTime !== null

  // Trial timer — only ticks for unauthenticated users while conversing
  const { remainingSeconds, trialExpired } = useTrialTimer({
    isConversing: hasStarted,
    isAuthenticated: !!user,
    onExpire: () => {
      stopRecording()
      resetConversation()
      setConversationStartTime(null)
    },
  })

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

        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Auth section */}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-brand-ivory/50 hidden sm:inline">
                {user.firstName ?? user.email}
              </span>
              <button
                onClick={() => signOut()}
                className="text-[11px] uppercase tracking-widest text-brand-ivory/40 hover:text-brand-coral/80 transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn()}
              className="flex items-center gap-2 px-4 py-1.5 text-[11px] uppercase tracking-widest text-brand-teal/90 hover:text-brand-teal border border-brand-teal/20 hover:border-brand-teal/40 rounded-full transition-all duration-200 hover:bg-brand-teal/5"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Sign In
            </button>
          )}

          {/* Trial countdown for guests */}
          {!user && hasStarted && !trialExpired && (
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-brand-ivory/30">
                Trial
              </span>
              <span className={`font-mono text-sm ${remainingSeconds <= 5 ? 'text-brand-coral animate-pulse' : 'text-brand-ivory/60'}`}>
                {remainingSeconds}s
              </span>
            </div>
          )}

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

      {/* Auth Gate Overlay */}
      {trialExpired && !user && <AuthGateOverlay />}
    </section>
  )
}

export default VoiceRecorder
