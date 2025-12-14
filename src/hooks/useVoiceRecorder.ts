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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const finalTranscriptRef = useRef('')

  const startRecording = useCallback(async () => {
    try {
      // Check for browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio recording')
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioUrl = URL.createObjectURL(audioBlob)

        setState((prev) => ({
          ...prev,
          audioBlob,
          audioUrl,
          isRecording: false,
          isPaused: false,
        }))

        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()

      // Set up Speech Recognition if available
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition
        const recognition = new SpeechRecognition()

        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'

        // Reset final transcript ref on start
        finalTranscriptRef.current = ''

        recognition.onresult = (event) => {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = null
          }

          let interimTranscript = ''
          let hasFinal = false

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscriptRef.current += transcript + ' '
              hasFinal = true
            } else {
              interimTranscript += transcript
            }
          }

          setState((prev) => ({
            ...prev,
            transcript: finalTranscriptRef.current + interimTranscript,
          }))

          if (hasFinal && onSpeechEnd) {
            silenceTimerRef.current = setTimeout(() => {
              onSpeechEnd()
            }, silenceDuration)
          }
        }

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error)
          // Don't throw error for recognition failures, just log
        }

        recognition.onend = () => {
          // Restart recognition if still recording
          if (state.isRecording && !state.isPaused) {
            try {
              recognition.start()
            } catch (e) {
              // Ignore restart errors
            }
          }
        }

        recognitionRef.current = recognition
        recognition.start()
      }

      setState((prev) => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        error: null,
      }))
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to start recording'
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isRecording: false,
      }))
    }
  }, [state.isRecording, state.isPaused, onSpeechEnd, silenceDuration])

  const stopRecording = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }

    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop()
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    setState((prev) => ({
      ...prev,
      isRecording: false,
      isPaused: false,
    }))
  }, [state.isRecording])

  const pauseRecording = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }

    if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
      mediaRecorderRef.current.pause()

      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }

      setState((prev) => ({
        ...prev,
        isPaused: true,
      }))
    }
  }, [state.isRecording, state.isPaused])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isPaused) {
      mediaRecorderRef.current.resume()

      // Recreate speech recognition if it was stopped
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        // Stop any existing recognition first
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop()
          } catch (e) {
            // Ignore
          }
        }

        const SpeechRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition
        const recognition = new SpeechRecognition()

        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'

        recognition.onresult = (event) => {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = null
          }

          let interimTranscript = ''
          let hasFinal = false

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscriptRef.current += transcript + ' '
              hasFinal = true
            } else {
              interimTranscript += transcript
            }
          }

          setState((prev) => ({
            ...prev,
            transcript: finalTranscriptRef.current + interimTranscript,
          }))

          if (hasFinal && onSpeechEnd) {
            silenceTimerRef.current = setTimeout(() => {
              onSpeechEnd()
            }, silenceDuration)
          }
        }

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error)
        }

        recognition.onend = () => {
          // Restart recognition if still recording and not paused
          setState((current) => {
            if (current.isRecording && !current.isPaused && recognitionRef.current) {
              try {
                recognitionRef.current.start()
              } catch (e) {
                // Ignore restart errors
              }
            }
            return current
          })
        }

        recognitionRef.current = recognition
        try {
          recognition.start()
        } catch (e) {
          console.error('Failed to start recognition on resume:', e)
        }
      }

      setState((prev) => ({
        ...prev,
        isPaused: false,
      }))
    }
  }, [state.isPaused, onSpeechEnd, silenceDuration])

  const clearRecording = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl)
    }

    finalTranscriptRef.current = ''

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
    finalTranscriptRef.current = ''
    setState((prev) => ({
      ...prev,
      transcript: '',
    }))
    // Note: We don't restart recognition here, we just clear our accumulated text.
    // New results will come in with new resultIndex.
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
