interface RecordingButtonProps {
  isRecording: boolean
  isPaused: boolean
  onStart: () => void
  onStop: () => void
  onPause: () => void
  onResume: () => void
}

const Glyph = ({ variant }: { variant: 'wave' | 'pause' | 'resume' | 'stop' }) => {
  const common = {
    className: 'h-5 w-5',
    viewBox: '0 0 48 48',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 3,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (variant) {
    case 'pause':
      return (
        <svg {...common}>
          <line x1="16" y1="12" x2="16" y2="36" />
          <line x1="32" y1="12" x2="32" y2="36" />
        </svg>
      )
    case 'resume':
      return (
        <svg {...common}>
          <path d="M18 12l16 12-16 12z" />
        </svg>
      )
    case 'stop':
      return (
        <svg {...common}>
          <rect x="16" y="16" width="16" height="16" rx="4" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <path d="M6 24c6-12 12 12 18 0s12-12 18 0" />
        </svg>
      )
  }
}

const baseButton =
  'inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.4em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'

const RecordingButton = ({
  isRecording,
  isPaused,
  onStart,
  onStop,
  onPause,
  onResume,
}: RecordingButtonProps) => {
  if (isRecording) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={isPaused ? onResume : onPause}
          className={`${baseButton} bg-white/10 text-brand-ivory/80 hover:bg-white/20`}
          aria-label={isPaused ? 'Resume recording' : 'Pause recording'}
        >
          <Glyph variant={isPaused ? 'resume' : 'pause'} />
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button
          onClick={onStop}
          className={`${baseButton} bg-brand-coral text-brand-midnight hover:brightness-105`}
          aria-label="Stop recording"
        >
          <Glyph variant="stop" />
          Stop
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={onStart}
      className={`${baseButton} button-primary !px-10 !py-4 text-brand-midnight`}
      aria-label="Start recording"
    >
      <Glyph variant="wave" />
      Begin Listening
    </button>
  )
}

export default RecordingButton


