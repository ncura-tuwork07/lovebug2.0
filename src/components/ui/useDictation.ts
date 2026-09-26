"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Dictado con el reconocimiento de voz del navegador (Chrome/Android, Safari/iPhone), en español
// de Argentina. No graba ni sube audio: el celu lo pasa a texto y lo podés corregir antes de mandar.
type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechEvent = { results: ArrayLike<SpeechResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

export function useDictation(text: string, setText: (t: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const want = useRef(false);
  const base = useRef("");
  const session = useRef("");
  const textRef = useRef(text);
  textRef.current = text;

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const stop = useCallback(() => {
    want.current = false;
    rec.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    setError(null);
    want.current = true;
    base.current = textRef.current.trim();
    session.current = "";

    const launch = () => {
      const r = new Ctor();
      r.lang = "es-AR";
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (e) => {
        // En Android cada resultado final a veces repite el anterior: nos quedamos con el más largo.
        const finals: string[] = [];
        let interim = "";
        for (let i = 0; i < e.results.length; i++) {
          const piece = e.results[i][0].transcript.trim();
          if (!piece) continue;
          if (!e.results[i].isFinal) {
            interim += ` ${piece}`;
            continue;
          }
          const last = finals[finals.length - 1];
          if (last && piece.toLowerCase().startsWith(last.toLowerCase())) finals[finals.length - 1] = piece;
          else if (!last || !last.toLowerCase().startsWith(piece.toLowerCase())) finals.push(piece);
        }
        session.current = finals.join(" ");
        setText([base.current, session.current, interim.trim()].filter(Boolean).join(" "));
      };
      r.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          want.current = false;
          setError("Necesito permiso para usar el micrófono. Activalo en el navegador, o escribilo abajo.");
        } else if (e.error === "network") {
          want.current = false;
          setError("El dictado necesita internet. Probá de nuevo o escribilo abajo.");
        }
      };
      r.onend = () => {
        // El navegador corta solo tras un silencio: si no tocaste "terminar", seguimos escuchando.
        base.current = [base.current, session.current].filter(Boolean).join(" ");
        session.current = "";
        if (want.current) {
          try {
            launch();
            return;
          } catch {}
        }
        want.current = false;
        setListening(false);
      };
      rec.current = r;
      r.start();
    };

    try {
      launch();
      setListening(true);
    } catch {
      want.current = false;
      setError("No pude usar el micrófono. Escribilo abajo.");
    }
  }, [setText]);

  useEffect(() => () => {
    want.current = false;
    rec.current?.stop();
  }, []);

  return { supported, listening, error, start, stop };
}
