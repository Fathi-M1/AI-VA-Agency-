"use client"

// Browser voice for the playground, using only the built-in Web Speech API:
// SpeechRecognition (speech -> text) and speechSynthesis (text -> speech).
// MDN: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
// Note (from MDN): in Chrome, recognition is server-based; the audio is sent to a web
// service, so it needs a network connection.
import * as React from "react"

export type VoiceState = "idle" | "listening" | "thinking" | "speaking"

// Minimal typing for the parts of SpeechRecognition used here (not in every TS DOM lib).
type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type RecognitionCtor = new () => Recognition

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const ERROR_TEXT: Record<string, string> = {
  "not-allowed": "Microphone access was blocked. Allow the microphone for this site in the browser's settings, or type instead.",
  "service-not-allowed": "This browser won't allow speech recognition here. You can keep typing.",
  "audio-capture": "No microphone was found. Check that one is connected, or type instead.",
  network: "Speech recognition needs an internet connection (this browser sends the audio to its speech service).",
  "no-speech": "Didn't catch anything. Press Talk and try again.",
  "language-not-supported": "This browser can't recognise English (US) speech. You can keep typing.",
}

/** Strip markdown symbols so they aren't read aloud. */
const speakable = (text: string) => text.replace(/[*_`#>]/g, "").replace(/\s+/g, " ").trim()

export function useVoice(onTranscript: (text: string) => void) {
  const [supported, setSupported] = React.useState({ recognition: false, synthesis: false, checked: false })
  const [state, setState] = React.useState<VoiceState>("idle")
  const [notice, setNotice] = React.useState<string | null>(null)
  const recRef = React.useRef<Recognition | null>(null)
  const heardRef = React.useRef(false)
  const erroredRef = React.useRef(false)
  const onTranscriptRef = React.useRef(onTranscript)
  React.useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  React.useEffect(() => {
    // Feature detection has to run in the browser, after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported({
      recognition: recognitionCtor() !== null,
      synthesis: typeof window !== "undefined" && "speechSynthesis" in window,
      checked: true,
    })
    return () => {
      recRef.current?.abort()
      if ("speechSynthesis" in window) window.speechSynthesis.cancel()
    }
  }, [])

  const listen = React.useCallback(() => {
    const Ctor = recognitionCtor()
    if (!Ctor) return
    if ("speechSynthesis" in window) window.speechSynthesis.cancel()
    setNotice(null)
    const rec = new Ctor()
    rec.lang = "en-US"
    rec.continuous = false
    rec.interimResults = false
    rec.maxAlternatives = 1
    heardRef.current = false
    erroredRef.current = false
    rec.onresult = (e) => {
      const result = e.results[e.results.length - 1]
      const text = result?.[0]?.transcript?.trim()
      if (text) {
        heardRef.current = true
        setState("thinking")
        onTranscriptRef.current(text)
      }
    }
    rec.onerror = (e) => {
      erroredRef.current = true
      if (e.error !== "aborted") setNotice(ERROR_TEXT[e.error] ?? `Speech recognition error: ${e.error}`)
      setState("idle")
    }
    rec.onend = () => {
      recRef.current = null
      if (!heardRef.current) {
        // Ended with no words and no error (the speech service returned nothing).
        if (!erroredRef.current) setNotice("Didn't catch any words. Press Talk and try again, or type instead.")
        setState((s) => (s === "listening" ? "idle" : s))
      }
    }
    recRef.current = rec
    setState("listening")
    try {
      rec.start() // the browser asks for microphone permission here
    } catch {
      setNotice("Couldn't start listening. Try again.")
      setState("idle")
    }
  }, [])

  const stopListening = React.useCallback(() => {
    recRef.current?.stop()
  }, [])

  /** Speak replies in order; resolves the state back to idle when done or stopped. */
  const speak = React.useCallback((texts: string[]) => {
    const parts = texts.map(speakable).filter(Boolean)
    if (!parts.length || !("speechSynthesis" in window)) {
      setState("idle")
      return
    }
    const synth = window.speechSynthesis
    synth.cancel()
    setState("speaking")
    parts.forEach((text, i) => {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = "en-US"
      if (i === parts.length - 1) {
        u.onend = () => setState("idle")
        u.onerror = () => setState("idle")
      }
      synth.speak(u)
    })
  }, [])

  const stopSpeaking = React.useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel()
    setState("idle")
  }, [])

  return { supported, state, setState, notice, setNotice, listen, stopListening, speak, stopSpeaking }
}
