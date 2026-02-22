import { useEffect, useRef, useState } from 'react'

const TRIAL_LIMIT = 20 // seconds
const STORAGE_KEY = 'cora_trial_elapsed'

/**
 * Tracks cumulative conversation time for unauthenticated users.
 * After TRIAL_LIMIT seconds the trial expires.
 * Authenticated users are never limited.
 */
export const useTrialTimer = ({
    isConversing,
    isAuthenticated,
    onExpire,
}: {
    isConversing: boolean
    isAuthenticated: boolean
    onExpire?: () => void
}) => {
    const [elapsedSeconds, setElapsedSeconds] = useState(() => {
        const stored = sessionStorage.getItem(STORAGE_KEY)
        return stored ? parseInt(stored, 10) : 0
    })

    const [trialExpired, setTrialExpired] = useState(() => {
        const stored = sessionStorage.getItem(STORAGE_KEY)
        return stored ? parseInt(stored, 10) >= TRIAL_LIMIT : false
    })

    const onExpireRef = useRef(onExpire)
    onExpireRef.current = onExpire

    // Tick every second while guest is conversing
    useEffect(() => {
        if (isAuthenticated || !isConversing || trialExpired) return

        const interval = setInterval(() => {
            setElapsedSeconds((prev) => {
                const next = prev + 1
                sessionStorage.setItem(STORAGE_KEY, String(next))

                if (next >= TRIAL_LIMIT) {
                    setTrialExpired(true)
                    onExpireRef.current?.()
                }

                return next
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [isAuthenticated, isConversing, trialExpired])

    const remainingSeconds = Math.max(0, TRIAL_LIMIT - elapsedSeconds)

    return {
        elapsedSeconds,
        remainingSeconds,
        trialExpired: isAuthenticated ? false : trialExpired,
        TRIAL_LIMIT,
    }
}
