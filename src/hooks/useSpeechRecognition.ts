"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The Web Speech API isn't in TypeScript's DOM lib yet, so describe the parts we use.
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Continuous speech-to-text that keeps listening through pauses until `stop()` is called. */
export function useSpeechRecognition(lang: string) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<Recognition | null>(null);
  const wantRef = useRef(false);
  const finalRef = useRef("");
  const interimRef = useRef("");

  useEffect(() => setSupported(getCtor() !== null), []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    recRef.current?.abort();
    finalRef.current = "";
    interimRef.current = "";
    setText("");
    setError(null);
    wantRef.current = true;

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      interimRef.current = interim;
      setText((finalRef.current + interim).trim());
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wantRef.current = false;
        setError("Microphone access is blocked, so you can type your answers. To speak instead, allow the microphone in your browser and reload.");
      } else if (e.error === "audio-capture") {
        wantRef.current = false;
        setError("No microphone was found, so you can type your answers.");
      }
    };
    rec.onend = () => {
      // Browsers end recognition after a pause; restart it while the candidate is still answering.
      if (wantRef.current) {
        finalRef.current += interimRef.current ? interimRef.current + " " : "";
        interimRef.current = "";
        try {
          rec.start();
          return;
        } catch {
          // Fall through and report that listening stopped.
        }
      }
      setListening(false);
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [lang]);

  /** Stops listening and returns everything heard so far. */
  const stop = useCallback(() => {
    wantRef.current = false;
    recRef.current?.stop();
    setListening(false);
    return (finalRef.current + interimRef.current).trim();
  }, []);

  useEffect(
    () => () => {
      wantRef.current = false;
      recRef.current?.abort();
    },
    [],
  );

  return { supported, listening, text, error, start, stop };
}
