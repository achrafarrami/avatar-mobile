import { useCallback, useRef, useState } from "react";
import { chat, speak, transcribe, Msg } from "./api";
import { signals } from "./avatarSignals";

export type Phase = "idle" | "listening" | "thinking" | "speaking";

// One conversation: hold-to-talk (mic -> stt -> chat -> tts) or send(text).
// Drives signals.speaking so the 3D avatar lip-syncs while audio plays.
export function useAura() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const err = (e: unknown) => { setError(e instanceof Error ? e.message : String(e)); setPhase("idle"); };

  const play = useCallback(async (text: string) => {
    setPhase("speaking"); signals.speaking = true;
    try {
      const url = await speak(text);
      const a = new Audio(url);
      await a.play().catch(() => {});
      await new Promise<void>((res) => { a.onended = () => res(); a.onerror = () => res(); });
      URL.revokeObjectURL(url);
    } finally { signals.speaking = false; setPhase("idle"); }
  }, []);

  const send = useCallback(async (text: string) => {
    const t = text.trim(); if (!t) return;
    setError(null);
    const prior = messages;
    setMessages([...prior, { role: "user", content: t }]);
    setPhase("thinking");
    try {
      const reply = await chat(t, prior);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      await play(reply);
    } catch (e) { err(e); }
  }, [messages, play]);

  const startRec = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      rec.current = mr; chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.start(); setPhase("listening");
    } catch { setError("Microphone permission needed — or type instead."); }
  }, []);

  const stopRec = useCallback(async () => {
    const mr = rec.current;
    if (!mr || mr.state === "inactive") { setPhase("idle"); return; }
    setPhase("thinking");
    await new Promise<void>((res) => { mr.onstop = () => res(); mr.stop(); });
    mr.stream.getTracks().forEach((t) => t.stop());
    try {
      const text = await transcribe(new Blob(chunks.current, { type: "audio/webm" }));
      if (text) await send(text); else setPhase("idle");
    } catch (e) { err(e); }
  }, [send]);

  return { phase, messages, error, send, startRec, stopRec };
}
