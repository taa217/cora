import MessageBubble from './MessageBubble'
import { ChatMessage } from '../../types/voice'

interface ConversationPanelProps {
  messages: ChatMessage[]
  isStreaming: boolean
  onReset: () => void
  onReplayVoice?: (audioUrl: string) => void
}

const ConversationPanel = ({
  messages,
  isStreaming,
  onReset,
  onReplayVoice,
}: ConversationPanelProps) => {
  return (
    <div className="glass-effect rounded-3xl p-6 h-full flex flex-col gap-4 shadow-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-widest text-primary-200/80 font-semibold">
            Live conversation
          </p>
          <h2 className="text-2xl font-bold text-white">Voice Companion</h2>
        </div>
        <button
          onClick={onReset}
          className="text-sm text-white/70 hover:text-white transition-colors underline decoration-dotted"
        >
          Reset
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onReplayVoice={onReplayVoice}
          />
        ))}
      </div>

      {isStreaming && (
        <div className="flex items-center gap-3 text-primary-200/80 text-sm">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-primary-300 rounded-full animate-pulse"></span>
            Companion is responding...
          </span>
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ConversationPanel

