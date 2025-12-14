interface CoraLogotypeProps {
  className?: string
  tone?: 'ivory' | 'teal' | 'coral'
  title?: string
}

const toneMap: Record<NonNullable<CoraLogotypeProps['tone']>, string> = {
  ivory: '#F4F1DE',
  teal: '#2EC4B6',
  coral: '#E76F51',
}

const CoraLogotype = ({
  className = '',
  tone = 'ivory',
  title = 'Cora',
}: CoraLogotypeProps) => {
  const color = toneMap[tone]

  return (
    <span
      className={`font-display text-3xl tracking-[0.08em] text-[color:var(--brand-ivory)] ${className}`}
      style={{ color }}
      aria-label={title}
    >
      Cora
    </span>
  )
}

export default CoraLogotype


