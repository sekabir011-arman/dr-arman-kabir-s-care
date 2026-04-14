import {
  AlertTriangle,
  Maximize2,
  MonitorPlay,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SerialEntry {
  id: string;
  serial: number;
  patientName: string;
  phone: string;
  arrivalTime: string;
  status: "waiting" | "in-progress" | "done";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayKey(): string {
  return `clinic_serials_${new Date().toISOString().slice(0, 10)}`;
}

function safeParseQueue(raw: string | null): SerialEntry[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SerialEntry =>
        item !== null &&
        typeof item === "object" &&
        typeof (item as SerialEntry).id === "string" &&
        typeof (item as SerialEntry).serial === "number" &&
        typeof (item as SerialEntry).patientName === "string" &&
        ["waiting", "in-progress", "done"].includes(
          (item as SerialEntry).status,
        ),
    );
  } catch {
    return [];
  }
}

function mergeQueues(
  local: SerialEntry[],
  remote: SerialEntry[],
): SerialEntry[] {
  const map = new Map<string, SerialEntry>();
  for (const item of local) map.set(item.id, item);
  // Remote wins for same id
  for (const item of remote) map.set(item.id, item);
  return Array.from(map.values()).sort((a, b) => a.serial - b.serial);
}

function isSpeechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// ── Error Boundary ────────────────────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean;
  error: string;
}

class QueueErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: "" };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("SerialDisplay error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center text-center px-6">
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-full bg-red-900/40 border border-red-700/40 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              Queue display unavailable
            </h1>
            <p className="text-gray-400 max-w-sm mx-auto">
              Unable to load the patient queue. Please refresh the page to try
              again.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Canister queue sync (best-effort) ─────────────────────────────────────────
// The canister backend has no dedicated queue API, so we piggy-back on
// ClinicalNotes: we store the queue as a JSON blob in a note with
// noteSubtype = "queue_display". All devices writing or reading this key
// see the same cross-device state within 1–2 canister round-trips.

const QUEUE_NOTE_SUBTYPE = "queue_display";

async function tryPullQueueFromCanister(): Promise<SerialEntry[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actor = (window as any).__canisterActorForQueue;
    if (!actor || !navigator.onLine) return [];
    const today = new Date().toISOString().slice(0, 10);
    const notes: Array<{
      content: string;
      noteSubtype?: string;
      createdAt: bigint;
    }> = await actor.getClinicalNotesByType(0n, "General");
    const queueNotes = notes
      .filter((n) => n.noteSubtype === QUEUE_NOTE_SUBTYPE)
      .sort((a, b) => Number(b.createdAt - a.createdAt));
    if (queueNotes.length === 0) return [];
    const parsed: unknown = JSON.parse(queueNotes[0].content);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "date" in parsed &&
      (parsed as { date: string }).date === today &&
      "entries" in parsed
    ) {
      return safeParseQueue(
        JSON.stringify((parsed as { entries: unknown }).entries),
      );
    }
    return [];
  } catch {
    return [];
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

function SerialDisplayInner() {
  const [serials, setSerials] = useState<SerialEntry[]>([]);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [time, setTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showVideoPanel, setShowVideoPanel] = useState(true);
  const [hasError, setHasError] = useState(false);
  const prevNowServingIdRef = useRef<string | null>(null);
  const lastCanisterPollRef = useRef<number>(0);

  // Real-time clock
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  // Online/offline status
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // BroadcastChannel for same-browser tab sync
  const bcRef = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    try {
      const bc = new BroadcastChannel("clinic_queue_sync");
      bcRef.current = bc;
      bc.onmessage = (e: MessageEvent) => {
        const incoming = safeParseQueue(JSON.stringify(e.data));
        if (incoming.length > 0) {
          setSerials((prev) => mergeQueues(prev, incoming));
        }
      };
      return () => bc.close();
    } catch {
      // BroadcastChannel not supported — gracefully degrade
      return undefined;
    }
  }, []);

  // Primary poll: localStorage every 2s + canister every 5s
  useEffect(() => {
    const load = async () => {
      try {
        // 1. Read localStorage (fast, always)
        const raw = localStorage.getItem(todayKey());
        const localEntries = safeParseQueue(raw);

        // 2. Try canister every 5 seconds for cross-device sync
        const now = Date.now();
        let merged = localEntries;
        if (now - lastCanisterPollRef.current >= 5_000) {
          lastCanisterPollRef.current = now;
          const remoteEntries = await tryPullQueueFromCanister();
          if (remoteEntries.length > 0) {
            merged = mergeQueues(localEntries, remoteEntries);
            // Write back merged result to localStorage so future local reads are up-to-date
            try {
              localStorage.setItem(todayKey(), JSON.stringify(merged));
            } catch {
              // localStorage full or unavailable
            }
          }
        }

        setSerials(merged);
        setHasError(false);
      } catch (err) {
        console.error("SerialDisplay poll error:", err);
        setHasError(true);
        // Ensure we always show something rather than crashing
        setSerials([]);
      }
    };

    load();
    const interval = setInterval(load, 2_000);
    return () => clearInterval(interval);
  }, []);

  const nowServing = serials.find((s) => s.status === "in-progress") ?? null;
  const waiting = serials.filter((s) => s.status === "waiting");
  const doneCount = serials.filter((s) => s.status === "done").length;

  // Announce when now-serving changes
  useEffect(() => {
    const currentId = nowServing?.id ?? null;
    if (
      currentId &&
      currentId !== prevNowServingIdRef.current &&
      speechEnabled &&
      isSpeechAvailable()
    ) {
      try {
        const serial = nowServing?.serial ?? 0;
        const text = `Patient number ${serial} please come. আসুন পেশেন্ট নম্বর ${serial}`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.85;
        utterance.pitch = 1;
        utterance.volume = 1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } catch {
        // Speech synthesis failed — ignore silently
      }
    }
    prevNowServingIdRef.current = currentId;
  }, [nowServing, speechEnabled]);

  const handleFullscreen = () => {
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {
      // Fullscreen not available
    }
  };

  const currentTimeStr = time.toLocaleTimeString("en-BD", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const currentDateStr = time.toLocaleDateString("en-BD", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="min-h-screen bg-gray-950 text-white flex flex-col select-none"
      data-ocid="serial_display.page"
    >
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-3 bg-gray-900/90 border-b border-gray-800 backdrop-blur-sm">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-white tracking-wide truncate">
            Dr. Arman Kabir&apos;s Care
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
            Patient Queue Display
          </p>
        </div>

        {/* Date + time — center on large screens */}
        <div className="hidden sm:block text-center flex-1">
          <p className="text-xl sm:text-3xl font-bold text-white tabular-nums leading-tight">
            {currentTimeStr}
          </p>
          <p className="text-gray-400 text-xs sm:text-sm font-medium">
            {currentDateStr}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          {/* Online status indicator */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
              isOnline
                ? "bg-emerald-900/40 border border-emerald-700/40 text-emerald-400"
                : "bg-red-900/40 border border-red-700/40 text-red-400"
            }`}
            data-ocid="serial_display.sync_status"
          >
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
            {isOnline ? "Synced" : "Offline"}
          </div>

          {/* Video panel toggle */}
          <button
            type="button"
            onClick={() => setShowVideoPanel((v) => !v)}
            className={`p-2.5 rounded-xl transition-colors ${
              showVideoPanel
                ? "bg-blue-800 hover:bg-blue-700"
                : "bg-gray-800 hover:bg-gray-700"
            }`}
            title={showVideoPanel ? "Hide video panel" : "Show video panel"}
            data-ocid="serial_display.video_toggle"
          >
            <MonitorPlay
              className={`w-5 h-5 ${showVideoPanel ? "text-blue-300" : "text-gray-400"}`}
            />
          </button>

          {/* Speech toggle */}
          <button
            type="button"
            onClick={() => setSpeechEnabled((v) => !v)}
            className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
            title={
              speechEnabled ? "Mute announcements" : "Enable announcements"
            }
            aria-label={
              speechEnabled ? "Mute announcements" : "Enable announcements"
            }
            data-ocid="serial_display.speech_toggle"
          >
            {speechEnabled ? (
              <Volume2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={handleFullscreen}
            className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
            title="Fullscreen"
            aria-label="Enter fullscreen"
            data-ocid="serial_display.fullscreen_button"
          >
            <Maximize2 className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      </div>

      {/* ── Mobile clock strip ───────────────────────────────────────────── */}
      <div className="sm:hidden flex items-center justify-between px-4 py-2 bg-gray-900/60 border-b border-gray-800/60 text-sm">
        <span className="text-gray-400 text-xs">{currentDateStr}</span>
        <span className="font-bold text-white tabular-nums">
          {currentTimeStr}
        </span>
      </div>

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {hasError && (
        <div
          className="mx-4 mt-3 flex items-center gap-3 bg-red-900/40 border border-red-700/40 rounded-xl px-4 py-3 text-sm text-red-300"
          data-ocid="serial_display.error_state"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          Queue data unavailable — reconnecting automatically. Check your
          connection.
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col gap-4 p-3 sm:p-6 ${showVideoPanel ? "lg:flex-row" : ""}`}
      >
        {/* Left section: Now Serving + Waiting Queue */}
        <div
          className={`flex flex-col gap-4 ${showVideoPanel ? "lg:flex-1" : "flex-1"}`}
        >
          {/* Now Serving hero panel */}
          <div
            className="flex-1 bg-gray-900/60 rounded-2xl border border-gray-800 flex flex-col items-center justify-center py-8 px-4 min-h-[240px]"
            data-ocid="serial_display.now_serving.panel"
          >
            <AnimatePresence mode="wait">
              {nowServing ? (
                <motion.div
                  key={nowServing.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.35 }}
                  className="text-center w-full max-w-md"
                >
                  <p className="text-gray-400 text-sm sm:text-base uppercase tracking-[0.25em] mb-4 font-medium">
                    Now Serving
                  </p>
                  <motion.div
                    animate={{
                      boxShadow: [
                        "0 0 0px #10b98180",
                        "0 0 40px #10b98180",
                        "0 0 0px #10b98180",
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                    className="w-24 h-24 sm:w-40 sm:h-40 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-5 ring-4 ring-emerald-400/30"
                  >
                    <span className="text-4xl sm:text-7xl font-black text-white">
                      {nowServing.serial}
                    </span>
                  </motion.div>
                  <h2 className="text-2xl sm:text-5xl lg:text-6xl font-bold text-white mb-2 px-2 break-words leading-tight">
                    {nowServing.patientName}
                  </h2>
                  <p className="text-gray-400 text-base sm:text-xl">
                    Serial #{nowServing.serial}
                  </p>
                  {speechEnabled && isSpeechAvailable() && (
                    <div className="mt-4 inline-flex items-center gap-2 text-emerald-400 text-sm bg-emerald-900/30 border border-emerald-800/40 rounded-full px-3 py-1.5">
                      <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                      Announcement active
                    </div>
                  )}
                </motion.div>
              ) : serials.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center"
                  data-ocid="serial_display.empty_state"
                >
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-5">
                    <Users className="w-12 h-12 sm:w-14 sm:h-14 text-gray-600" />
                  </div>
                  <h2 className="text-xl sm:text-3xl font-bold text-gray-500 px-4">
                    No patients in queue
                  </h2>
                  <p className="text-gray-600 mt-2 text-sm max-w-xs mx-auto leading-relaxed">
                    The queue is empty for today. Patients will appear here when
                    added by the doctor.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center"
                >
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-5">
                    <Users className="w-12 h-12 sm:w-14 sm:h-14 text-gray-600" />
                  </div>
                  <h2 className="text-xl sm:text-3xl font-bold text-gray-500 px-4">
                    No patient currently being served
                  </h2>
                  <p className="text-gray-600 mt-2 text-sm">
                    Waiting for the doctor to call the next patient
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Up Next indicator */}
            {waiting.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 px-6 sm:px-10 py-3 sm:py-4 bg-gray-800/80 rounded-2xl border border-amber-700/30 text-center"
                data-ocid="serial_display.up_next"
              >
                <p className="text-gray-500 text-xs uppercase tracking-widest mb-1 font-medium">
                  Up Next
                </p>
                <p className="text-lg sm:text-3xl font-bold text-amber-400">
                  #{waiting[0].serial} — {waiting[0].patientName}
                </p>
              </motion.div>
            )}
          </div>

          {/* Stats row */}
          <div className="flex gap-3">
            <div
              className="flex-1 bg-amber-900/20 border border-amber-800/30 rounded-xl px-4 py-3 text-center"
              data-ocid="serial_display.waiting_count"
            >
              <p className="text-2xl sm:text-3xl font-bold text-amber-400">
                {waiting.length}
              </p>
              <p className="text-amber-600/80 text-xs uppercase tracking-wide mt-0.5 font-medium">
                Waiting
              </p>
            </div>
            <div
              className="flex-1 bg-emerald-900/20 border border-emerald-800/30 rounded-xl px-4 py-3 text-center"
              data-ocid="serial_display.done_count"
            >
              <p className="text-2xl sm:text-3xl font-bold text-emerald-400">
                {doneCount}
              </p>
              <p className="text-emerald-600/80 text-xs uppercase tracking-wide mt-0.5 font-medium">
                Completed
              </p>
            </div>
            <div
              className="flex-1 bg-blue-900/20 border border-blue-800/30 rounded-xl px-4 py-3 text-center"
              data-ocid="serial_display.total_count"
            >
              <p className="text-2xl sm:text-3xl font-bold text-blue-400">
                {serials.length}
              </p>
              <p className="text-blue-600/80 text-xs uppercase tracking-wide mt-0.5 font-medium">
                Total
              </p>
            </div>
          </div>

          {/* Waiting queue list */}
          <div
            className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden"
            data-ocid="serial_display.queue.list"
          >
            <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between bg-gray-900/80">
              <h3 className="font-bold text-gray-200 text-base">
                Waiting Queue
              </h3>
              <span className="bg-amber-500 text-black text-xs font-bold px-2.5 py-0.5 rounded-full min-w-[1.5rem] text-center">
                {waiting.length}
              </span>
            </div>
            <div className="overflow-y-auto max-h-48 sm:max-h-56 p-3 space-y-2">
              {waiting.length === 0 ? (
                <p
                  className="text-gray-600 text-sm text-center py-8"
                  data-ocid="serial_display.queue.empty_state"
                >
                  No patients waiting
                </p>
              ) : (
                <AnimatePresence initial={false}>
                  {waiting.map((s, idx) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.2, delay: idx * 0.03 }}
                      className={`flex items-center gap-3 rounded-xl px-4 py-2.5 ${
                        idx === 0
                          ? "bg-amber-900/30 border border-amber-700/30"
                          : "bg-gray-800/60"
                      }`}
                      data-ocid={`serial_display.queue.item.${idx + 1}`}
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                          idx === 0
                            ? "bg-amber-500 text-black"
                            : "bg-gray-700 text-white"
                        }`}
                      >
                        {s.serial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate text-sm">
                          {s.patientName}
                        </p>
                        <p className="text-xs text-gray-500">
                          Arrived: {s.arrivalTime}
                        </p>
                      </div>
                      {idx === 0 && (
                        <span className="text-[10px] bg-amber-500 text-black font-bold px-1.5 py-0.5 rounded shrink-0">
                          NEXT
                        </span>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>

        {/* Right section: Health education video panel */}
        {showVideoPanel && (
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            className="lg:w-[420px] xl:w-[500px] flex flex-col gap-3"
            data-ocid="serial_display.video.panel"
          >
            <div className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden flex-1 flex flex-col min-h-[200px] sm:min-h-[280px]">
              <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MonitorPlay className="w-4 h-4 text-blue-400" />
                  <h3 className="font-bold text-gray-200 text-sm">
                    Health Education
                  </h3>
                </div>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                  Live
                </span>
              </div>

              {/* Video embed — uses a general health education playlist */}
              <div className="flex-1 relative bg-black">
                <iframe
                  src="https://www.youtube.com/embed/videoseries?list=PLbpi6ZahtOH6Ar_3GPy3workfN8S9-fvo&autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&modestbranding=1"
                  title="Health Education"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-0"
                  loading="lazy"
                />
              </div>

              {/* Health tip ticker */}
              <div className="px-4 py-2.5 bg-gray-900/90 border-t border-gray-800">
                <HealthTicker />
              </div>
            </div>

            {/* Quick health facts */}
            <div className="grid grid-cols-2 gap-2.5">
              {HEALTH_FACTS.map((fact) => (
                <div
                  key={fact.label}
                  className="bg-gray-900/50 border border-gray-800 rounded-xl p-3"
                >
                  <p className="text-lg font-bold text-emerald-400">
                    {fact.value}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                    {fact.label}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Health ticker ─────────────────────────────────────────────────────────────

const HEALTH_TIPS = [
  "💧 Drink at least 8 glasses of water daily to stay healthy.",
  "🚶 Walk 30 minutes every day to maintain a healthy heart.",
  "🥦 Eat more vegetables and fruits for essential vitamins.",
  "😴 Get 7–8 hours of sleep every night for body recovery.",
  "🩺 Visit your doctor regularly for preventive check-ups.",
  "🚭 Avoid smoking — it causes heart disease and cancer.",
  "🧘 Manage stress with yoga, meditation, or deep breathing.",
  "💊 Never skip prescribed medicines without consulting your doctor.",
];

const HEALTH_FACTS = [
  { value: "150 min", label: "Weekly exercise target" },
  { value: "5 servings", label: "Fruits & veggies per day" },
  { value: "8 hrs", label: "Recommended daily sleep" },
  { value: "<120/80", label: "Healthy blood pressure" },
];

function HealthTicker() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const iv = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % HEALTH_TIPS.length);
        setVisible(true);
      }, 400);
    }, 6_000);
    return () => clearInterval(iv);
  }, []);

  return (
    <p
      className={`text-xs text-gray-300 transition-opacity duration-400 ${visible ? "opacity-100" : "opacity-0"}`}
      style={{ minHeight: "1.25rem" }}
    >
      {HEALTH_TIPS[idx]}
    </p>
  );
}

// ── Exported component with error boundary ────────────────────────────────────

export default function SerialDisplay() {
  return (
    <QueueErrorBoundary>
      <SerialDisplayInner />
    </QueueErrorBoundary>
  );
}
