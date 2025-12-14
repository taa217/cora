import CoraMark from './CoraMark'
import CoraLogotype from './CoraLogotype'

interface CoraLogoProps {
  compact?: boolean
  className?: string
}

const CoraLogo = ({ compact = false, className = '' }: CoraLogoProps) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <CoraMark size={compact ? 36 : 48} />
      {!compact && <CoraLogotype className="w-28 sm:w-32" />}
    </div>
  )
}

export default CoraLogo


