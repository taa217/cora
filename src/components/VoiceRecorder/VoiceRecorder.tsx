import { useEffect, useMemo, useState } from 'react'
import RecordingButton from './RecordingButton'
import ErrorMessage from './ErrorMessage'
import useVoiceAssistant from '../../hooks/useVoiceAssistant'
import CoraWave, { CoraWaveState } from '../CoraWave'
import CoraLogo from '../CoraLogo'

const VoiceRecorder = () => {
  const {
    recorder,
    messages,
    isStreaming,
    connectionError,
    resetConversation,
    isAssistantSpeaking,
  } = useVoiceAssistant()

  const {
    state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  } = recorder

  const [showTranscript, setShowTranscript] = useState(false)

  useEffect(() => {
    return () => {
      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl)
      }
    }
  }, [state.audioUrl])

  const liveTranscript = state.transcript.trim()
  const recentMessages = useMemo(
    () => messages.slice(-4),
    [messages],
  )

  const waveState: CoraWaveState = state.isRecording
    ? 'listening'
    : isAssistantSpeaking
      ? 'speaking'
      : isStreaming
        ? 'thinking'
        : 'idle'

  const statusCopy = state.isRecording
    ? state.isPaused
      ? 'Listening paused'
      : 'Listening to your tone'
    : isStreaming
      ? 'Thinking through your request'
      : isAssistantSpeaking
        ? 'Cora is speaking back'
        : 'Tap below and let Cora listen'

  return (
    <section className="glass-effect relative overflow-hidden rounded-[36px] p-6 sm:p-10">
      <div className="absolute inset-0 opacity-30 blur-3xl pointer-events-none">
        <div className="h-1/2 w-1/2 bg-[radial-gradient(circle,_rgba(46,196,182,0.35)_0%,_transparent_70%)]" />
      </div>
      <div className="relative space-y-8">
        <div className="flex items-center justify-between gap-4">
          <CoraLogo />
          <button
            onClick={resetConversation}
            className="text-xs uppercase tracking-[0.4em] text-brand-ivory/60 hover:text-brand-ivory transition"
          >
            Reset
          </button>
        </div>

        {(state.error || connectionError) && (
          <ErrorMessage message={connectionError || state.error!} />
        )}

        <div className="flex flex-col items-center gap-5">
          <CoraWave state={waveState} size="lg" />
          <p className="text-sm text-brand-ivory/70">{statusCopy}</p>
          <RecordingButton
            isRecording={state.isRecording}
            isPaused={state.isPaused}
            onStart={startRecording}
            onStop={stopRecording}
            onPause={pauseRecording}
            onResume={resumeRecording}
          />
        </div>

        {/* Transcript section - always reserves space */}
        <div className="space-y-3 min-h-[120px]">
          {/* Toggle button */}
          {(recentMessages.length > 0 || liveTranscript) && (
            <div className="flex justify-center">
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="text-xs uppercase tracking-[0.3em] text-brand-ivory/50 hover:text-brand-ivory/80 transition flex items-center gap-2"
              >
                <span>{showTranscript ? 'Hide' : 'Show'} conversation</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="14"
                  height="14"
                  className={`transition-transform ${showTranscript ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          )}

          {/* Transcript content - fades in/out smoothly */}
          <div
            className={`transform transition-all duration-500 ease-out ${showTranscript
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 -translate-y-2 pointer-events-none'
              }`}
          >
            {recentMessages.map((message, index) => {
              const depth = recentMessages.length || 1
              const opacity = 0.45 + ((index + 1) / depth) * 0.55

              return (
                <p
                  key={message.id}
                  className="transcript-line text-lg"
                  data-role={message.role}
                  style={{ opacity }}
                >
                  {message.content || '...'}
                  {message.role === 'assistant' && <span className="text-brand-coral"> —</span>}
                </p>
              )
            })}
            {liveTranscript && (
              <p
                className="transcript-line text-lg"
                data-role="user"
              >
                {liveTranscript}
                <span className="ml-2 text-sm uppercase tracking-[0.4em] text-brand-ivory/40">Live</span>
              </p>
            )}
            {!recentMessages.length && !liveTranscript && (
              <p className="text-brand-ivory/40 italic text-center">
                Speak naturally—your words appear here.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default VoiceRecorder
