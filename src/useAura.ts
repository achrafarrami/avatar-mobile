import { useCallback, useEffect, useRef, useState } from "react";
import { chat, speakBuffer, transcribe, Msg } from "./api";
import { signals } from "./avatarSignals";
import { useAvatar } from "./avatarStore";
import { getSettings, langCode } from "./settings";
import { t } from "./i18n";

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
    let raf = 0;
    try {
      const bytes = await speakBuffer(text, voice);
      const ctx = audio();
      await ctx.resume().catch(() => {});
      const audioBuf = await ctx.decodeAudioData(bytes);
      const src = ctx.createBufferSource(); src.buffer = audioBuf;
      const an = ctx.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = 0.4;
      src.connect(an); an.connect(ctx.destination);           // BufferSource always feeds the analyser
      const td = new Uint8Array(an.fftSize);
      const fd = new Uint8Array(an.frequencyBinCount);
      // Hz per frequency bin (voice band cut ~180Hz–8kHz below)
      const hzPerBin = ctx.sampleRate / an.fftSize;
      // Talking clip + speaking state start HERE, after fetch/decode, in the
      // same tick as src.start() — the clips bake viseme mouth motion, so
      // starting them any earlier makes the mouth talk before the voice.
      playClip(TALK_CLIPS[Math.floor(Math.random() * TALK_CLIPS.length)]);
      setPhase("speaking"); signals.speaking = true;
      // AGC: track the running speech peak so stressed syllables always reach
      // near-full openness whatever the TTS volume; gate closes the mouth in
      // pauses. pow(0.6) lifts mid-level syllables (speech spends most time there).
      let peak = 0.06;
      const loop = () => {
        an.getByteTimeDomainData(td);
        let s = 0;
        for (let i = 0; i < td.length; i++) { const x = (td[i] - 128) / 128; s += x * x; }
        const rms = Math.sqrt(s / td.length);
        peak = Math.max(rms, peak * 0.996, 0.04);
        signals.mouth = rms < 0.012 ? 0 : Math.pow(Math.min(1, rms / peak), 0.6);
        // Mouth SHAPE from the spectrum: high centroid (ee/s) spreads the lips,
        // low centroid (oo/o) rounds them — articulation, not just flapping.
        an.getByteFrequencyData(fd);
        let num = 0, den = 0;
        const i0 = Math.max(1, Math.round(180 / hzPerBin)), i1 = Math.min(fd.length, Math.round(8000 / hzPerBin));
        for (let i = i0; i < i1; i++) { num += fd[i] * i * hzPerBin; den += fd[i]; }
        const centroid = den > 60 ? num / den : 0;            // Hz; 0 = too quiet to judge
        const shape = (x: number) => Math.max(0, Math.min(1, x));
        signals.mouthWide = signals.mouth > 0.05 && centroid ? shape((centroid - 2200) / 1800) : 0;
        signals.mouthRound = signals.mouth > 0.05 && centroid ? shape((1400 - centroid) / 900) : 0;
        raf = requestAnimationFrame(loop);
      };
      await new Promise<void>((res) => { src.onended = () => res(); src.start(); loop(); });
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally {
      cancelAnimationFrame(raf);
      signals.mouth = 0; signals.mouthWide = 0; signals.mouthRound = 0; signals.speaking = false;
      stopClip(); setPhase("idle");
    }
  }, [voice, playClip, stopClip]);

  const send = useCallback(async (text: string) => {
    const t = text.trim(); if (!t) return;
    unlockAudio();          // still inside the send tap — primes audio for TTS
    setError(null);
    const prior = messages;
    setMessages([...prior, { role: "user", content: t }]);
    setPhase("thinking");
    try {
      const reply = await chat(t, prior, getSettings().language);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      await play(reply);
    } catch (e) { err(e); }
  }, [messages, play]);

  const startRec = useCallback(async () => {
    // iOS: a *running* AudioContext while the mic opens makes MediaRecorder
    // capture silence (Whisper then hallucinates "you"). Keep it suspended
    // during recording; stopRec's pointer-up gesture unlocks it for TTS.
    if (_ctx?.state === "running") _ctx.suspend().catch(() => {});
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
      // BUT: Safari's mp4 timeslice chunks are each standalone files (own
      // ftyp/moov headers); concatenating them makes an invalid mp4 that
      // Whisper rejects. Only streamable containers (webm/ogg) get a timeslice;
      // mp4 records in one piece and relies on the onstop wait in stopRec.
      const isMp4 = /mp4/.test(mr.mimeType || mime || "");
      if (isMp4) mr.start(); else mr.start(250);
      signals.listening = true; setPhase("listening");
      playClip("curious"); // curious pose on the avatar while it listens (loads on first use)
    } catch (e) {
      signals.listening = false;
      // NotAllowedError = user/OS denied it; NotReadableError = permission is
      // fine but the OS couldn't open the mic hardware (e.g. held by another
      // app, or an OEM restriction) — surface which one so it's diagnosable.
      const name = e instanceof DOMException ? e.name : null;
      const hint = name === "NotReadableError" ? "mic is busy or blocked by the OS"
        : name === "NotAllowedError" ? "permission denied"
        : name || "unknown error";
      setError(`Microphone unavailable (${hint}) — or type instead.`);
    }
  }, [playClip]);

  const stopRec = useCallback(async () => {
    unlockAudio();          // release is a gesture — resume the context for TTS
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
      setError(t("Hold the mic and speak — that was too short.")); setPhase("idle"); return;
    }
    // Silent-capture guard: Whisper hallucinates ("you", "thank you"…) on
    // silence, which reads like a bad transcript. Decode locally and check the
    // peak level; if the mic delivered nothing, say so instead of sending it.
    try {
      const pcm = await audio().decodeAudioData(await blob.arrayBuffer());
      const d = pcm.getChannelData(0);
      let peak = 0;
      for (let i = 0; i < d.length; i += 50) peak = Math.max(peak, Math.abs(d[i]));
      if (peak < 0.01) {
        setError(t("Mic captured only silence — check the input device in your browser/OS sound settings."));
        setPhase("idle"); return;
      }
    } catch { /* container not decodable locally — let the server try anyway */ }
    setPhase("thinking");
    try {
      const text = await transcribe(blob, langCode(getSettings().language));
      if (text) await send(text); else setPhase("idle");
    } catch (e) { err(e); }
  }, [send, stopClip]);

  return { phase, messages, error, send, startRec, stopRec };
}
