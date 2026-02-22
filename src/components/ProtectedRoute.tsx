import { useAuth } from '@workos-inc/authkit-react'
import { useEffect } from 'react'
import CoraWave from './CoraWave'

interface ProtectedRouteProps {
    children: React.ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const { isLoading, user, signIn } = useAuth()

    useEffect(() => {
        if (!isLoading && !user) {
            signIn()
        }
    }, [isLoading, user, signIn])

    if (isLoading || !user) {
        return (
            <div className="min-h-screen bg-brand-midnight flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <CoraWave state="thinking" size="md" />
                    <p className="text-brand-ivory/60 text-sm tracking-widest uppercase animate-pulse">
                        Authenticating...
                    </p>
                </div>
            </div>
        )
    }

    return <>{children}</>
}

export default ProtectedRoute
