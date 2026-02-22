import { Routes, Route } from 'react-router-dom'
import { useAuth } from '@workos-inc/authkit-react'
import { useEffect } from 'react'
import VoiceRecorder from './components/VoiceRecorder/VoiceRecorder'
import ProtectedRoute from './components/ProtectedRoute'

/** Immediately triggers the WorkOS hosted sign-in flow */
function LoginRedirect() {
  const { signIn } = useAuth()
  useEffect(() => { signIn() }, [signIn])
  return <div className="min-h-screen bg-brand-midnight" />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRedirect />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-brand-midnight text-brand-ivory">
              <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-10 md:px-6 lg:py-16">
                <VoiceRecorder />
              </div>
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
