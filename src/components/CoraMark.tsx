interface CoraMarkProps {
  size?: number
  className?: string
}

const CoraMark = ({ size = 48, className = '' }: CoraMarkProps) => {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Cora mark"
    >
      <path
        d="M46 18 A18 18 0 1 1 18 40"
        fill="none"
        stroke="#2EC4B6"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="50" cy="16" r="5" fill="#E76F51" />
    </svg>
  )
}

export default CoraMark


