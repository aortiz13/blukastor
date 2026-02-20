'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Trash2, Send, Mic, Square, Play, Pause } from 'lucide-react'

interface AudioRecorderProps {
    onSend: (blob: Blob, durationSeconds: number) => void
    onCancel: () => void
}

type RecorderPhase = 'recording' | 'preview'

export function AudioRecorder({ onSend, onCancel }: AudioRecorderProps) {
    const [phase, setPhase] = useState<RecorderPhase>('recording')
    const [elapsed, setElapsed] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [playProgress, setPlayProgress] = useState(0)

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const audioBlobRef = useRef<Blob | null>(null)
    const audioUrlRef = useRef<string | null>(null)
    const audioElRef = useRef<HTMLAudioElement | null>(null)
    const animFrameRef = useRef<number | null>(null)

    // --- Recording ---
    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            streamRef.current = stream

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/mp4')
                    ? 'audio/mp4'
                    : 'audio/webm'

            const recorder = new MediaRecorder(stream, { mimeType })
            mediaRecorderRef.current = recorder
            chunksRef.current = []

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }

            recorder.start()

            timerRef.current = setInterval(() => {
                setElapsed((prev) => prev + 1)
            }, 1000)
        } catch (err) {
            console.error('Microphone access denied:', err)
            onCancel()
        }
    }, [onCancel])

    useEffect(() => {
        startRecording()
        return () => {
            cleanupAll()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // --- Stop recording → enter preview ---
    const stopRecording = () => {
        const recorder = mediaRecorderRef.current
        if (!recorder || recorder.state === 'inactive') return

        recorder.onstop = () => {
            const mimeType = recorder.mimeType || 'audio/webm'
            const blob = new Blob(chunksRef.current, { type: mimeType })
            audioBlobRef.current = blob
            audioUrlRef.current = URL.createObjectURL(blob)

            // Create an Audio element for preview playback
            const audio = new Audio(audioUrlRef.current)
            audioElRef.current = audio

            audio.onended = () => {
                setIsPlaying(false)
                setPlayProgress(0)
            }

            // Stop mic stream
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop())
            }
            if (timerRef.current) clearInterval(timerRef.current)

            setPhase('preview')
        }
        recorder.stop()
    }

    // --- Preview playback ---
    const togglePlay = () => {
        const audio = audioElRef.current
        if (!audio) return

        if (isPlaying) {
            audio.pause()
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
            setIsPlaying(false)
        } else {
            audio.play()
            setIsPlaying(true)
            trackProgress()
        }
    }

    const trackProgress = () => {
        const audio = audioElRef.current
        if (!audio) return

        const update = () => {
            if (audio.duration && audio.duration > 0) {
                setPlayProgress(audio.currentTime / audio.duration)
            }
            if (!audio.paused && !audio.ended) {
                animFrameRef.current = requestAnimationFrame(update)
            }
        }
        animFrameRef.current = requestAnimationFrame(update)
    }

    const seekAudio = (e: React.MouseEvent<HTMLDivElement>) => {
        const audio = audioElRef.current
        if (!audio || !audio.duration) return

        const rect = e.currentTarget.getBoundingClientRect()
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        audio.currentTime = ratio * audio.duration
        setPlayProgress(ratio)
    }

    // --- Send / Discard ---
    const handleSend = () => {
        if (audioBlobRef.current) {
            onSend(audioBlobRef.current, elapsed)
        }
        cleanupAll()
    }

    const handleDiscard = () => {
        cleanupAll()
        onCancel()
    }

    const cleanupAll = () => {
        if (timerRef.current) clearInterval(timerRef.current)
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop())
        }
        if (audioElRef.current) {
            audioElRef.current.pause()
            audioElRef.current = null
        }
        if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current)
        }
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current)
        }
        const recorder = mediaRecorderRef.current
        if (recorder && recorder.state !== 'inactive') {
            recorder.onstop = null
            recorder.stop()
        }
    }

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    // ===================== RECORDING UI =====================
    if (phase === 'recording') {
        return (
            <div className="flex items-center gap-3 px-4 py-3 bg-white border-t w-full animate-in fade-in duration-200">
                {/* Cancel / Delete */}
                <button
                    onClick={handleDiscard}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-red-50 hover:bg-red-100 transition-colors text-red-500"
                    title="Cancelar grabación"
                >
                    <Trash2 size={18} />
                </button>

                {/* Recording indicator + timer */}
                <div className="flex-1 flex items-center justify-center gap-3">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                    </span>
                    <span className="text-sm font-mono text-gray-700 tabular-nums">
                        {formatTime(elapsed)}
                    </span>
                    <Mic size={16} className="text-red-500 animate-pulse" />
                </div>

                {/* Stop recording → go to preview */}
                <button
                    onClick={stopRecording}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-700 transition-colors text-white"
                    title="Detener grabación"
                >
                    <Square size={16} fill="currentColor" />
                </button>
            </div>
        )
    }

    // ===================== PREVIEW UI =====================
    return (
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-t w-full animate-in fade-in duration-200">
            {/* Delete recording */}
            <button
                onClick={handleDiscard}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-red-50 hover:bg-red-100 transition-colors text-red-500 flex-shrink-0"
                title="Borrar audio"
            >
                <Trash2 size={18} />
            </button>

            {/* Play / Pause */}
            <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 transition-colors text-white flex-shrink-0"
                title={isPlaying ? 'Pausar' : 'Reproducir'}
            >
                {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
            </button>

            {/* Waveform / progress bar + time */}
            <div className="flex-1 flex items-center gap-2.5 min-w-0">
                <div
                    className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer relative overflow-hidden"
                    onClick={seekAudio}
                >
                    <div
                        className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-[width] duration-75"
                        style={{ width: `${playProgress * 100}%` }}
                    />
                    {/* Seek handle */}
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-blue-600 rounded-full shadow-sm border-2 border-white transition-[left] duration-75"
                        style={{ left: `calc(${playProgress * 100}% - 7px)` }}
                    />
                </div>

                <span className="text-xs font-mono text-gray-500 tabular-nums flex-shrink-0 w-9 text-right">
                    {formatTime(elapsed)}
                </span>
            </div>

            {/* Send */}
            <button
                onClick={handleSend}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 transition-colors text-white flex-shrink-0"
                title="Enviar audio"
            >
                <Send size={16} className="ml-0.5" />
            </button>
        </div>
    )
}
