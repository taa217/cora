export const speakText = (text: string) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null
  }

  const trimmed = text.trim()
  if (!trimmed) {
    return null
  }

  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(trimmed)
  utterance.rate = 1.02
  utterance.pitch = 1
  utterance.volume = 1

  window.speechSynthesis.speak(utterance)
  return utterance
}

export const stopSpeaking = () => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }

  window.speechSynthesis.cancel()
}





