// pages/Reader.jsx
//
// Books / notes padhne ka in-app reader. PDF sirf memory mein decrypt hoti hai
// aur canvas par dikhti hai — koi download / print button nahi, aur har page
// par student ka naam/phone watermark.
//
// Ye page lazy-load hota hai (PDF.js ~1MB), baaki app par asar nahi.
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import api from "../api/api";
import {
  OfflineError,
  getDeviceId,
  getOfflineItem,
  isExpired,
  readOffline,
  saveOffline,
  syncOffline,
} from "../offline/offlineStore";

GlobalWorkerOptions.workerSrc = workerUrl;

const ZOOMS = [1, 1.25, 1.5, 2];

const Watermark = ({ text }) => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden select-none" aria-hidden="true">
    {[15, 50, 85].map((top) => (
      <p
        key={top}
        className="absolute left-1/2 whitespace-nowrap text-[13px] font-semibold text-black/10"
        style={{ top: `${top}%`, transform: "translate(-50%, -50%) rotate(-30deg)" }}
      >
        {text}
      </p>
    ))}
  </div>
);

const PdfPage = ({ pdf, pageNumber, width, zoom, watermark }) => {
  const holderRef = useRef(null);
  const canvasRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [ratio, setRatio] = useState(1.414);

  useEffect(() => {
    let cancelled = false;
    pdf.getPage(pageNumber).then((page) => {
      if (cancelled) return;
      const vp = page.getViewport({ scale: 1 });
      setRatio(vp.height / vp.width);
    });
    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber]);

  // Sirf screen ke paas wale pages render — 300 page ki book bhi halki chale
  useEffect(() => {
    const el = holderRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: "800px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !width) return undefined;
    let task;
    let cancelled = false;
    pdf.getPage(pageNumber).then((page) => {
      if (cancelled || !canvasRef.current) return;
      const cssWidth = width * zoom;
      const base = page.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (cssWidth / base.width) * dpr });
      const canvas = canvasRef.current;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      task = page.render({ canvas, viewport });
      task.promise.catch(() => {});
    });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [visible, pdf, pageNumber, width, zoom]);

  const cssWidth = width * zoom;
  return (
    <div
      ref={holderRef}
      className="relative bg-white mx-auto shadow-lg"
      style={{ width: cssWidth, height: cssWidth * ratio }}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
      <Watermark text={watermark} />
      <span className="absolute bottom-1 right-2 text-[10px] text-gray-400">{pageNumber}</span>
    </div>
  );
};

const DeviceLimit = ({ devices, onRemoved }) => {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const remove = async (deviceId) => {
    setBusy(deviceId);
    setError("");
    try {
      await api.post(`/offline/devices/${encodeURIComponent(deviceId)}/remove`);
      onRemoved();
    } catch (err) {
      setError(err.response?.data?.message || "Could not remove the phone.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="mt-5 space-y-2 text-left">
      {devices.map((d) => (
        <div key={d.deviceId} className="flex items-center gap-3 bg-[#111827] border border-gray-800 rounded-xl p-3">
          <span className="text-xl">📱</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{d.label}</p>
            <p className="text-[11px] text-gray-500">
              Last used {new Date(d.lastSeenAt).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => remove(d.deviceId)}
            disabled={!!busy}
            className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-300 text-xs font-semibold disabled:opacity-50"
          >
            {busy === d.deviceId ? "..." : "Remove"}
          </button>
        </div>
      ))}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <p className="text-[11px] text-gray-500">All offline books/notes on the removed phone will stop working.</p>
    </div>
  );
};

const Reader = () => {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const loadingTaskRef = useRef(null);

  const [phase, setPhase] = useState("loading"); // loading | downloading | ready | error
  const [error, setError] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [meta, setMeta] = useState(null);
  const [width, setWidth] = useState(0);
  const [zoomIndex, setZoomIndex] = useState(0);

  const open = useCallback(async () => {
    try {
      let saved = await getOfflineItem(type, id).catch(() => null);

      if (saved && isExpired(saved) && navigator.onLine) {
        await syncOffline();
        saved = await getOfflineItem(type, id).catch(() => null);
      }
      if (!saved || isExpired(saved)) {
        if (!navigator.onLine) {
          throw new OfflineError(
            saved
              ? "Offline access has expired. Turn on the internet and open it again."
              : "This is not saved on this phone. You need internet to open it the first time.",
            { code: "OFFLINE" }
          );
        }
        setPhase("downloading");
        await saveOffline(type, id);
      }

      const { item, data } = await readOffline(type, id);
      loadingTaskRef.current?.destroy();
      const loadingTask = getDocument({ data, isEvalSupported: false, disableAutoFetch: true });
      loadingTaskRef.current = loadingTask;
      const doc = await loadingTask.promise;
      setMeta(item);
      setPdf(doc);
      setPhase("ready");
    } catch (err) {
      setError(err instanceof OfflineError ? err : new OfflineError("Could not open the file. Please try again."));
      setPhase("error");
    }
  }, [type, id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async load; setState await ke baad
    open();
  }, [open]);

  const retry = () => {
    setPhase("loading");
    setError(null);
    open();
  };

  // Reader band hone par PDF memory se hatao
  useEffect(() => () => loadingTaskRef.current?.destroy(), []);

  // Device ki pehchaan pehle se bana lo (sync ke liye)
  useEffect(() => {
    getDeviceId().catch(() => {});
  }, []);

  useEffect(() => {
    const measure = () => {
      const w = containerRef.current?.clientWidth || window.innerWidth;
      setWidth(Math.min(w - 16, 900));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [phase]);

  // Right-click / copy band — sirf padhne ke liye
  const block = (e) => e.preventDefault();

  return (
    <div
      className="reader-root min-h-screen bg-[#0A0D14] text-white select-none"
      onContextMenu={block}
      onCopy={block}
      onDragStart={block}
    >
      <style>{`@media print { .reader-root { display: none !important; } body::after { content: "Printing is disabled."; } }`}</style>

      <header className="sticky top-0 z-20 flex items-center gap-3 px-3 py-3 bg-[#0A0D14]/95 backdrop-blur border-b border-gray-800">
        <button onClick={() => navigate(-1)} className="text-gray-400 text-xl leading-none px-1" aria-label="Back">
          ←
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{meta?.title || "Reader"}</p>
          {meta?.subtitle && <p className="text-[11px] text-gray-500 truncate">{meta.subtitle}</p>}
        </div>
        {phase === "ready" && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoomIndex((z) => Math.max(0, z - 1))}
              disabled={zoomIndex === 0}
              className="w-8 h-8 rounded-lg border border-gray-700 text-lg disabled:opacity-40"
              aria-label="Zoom out"
            >
              −
            </button>
            <button
              onClick={() => setZoomIndex((z) => Math.min(ZOOMS.length - 1, z + 1))}
              disabled={zoomIndex === ZOOMS.length - 1}
              className="w-8 h-8 rounded-lg border border-gray-700 text-lg disabled:opacity-40"
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
        )}
      </header>

      <main ref={containerRef} className="py-4 px-2 overflow-x-auto">
        {(phase === "loading" || phase === "downloading") && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="w-10 h-10 rounded-full border-2 border-gray-700 border-t-[#7C3AED] animate-spin" />
            <p className="text-sm text-gray-400">
              {phase === "downloading" ? "Saving to your phone — next time it will open without internet..." : "Opening..."}
            </p>
          </div>
        )}

        {phase === "error" && (
          <div className="max-w-md mx-auto text-center py-16 px-4">
            <p className="text-4xl mb-3">{error?.code === "DEVICE_LIMIT" ? "📱" : "📄"}</p>
            <p className="text-sm text-gray-300 leading-relaxed">{error?.message}</p>
            {error?.code === "DEVICE_LIMIT" && error.devices?.length > 0 && (
              <DeviceLimit devices={error.devices} onRemoved={retry} />
            )}
            <div className="flex justify-center gap-3 mt-6">
              <button onClick={retry} className="px-5 py-2 rounded-lg bg-[#7C3AED] text-sm font-medium">
                Try again
              </button>
              <button onClick={() => navigate("/MyDownloads")} className="px-5 py-2 rounded-lg border border-gray-700 text-sm">
                My Downloads
              </button>
            </div>
          </div>
        )}

        {phase === "ready" && pdf && width > 0 && (
          <div className="space-y-3">
            {Array.from({ length: pdf.numPages }, (_, i) => (
              <PdfPage
                key={i + 1}
                pdf={pdf}
                pageNumber={i + 1}
                width={width}
                zoom={ZOOMS[zoomIndex]}
                watermark={meta?.watermark || "AntimPrayash.in"}
              />
            ))}
            <p className="text-center text-[11px] text-gray-600 py-4">
              {pdf.numPages} pages · Offline available
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Reader;
