import { useCallback, useEffect, useRef, useState } from 'react'
import useVoiceRecorder from './useVoiceRecorder'
import { useElevenLabs } from './useElevenLabs'
import { ChatCompletionMessageParam, ChatMessage } from '../types/voice'
import { streamOpenAIResponse, synthesizeSpeechOpenAI } from '../lib/openai'
import { speakText, stopSpeaking } from '../utils/speech'
import { AudioQueue, extractCompleteSentences } from '../utils/audioQueue'

export type VoiceProvider = 'openai' | 'elevenlabs'

const SYSTEM_PROMPT =
  "You are Cora, a friendly and concise real-time voice companion. Keep answers under three sentences, use a warm and proactive tone, and finish with a brief, helpful suggestion for next steps whenever it makes sense."

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

const initialAssistantMessage: ChatMessage = {
  id: createId(),
  role: 'assistant',
  content:
    "Hey there! I'm your Voice Companion. Tap \"Start Recording\", talk to me naturally, and I'll jump in with a quick response.",
  timestamp: Date.now(),
}

const useVoiceAssistant = (provider: VoiceProvider = 'elevenlabs') => {
  // --- Common State ---
  const [messages, setMessages] = useState<ChatMessage[]>([initialAssistantMessage])
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // --- OpenAI Implementation ---
  // Ref to store the sendTranscript function to avoid circular dependency
  const sendTranscriptRef = useRef<() => Promise<void>>(async () => { })
  // Ref to store resumeRecording to avoid stale closure in AudioQueue callback
  const resumeRecordingRef = useRef<() => void>(() => { })

  const handleSpeechEnd = useCallback(() => {
    if (provider === 'openai') {
      sendTranscriptRef.current()
    }
  }, [provider])

  const openAIRecorder = useVoiceRecorder({ onSpeechEnd: handleSpeechEnd })
  const [isOpenAIStreaming, setIsOpenAIStreaming] = useState(false)
  const [isOpenAIAssistantSpeaking, setIsOpenAIAssistantSpeaking] = useState(false)

  const controllerRef = useRef<AbortController | null>(null)
  const latestMessagesRef = useRef<ChatMessage[]>(messages)
  const assistantAudioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRegistryRef = useRef<string[]>([])
  const audioQueueRef = useRef<AudioQueue | null>(null)

  // --- ElevenLabs Implementation ---
  const elevenLabs = useElevenLabs({
    onMessage: (message) => {
      setMessages((prev) => [...prev, message])
    },
    onError: (error) => {
      setConnectionError(error)
    },
  })

  // --- Sync Refs ---
  // Keep resumeRecordingRef in sync with recorder.resumeRecording
  useEffect(() => {
    resumeRecordingRef.current = openAIRecorder.resumeRecording
  }, [openAIRecorder.resumeRecording])

  useEffect(() => {
    latestMessagesRef.current = messages
  }, [messages])

  // --- OpenAI Logic ---
  const cleanupAssistantAudio = useCallback(() => {
    assistantAudioRef.current?.pause()
    assistantAudioRef.current = null
    audioUrlRegistryRef.current.forEach((url) => URL.revokeObjectURL(url))
    audioUrlRegistryRef.current = []
    audioQueueRef.current?.dispose()
    audioQueueRef.current = null
    stopSpeaking()
    setIsOpenAIAssistantSpeaking(false)
  }, [])

  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
      cleanupAssistantAudio()
    }
  }, [cleanupAssistantAudio])

  const playAssistantAudio = useCallback((audioUrl: string) => {
    if (!audioUrl) return
    assistantAudioRef.current?.pause()
    const audio = new Audio(audioUrl)
    const settle = () => {
      // Add a small delay before cutting off to ensure the last word finishes
      setTimeout(() => {
        setIsOpenAIAssistantSpeaking(false)
        // Resume recording after assistant finishes speaking
        openAIRecorder.resumeRecording()
      }, 500)
    }
    audio.onplay = () => setIsOpenAIAssistantSpeaking(true)
    audio.onended = settle
    audio.onpause = settle
    audio.onerror = settle
    assistantAudioRef.current = audio
    audio.play().catch((error) => {
      settle()
      console.warn('Failed to play assistant audio', error)
    })
  }, [openAIRecorder])

  const resetConversation = useCallback(() => {
    setMessages([initialAssistantMessage])
    latestMessagesRef.current = [initialAssistantMessage]
    setConnectionError(null)

    if (provider === 'openai') {
      openAIRecorder.clearRecording()
      cleanupAssistantAudio()
    } else {
      elevenLabs.stop()
    }
  }, [provider, openAIRecorder, cleanupAssistantAudio, elevenLabs])

  const sendTranscript = useCallback(async () => {
    const transcript = openAIRecorder.state.transcript.trim()
    if (!transcript || isOpenAIStreaming) {
      return
    }

    const userMessage: ChatMessage = {
      id: createId(),
      role: 'user',
      content: transcript,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    latestMessagesRef.current = [...latestMessagesRef.current, userMessage]
    setConnectionError(null)

    // Pause recording while processing and speaking
    openAIRecorder.pauseRecording()
    openAIRecorder.resetTranscript()

    stopSpeaking()
    setIsOpenAIAssistantSpeaking(false)

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    const recentMessages = latestMessagesRef.current.slice(-8)

    const payloadMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...recentMessages.map(({ role, content }) => ({ role, content })),
    ]

    const assistantMessageId = createId()
    const placeholder: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
      isError: false,
    }

    setMessages((prev) => [...prev, placeholder])
    latestMessagesRef.current = [...latestMessagesRef.current, placeholder]
    setIsOpenAIStreaming(true)

    let aggregated = ''
    let sentenceBuffer = ''
    let ttsHasFailed = false
    const pendingTtsPromises: Promise<void>[] = []

    // Create audio queue for this response
    const audioQueue = new AudioQueue({
      onPlayStart: () => setIsOpenAIAssistantSpeaking(true),
      onPlayEnd: () => {
        setIsOpenAIAssistantSpeaking(false)
        setTimeout(() => resumeRecordingRef.current(), 300)
      },
      onError: (error) => console.warn('Audio queue error:', error),
    })
    audioQueueRef.current = audioQueue

    // Helper to synthesize a sentence and add to queue
    const synthesizeSentence = async (sentence: string) => {
      if (ttsHasFailed || !sentence.trim()) return
      try {
        const { audioUrl } = await synthesizeSpeechOpenAI({ text: sentence })
        audioQueue.enqueue(audioUrl)
      } catch (error) {
        console.error('OpenAI TTS error for sentence:', error)
        ttsHasFailed = true
      }
    }

    try {
      const finalText = await streamOpenAIResponse({
        messages: payloadMessages,
        signal: controller.signal,
        onToken: (token) => {
          aggregated += token
          sentenceBuffer += token

          // Update UI with streamed text
          setMessages((prev) => {
            const next = prev.map((message) =>
              message.id === assistantMessageId ? { ...message, content: aggregated } : message,
            )
            latestMessagesRef.current = next
            return next
          })

          // Check for complete sentences and synthesize them in parallel
          const { sentences, remainder } = extractCompleteSentences(sentenceBuffer)
          if (sentences.length > 0) {
            sentences.forEach((sentence) => {
              pendingTtsPromises.push(synthesizeSentence(sentence))
            })
            sentenceBuffer = remainder
          }
        },
      })

      // Handle any remaining text that didn't end with punctuation
      if (sentenceBuffer.trim()) {
        pendingTtsPromises.push(synthesizeSentence(sentenceBuffer))
      }

      // Wait for all TTS to complete before finishing
      await Promise.all(pendingTtsPromises)

      // Mark audio queue as finalized - no more audio will be added
      // This triggers onPlayEnd when playback finishes
      audioQueue.finalize()

      // Fallback to browser TTS if DeepInfra failed
      if (ttsHasFailed && audioQueue.idle) {
        const utterance = speakText(finalText)
        if (utterance) {
          setIsOpenAIAssistantSpeaking(true)
          utterance.onend = () => {
            setIsOpenAIAssistantSpeaking(false)
            openAIRecorder.resumeRecording()
          }
          utterance.onerror = () => {
            setIsOpenAIAssistantSpeaking(false)
            openAIRecorder.resumeRecording()
          }
        } else {
          openAIRecorder.resumeRecording()
        }
        setConnectionError(
          'DeepInfra TTS failed. Playing fallback speech while the issue persists.',
        )
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Could not reach OpenAI. Please try again.'

      setConnectionError(errorMessage)
      setMessages((prev) => {
        const next = prev.map((message) =>
          message.id === assistantMessageId
            ? { ...message, content: errorMessage, isStreaming: false, isError: true }
            : message,
        )
        latestMessagesRef.current = next
        return next
      })
      // Resume recording on error so user can try again
      openAIRecorder.resumeRecording()
    } finally {
      setIsOpenAIStreaming(false)
      controllerRef.current = null
      setMessages((prev) => {
        const next = prev.map((message) =>
          message.id === assistantMessageId ? { ...message, isStreaming: false } : message,
        )
        latestMessagesRef.current = next
        return next
      })
    }
  }, [openAIRecorder, isOpenAIStreaming])

  // Update the ref whenever sendTranscript changes
  useEffect(() => {
    sendTranscriptRef.current = sendTranscript
  }, [sendTranscript])

  // --- Unified Interface ---

  // If ElevenLabs is active, we map its state to the recorder interface
  // so the UI can stay mostly the same.
  const activeRecorder = provider === 'elevenlabs' ? {
    state: {
      isRecording: elevenLabs.isRecording,
      isPaused: false, // ElevenLabs handles this differently, but for UI we can say not paused
      audioBlob: null,
      audioUrl: null,
      transcript: '', // ElevenLabs doesn't expose partial transcript easily in the same way, or we can map it
      error: null,
    },
    startRecording: elevenLabs.start,
    stopRecording: elevenLabs.stop,
    pauseRecording: () => { }, // Not implemented for ElevenLabs in this demo
    resumeRecording: () => { }, // Not implemented
    clearRecording: () => { },
    resetTranscript: () => { },
  } : openAIRecorder

  return {
    recorder: activeRecorder,
    messages: provider === 'elevenlabs' ? elevenLabs.messages : messages,
    isStreaming: provider === 'elevenlabs' ? elevenLabs.isSpeaking : isOpenAIStreaming,
    connectionError,
    resetConversation,
    sendTranscript: provider === 'elevenlabs' ? async () => { } : sendTranscript,
    replayAssistantAudio: playAssistantAudio,
    isAssistantSpeaking: provider === 'elevenlabs' ? elevenLabs.isSpeaking : isOpenAIAssistantSpeaking,
  }
}

export default useVoiceAssistant
