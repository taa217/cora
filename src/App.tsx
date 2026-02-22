import VoiceRecorder from './components/VoiceRecorder/VoiceRecorder'

function App() {
  return (
    <div className="min-h-screen bg-brand-midnight text-brand-ivory">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-10 md:px-6 lg:py-16">
        <VoiceRecorder />
      </div>
    </div>
  )
}

export default App
