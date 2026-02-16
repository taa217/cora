import { CartesiaClient } from '@cartesia/cartesia-js'
import { useCallback, useRef, useState } from 'react'
import { ChatMessage, ChatCompletionMessageParam } from '../types/voice'
import { streamOpenAIResponse } from '../lib/openai'

const SYSTEM_PROMPT =
    "You are Cora, a friendly and concise real-time voice companion. Keep answers under three sentences, use a warm and proactive tone, and finish with a brief, helpful suggestion for next steps whenever it makes sense."

export const useCartesia = ({
    onMessage,
    onError,
}: {
    onMessage?: (message: ChatMessage) => void
    onError?: (error: string) => void
} = {}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [isRecording, setIsRecording] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')

    const clientRef = useRef<CartesiaClient | null>(null)
    const sttWsRef = useRef<unknown>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const playbackContextRef = useRef<AudioContext | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const processorRef = useRef<ScriptProcessorNode | null>(null)
    const isRecordingRef = useRef(false)
    const isProcessingRef = useRef(false)
    const messagesRef = useRef<ChatMessage[]>([])

    // Keep messages ref in sync
    const updateMessages = useCallback((updater: (prev: ChatMessage[]) => ChatMessage[]) => {
        setMessages((prev) => {
            const next = updater(prev)
            messagesRef.current = next
            return next
        })
    }, [])

    const addMessage = useCallback((source: 'user' | 'agent', text: string) => {
        const role = source === 'user' ? 'user' : 'assistant'
        const chatMessage: ChatMessage = {
            id: Math.random().toString(36).slice(2),
            role,
            content: text,
            timestamp: Date.now(),
        }
        updateMessages((prev) => [...prev, chatMessage])
        onMessage?.(chatMessage)
        return chatMessage
    }, [onMessage, updateMessages])

    // TTS: Convert text to speech using Cartesia Sonic
    const speakText = useCallback(async (text: string) => {
        if (!clientRef.current || !text.trim()) return

        try {
            setIsSpeaking(true)
            console.log('[Cartesia] Speaking:', text)

            // Use CARTESIA_TTS_VOICE_ID if available, otherwise use default "Kira" voice
            // Kira is recommended for conversational agents
            const voiceId = import.meta.env.CARTESIA_TTS_VOICE_ID || '57dcab65-68ac-45a6-8480-6c4c52ec1cd1'

            // Use Cartesia TTS bytes API
            const audioData = await clientRef.current.tts.bytes({
                modelId: 'sonic-2',
                transcript: text,
                voice: {
                    mode: 'id',
                    id: voiceId,
                },
                language: 'en',
                outputFormat: {
                    container: 'wav',
                    sampleRate: 44100,
                    encoding: 'pcm_f32le',
                },
            })

            // Debug: log the response type to understand what the SDK returns
            console.log('[Cartesia] TTS response type:', typeof audioData)
            console.log('[Cartesia] TTS response constructor:', audioData?.constructor?.name)

            // The SDK returns a Uint8Array/Buffer or a stream wrapper
            let arrayBuffer: ArrayBuffer
            if (audioData instanceof ArrayBuffer) {
                arrayBuffer = audioData
            } else if (audioData instanceof Uint8Array) {
                arrayBuffer = (audioData.buffer as ArrayBuffer).slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength)
            } else if (ArrayBuffer.isView(audioData)) {
                // Handle any TypedArray or DataView
                const view = audioData as ArrayBufferView
                arrayBuffer = (view.buffer as ArrayBuffer).slice(view.byteOffset, view.byteOffset + view.byteLength)
            } else if (typeof audioData === 'object' && audioData !== null) {
                // Check for _UndiciStreamWrapper or similar stream wrappers
                const wrapper = audioData as unknown as {
                    readableStream?: ReadableStream<Uint8Array>
                    reader?: ReadableStreamDefaultReader<Uint8Array>
                    buffer?: ArrayBuffer
                    arrayBuffer?: () => Promise<ArrayBuffer>
                    data?: Uint8Array
                }

                if (wrapper.reader || wrapper.readableStream instanceof ReadableStream) {
                    // Read all chunks from the stream using existing reader or create new one
                    console.log('[Cartesia] Reading from ReadableStream...')
                    const reader = wrapper.reader || wrapper.readableStream!.getReader()
                    const chunks: Uint8Array[] = []

                    while (true) {
                        const { done, value } = await reader.read()
                        if (done) break
                        if (value) chunks.push(value)
                    }

                    // Combine all chunks into one ArrayBuffer
                    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
                    const combined = new Uint8Array(totalLength)
                    let offset = 0
                    for (const chunk of chunks) {
                        combined.set(chunk, offset)
                        offset += chunk.length
                    }
                    arrayBuffer = combined.buffer
                    console.log('[Cartesia] Read', totalLength, 'bytes from stream')
                } else if (wrapper.data instanceof Uint8Array) {
                    arrayBuffer = (wrapper.data.buffer as ArrayBuffer).slice(wrapper.data.byteOffset, wrapper.data.byteOffset + wrapper.data.byteLength)
                } else if (wrapper.buffer instanceof ArrayBuffer) {
                    arrayBuffer = wrapper.buffer
                } else if (typeof wrapper.arrayBuffer === 'function') {
                    arrayBuffer = await wrapper.arrayBuffer()
                } else {
                    console.error('[Cartesia] Unable to handle TTS response:', audioData)
                    throw new Error('Unexpected response format from Cartesia TTS')
                }
            } else {
                throw new Error('Unexpected response format from Cartesia TTS')
            }

            if (!playbackContextRef.current) {
                playbackContextRef.current = new AudioContext()
            }

            const audioBuffer = await playbackContextRef.current.decodeAudioData(arrayBuffer.slice(0))
            const source = playbackContextRef.current.createBufferSource()
            source.buffer = audioBuffer
            source.connect(playbackContextRef.current.destination)

            source.onended = () => {
                setIsSpeaking(false)
                console.log('[Cartesia] Speech ended')
            }

            source.start()
            console.log('[Cartesia] Audio playback started')
        } catch (error) {
            console.error('[Cartesia] TTS failed:', error)
            setIsSpeaking(false)
        }
    }, [])

    // Speak a queue of sentences sequentially
    const speechQueueRef = useRef<string[]>([])
    const isSpeakingQueueRef = useRef(false)

    const processSpeechQueue = useCallback(async () => {
        if (isSpeakingQueueRef.current) return
        isSpeakingQueueRef.current = true

        while (speechQueueRef.current.length > 0) {
            const sentence = speechQueueRef.current.shift()
            if (sentence) {
                await speakText(sentence)
            }
        }

        isSpeakingQueueRef.current = false
    }, [speakText])

    const queueSpeech = useCallback((text: string) => {
        speechQueueRef.current.push(text)
        processSpeechQueue()
    }, [processSpeechQueue])

    // Process transcript: call LLM and speak response with sentence streaming
    const processTranscript = useCallback(async (transcript: string) => {
        if (isProcessingRef.current) return
        isProcessingRef.current = true

        try {
            // Add user message
            addMessage('user', transcript)

            // Build message history for LLM
            const recentMessages = messagesRef.current.slice(-8)
            const payloadMessages: ChatCompletionMessageParam[] = [
                { role: 'system', content: SYSTEM_PROMPT },
                ...recentMessages.map(({ role, content }) => ({ role, content })),
            ]

            // Call LLM for response with sentence streaming
            console.log('[Cartesia] Getting LLM response...')
            let fullResponse = ''
            let pendingSentence = ''

            // Sentence-ending patterns
            const sentenceEnders = /([.!?])\s+/

            await streamOpenAIResponse({
                messages: payloadMessages,
                onToken: (token) => {
                    fullResponse += token
                    pendingSentence += token

                    // Check if we have a complete sentence
                    const match = pendingSentence.match(sentenceEnders)
                    if (match) {
                        const endIndex = pendingSentence.indexOf(match[0]) + match[1].length
                        const completeSentence = pendingSentence.slice(0, endIndex).trim()
                        pendingSentence = pendingSentence.slice(endIndex)

                        if (completeSentence) {
                            console.log('[Cartesia] Queueing sentence:', completeSentence)
                            queueSpeech(completeSentence)
                        }
                    }
                },
            })

            // Handle any remaining text
            if (pendingSentence.trim()) {
                console.log('[Cartesia] Queueing remaining:', pendingSentence.trim())
                queueSpeech(pendingSentence.trim())
            }

            if (fullResponse) {
                // Add assistant message with full response
                addMessage('agent', fullResponse)
            }
        } catch (error) {
            console.error('[Cartesia] Processing error:', error)
            onError?.(error instanceof Error ? error.message : 'Failed to process transcript')
        } finally {
            isProcessingRef.current = false
        }
    }, [addMessage, queueSpeech, onError])

    const startConversation = useCallback(async () => {
        try {
            const agentId = import.meta.env.CARTESIA_VOICE_ID
            const apiKey = import.meta.env.CARTESIA_API_KEY

            if (!agentId) {
                throw new Error('Missing CARTESIA_VOICE_ID in .env file. Please ensure you have an Agent ID configured.')
            }

            if (!apiKey) {
                throw new Error('Missing CARTESIA_API_KEY in .env file. Please ensure you have an API key configured.')
            }

            setStatus('connecting')
            console.log('[Cartesia] Connecting...')

            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            })
            streamRef.current = stream

            // Initialize Cartesia client
            const client = new CartesiaClient({ apiKey })
            clientRef.current = client

            // Create STT WebSocket connection
            const sttWs = client.stt.websocket({
                model: 'ink-whisper',
                language: 'en',
                encoding: 'pcm_s16le',
                sampleRate: 16000,
            })
            sttWsRef.current = sttWs

            // Handle incoming transcripts
            sttWs.onMessage((result: { type: string; isFinal?: boolean; text?: string }) => {
                if (result.type === 'transcript' && result.isFinal && result.text?.trim()) {
                    console.log('[Cartesia] Transcript:', result.text)
                    // Process the transcript through LLM and TTS
                    processTranscript(result.text)
                }
            })

            // Start audio processing
            audioContextRef.current = new AudioContext({ sampleRate: 16000 })
            const source = audioContextRef.current.createMediaStreamSource(stream)
            const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1)
            processorRef.current = processor

            processor.onaudioprocess = (e) => {
                if (!isRecordingRef.current) return

                const inputData = e.inputBuffer.getChannelData(0)
                // Convert float32 to int16
                const int16Data = new Int16Array(inputData.length)
                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]))
                    int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
                }

                sttWs.send(int16Data.buffer).catch(console.error)
            }

            source.connect(processor)
            processor.connect(audioContextRef.current.destination)

            isRecordingRef.current = true
            setStatus('connected')
            setIsRecording(true)
            console.log('[Cartesia] Connected')

        } catch (error) {
            console.error('[Cartesia] Failed to start:', error)
            setStatus('disconnected')
            onError?.(error instanceof Error ? error.message : 'Failed to start Cartesia session')
        }
    }, [processTranscript, onError])

    const stopConversation = useCallback(async () => {
        console.log('[Cartesia] Disconnecting...')

        isRecordingRef.current = false

        // Stop media stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }

        // Disconnect processor
        if (processorRef.current) {
            processorRef.current.disconnect()
            processorRef.current = null
        }

        // Close audio contexts
        if (audioContextRef.current) {
            audioContextRef.current.close()
            audioContextRef.current = null
        }

        if (playbackContextRef.current) {
            playbackContextRef.current.close()
            playbackContextRef.current = null
        }

        // Close WebSocket connections
        if (sttWsRef.current && typeof (sttWsRef.current as { disconnect?: () => void }).disconnect === 'function') {
            (sttWsRef.current as { disconnect: () => void }).disconnect()
            sttWsRef.current = null
        }

        clientRef.current = null
        setIsRecording(false)
        setIsSpeaking(false)
        setStatus('disconnected')
        console.log('[Cartesia] Disconnected')
    }, [])

    return {
        start: startConversation,
        stop: stopConversation,
        isRecording,
        isSpeaking,
        messages,
        status,
    }
}
