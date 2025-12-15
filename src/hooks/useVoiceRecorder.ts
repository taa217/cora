import { useState, useRef, useCallback, useEffect } from 'react'
import { VoiceRecorderHook, VoiceRecorderState } from '../types/voice'

interface UseVoiceRecorderOptions {
  onSpeechEnd?: () => void
  silenceDuration?: number
}

const useVoiceRecorder = ({
  onSpeechEnd,
  silenceDuration = 1500,
}: UseVoiceRecorderOptions = {}): VoiceRecorderHook => {
  const [state, setState] = useState<VoiceRecorderState>({
    isRecording: false,
    isPaused: false,
    audioBlob: null,
    audioUrl: null,
    transcript: '',
    error: null,
  })

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Stores text from previous recognition sessions (before restarts)
  const committedTranscriptRef = useRef('')
  // Stores text from the current recognition session
  const sessionTranscriptRef = useRef('')

  const isRecordingRef = useRef(false)
  const isPausedRef = useRef(false)

  const startNewRecognition = useCallback(() => {
    // Check for browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      throw new Error('Your browser does not support speech recognition')
    }

    // Stop any existing recognition first
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null // Prevent infinite loop
        recognitionRef.current.stop()
      } catch (e) {
        // Ignore
      }
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    // Mobile Chrome often ignores continuous mode, so we handle restarts manually
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    // Increase maxAlternatives for better accuracy on mobile
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      console.log('[SpeechRecognition] Started')
    }

    recognition.onaudiostart = () => {
      console.log('[SpeechRecognition] Audio capture started')
    }

    recognition.onaudioend = () => {
      console.log('[SpeechRecognition] Audio capture ended')
    }

    recognition.onspeechstart = () => {
      console.log('[SpeechRecognition] Speech detected')
    }

    recognition.onspeechend = () => {
      console.log('[SpeechRecognition] Speech ended')
    }

    recognition.onresult = (event) => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }

      // Rebuild the transcript for the CURRENT session from scratch
      // This avoids duplication issues where Android sends repeated final results
      let newSessionTranscript = ''
      let hasFinal = false

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript
        newSessionTranscript += transcript

        if (result.isFinal) {
          hasFinal = true
          // Add a space after final results if not present
          if (!newSessionTranscript.endsWith(' ')) {
            newSessionTranscript += ' '
          }
        }
      }

      sessionTranscriptRef.current = newSessionTranscript

      setState((prev) => ({
        ...prev,
        transcript: committedTranscriptRef.current + sessionTranscriptRef.current,
      }))

      if (hasFinal && onSpeechEnd) {
        silenceTimerRef.current = setTimeout(() => {
          onSpeechEnd()
        }, silenceDuration)
      }
    }

    recognition.onerror = (event) => {
      console.error('[SpeechRecognition] Error:', event.error, event.message)
      // On mobile, "no-speech" error is common - just restart
      if (event.error === 'no-speech' || event.error === 'audio-capture' || event.error === 'network') {
        // These are recoverable errors, recognition will end and we'll restart
        console.log('[SpeechRecognition] Recoverable error, will restart on onend')
      }
    }

    recognition.onend = () => {
      console.log('[SpeechRecognition] Ended. isRecording:', isRecordingRef.current, 'isPaused:', isPausedRef.current)

      // Commit the session transcript to the permanent store
      if (sessionTranscriptRef.current) {
        committedTranscriptRef.current += sessionTranscriptRef.current
        sessionTranscriptRef.current = ''
      }

      // Restart recognition if still recording - use refs to avoid stale closure
      if (isRecordingRef.current && !isPausedRef.current) {
        // Add a small delay before restarting on mobile to prevent rapid-fire restarts
        setTimeout(() => {
          if (isRecordingRef.current && !isPausedRef.current) {
            try {
              console.log('[SpeechRecognition] Attempting restart with NEW instance...')
              startNewRecognition()
            } catch (e) {
              console.error('[SpeechRecognition] Restart failed:', e)
            }
          }
        }, 100)
      }
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
      console.log('[SpeechRecognition] Instance started')
    } catch (e) {
      console.error('[SpeechRecognition] Start failed:', e)
      throw e
    }
  }, [onSpeechEnd, silenceDuration])

  const startRecording = useCallback(async () => {
    try {
      // Set refs BEFORE starting recognition to prevent race conditions
      isRecordingRef.current = true
      isPausedRef.current = false
      committedTranscriptRef.current = ''
      sessionTranscriptRef.current = ''

      startNewRecognition()

      setState((prev) => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        error: null,
      }))
    } catch (error) {
      console.error('[Recording] Failed to start:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to start recording'
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isRecording: false,
      }))
    }
  }, [startNewRecognition])

  const stopRecording = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }

    if (recognitionRef.current) {
      recognitionRef.current.onend = null // Prevent auto-restart
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    isRecordingRef.current = false
    isPausedRef.current = false
    setState((prev) => ({
      ...prev,
      isRecording: false,
      isPaused: false,
    }))
  }, [])

  const pauseRecording = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }

    if (state.isRecording && !state.isPaused) {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null // Prevent auto-restart
        recognitionRef.current.stop()
      }

      isPausedRef.current = true
      setState((prev) => ({
        ...prev,
        isPaused: true,
      }))
    }
  }, [state.isRecording, state.isPaused])

  const resumeRecording = useCallback(() => {
    if (state.isPaused) {
      isPausedRef.current = false

      // Start a fresh instance
      try {
        startNewRecognition()
      } catch (e) {
        console.error('Failed to resume:', e)
      }

      setState((prev) => ({
        ...prev,
        isPaused: false,
      }))
    }
  }, [state.isPaused, startNewRecognition])

  const clearRecording = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl)
    }

    committedTranscriptRef.current = ''
    sessionTranscriptRef.current = ''

    setState({
      isRecording: false,
      isPaused: false,
      audioBlob: null,
      audioUrl: null,
      transcript: '',
      error: null,
    })
  }, [state.audioUrl])

  const resetTranscript = useCallback(() => {
    committedTranscriptRef.current = ''
    sessionTranscriptRef.current = ''
    setState((prev) => ({
      ...prev,
      transcript: '',
    }))
  }, [])

  const playAudio = useCallback(() => {
    if (state.audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      const audio = new Audio(state.audioUrl)
      audioRef.current = audio
      audio.play()
    }
  }, [state.audioUrl])

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  return {
    state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    resetTranscript,
    playAudio,
    stopAudio,
  }
}

export default useVoiceRecorder
