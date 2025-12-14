export type CoraWaveState = 'idle' | 'listening' | 'thinking' | 'speaking'

interface CoraWaveProps {
  state?: CoraWaveState
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap: Record<NonNullable<CoraWaveProps['size']>, number> = {
  sm: 96,
  md: 144,
  lg: 208,
}

const CoraWave = ({ state = 'idle', size = 'md', className = '' }: CoraWaveProps) => {
  const dimension = sizeMap[size]

  return (
    <div
      className={`cora-wave ${className}`}
      data-state={state}
      style={{ width: dimension, height: dimension }}
    >
      <div className="cora-wave__halo" aria-hidden />
      <div className="cora-wave__ring" aria-hidden />
      <span className="cora-wave__spark" aria-hidden />
    </div>
  )
}

export default CoraWave




