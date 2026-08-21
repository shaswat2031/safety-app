"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSafety } from "@/context/SafetyContext";
import { evaluateGeofence } from "@/lib/geofence";
import {
  ShieldAlert,
  AlertOctagon,
  MapPin,
  PhoneCall,
  Camera,
  CheckCircle2,
  BatteryCharging,
  Volume2,
  VolumeX,
  X,
  Send,
  AlertTriangle,
  Navigation,
  UploadCloud,
  Check,
  Lock,
  User,
  Phone,
  Droplet,
  Building2,
  IdCard,
  Mail,
  PhoneIncoming,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";

/* ─────────────── helpers ─────────────── */
const EMERGENCY_CONTACTS = [
  {
    id: "ec-1",
    name: "Control Room Hotline",
    role: "Direct Emergency Desk",
    number: "9265318481",
    color: "red",
  },
  {
    id: "ec-2",
    name: "Vedanta Emergency",
    role: "National Helpline",
    number: "108",
    color: "purple",
  },
  {
    id: "ec-3",
    name: "QRF Ambulance Unit",
    role: "Quick Response",
    number: "+919876599887",
    color: "amber",
  },
  {
    id: "ec-4",
    name: "Site Safety Officer",
    role: "EHS Department",
    number: "+919876500001",
    color: "blue",
  },
];

const colorVariants = {
  red: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    btn: "bg-red-600 hover:bg-red-700 text-white",
    icon: "bg-red-100 text-red-600",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    btn: "bg-purple-600 hover:bg-purple-700 text-white",
    icon: "bg-purple-100 text-purple-600",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    btn: "bg-amber-500 hover:bg-amber-600 text-white",
    icon: "bg-amber-100 text-amber-600",
  },
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    btn: "bg-blue-600 hover:bg-blue-700 text-white",
    icon: "bg-blue-100 text-blue-600",
  },
};

/* ─────────────── component ─────────────── */
export default function WorkerPage() {
  const router = useRouter();
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const {
    triggerSOS,
    resolveSOS,
    reportIncident,
    sosAlerts,
    zones,
    updateWorkerLocation,
    isSirenMuted,
    toggleSirenMute,
    isOnline,
  } = useSafety();

  /* auth guard */
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("Please login to access Worker SOS Portal.");
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  /* ── state ── */
  const [countdown, setCountdown] = useState(3);
  const [isActivating, setIsActivating] = useState(false);
  const countdownRef = useRef(null);

  /* default site coords fallback */
  const DEFAULT_SITE_COORDS = { lat: 19.711355, lng: 83.398825 };
  const [coords, setCoords] = useState(DEFAULT_SITE_COORDS);
  const [accuracy, setAccuracy] = useState(10);
  const [speed, setSpeed] = useState(0);
  const [heading, setHeading] = useState(0);
  const [address, setAddress] = useState("Acquiring location…");
  const [battery, setBattery] = useState(null);
  const [batteryCharging, setBatteryCharging] = useState(false);
  const [gpsReady, setGpsReady] = useState(false);
  const [gpsType, setGpsType] = useState("acquiring"); // 'hardware' | 'network' | 'site_default' | 'acquiring' | 'unavailable'

  const zonesRef = useRef(zones);
  const profileRef = useRef(profile);
  const updateWorkerLocationRef = useRef(updateWorkerLocation);
  const lastGeocodeTimeRef = useRef(0);
  const lastGeocodeCoordsRef = useRef(null);

  useEffect(() => {
    zonesRef.current = zones;
  }, [zones]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    updateWorkerLocationRef.current = updateWorkerLocation;
  }, [updateWorkerLocation]);

  const [zoneStatus, setZoneStatus] = useState({
    zoneName: "Acquiring location…",
    isBreached: false,
    breachType: "safe",
  });

  /* modals */
  const [showReport, setShowReport] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  /* report form */
  const [reportData, setReportData] = useState({
    title: "",
    category: "fire",
    severity: "high",
    description: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  /* active SOS for this worker */
  const myActiveSOS = sosAlerts.find(
    (a) =>
      (a.worker_id === profile?.id ||
        a.employee_code === profile?.employee_code) &&
      ["active", "acknowledged", "dispatched"].includes(a.status)
  );

  /* ── battery — real API, no fake fallback ── */
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (typeof navigator.getBattery === "function") {
      navigator.getBattery()
        .then((b) => {
          const update = () => {
            setBattery(Math.round(b.level * 100));
            setBatteryCharging(b.charging);
          };
          update();
          b.addEventListener("levelchange", update);
          b.addEventListener("chargingchange", update);
          return () => {
            b.removeEventListener("levelchange", update);
            b.removeEventListener("chargingchange", update);
          };
        })
        .catch(() => setBattery(null));
    } else {
      setBattery(null);
    }
  }, []);

  /* ── reverse geocode helper (throttled) ── */
  const reverseGeocode = useCallback(async (lat, lng) => {
    const now = Date.now();
    if (lastGeocodeCoordsRef.current) {
      const dLat = Math.abs(lat - lastGeocodeCoordsRef.current.lat);
      const dLng = Math.abs(lng - lastGeocodeCoordsRef.current.lng);
      if (now - lastGeocodeTimeRef.current < 15000 && dLat < 0.0005 && dLng < 0.0005) {
        return;
      }
    }
    lastGeocodeTimeRef.current = now;
    lastGeocodeCoordsRef.current = { lat, lng };

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data?.display_name) {
        const parts = data.display_name.split(",").map((s) => s.trim());
        const short = parts.slice(0, 3).join(", ");
        setAddress(short);
      }
    } catch {
      // keep previous address
    }
  }, []);

  const batteryRef = useRef(battery);
  useEffect(() => {
    batteryRef.current = battery;
    const currentProfile = profileRef.current;
    if (currentProfile?.id && updateWorkerLocationRef.current && coords) {
      updateWorkerLocationRef.current(currentProfile.id, coords.lat, coords.lng, speed, heading, currentProfile, battery);
    }
  }, [battery, coords, speed, heading]);

  /* ── position handler ── */
  const handlePositionUpdate = useCallback(
    (pos, source = "hardware") => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const spd = pos.coords.speed != null ? Math.round(pos.coords.speed * 3.6) : 0;
      const hdg = pos.coords.heading != null ? Math.round(pos.coords.heading) : 0;
      const acc = pos.coords.accuracy != null ? Math.round(pos.coords.accuracy) : 10;

      setCoords({ lat, lng });
      setSpeed(spd);
      setHeading(hdg);
      setAccuracy(acc);
      setGpsType(source);
      setGpsReady(true);

      const zone = evaluateGeofence([lat, lng], zonesRef.current || []);
      setZoneStatus(zone);
      reverseGeocode(lat, lng);

      const currentProfile = profileRef.current;
      if (currentProfile?.id && updateWorkerLocationRef.current) {
        updateWorkerLocationRef.current(currentProfile.id, lat, lng, spd, hdg, currentProfile, batteryRef.current);
      }
    },
    [reverseGeocode]
  );

  /* ── GPS watch & initial position ── */
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsType("site_default");
      setGpsReady(true);
      return;
    }

    let watchId = null;
    let fallbackWatchId = null;
    setGpsType("acquiring");

    // Initial fix attempt (High accuracy first, then fallback to network)
    navigator.geolocation.getCurrentPosition(
      (pos) => handlePositionUpdate(pos, "hardware"),
      (err1) => {
        console.warn("High accuracy initial location failed, trying network positioning:", err1.message);
        navigator.geolocation.getCurrentPosition(
          (pos) => handlePositionUpdate(pos, "network"),
          (err2) => {
            console.warn("Network initial location failed:", err2.message);
            setGpsType("site_default");
            setGpsReady(true);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );

    // Continuous location tracking
    watchId = navigator.geolocation.watchPosition(
      (pos) => handlePositionUpdate(pos, "hardware"),
      (err) => {
        console.warn("High accuracy watchPosition error, falling back to network watch:", err.message);
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }

        fallbackWatchId = navigator.geolocation.watchPosition(
          (pos) => handlePositionUpdate(pos, "network"),
          (fallbackErr) => {
            console.warn("Network watchPosition failed:", fallbackErr.message);
            setGpsType((prev) => (prev === "hardware" || prev === "network" ? prev : "site_default"));
            setGpsReady(true);
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (fallbackWatchId !== null) navigator.geolocation.clearWatch(fallbackWatchId);
    };
  }, [handlePositionUpdate]);

  const recalibrateGPS = () => {
    if (!navigator.geolocation) {
      toast.error("GPS not available on this device.");
      return;
    }
    toast.loading("Acquiring GPS lock…", { id: "gps" });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handlePositionUpdate(pos, "hardware");
        toast.success(
          `GPS locked ±${pos.coords.accuracy != null ? Math.round(pos.coords.accuracy) : "?"}m`,
          { id: "gps" }
        );
      },
      (err) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            handlePositionUpdate(pos, "network");
            toast.success(
              `Network location acquired ±${pos.coords.accuracy != null ? Math.round(pos.coords.accuracy) : "?"}m`,
              { id: "gps" }
            );
          },
          (err2) => {
            toast.info("Using plant site default coordinates.", { id: "gps" });
            setGpsType("site_default");
            setGpsReady(true);
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  /* ── SOS logic ── */
  const startSOS = () => {
    if (myActiveSOS) return;
    setIsActivating(true);
    setCountdown(3);
    let c = 3;
    countdownRef.current = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(countdownRef.current);
        setIsActivating(false);
        setCountdown(3);
        triggerSOS(profile, { lat: coords.lat, lng: coords.lng, battery }, "Field Worker Immediate Distress Signal");
        toast.error("🚨 SOS BROADCASTED TO CENTRAL COMMAND!", { duration: 6000 });
      }
    }, 1000);
  };

  const cancelSOS = () => {
    clearInterval(countdownRef.current);
    setIsActivating(false);
    setCountdown(3);
    toast.info("SOS cancelled.");
  };

  const standDown = () => {
    if (myActiveSOS) {
      resolveSOS(myActiveSOS.id, "Worker confirmed safe. Stand-down.");
      toast.success("Stand-down sent. Command Center notified.");
    }
  };

  useEffect(() => () => clearInterval(countdownRef.current), []);

  /* ── report submit ── */
  const submitReport = async (e) => {
    e.preventDefault();
    if (!reportData.title.trim() || !reportData.description.trim()) {
      toast.error("Title and description are required.");
      return;
    }
    setUploading(true);
    await reportIncident(
      {
        title: reportData.title,
        category: reportData.category,
        severity: reportData.severity,
        description: reportData.description,
        reporter_name: profile?.full_name || "Field Worker",
        reporter_code: profile?.employee_code || "",
        reporter_id: profile?.id,
        lat: coords?.lat ?? 0,
        lng: coords?.lng ?? 0,
      },
      selectedFile
    );
    setUploading(false);
    toast.success("Incident report submitted & media uploaded.");
    setShowReport(false);
    setReportData({ title: "", category: "fire", severity: "high", description: "" });
    setSelectedFile(null);
    setFilePreview(null);
  };

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) { setSelectedFile(f); setFilePreview(URL.createObjectURL(f)); }
  };

  const safeCheckIn = () => {
    toast.success(`"I AM SAFE" check-in logged for ${profile?.full_name || "Worker"}.`);
  };

  /* ── zone colour ── */
  const zoneColorClass =
    zoneStatus.breachType === "hazard"
      ? "bg-red-50 border-red-300 text-red-800"
      : zoneStatus.breachType === "restricted"
      ? "bg-amber-50 border-amber-300 text-amber-800"
      : "bg-emerald-50 border-emerald-300 text-emerald-800";

  const zoneIcon =
    zoneStatus.breachType === "hazard"
      ? "🔴"
      : zoneStatus.breachType === "restricted"
      ? "🟡"
      : "🟢";

  /* ── loading guard ── */
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 gap-3">
        <Lock className="w-8 h-8 text-red-500 animate-pulse" />
        <p className="text-sm font-bold text-white">Authenticating…</p>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col pb-8">
      {/* ── TOP BAR ── */}
      <div className="bg-white border-b border-slate-200 px-3.5 py-2.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs sm:text-sm shrink-0 shadow-xs">
            {profile?.full_name?.charAt(0)?.toUpperCase() || "W"}
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate">
              {profile?.full_name || "Worker"}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 font-mono leading-tight truncate">
              {profile?.employee_code || "VED-MN"} {profile?.department ? `· ${profile.department}` : ""}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* status badge */}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] font-bold border ${
              isOnline
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            {isOnline ? <Wifi className="w-3 h-3 text-emerald-600" /> : <WifiOff className="w-3 h-3 text-amber-600" />}
            <span>{isOnline ? "Online" : "Offline"}</span>
          </div>

          {/* siren mute toggle */}
          <button
            onClick={toggleSirenMute}
            className={`p-1.5 sm:p-2 rounded-xl border transition-colors ${
              isSirenMuted
                ? "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200"
                : "bg-red-50 border-red-200 text-red-600 animate-pulse"
            }`}
            title={isSirenMuted ? "Unmute Alarm" : "Mute Alarm"}
          >
            {isSirenMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          {/* profile trigger */}
          <button
            onClick={() => setShowProfile(true)}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 transition-colors"
            title="My Profile"
          >
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* ── ZONE STATUS BANNER ── */}
      <div className={`mx-3 mt-3 rounded-2xl border px-3.5 py-2.5 flex items-center gap-2.5 ${zoneColorClass}`}>
        <div className="shrink-0 flex items-center justify-center">
          {zoneStatus.breachType === "hazard" ? (
            <ShieldAlert className="w-5 h-5 text-red-600 animate-pulse" />
          ) : zoneStatus.breachType === "restricted" ? (
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-black truncate">
            {zoneStatus.zoneName === "Acquiring location…" ? "Detecting Zone…" : zoneStatus.zoneName}
          </div>
          <div className="text-[11px] opacity-90 mt-0.5 truncate font-medium">
            {zoneStatus.breachType === "hazard"
              ? "Hazard Area — PPE Mandatory"
              : zoneStatus.breachType === "restricted"
              ? "Restricted Access — Authorized Only"
              : zoneStatus.zoneName === "Outside Monitored Perimeter"
              ? "Unmonitored Sector — Exercise Vigilance"
              : "Safe Operational Zone"}
          </div>
        </div>
      </div>

      {/* ── SOS MAIN PANEL ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-5">
        {myActiveSOS ? (
          /* ─ ACTIVE SOS STATE ─ */
          <div className="w-full max-w-sm bg-white border-2 border-red-500 rounded-3xl p-5 space-y-4 shadow-2xl shadow-red-200">
            <div className="flex flex-col items-center gap-2 pt-1">
              <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-xl animate-bounce">
                <ShieldAlert className="w-7 h-7 text-white" />
              </div>
              <div className="text-[11px] font-black uppercase tracking-wider text-red-600">
                EMERGENCY ALERT ACTIVE
              </div>
              <div className="text-base font-black text-slate-900 text-center">
                Command Center Alerted
              </div>
            </div>

            {/* status steps */}
            <div className="bg-slate-50 rounded-2xl p-3 space-y-2 border border-slate-100">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Response Status
              </div>

              {[
                { label: "Distress signal broadcasted", done: true },
                {
                  label: "Acknowledged by Command Desk",
                  done: ["acknowledged", "dispatched"].includes(myActiveSOS.status),
                },
                {
                  label: myActiveSOS.dispatched_to
                    ? `QRF En Route: ${myActiveSOS.dispatched_to}`
                    : "QRF Dispatching",
                  done: myActiveSOS.status === "dispatched",
                  pulse: myActiveSOS.status === "dispatched",
                },
              ].map((step, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 text-xs font-semibold ${
                    step.done
                      ? step.pulse
                        ? "text-blue-600 animate-pulse"
                        : "text-emerald-700"
                      : "text-slate-400"
                  }`}
                >
                  {step.done ? (
                    <Check className="w-4 h-4 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-current shrink-0" />
                  )}
                  <span>{step.label}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={toggleSirenMute}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                {isSirenMuted ? (
                  <><VolumeX className="w-4 h-4 text-amber-500" /> Unmute</>
                ) : (
                  <><Volume2 className="w-4 h-4 text-red-600" /> Mute Siren</>
                )}
              </button>
              <button
                onClick={standDown}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-md transition-colors"
              >
                <Check className="w-4 h-4" /> I Am Safe
              </button>
            </div>
          </div>
        ) : isActivating ? (
          /* ─ COUNTDOWN SCREEN ─ */
          <div className="w-full max-w-sm bg-white border-2 border-red-500 rounded-3xl p-7 text-center space-y-4 shadow-2xl">
            <div className="text-7xl font-black text-red-600 tabular-nums animate-pulse">
              {countdown}
            </div>
            <div className="text-sm font-bold text-slate-800">
              Broadcasting SOS in {countdown}s…
            </div>
            <button
              onClick={cancelSOS}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm rounded-2xl border border-slate-200 transition-colors"
            >
              Cancel SOS
            </button>
          </div>
        ) : (
          /* ─ NORMAL SOS TRIGGER BUTTON ─ */
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-red-500/20 animate-ping" />
              <div className="absolute -inset-8 rounded-full bg-red-400/10 animate-pulse" />
              <button
                onClick={startSOS}
                className="relative w-52 h-52 rounded-full bg-gradient-to-br from-red-700 via-red-600 to-rose-500 text-white flex flex-col items-center justify-center gap-2 shadow-2xl shadow-red-700/40 border-4 border-white active:scale-95 transition-transform cursor-pointer select-none"
                aria-label="Trigger SOS emergency"
              >
                <AlertOctagon className="w-14 h-14 animate-pulse" />
                <span className="text-4xl font-black tracking-widest">SOS</span>
                <span className="text-[11px] font-bold uppercase tracking-widest opacity-90">
                  Press to Activate
                </span>
              </button>
            </div>
            <p className="text-center text-xs text-slate-500 max-w-[220px] font-medium leading-tight mt-1">
              Broadcasts live GPS location & alerts Command Center.
            </p>
          </div>
        )}
      </div>

      {/* ── GPS TELEMETRY STRIP ── */}
      <div className="mx-3 mb-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                gpsType === "hardware"
                  ? "bg-emerald-500 animate-pulse"
                  : gpsType === "network"
                  ? "bg-blue-500 animate-pulse"
                  : gpsType === "acquiring"
                  ? "bg-amber-400 animate-ping"
                  : "bg-slate-400"
              }`}
            />
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
              Live Telemetry
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              (
              {gpsType === "hardware"
                ? "Hardware GPS"
                : gpsType === "network"
                ? "Network Location"
                : gpsType === "site_default"
                ? "Plant Site Default"
                : gpsType === "acquiring"
                ? "Acquiring Lock…"
                : "Fallback"}
              )
            </span>
          </div>
          <button
            onClick={recalibrateGPS}
            className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Recalibrate
          </button>
        </div>

        {/* Address subtext */}
        {address && address !== "Acquiring location…" && (
          <div className="text-[11px] font-semibold text-slate-600 mb-2 truncate flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
            <MapPin className="w-3 h-3 text-red-500 shrink-0" />
            <span className="truncate">{address}</span>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { icon: <Navigation className="w-3.5 h-3.5 text-blue-500" />, label: "Lat", val: coords.lat.toFixed(5) },
            { icon: <Navigation className="w-3.5 h-3.5 text-blue-500 rotate-90" />, label: "Lng", val: coords.lng.toFixed(5) },
            { icon: <MapPin className="w-3.5 h-3.5 text-emerald-500" />, label: "Accuracy", val: accuracy != null ? `±${accuracy}m` : "—" },
            { icon: <BatteryCharging className="w-3.5 h-3.5 text-emerald-500" />, label: "Battery", val: battery != null ? `${battery}%` : "—" },
          ].map((item) => (
            <div key={item.label} className="bg-slate-50 rounded-xl p-2 border border-slate-100">
              <div className="flex items-center justify-center mb-0.5">{item.icon}</div>
              <div className="text-[10px] text-slate-400">{item.label}</div>
              <div className="text-[11px] font-black text-slate-800 font-mono truncate">{item.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM ACTION BUTTONS ── */}
      <div className="mx-3 mb-4 grid grid-cols-3 gap-2.5">
        {/* Voice Call */}
        <button
          onClick={() => setShowCall(true)}
          className="flex flex-col items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-colors active:scale-95"
        >
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <PhoneCall className="w-5 h-5 text-red-600" />
          </div>
          <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
            Emergency<br />Call
          </span>
        </button>

        {/* Report Incident */}
        <button
          onClick={() => setShowReport(true)}
          className="flex flex-col items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-colors active:scale-95"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Camera className="w-5 h-5 text-amber-600" />
          </div>
          <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
            Report<br />Hazard
          </span>
        </button>

        {/* Check-In Safe */}
        <button
          onClick={safeCheckIn}
          className="flex flex-col items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-colors active:scale-95"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
            Check-In<br />Safe
          </span>
        </button>
      </div>

      {/* ════════ MODAL: Voice Call ════════ */}
      {showCall && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
            {/* header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                  <PhoneCall className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900">Emergency Contacts</div>
                  <div className="text-[11px] text-slate-500">Tap to call directly</div>
                </div>
              </div>
              <button
                onClick={() => setShowCall(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* contact list */}
            <div className="p-4 space-y-2">
              {EMERGENCY_CONTACTS.map((c) => {
                const cv = colorVariants[c.color];
                return (
                  <a
                    key={c.id}
                    href={`tel:${c.number}`}
                    className={`flex items-center gap-3 p-3 rounded-2xl border ${cv.bg} ${cv.border} transition-all active:scale-98 group`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cv.icon}`}>
                      <PhoneIncoming className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-black ${cv.text} truncate`}>{c.name}</div>
                      <div className="text-[11px] text-slate-500">{c.role}</div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl text-xs font-black ${cv.btn} shrink-0 shadow-sm`}>
                      {c.number === "108" ? "108" : "Call"}
                    </div>
                  </a>
                );
              })}

              {profile?.emergency_contact && (
                <a
                  href={`tel:${profile.emergency_contact}`}
                  className="flex items-center gap-3 p-3 rounded-2xl border bg-slate-50 border-slate-200 transition-all active:scale-98"
                >
                  <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-black text-slate-800">Emergency Contact</div>
                    <div className="text-[11px] text-slate-500 font-mono">{profile.emergency_contact}</div>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl text-xs font-black bg-slate-700 hover:bg-slate-800 text-white shrink-0 shadow-sm">
                    Call
                  </div>
                </a>
              )}
            </div>

            <div className="px-4 pb-5">
              <button
                onClick={() => setShowCall(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ MODAL: Incident Report ════════ */}
      {showReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
            {/* header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Camera className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900">Report Hazard</div>
                  <div className="text-[11px] text-slate-500">
                    Tagged at {coords.lat.toFixed(4)}°, {coords.lng.toFixed(4)}°
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowReport(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* form */}
            <form onSubmit={submitReport} className="overflow-y-auto flex-1">
              <div className="p-5 space-y-4">
                {/* title */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Incident Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gas leak near Conveyor Unit 4"
                    value={reportData.title}
                    onChange={(e) => setReportData({ ...reportData, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  />
                </div>

                {/* category + severity */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Category</label>
                    <select
                      value={reportData.category}
                      onChange={(e) => setReportData({ ...reportData, category: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                    >
                      <option value="fire">Fire / Smoke</option>
                      <option value="gas_leak">Gas / Toxic Leak</option>
                      <option value="machinery">Machinery Fault</option>
                      <option value="fall">Slip / Fall</option>
                      <option value="near_miss">Near Miss</option>
                      <option value="chemical">Chemical Spill</option>
                      <option value="electrical">Electrical Hazard</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Severity</label>
                    <select
                      value={reportData.severity}
                      onChange={(e) => setReportData({ ...reportData, severity: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                {/* description */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe what you observed, location details, and immediate actions taken…"
                    value={reportData.description}
                    onChange={(e) => setReportData({ ...reportData, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  />
                </div>

                {/* photo / video upload */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Photo / Video Evidence
                  </label>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    capture="environment"
                    ref={fileInputRef}
                    onChange={onFileChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-2xl p-4 text-center cursor-pointer transition-colors"
                  >
                    {filePreview ? (
                      <div className="space-y-2">
                        <img
                          src={filePreview}
                          alt="Preview"
                          className="w-full h-36 object-cover rounded-xl border border-slate-200"
                        />
                        <span className="text-[11px] font-bold text-emerald-700 block">
                          ✓ Media attached — tap to change
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <UploadCloud className="w-7 h-7 text-slate-300 mx-auto" />
                        <div className="text-xs font-bold text-slate-600">
                          Tap to capture photo or video
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* submit row */}
              <div className="px-5 pb-5 pt-2 grid grid-cols-2 gap-2 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowReport(false)}
                  className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-2xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md transition-colors"
                >
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><Send className="w-4 h-4" /> Submit Report</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════ MODAL: Profile Card ════════ */}
      {showProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
            {/* header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
              <div className="text-sm font-black text-slate-900">Worker Profile</div>
              <button
                onClick={() => setShowProfile(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {/* avatar + name */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-sm">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || "W"}
                </div>
                <div>
                  <div className="text-base font-black text-slate-900">{profile?.full_name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold text-[11px]">
                      Field Worker
                    </span>
                  </div>
                </div>
              </div>

              {/* profile fields */}
              {[
                { icon: <IdCard className="w-4 h-4 text-slate-400" />, label: "Employee ID", val: profile?.employee_code },
                { icon: <Mail className="w-4 h-4 text-slate-400" />, label: "Email", val: profile?.email },
                { icon: <Building2 className="w-4 h-4 text-slate-400" />, label: "Department", val: profile?.department },
                { icon: <Phone className="w-4 h-4 text-slate-400" />, label: "Phone", val: profile?.phone },
                { icon: <PhoneCall className="w-4 h-4 text-slate-400" />, label: "Emergency Contact", val: profile?.emergency_contact || "—" },
                { icon: <Droplet className="w-4 h-4 text-red-500" />, label: "Blood Group", val: profile?.blood_group },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                    {row.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{row.label}</div>
                    <div className="text-sm font-semibold text-slate-800 truncate">{row.val || "—"}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={() => setShowProfile(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
