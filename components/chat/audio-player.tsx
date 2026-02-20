'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Play, Pause } from 'lucide-react'

interface AudioPlayerProps {
    src: string
    duration?: number
    isOwn: boolean
}

// Global ref to track the currently playing audio
let currentlyPlaying: HTMLAudioElement | null = null

export function AudioPlayer({ src, duration: initialDuration, isOwn }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(initialDuration || 0)
    const [playbackRate, setPlaybackRate] = useState(1)

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const onLoaded = () => {
            if (audio.duration && isFinite(audio.duration)) {
                setDuration(audio.duration)
            }
        }
        const onTimeUpdate = () => setCurrentTime(audio.currentTime)
        const onEnded = () => {
            setIsPlaying(false)
            setCurrentTime(0)
            currentlyPlaying = null
        }

        audio.addEventListener('loadedmetadata', onLoaded)
        audio.addEventListener('timeupdate', onTimeUpdate)
        audio.addEventListener('ended', onEnded)

        return () => {
            audio.removeEventListener('loadedmetadata', onLoaded)
            audio.removeEventListener('timeupdate', onTimeUpdate)
            audio.removeEventListener('ended', onEnded)
        }
    }, [])

    const togglePlay = useCallback(() => {
        const audio = audioRef.current
        if (!audio) return

        if (isPlaying) {
            audio.pause()
            setIsPlaying(false)
            currentlyPlaying = null
        } else {
            // Pause any currently playing audio
            if (currentlyPlaying && currentlyPlaying !== audio) {
                currentlyPlaying.pause()
                currentlyPlaying.dispatchEvent(new Event('pause'))
            }
            audio.play()
            setIsPlaying(true)
            currentlyPlaying = audio
        }
    }, [isPlaying])

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current
        if (!audio) return
        const time = parseFloat(e.target.value)
        audio.currentTime = time
        setCurrentTime(time)
    }

    const cycleSpeed = () => {
        const speeds = [1, 1.5, 2]
        const next = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length]
        setPlaybackRate(next)
        if (audioRef.current) audioRef.current.playbackRate = next
    }

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = Math.floor(seconds % 60)
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    // Listen for external pause events (when another audio starts)
    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return
        const onPause = () => {
            if (currentlyPlaying !== audio) setIsPlaying(false)
        }
        audio.addEventListener('pause', onPause)
        return () => audio.removeEventListener('pause', onPause)
    }, [])

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0
    const accentColor = isOwn ? '#2563eb' : '#3b82f6'

    return (
        <div className="flex items-center gap-2 min-w-[200px]">
            <audio ref={audioRef} src={src} preload="metadata" />

            {/* Play/Pause Button */}
            <button
                onClick={togglePlay}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                style={{ backgroundColor: accentColor, color: '#fff' }}
            >
                {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
            </button>

            {/* Progress Bar */}
            <div className="flex-1 flex flex-col gap-0.5">
                <input
                    type="range"
                    min={0}
                    max={duration || 1}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1 rounded-full appearance-none cursor-pointer"
                    style={{
                        background: `linear-gradient(to right, ${accentColor} ${progress}%, #ccc ${progress}%)`,
                    }}
                />
                <div className="flex justify-between text-[10px] opacity-70">
                    <span>{isPlaying ? formatTime(currentTime) : formatTime(duration)}</span>
                    <button onClick={cycleSpeed} className="font-medium hover:opacity-80">
                        {playbackRate}x
                    </button>
                </div>
            </div>
        </div>
    )
}
