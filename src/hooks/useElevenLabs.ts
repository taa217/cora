import { useConversation } from '@elevenlabs/react'
import { useCallback, useState } from 'react'
import { ChatMessage } from '../types/voice'

export const useElevenLabs = ({
    onMessage,
    onError,
}: {
    onMessage?: (message: ChatMessage) => void
    onError?: (error: string) => void
} = {}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [isRecording, setIsRecording] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)

    const conversation = useConversation({
        onConnect: () => {
            console.log('[ElevenLabs] Connected')
            setIsRecording(true)
        },
        onDisconnect: () => {
            console.log('[ElevenLabs] Disconnected')
            setIsRecording(false)
            setIsSpeaking(false)
        },
        onMessage: (message) => {
            // Map ElevenLabs message to our ChatMessage format if needed
            // The SDK returns { source: 'user' | 'ai', message: string }
            const role = message.source === 'user' ? 'user' : 'assistant'
            const chatMessage: ChatMessage = {
                id: Math.random().toString(36).slice(2),
                role,
                content: message.message,
                timestamp: Date.now(),
            }

            setMessages((prev) => [...prev, chatMessage])
            onMessage?.(chatMessage)
        },
        onError: (error) => {
            console.error('[ElevenLabs] Error:', error)
            onError?.(typeof error === 'string' ? error : 'An error occurred with ElevenLabs')
            setIsRecording(false)
        },
        onModeChange: (mode) => {
            setIsSpeaking(mode.mode === 'speaking')
        },
    })

    const startConversation = useCallback(async () => {
        try {
            const agentId = import.meta.env.ELEVENLABS_API
            if (!agentId) {
                throw new Error('Missing ELEVENLABS_API in .env file. Please ensure you have an Agent ID configured.')
            }

            // Request microphone access first
            await navigator.mediaDevices.getUserMedia({ audio: true })

            await conversation.startSession({
                agentId: agentId,
            })
        } catch (error) {
            console.error('[ElevenLabs] Failed to start:', error)
            onError?.(error instanceof Error ? error.message : 'Failed to access microphone or start session')
        }
    }, [conversation, onError])

    const stopConversation = useCallback(async () => {
        await conversation.endSession()
    }, [conversation])

    return {
        start: startConversation,
        stop: stopConversation,
        isRecording,
        isSpeaking,
        messages,
        status: conversation.status,
    }
}
