import { useCallback, useEffect, useRef, useState } from 'react'
import useVoiceRecorder from './useVoiceRecorder'
import { ChatCompletionMessageParam, ChatMessage } from '../types/voice'
import { streamOpenAIResponse, synthesizeSpeechOpenAI } from '../lib/openai'
import { speakText, stopSpeaking } from '../utils/speech'
import { AudioQueue, extractCompleteSentences } from '../utils/audioQueue'

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

const useVoiceAssistant = () => {
  // Ref to store the sendTranscript function to avoid circular dependency
  const sendTranscriptRef = useRef<() => Promise<void>>(async () => { })
  // Ref to store resumeRecording to avoid stale closure in AudioQueue callback
  const resumeRecordingRef = useRef<() => void>(() => { })

  const handleSpeechEnd = useCallback(() => {
    sendTranscriptRef.current()
  }, [])

  const recorder = useVoiceRecorder({ onSpeechEnd: handleSpeechEnd })
  const [messages, setMessages] = useState<ChatMessage[]>([initialAssistantMessage])
  const [isStreaming, setIsStreaming] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false)

  const controllerRef = useRef<AbortController | null>(null)
  const latestMessagesRef = useRef<ChatMessage[]>(messages)
  const assistantAudioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRegistryRef = useRef<string[]>([])
  const audioQueueRef = useRef<AudioQueue | null>(null)

  // Keep resumeRecordingRef in sync with recorder.resumeRecording
  useEffect(() => {
    resumeRecordingRef.current = recorder.resumeRecording
  }, [recorder.resumeRecording])

  useEffect(() => {
    latestMessagesRef.current = messages
  }, [messages])

  const cleanupAssistantAudio = useCallback(() => {
    assistantAudioRef.current?.pause()
    assistantAudioRef.current = null
    audioUrlRegistryRef.current.forEach((url) => URL.revokeObjectURL(url))
    audioUrlRegistryRef.current = []
    audioQueueRef.current?.dispose()
    audioQueueRef.current = null
    stopSpeaking()
    setIsAssistantSpeaking(false)
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
        setIsAssistantSpeaking(false)
        // Resume recording after assistant finishes speaking
        recorder.resumeRecording()
      }, 500)
    }
    audio.onplay = () => setIsAssistantSpeaking(true)
    audio.onended = settle
    audio.onpause = settle
    audio.onerror = settle
    assistantAudioRef.current = audio
    audio.play().catch((error) => {
      settle()
      console.warn('Failed to play assistant audio', error)
    })
  }, [recorder])

  const resetConversation = useCallback(() => {
    setMessages([initialAssistantMessage])
    latestMessagesRef.current = [initialAssistantMessage]
    setConnectionError(null)
    recorder.clearRecording()
    cleanupAssistantAudio()
  }, [recorder, cleanupAssistantAudio])

  const sendTranscript = useCallback(async () => {
    const transcript = recorder.state.transcript.trim()
    if (!transcript || isStreaming) {
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
    recorder.pauseRecording()
    recorder.resetTranscript()

    stopSpeaking()
    setIsAssistantSpeaking(false)

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
    }

    setMessages((prev) => [...prev, placeholder])
    latestMessagesRef.current = [...latestMessagesRef.current, placeholder]
    setIsStreaming(true)

    let aggregated = ''
    let sentenceBuffer = ''
    let ttsHasFailed = false
    const pendingTtsPromises: Promise<void>[] = []

    // Create audio queue for this response
    const audioQueue = new AudioQueue({
      onPlayStart: () => setIsAssistantSpeaking(true),
      onPlayEnd: () => {
        setIsAssistantSpeaking(false)
        // Resume recording after all audio finishes - use ref to get latest function
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
          setIsAssistantSpeaking(true)
          utterance.onend = () => {
            setIsAssistantSpeaking(false)
            recorder.resumeRecording()
          }
          utterance.onerror = () => {
            setIsAssistantSpeaking(false)
            recorder.resumeRecording()
          }
        } else {
          recorder.resumeRecording()
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
      recorder.resumeRecording()
    } finally {
      setIsStreaming(false)
      controllerRef.current = null
      setMessages((prev) => {
        const next = prev.map((message) =>
          message.id === assistantMessageId ? { ...message, isStreaming: false } : message,
        )
        latestMessagesRef.current = next
        return next
      })
    }
  }, [recorder, isStreaming])

  // Update the ref whenever sendTranscript changes
  useEffect(() => {
    sendTranscriptRef.current = sendTranscript
  }, [sendTranscript])

  return {
    recorder,
    messages,
    isStreaming,
    connectionError,
    resetConversation,
    sendTranscript,
    replayAssistantAudio: playAssistantAudio,
    isAssistantSpeaking,
  }
}

export default useVoiceAssistant
