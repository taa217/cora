import { useAuth } from '@workos-inc/authkit-react'

const AuthGateOverlay = () => {
    const { signIn } = useAuth()

    return (
        <div className="auth-gate-overlay">
            <div className="flex flex-col items-center gap-6 text-center max-w-sm px-4">
                {/* Lock icon */}
                <div className="w-16 h-16 rounded-full border-2 border-brand-teal/40 flex items-center justify-center">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-7 h-7 text-brand-teal"
                    >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                </div>

                <div className="flex flex-col gap-2">
                    <h2 className="text-lg font-semibold text-brand-ivory tracking-wide">
                        Your free preview has ended
                    </h2>
                    <p className="text-sm text-brand-ivory/50 leading-relaxed">
                        Sign in to continue talking with Cora — no time limit.
                    </p>
                </div>

                <button
                    onClick={() => signIn()}
                    className="button-primary mt-2 text-sm tracking-widest uppercase"
                >
                    Sign In to Continue
                </button>
            </div>
        </div>
    )
}

export default AuthGateOverlay
