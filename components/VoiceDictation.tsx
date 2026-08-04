"use client";

import { useEffect, useRef, useState } from "react";

import { trackVoiceEvent } from "@/lib/speech/client";

/**
 * Two minutes is plenty for a business brief and keeps clips comfortably
 * under the transcribe route's size cap. The clock in the UI shows the limit
 * so the auto-stop never feels like a malfunction.
 */
const MAX_RECORDING_MS = 120_000;

/**
 * A crib sheet, not a script — shown while recording. These map one-to-one to
 * the sections the generated sites most commonly need to fill.
 */
const GUIDED_PROMPTS = [
  "Your business name",
  "A bit about the business",
  "Where you're based",
  "The main services you offer",
  "Why you're different",
  "How people should contact you",
  "Opening hours (if you have set times)",
  "About you or your team",
];

const RECORDER_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

type Phase = "idle" | "requesting" | "recording" | "transcribing";

interface VoiceDictationProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  /**
   * Ask for the mic as soon as the component mounts. Used when the tap that
   * revealed this component was itself "I want to talk" — asking again would
   * be a second, redundant tap.
   */
  autoStart?: boolean;
  /**
   * "full" is the home-page brief recorder (big card, guided prompts).
   * "compact" is a one-line mic row for short commands like edit requests —
   * no prompts, no card, and it hides entirely in unsupported browsers.
   */
  variant?: "full" | "compact";
  /** Tagged onto every GA voice event so funnels can be split by surface. */
  context?: string;
}

function pickRecorderMimeType(): string | undefined {
  return RECORDER_MIME_CANDIDATES.find((type) =>
    MediaRecorder.isTypeSupported(type),
  );
}

function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function fileExtensionFor(mimeType: string): string {
  if (mimeType.includes("mp4")) {
    return "m4a";
  }

  if (mimeType.includes("ogg")) {
    return "ogg";
  }

  return "webm";
}

function MicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
      <path d="M12 18v4" />
    </svg>
  );
}

/**
 * Tap-to-toggle voice recorder for the "describe your business" flow. Records
 * a single clip, sends it to /api/transcribe on stop, and hands the text back
 * via onTranscript — the parent textarea stays the source of truth, so the
 * transcript is always visible and editable.
 *
 * Deliberately tap-to-start / tap-to-stop rather than hold-to-talk: hold
 * gestures fight scrolling and long-press menus on mobile, and this audience
 * is heavily mobile.
 */
export default function VoiceDictation({
  onTranscript,
  disabled = false,
  autoStart = false,
  variant = "full",
  context,
}: VoiceDictationProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  // Loaded with ssr:false, so this initializer only ever runs in the browser.
  const [supported] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.MediaRecorder !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia),
  );

  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  // Lets the mount effect trigger recording without listing the (re-created
  // every render) startRecording function as a dependency.
  const startRecordingRef = useRef<() => void>(() => undefined);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const meterRef = useRef<HTMLSpanElement | null>(null);
  const meterRafRef = useRef<number | null>(null);
  const clockTimerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const unmountedRef = useRef(false);

  const track = (
    eventName: Parameters<typeof trackVoiceEvent>[0],
    params?: Record<string, string | number | boolean>,
  ) => {
    trackVoiceEvent(eventName, context ? { context, ...params } : params);
  };

  const releaseHardware = () => {
    if (meterRafRef.current !== null) {
      window.cancelAnimationFrame(meterRafRef.current);
      meterRafRef.current = null;
    }

    if (clockTimerRef.current !== null) {
      window.clearInterval(clockTimerRef.current);
      clockTimerRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
  };

  useEffect(() => {
    // Reset explicitly: StrictMode's dev remount reuses the same refs, so a
    // stale true here would silently discard every transcript.
    unmountedRef.current = false;

    if (autoStart) {
      startRecordingRef.current();
    }

    return () => {
      unmountedRef.current = true;

      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try {
          recorderRef.current.stop();
        } catch {
          // Already stopped.
        }
      }

      if (meterRafRef.current !== null) {
        window.cancelAnimationFrame(meterRafRef.current);
      }

      if (clockTimerRef.current !== null) {
        window.clearInterval(clockTimerRef.current);
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      void audioContextRef.current?.close().catch(() => undefined);
      audioContextRef.current = null;
    };
  }, [autoStart]);

  const startMeter = (stream: MediaStream) => {
    const AudioContextCtor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    // The meter is a nicety — recording works fine without it.
    if (!AudioContextCtor) {
      return;
    }

    const context = new AudioContextCtor();
    audioContextRef.current = context;
    // Auto-started recordings can create the context outside a direct user
    // gesture, which leaves it suspended in Chrome until resumed.
    void context.resume().catch(() => undefined);

    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    context.createMediaStreamSource(stream).connect(analyser);

    const samples = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteTimeDomainData(samples);

      let sum = 0;

      for (let i = 0; i < samples.length; i += 1) {
        const v = (samples[i] - 128) / 128;
        sum += v * v;
      }

      const level = Math.min(1, Math.sqrt(sum / samples.length) * 4);
      // Looked up per frame: the bars aren't in the DOM yet when the meter
      // starts (they render with the "recording" state).
      const bars = meterRef.current?.children;

      if (bars) {
        for (let i = 0; i < bars.length; i += 1) {
          const emphasis = 1 - Math.abs(i - (bars.length - 1) / 2) / bars.length;
          (bars[i] as HTMLElement).style.transform = `scaleY(${(
            0.2 +
            level * emphasis * 1.6
          ).toFixed(3)})`;
        }
      }

      meterRafRef.current = window.requestAnimationFrame(tick);
    };

    meterRafRef.current = window.requestAnimationFrame(tick);
  };

  const transcribe = async (recorderMimeType: string) => {
    const durationMs = performance.now() - startedAtRef.current;
    const type = recorderMimeType || "audio/webm";
    const blob = new Blob(chunksRef.current, { type });
    chunksRef.current = [];

    if (blob.size === 0) {
      setPhase("idle");
      setNotice("We didn't catch any audio — tap the mic and try again.");

      return;
    }

    const form = new FormData();
    form.append("audio", blob, `voice.${fileExtensionFor(type)}`);

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json().catch(() => ({}))) as {
        text?: string;
        error?: string;
      };

      if (unmountedRef.current) {
        return;
      }

      if (!response.ok || !payload.text) {
        track("voice_error");
        setPhase("idle");
        setNotice(
          payload.error ??
            "We couldn't turn that into text — try again, or type it instead.",
        );

        return;
      }

      track("voice_transcribed", {
        seconds: Math.round(durationMs / 1000),
        characters: payload.text.length,
      });
      onTranscriptRef.current(payload.text);
      setPhase("idle");
      setNotice(null);
    } catch {
      if (unmountedRef.current) {
        return;
      }

      track("voice_error");
      setPhase("idle");
      setNotice(
        "We couldn't reach the transcriber — check your connection, or just type it instead.",
      );
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;

    if (!recorder || recorder.state === "inactive") {
      return;
    }

    setPhase("transcribing");

    try {
      recorder.stop();
    } catch {
      releaseHardware();
      setPhase("idle");
    }
  };

  const startRecording = async () => {
    if (disabled || phase !== "idle") {
      return;
    }

    setNotice(null);
    setPhase("requesting");
    track("voice_opened");

    let stream: MediaStream;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      track("voice_permission_denied");
      setPhase("idle");
      setNotice(
        "No worries — the mic is blocked or busy, so just type it instead.",
      );

      return;
    }

    // The permission prompt can outlive the panel (they navigated away), and
    // StrictMode's dev remount can race two grants — whichever lands second
    // must not leave the first stream holding the mic open.
    if (unmountedRef.current || streamRef.current) {
      stream.getTracks().forEach((track) => track.stop());

      return;
    }

    streamRef.current = stream;

    const mimeType = pickRecorderMimeType();
    let recorder: MediaRecorder;

    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      releaseHardware();
      setPhase("idle");
      setNotice(
        "Recording isn't working in this browser — typing it works just as well.",
      );

      return;
    }

    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };
    recorder.onstop = () => {
      releaseHardware();

      if (!unmountedRef.current) {
        void transcribe(recorder.mimeType);
      }
    };
    recorderRef.current = recorder;

    recorder.start();
    startedAtRef.current = performance.now();
    setElapsedMs(0);
    setPhase("recording");
    startMeter(stream);

    clockTimerRef.current = window.setInterval(() => {
      const elapsed = performance.now() - startedAtRef.current;
      setElapsedMs(elapsed);

      if (elapsed >= MAX_RECORDING_MS) {
        stopRecording();
      }
    }, 200);
  };

  startRecordingRef.current = () => void startRecording();

  // In the full variant this component is the chosen path, not a decoration,
  // so a browser without MediaRecorder gets a gentle redirect rather than a
  // blank space. The compact variant is an extra next to a textarea, so it
  // simply disappears.
  if (!supported) {
    if (variant === "compact") {
      return null;
    }

    return (
      <div className="mt-4 rounded-3xl border border-black/10 bg-white p-4 text-xs leading-5 text-black/55 sm:p-5">
        Voice isn&apos;t available in this browser — no problem, just type it
        in the box below.
      </div>
    );
  }

  const isRecording = phase === "recording";
  const isTranscribing = phase === "transcribing";
  const isRequesting = phase === "requesting";

  if (variant === "compact") {
    return (
      <div className="mt-2">
        {!isRecording ? (
          <button
            type="button"
            onClick={() => void startRecording()}
            disabled={disabled || isTranscribing || isRequesting}
            className="flex items-center gap-2.5 text-left disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-kiwi-green text-black shadow-sm"
              aria-hidden
            >
              {isTranscribing ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/25 border-t-black" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-[18px] w-[18px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="2" width="6" height="12" rx="3" />
                  <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
                  <path d="M12 18v4" />
                </svg>
              )}
            </span>
            <span className="text-xs font-semibold text-black/55">
              {isTranscribing
                ? "Turning your words into text…"
                : isRequesting
                  ? "Waiting for your mic…"
                  : "Rather talk than type? Tap the mic and say it"}
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={stopRecording}
              aria-label="Stop recording"
              className="voice-ring-pulse grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#D64541] text-white shadow-sm transition hover:brightness-95"
            >
              <span className="h-3 w-3 rounded-[3px] bg-white" aria-hidden />
            </button>
            <span className="text-xs font-bold text-[#B4451F]">
              Recording — tap to stop
            </span>
            <span className="text-xs font-semibold tabular-nums text-black/45">
              {formatClock(elapsedMs)}
            </span>
            <span
              ref={meterRef}
              className="flex h-4 items-center gap-[2px]"
              aria-hidden
            >
              {[0, 1, 2, 3, 4].map((bar) => (
                <span
                  key={bar}
                  className="h-full w-[3px] origin-center rounded-full bg-[#6F9B24]"
                  style={{ transform: "scaleY(0.2)" }}
                />
              ))}
            </span>
          </div>
        )}

        {notice ? (
          <p className="mt-2 text-xs leading-5 text-[#B4451F]" role="status">
            {notice}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-3xl border border-black/10 bg-white p-4 sm:p-5">
      {!isRecording ? (
        <button
          type="button"
          onClick={() => void startRecording()}
          disabled={disabled || isTranscribing || isRequesting}
          className="flex w-full items-center gap-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-kiwi-green text-black shadow-sm"
            aria-hidden
          >
            {isTranscribing ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/25 border-t-black" />
            ) : (
              <MicIcon />
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold leading-6">
              {isTranscribing
                ? "Turning your words into text…"
                : isRequesting
                  ? "Waiting for your mic…"
                  : "Just talk — tell us about your business"}
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-black/50">
              {isTranscribing
                ? "A couple of seconds — it'll drop into the box below."
                : isRequesting
                  ? "Your browser will ask to use the microphone — that's us."
                  : "Tap once to start, tap again to finish — no need to hold. Or type below."}
            </span>
          </span>
        </button>
      ) : (
        <div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={stopRecording}
              aria-label="Stop recording"
              className="voice-ring-pulse grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#D64541] text-white shadow-sm transition hover:brightness-95"
            >
              <span className="h-[18px] w-[18px] rounded-[4px] bg-white" aria-hidden />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-6 text-[#B4451F]">
                Recording — tap the square to stop
              </p>
              <div className="mt-1 flex items-center gap-3">
                <span className="text-xs font-semibold tabular-nums text-black/55">
                  {formatClock(elapsedMs)} / {formatClock(MAX_RECORDING_MS)}
                </span>
                <span
                  ref={meterRef}
                  className="flex h-5 items-center gap-[3px]"
                  aria-hidden
                >
                  {[0, 1, 2, 3, 4].map((bar) => (
                    <span
                      key={bar}
                      className="h-full w-1 origin-center rounded-full bg-[#6F9B24]"
                      style={{ transform: "scaleY(0.2)" }}
                    />
                  ))}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-[#faf8f1] px-4 py-3">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-black/45">
              Worth mentioning
            </p>
            <ul className="mt-2 grid gap-x-4 gap-y-1 text-xs leading-5 text-black/60 sm:grid-cols-2">
              {GUIDED_PROMPTS.map((prompt) => (
                <li key={prompt} className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-kiwi-green"
                  />
                  {prompt}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {notice ? (
        <p className="mt-3 text-xs leading-5 text-[#B4451F]" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
