import { useState, useRef, useEffect } from 'react'

interface AudioPlayerProps {
  audioUrl: string
  onPlay: () => void
  onStop: () => void
  onClear: () => void
}

const AudioPlayer = ({ audioUrl, onPlay, onStop, onClear }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio(audioUrl)
    audioRef.current = audio

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
      audio.pause()
    }
  }, [audioUrl])

  const handlePlayPause = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      onStop()
    } else {
      audioRef.current.play()
      onPlay()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return
    const newTime = parseFloat(e.target.value)
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 space-y-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-brand-ivory/60">
        <span>Captured audio</span>
        <span>{formatTime(duration)}</span>
      </div>

      <div>
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="w-full accent-brand-teal"
        />
        <div className="mt-1 flex justify-between text-xs text-brand-ivory/60">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={handlePlayPause}
          className="button-secondary flex-1 flex items-center justify-center gap-2"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? 'Pause playback' : 'Preview voice'}
        </button>
        <button
          onClick={onClear}
          className="button-secondary px-4"
          aria-label="Clear recording"
        >
          Clear
        </button>
      </div>
    </div>
  )
}

export default AudioPlayer


