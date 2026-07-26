import { useCallback, useRef, useState } from "react";
import { chat, speakBuffer, transcribe, Msg } from "./api";
import { signals } from "./avatarSignals";
import { useAvatar } from "./avatarStore";

export type Phase = "idle" | "listening" | "thinking" | "speaking";

// one shared AudioContext (browsers limit them); resumed on first user gesture
let _ctx: AudioContext | null = null;
const audio = () => (_ctx ??= new (window.AudioContext ||
  (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)());

// One conversation: hold-to-talk (mic -> stt -> chat -> tts) or send(text).
// Real lip-sync: while the TTS audio plays we sample its waveform and push the
// live mouth-openness into signals.mouth, which the 3D avatar reads each frame.
export function useAura() {
  const { voice } = useAvatar();
  const [phase, setPhase] = useState<Phase>("idle");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const err = (e: unknown) => { setError(e instanceof Error ? e.message : String(e)); setPhase("idle"); };

  const play = useCallback(async (text: string) => {
    setPhase("speaking"); signals.speaking = true;
    let raf = 0;
    try {
      const bytes = await speakBuffer(text, voice);
      const ctx = audio();
      await ctx.resume().catch(() => {});
      const audioBuf = await ctx.decodeAudioData(bytes);
      const src = ctx.createBufferSource(); src.buffer = audioBuf;
      const an = ctx.createAnalyser(); an.fftSize = 256;
      src.connect(an); an.connect(ctx.destination);           // BufferSource always feeds the analyser
      const data = new Uint8Array(an.fftSize);
      const loop = () => {
        an.getByteTimeDomainData(data);
        let s = 0;
        for (let i = 0; i < data.length; i++) { const x = (data[i] - 128) / 128; s += x * x; }
        signals.mouth = Math.min(1, Math.sqrt(s / data.length) * 4.5); // RMS -> jaw openness
        raf = requestAnimationFrame(loop);
      };
      await new Promise<void>((res) => { src.onended = () => res(); src.start(); loop(); });
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { cancelAnimationFrame(raf); signals.mouth = 0; signals.speaking = false; setPhase("idle"); }
  }, [voice]);

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
