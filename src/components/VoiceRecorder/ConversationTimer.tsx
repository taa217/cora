import { useEffect, useState } from 'react'

interface ConversationTimerProps {
    startTime: number | null
}

const ConversationTimer = ({ startTime }: ConversationTimerProps) => {
    const [elapsed, setElapsed] = useState(0)

    useEffect(() => {
        if (!startTime) {
            setElapsed(0)
            return
        }

        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTime) / 1000))
        }, 1000)

        return () => clearInterval(interval)
    }, [startTime])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div className="flex flex-col items-center">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-ivory/40">
                Duration
            </span>
            <span className="font-mono text-xl text-brand-ivory/90">
                {formatTime(elapsed)}
            </span>
        </div>
    )
}

export default ConversationTimer
