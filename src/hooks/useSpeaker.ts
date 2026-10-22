"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PREFERRED_VOICES = ["Natural", "Neural", "Premium", "Enhanced", "Google", "Samantha", "Aria", "Jenny", "Maysa", "Laila"];

function pickVoice(voices: SpeechSynthesisVoice[], lang: string) {
  const base = lang.split("-")[0];
  const matching = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
  const score = (v: SpeechSynthesisVoice) => {
    const i = PREFERRED_VOICES.findIndex((p) => v.name.includes(p));
    return (i === -1 ? 0 : PREFERRED_VOICES.length - i) + (v.lang === lang ? 0.5 : 0);
  };
  return matching.sort((a, b) => score(b) - score(a))[0] ?? null;
}

const SENTENCE_END = /[.!?؟]+["')\]]?\s+/;

/**
 * Text-to-speech that can start talking while text is still streaming in:
 * `begin()` returns a session you `feed()` chunks into, and `end()` resolves when speaking finishes.
 */
export function useSpeaker(lang: string, enabled: boolean) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  // Chrome can garbage-collect utterances mid-speech (and never fire onend) unless they are referenced.
  const liveRef = useRef(new Set<SpeechSynthesisUtterance>());
  const idleWaitersRef = useRef<(() => void)[]>([]);
  // Read through a ref so toggling voice mid-turn applies to the sentences still streaming in.
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    const load = () => (voiceRef.current = pickVoice(window.speechSynthesis.getVoices(), lang));
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, [lang]);

  const notifyIfIdle = useCallback(() => {
    if (liveRef.current.size > 0) return;
    setSpeaking(false);
    idleWaitersRef.current.splice(0).forEach((resolve) => resolve());
  }, []);

  const say = useCallback(
    (text: string) => {
      const clean = text.trim();
      // Checked directly (not via state) so the very first turn can speak before effects have run.
      const available = typeof window !== "undefined" && "speechSynthesis" in window;
      if (!clean || !enabledRef.current || !available) return;
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = lang;
      if (voiceRef.current) u.voice = voiceRef.current;
      u.rate = 1.02;
      const done = () => {
        liveRef.current.delete(u);
        notifyIfIdle();
      };
      u.onend = done;
      u.onerror = done;
      liveRef.current.add(u);
      setSpeaking(true);
      window.speechSynthesis.speak(u);
    },
    [lang, notifyIfIdle],
  );

  const whenIdle = useCallback(
    () =>
      new Promise<void>((resolve) => {
        if (liveRef.current.size === 0) resolve();
        else idleWaitersRef.current.push(resolve);
      }),
    [],
  );

  const cancel = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    liveRef.current.clear();
    notifyIfIdle();
  }, [notifyIfIdle]);

  const begin = useCallback(() => {
    let buffer = "";
    return {
      feed(chunk: string) {
        buffer += chunk;
        let match: RegExpExecArray | null;
        while ((match = SENTENCE_END.exec(buffer))) {
          const end = match.index + match[0].length;
          say(buffer.slice(0, end));
          buffer = buffer.slice(end);
        }
      },
      end() {
        say(buffer);
        buffer = "";
        return whenIdle();
      },
    };
  }, [say, whenIdle]);

  useEffect(() => () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  return { supported, speaking, begin, say, cancel, whenIdle };
}
