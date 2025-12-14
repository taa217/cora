import { ChatMessage } from '../../types/voice'

interface MessageBubbleProps {
  message: ChatMessage
  onReplayVoice?: (audioUrl: string) => void
}

const MessageBubble = ({ message, onReplayVoice }: MessageBubbleProps) => {
  const isAssistant = message.role === 'assistant'

  return (
    <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm md:text-base leading-relaxed shadow-lg ${
          isAssistant
            ? 'bg-white/10 text-white border border-white/20'
            : 'bg-primary-500/90 text-white border border-primary-400/40'
        } ${message.isStreaming ? 'animate-pulse-slow' : ''}`}
      >
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="font-semibold text-xs uppercase tracking-wide opacity-70">
            {isAssistant ? 'Companion' : 'You'}
          </p>
          {isAssistant && message.audioUrl && (
            <button
              onClick={() => onReplayVoice?.(message.audioUrl!)}
              className="text-[10px] tracking-wide uppercase text-white/70 hover:text-white transition-colors"
            >
              Replay voice
            </button>
          )}
        </div>
        <p>{message.content}</p>
      </div>
    </div>
  )
}

export default MessageBubble

