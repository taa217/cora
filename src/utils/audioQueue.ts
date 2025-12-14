/**
 * AudioQueue - Manages sequential playback of audio chunks for streaming TTS
 * Ensures seamless playback as audio URLs are added asynchronously
 */

export type AudioQueueCallbacks = {
    onPlayStart?: () => void
    onPlayEnd?: () => void
    onError?: (error: Error) => void
}

export class AudioQueue {
    private queue: string[] = []
    private isPlaying = false
    private currentAudio: HTMLAudioElement | null = null
    private callbacks: AudioQueueCallbacks
    private disposed = false
    private hasStarted = false
    private isFinalized = false // Set to true when no more audio will be added

    constructor(callbacks: AudioQueueCallbacks = {}) {
        this.callbacks = callbacks
    }

    /**
     * Add an audio URL to the queue and start playback if not already playing
     */
    enqueue(audioUrl: string): void {
        if (this.disposed) return
        this.queue.push(audioUrl)
        if (!this.isPlaying) {
            this.playNext()
        }
    }

    /**
     * Mark the queue as finalized - no more audio will be added
     * This allows onPlayEnd to be called when the queue empties
     */
    finalize(): void {
        this.isFinalized = true
        // If queue is already empty and not playing, fire onPlayEnd now
        if (!this.isPlaying && this.queue.length === 0 && this.hasStarted) {
            this.callbacks.onPlayEnd?.()
        }
    }

    /**
     * Play the next audio in the queue
     */
    private playNext(): void {
        if (this.disposed || this.queue.length === 0) {
            this.isPlaying = false
            // Only fire onPlayEnd if we've both started and been finalized
            if (this.hasStarted && this.isFinalized) {
                this.callbacks.onPlayEnd?.()
            }
            return
        }

        const audioUrl = this.queue.shift()!
        this.isPlaying = true
        this.hasStarted = true

        const audio = new Audio(audioUrl)
        this.currentAudio = audio

        audio.onplay = () => {
            this.callbacks.onPlayStart?.()
        }

        audio.onended = () => {
            URL.revokeObjectURL(audioUrl)
            this.currentAudio = null
            this.playNext()
        }

        audio.onerror = () => {
            URL.revokeObjectURL(audioUrl)
            this.currentAudio = null
            this.callbacks.onError?.(new Error('Audio playback failed'))
            this.playNext()
        }

        audio.play().catch((error) => {
            URL.revokeObjectURL(audioUrl)
            this.currentAudio = null
            this.callbacks.onError?.(error)
            this.playNext()
        })
    }

    /**
     * Check if the queue is currently playing
     */
    get playing(): boolean {
        return this.isPlaying
    }

    /**
     * Check if the queue is empty and not playing
     */
    get idle(): boolean {
        return !this.isPlaying && this.queue.length === 0
    }

    /**
     * Stop playback and clear the queue
     */
    clear(): void {
        this.currentAudio?.pause()
        this.currentAudio = null
        // Revoke all pending URLs
        this.queue.forEach((url) => URL.revokeObjectURL(url))
        this.queue = []
        this.isPlaying = false
    }

    /**
     * Dispose of the queue (for cleanup)
     */
    dispose(): void {
        this.clear()
        this.disposed = true
    }
}

/**
 * Sentence boundary detection for streaming TTS
 * Returns true if the text ends with a sentence-ending punctuation
 */
export const isSentenceEnd = (text: string): boolean => {
    const trimmed = text.trim()
    // Match common sentence endings, including after quotes
    return /[.!?]["']?\s*$/.test(trimmed)
}

/**
 * Split text into sentences for TTS processing
 */
export const extractCompleteSentences = (
    text: string,
): { sentences: string[]; remainder: string } => {
    // Match sentences ending with . ! ? followed by space or end of string
    // Handle quotes and common abbreviations
    const sentencePattern = /[^.!?]*[.!?]["']?(?=\s|$)/g
    const matches = text.match(sentencePattern)

    if (!matches || matches.length === 0) {
        return { sentences: [], remainder: text }
    }

    const sentences = matches.map((s) => s.trim()).filter((s) => s.length > 0)
    const matchedLength = matches.join('').length
    const remainder = text.slice(matchedLength).trim()

    return { sentences, remainder }
}
