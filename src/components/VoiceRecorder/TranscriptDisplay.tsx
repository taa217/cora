interface TranscriptDisplayProps {
  transcript: string
}

const TranscriptDisplay = ({ transcript }: TranscriptDisplayProps) => {
  return (
    <div className="glass-effect rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-3">
        <svg
          className="w-5 h-5 text-primary-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="text-white font-semibold text-lg">Transcript</h3>
      </div>
      <p className="text-white/90 leading-relaxed min-h-[60px]">
        {transcript || (
          <span className="text-white/50 italic">No transcript yet...</span>
        )}
      </p>
    </div>
  )
}

export default TranscriptDisplay


