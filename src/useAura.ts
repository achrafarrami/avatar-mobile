import { useCallback, useEffect, useRef, useState } from "react";
import { chat, speakBuffer, transcribe, Msg } from "./api";
import { signals } from "./avatarSignals";
import { useAvatar } from "./avatarStore";

// A press shorter than this (a stray tap, not speech) yields an empty/too-short
// clip OpenAI rejects — skip STT and prompt the user instead of erroring.
const MIN_TALK_MS = 400;

// Expressive body/face clips played while the avatar speaks; lip-sync drives the
// mouth on top of them (Model runs the mixer then the lip-sync override).
const TALK_CLIPS = ["talking_happy", "talking_excited", "talk_excited"];

export type Phase = "idle" | "listening" | "thinking" | "speaking";

// one shared AudioContext (browsers limit them); resumed on first user gesture
let _ctx: AudioContext | null = null;
const audio = () => (_ctx ??= new (window.AudioContext ||
  (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)());
// Mobile (esp. iOS) only lets an AudioContext start from a user gesture. TTS
// plays later, after network awaits — off-gesture — so create+resume it *now*,
// synchronously inside the tap, or it stays suspended and lip-sync gets silence.
const unlockAudio = () => { const c = audio(); if (c.state === "suspended") c.resume().catch(() => {}); };

// One conversation: hold-to-talk (mic -> stt -> chat -> tts) or send(text).
// Real lip-sync: while the TTS audio plays we sample its waveform and push the
// live mouth-openness into signals.mouth, which the 3D avatar reads each frame.
export function useAura() {
  const { voice, playClip, stopClip } = useAvatar();
  const [phase, setPhase] = useState<Phase>("idle");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const recStart = useRef(0);
  const err = (e: unknown) => { setError(e instanceof Error ? e.message : String(e)); setPhase("idle"); };

  // leaving the chat: drop the listening clip + clear any live signals
  const stopClipRef = useRef(stopClip); stopClipRef.current = stopClip;
  useEffect(() => () => {
    stopClipRef.current();
    signals.listening = false; signals.speaking = false; signals.mouth = 0;
  }, []);

  const play = useCallback(async (text: string) => {
    // play an expressive talking clip for gestures/face; lip-sync owns the mouth
    playClip(TALK_CLIPS[Math.floor(Math.random() * TALK_CLIPS.length)]);
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
    finally { cancelAnimationFrame(raf); signals.mouth = 0; signals.speaking = false; stopClip(); setPhase("idle"); }
  }, [voice, playClip, stopClip]);

  const send = useCallback(async (text: string) => {
    const t = text.trim(); if (!t) return;
    unlockAudio();          // still inside the send tap — primes audio for TTS
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
    unlockAudio();          // press is a gesture — unlock now so TTS plays later
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Pick a MIME the platform actually supports (Chrome: webm/opus, Safari: mp4).
      const mime = ["audio/webm", "audio/mp4", "audio/ogg"]
        .find((m) => MediaRecorder.isTypeSupported?.(m));
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      rec.current = mr; chunks.current = []; recStart.current = Date.now();
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      // Timeslice: deliver data every 250ms so chunks are populated even if the
      // final dataavailable races onstop — this is what prevents empty clips.
      mr.start(250); signals.listening = true; setPhase("listening");
      playClip("curious"); // curious pose on the avatar while it listens (loads on first use)
    } catch { signals.listening = false; setError("Microphone permission needed — or type instead."); }
  }, [playClip]);

  const stopRec = useCallback(async () => {
    signals.listening = false;
    stopClip(); // drop the curious pose so lip-sync can take over when speaking
    const mr = rec.current;
    if (!mr || mr.state === "inactive") { setPhase("idle"); return; }
    const heldMs = Date.now() - recStart.current;
    // flush the last chunk, then wait for the recorder to finish
    mr.requestData?.();
    await new Promise<void>((res) => { mr.onstop = () => res(); mr.stop(); });
    mr.stream.getTracks().forEach((t) => t.stop());
    const blob = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
    if (heldMs < MIN_TALK_MS || blob.size === 0) {   // stray tap / capture failure
      setError("Hold the mic and speak — that was too short."); setPhase("idle"); return;
    }
    setPhase("thinking");
    try {
      const text = await transcribe(blob);
      if (text) await send(text); else setPhase("idle");
    } catch (e) { err(e); }
  }, [send, stopClip]);

  return { phase, messages, error, send, startRec, stopRec };
}
