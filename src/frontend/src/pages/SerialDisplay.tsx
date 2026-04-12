import { Maximize2, Users, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

function todayKey() {
  return `clinic_serials_${new Date().toISOString().slice(0, 10)}`;
}

interface SerialEntry {
  id: string;
  serial: number;
  patientName: string;
  phone: string;
  arrivalTime: string;
  status: "waiting" | "in-progress" | "done";
}

export default function SerialDisplay() {
  const [serials, setSerials] = useState<SerialEntry[]>([]);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [time, setTime] = useState(new Date());
  const prevNowServingRef = useRef<string | null>(null);

  // Real-time clock
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  // Poll localStorage for queue updates every 2s
  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem(todayKey());
        const data: SerialEntry[] = raw ? JSON.parse(raw) : [];
        setSerials(data);
      } catch {
        setSerials([]);
      }
    };
    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, []);

  const nowServing = serials.find((s) => s.status === "in-progress") ?? null;
  const waiting = serials.filter((s) => s.status === "waiting");
  const doneCount = serials.filter((s) => s.status === "done").length;

  // Announce when now-serving changes
  useEffect(() => {
    const name = nowServing?.patientName ?? null;
    if (name && name !== prevNowServingRef.current && speechEnabled) {
      const serial = nowServing?.serial;
      const utterance = new SpeechSynthesisUtterance(
        `Now serving: ${name}, serial number ${serial}. Please proceed to the consultation room.`,
      );
      utterance.rate = 0.85;
      utterance.pitch = 1;
      utterance.volume = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
    prevNowServingRef.current = name;
  }, [nowServing, speechEnabled]);

  const handleFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 sm:px-8 py-4 bg-gray-900/80 border-b border-gray-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
            Dr. Arman Kabir&apos;s Care
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Patient Queue Display</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
            {currentTimeStr}
          </p>
          <p className="text-gray-400 text-xs sm:text-sm">{currentDateStr}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setSpeechEnabled((v) => !v)}
            className="p-2.5 sm:p-3 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
            title={
              speechEnabled ? "Mute announcements" : "Enable announcements"
            }
          >
            {speechEnabled ? (
              <Volume2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-500" />
            )}
          </button>
          <button
            type="button"
            onClick={handleFullscreen}
            className="p-2.5 sm:p-3 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 p-4 sm:p-8">
        {/* Now serving + next */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {nowServing ? (
              <motion.div
                key={nowServing.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                <p className="text-gray-400 text-base sm:text-lg uppercase tracking-[0.3em] mb-4">
                  Now Serving
                </p>
                <div className="w-24 h-24 sm:w-36 sm:h-36 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl shadow-emerald-500/30 ring-4 ring-emerald-400/30">
                  <span className="text-4xl sm:text-6xl font-black text-white">
                    {nowServing.serial}
                  </span>
                </div>
                <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-3 px-4 break-words">
                  {nowServing.patientName}
                </h2>
                <p className="text-gray-400 text-lg sm:text-xl">
                  Serial #{nowServing.serial}
                </p>
                {speechEnabled && (
                  <div className="mt-4 sm:mt-6 flex items-center justify-center gap-2 text-emerald-400 text-sm">
                    <Volume2 className="w-4 h-4 animate-pulse" />
                    Announcement active
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Users className="w-14 h-14 sm:w-16 sm:h-16 text-gray-600" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-500 px-4">
                  No patient currently being served
                </h2>
                <p className="text-gray-600 mt-2 text-sm">
                  Waiting for the doctor to call the next patient
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Next patient indicator */}
          {waiting.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 sm:mt-10 px-6 sm:px-10 py-4 sm:py-5 bg-gray-900 rounded-2xl border border-gray-800 text-center"
            >
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">
                Up Next
              </p>
              <p className="text-xl sm:text-3xl font-bold text-amber-400">
                #{waiting[0].serial} — {waiting[0].patientName}
              </p>
            </motion.div>
          )}

          {/* Stats row */}
          <div className="mt-6 flex gap-4 sm:gap-6 text-center">
            <div className="bg-amber-900/30 border border-amber-800/40 rounded-xl px-4 sm:px-6 py-3">
              <p className="text-2xl sm:text-3xl font-bold text-amber-400">
                {waiting.length}
              </p>
              <p className="text-amber-600 text-xs uppercase tracking-wide mt-0.5">
                Waiting
              </p>
            </div>
            <div className="bg-emerald-900/30 border border-emerald-800/40 rounded-xl px-4 sm:px-6 py-3">
              <p className="text-2xl sm:text-3xl font-bold text-emerald-400">
                {doneCount}
              </p>
              <p className="text-emerald-600 text-xs uppercase tracking-wide mt-0.5">
                Completed
              </p>
            </div>
          </div>
        </div>

        {/* Waiting queue */}
        <div className="lg:w-80 xl:w-96 flex flex-col">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 flex-1 flex flex-col overflow-hidden max-h-[60vh] lg:max-h-none">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-gray-200 text-lg">Waiting Queue</h3>
              <span className="bg-amber-500 text-black text-xs font-bold px-2.5 py-0.5 rounded-full">
                {waiting.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {waiting.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-10">
                  No patients waiting
                </p>
              ) : (
                <AnimatePresence>
                  {waiting.map((s, idx) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.2, delay: idx * 0.04 }}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                        idx === 0
                          ? "bg-amber-900/40 border border-amber-700/40"
                          : "bg-gray-800"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-base ${
                          idx === 0
                            ? "bg-amber-500 text-black"
                            : "bg-gray-700 text-white"
                        }`}
                      >
                        {s.serial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate text-base">
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
      </div>
    </div>
  );
}
