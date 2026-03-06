'use client'

import { useState, useRef, useCallback } from 'react'
import { api } from '@/client-api/eden'

export type MicState = 'idle' | 'recording' | 'processing'

const SPEECH_THRESHOLD = 10      // RMS above this counts as "user is speaking"
const SILENCE_THRESHOLD = 6      // RMS below this counts as silence
const SILENCE_DURATION_MS = 2000 // 2s of silence after speech → auto-stop
const STARTUP_GRACE_MS = 800     // never auto-stop in the first 0.8s
const NO_SPEECH_TIMEOUT_MS = 12_000 // fallback: stop after 12s even if no speech detected
const MAX_DURATION_MS = 60_000   // hard cap

export function useSpeechRecord(onTranscript: (text: string) => void) {
    const [state, setState] = useState<MicState>('idle')
    const [error, setError] = useState<string | null>(null)

    const recorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const audioCtxRef = useRef<AudioContext | null>(null)
    const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const noSpeechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const rafRef = useRef<number | null>(null)

    const cleanup = useCallback(() => {
        if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null }
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
        if (noSpeechTimerRef.current) { clearTimeout(noSpeechTimerRef.current); noSpeechTimerRef.current = null }
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
        if (audioCtxRef.current) { void audioCtxRef.current.close(); audioCtxRef.current = null }
    }, [])

    const stop = useCallback(() => {
        cleanup()
        const rec = recorderRef.current
        if (rec?.state === 'recording') {
            try { rec.requestData() } catch { /* flush buffer */ }
            rec.stop()
        }
    }, [cleanup])

    const start = useCallback(async () => {
        setError(null)

        let stream: MediaStream
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        } catch {
            setError('Microphone access denied. Please allow microphone permissions.')
            return
        }

        const mimeType =
            ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'].find(
                (t) => MediaRecorder.isTypeSupported(t),
            ) ?? ''

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
        chunksRef.current = []

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data)
        }

        recorder.onstop = async () => {
            cleanup()
            stream.getTracks().forEach((t) => t.stop())

            const totalSize = chunksRef.current.reduce((s, b) => s + b.size, 0)
            // Not enough audio captured — skip silently
            if (totalSize < 800) {
                setState('idle')
                return
            }

            setState('processing')
            try {
                const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })

                // Use FileReader to get data URL (includes MIME prefix the backend uses for format detection)
                const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = () => resolve(reader.result as string)
                    reader.onerror = reject
                    reader.readAsDataURL(blob)
                })

                const { data } = await api['speech-to-text'].post({ audio: dataUrl })

                if (data && 'transcript' in data && (data as { transcript?: string }).transcript) {
                    onTranscript((data as { transcript: string }).transcript)
                }
                // Silently ignore API errors — no transcript = just do nothing
            } catch {
                // Network or unexpected error — silently ignore
            } finally {
                setState('idle')
            }
        }

        // ── Voice-activity-aware silence detection ──
        try {
            const audioCtx = new AudioContext()
            audioCtxRef.current = audioCtx
            const source = audioCtx.createMediaStreamSource(stream)
            const analyser = audioCtx.createAnalyser()
            analyser.fftSize = 512
            source.connect(analyser)
            const freqData = new Uint8Array(analyser.frequencyBinCount)

            let speechEverDetected = false
            const startedAt = Date.now()

            const tick = () => {
                if (recorder.state !== 'recording') return
                analyser.getByteFrequencyData(freqData)
                const rms = Math.sqrt(freqData.reduce((s, v) => s + v * v, 0) / freqData.length)
                const elapsed = Date.now() - startedAt

                // Mark speech detected once voice is heard
                if (rms > SPEECH_THRESHOLD) {
                    speechEverDetected = true
                    // Cancel any pending silence timer when speech resumes
                    if (silenceTimerRef.current) {
                        clearTimeout(silenceTimerRef.current)
                        silenceTimerRef.current = null
                    }
                }

                // Only auto-stop after grace period AND after speech was heard
                if (elapsed > STARTUP_GRACE_MS && speechEverDetected && rms < SILENCE_THRESHOLD) {
                    if (!silenceTimerRef.current) {
                        silenceTimerRef.current = setTimeout(() => {
                            if (recorder.state === 'recording') {
                                try { recorder.requestData() } catch { /* flush */ }
                                recorder.stop()
                            }
                        }, SILENCE_DURATION_MS)
                    }
                } else if (rms >= SILENCE_THRESHOLD && silenceTimerRef.current) {
                    clearTimeout(silenceTimerRef.current)
                    silenceTimerRef.current = null
                }

                rafRef.current = requestAnimationFrame(tick)
            }
            rafRef.current = requestAnimationFrame(tick)
        } catch {
            // AudioContext unavailable — user clicks stop manually
        }

        // Fallback: if no speech detected after NO_SPEECH_TIMEOUT_MS, stop and try transcription anyway
        noSpeechTimerRef.current = setTimeout(() => {
            if (recorder.state === 'recording') {
                try { recorder.requestData() } catch { /* flush */ }
                recorder.stop()
            }
        }, NO_SPEECH_TIMEOUT_MS)

        maxTimerRef.current = setTimeout(() => {
            if (recorder.state === 'recording') {
                try { recorder.requestData() } catch { /* flush */ }
                recorder.stop()
            }
        }, MAX_DURATION_MS)

        recorder.start(100)
        recorderRef.current = recorder
        setState('recording')
    }, [onTranscript, cleanup])

    const toggle = useCallback(() => {
        if (state === 'recording') stop()
        else if (state === 'idle') void start()
    }, [state, start, stop])

    const clearError = useCallback(() => setError(null), [])

    return { state, error, clearError, toggle }
}
