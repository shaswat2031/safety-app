"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSafety } from "@/context/SafetyContext";
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerTooltip,
  MarkerPopup,
  MapRoute,
} from "@/components/ui/map";
import {
  ShieldAlert,
  Navigation,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  Ambulance,
  MapPin,
  Clock,
  UserCheck,
  Building2,
  Activity,
  Wifi,
} from "lucide-react";
import { fetchRealRoadRoute } from "@/lib/routingService";
import { toast } from "sonner";

/* ─────────────────────────────────────────────────────────────
   Dedicated SOS Location & Live Navigation Route Map
   ───────────────────────────────────────────────────────────── */
function SOSLocationMap({ alert, onReachLocation, onResolve }) {
  // Real coordinates from alert (in MapLibre [longitude, latitude] format)
  const workerLng = Number(alert.longitude) || 83.398825;
  const workerLat = Number(alert.latitude) || 19.711355;

  // QRF Ambulance starting position
  const qrfStart = alert.responder_coords
    ? [Number(alert.responder_coords[1]), Number(alert.responder_coords[0])]
    : [workerLng - 0.007, workerLat - 0.005];

  const targetPos = [workerLng, workerLat];

  // Route & ETA state from real road routing engine
  const [routeInfo, setRouteInfo] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(true);

  // Live ambulance movement progress (0 to 1)
  const [progress, setProgress] = useState(alert.status === "on_scene" ? 1 : 0.05);
  const [isReached, setIsReached] = useState(alert.status === "on_scene");

  // Fetch real road route geometry from OSRM API
  useEffect(() => {
    let isCancelled = false;
    setLoadingRoute(true);

    fetchRealRoadRoute(qrfStart[0], qrfStart[1], targetPos[0], targetPos[1]).then((res) => {
      if (!isCancelled && res) {
        setRouteInfo(res);
        setLoadingRoute(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [qrfStart[0], qrfStart[1], targetPos[0], targetPos[1]]);

  // Simulate real-time movement along real road coordinates when dispatched
  useEffect(() => {
    if (!isReached) {
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 0.96) {
            return 1;
          }
          return prev + 0.08;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isReached]);

  // Trigger arrival side effect when progress reaches 100%
  useEffect(() => {
    if (progress >= 1 && !isReached) {
      setIsReached(true);
      if (typeof onReachLocation === "function") {
        onReachLocation(alert.id);
      }
      toast.success(`🚑 QRF Ambulance arrived at ${alert.worker_name}'s exact SOS location!`);
    }
  }, [progress, isReached, alert.id, alert.worker_name, onReachLocation]);

  // Interpolate position strictly along actual road coordinates
  const roadCoords = routeInfo?.coordinates || [qrfStart, targetPos];
  let currentLng = qrfStart[0];
  let currentLat = qrfStart[1];

  if (roadCoords.length > 1) {
    const exactIndex = (roadCoords.length - 1) * progress;
    const lowerIndex = Math.floor(exactIndex);
    const upperIndex = Math.min(Math.ceil(exactIndex), roadCoords.length - 1);
    const factor = exactIndex - lowerIndex;

    const p1 = roadCoords[lowerIndex];
    const p2 = roadCoords[upperIndex];

    currentLng = p1[0] + (p2[0] - p1[0]) * factor;
    currentLat = p1[1] + (p2[1] - p1[1]) * factor;
  }

  return (
    <div className="relative w-full h-[420px] sm:h-[480px] rounded-3xl overflow-hidden border-2 border-slate-200 shadow-xl bg-slate-900">
      <Map
        center={[(qrfStart[0] + targetPos[0]) / 2, (qrfStart[1] + targetPos[1]) / 2]}
        zoom={14.8}
        theme="light"
        className="w-full h-full"
      >
        <MapControls position="top-right" showZoom showFullscreen />

        {/* Real Road Navigation Route Line connecting QRF -> SOS Location */}
        <MapRoute
          coordinates={roadCoords}
          color="#2563eb"
          width={5}
          opacity={0.9}
        />

        {/* QRF Ambulance Moving Unit Marker */}
        <MapMarker longitude={currentLng} latitude={currentLat}>
          <MarkerContent>
            <div className="w-10 h-10 rounded-2xl bg-blue-600 border-2 border-white text-white font-bold flex items-center justify-center shadow-2xl text-lg transition-all duration-300 hover:scale-125 cursor-pointer">
              🚑
            </div>
          </MarkerContent>
          <MarkerTooltip>
            {isReached
              ? "QRF Ambulance: Arrived On Scene"
              : `QRF Ambulance: Navigating Real Road Route (${routeInfo?.distanceText || ""} • ${routeInfo?.durationText || ""})`}
          </MarkerTooltip>
        </MapMarker>

        {/* SOS Request Location Target Marker */}
        <MapMarker longitude={targetPos[0]} latitude={targetPos[1]}>
          <MarkerContent>
            <div className="relative flex items-center justify-center cursor-pointer">
              <div className="absolute w-12 h-12 bg-red-500/50 rounded-full animate-ping"></div>
              <div className="w-9 h-9 rounded-full bg-red-600 border-2 border-white text-white font-black text-xs flex items-center justify-center shadow-2xl hover:scale-125 transition-transform">
                SOS
              </div>
            </div>
          </MarkerContent>
          <MarkerPopup closeButton>
            <div className="text-xs p-1 space-y-1">
              <div className="font-bold text-red-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                SOS Location: {alert.worker_name}
              </div>
              <div className="text-[11px] text-slate-600">
                Code: {alert.employee_code} • Dept: {alert.department}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                GPS: {alert.latitude.toFixed(5)}°, {alert.longitude.toFixed(5)}°
              </div>
              {routeInfo && (
                <div className="text-[10px] text-blue-600 font-semibold border-t border-slate-100 pt-1">
                  Road Dist: {routeInfo.distanceText} • Driving ETA: {routeInfo.durationText}
                </div>
              )}
            </div>
          </MarkerPopup>
          <MarkerTooltip>
            SOS Request Location ({alert.worker_name})
          </MarkerTooltip>
        </MapMarker>
      </Map>

      {/* Dynamic Status HUD Banner */}
      <div className="absolute top-4 left-4 z-[10] bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-200 shadow-md text-xs flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
          <span className="font-bold text-slate-900">SOS Origin Location:</span>
          <span className="font-semibold text-slate-700">{alert.zone_name || "Industrial Sector"}</span>
        </div>
        {routeInfo && (
          <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 pl-3 text-slate-600 font-medium">
            <span>Road Distance: <strong className="text-blue-700 font-bold">{routeInfo.distanceText}</strong></span>
            <span>Est. Drive Time: <strong className="text-emerald-700 font-bold">{routeInfo.durationText}</strong></span>
          </div>
        )}
      </div>

      {/* Arrival & Resolve Floating Button Overlay */}
      <div className="absolute bottom-4 left-4 right-4 z-[10] bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          {isReached ? (
            <div className="flex items-center gap-2 text-emerald-700 font-bold">
              <span className="w-3 h-3 rounded-full bg-emerald-600 animate-ping"></span>
              <span>QRF Unit Arrived at SOS Location!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-blue-700 font-bold">
              <span className="w-3 h-3 rounded-full bg-blue-600 animate-pulse"></span>
              <span>
                Navigating Real Road Route
                {routeInfo ? ` (${routeInfo.distanceText} • ETA: ${routeInfo.durationText})` : "..."}
              </span>
            </div>
          )}
        </div>

        {/* SHOW RESOLVE BUTTON ONLY WHEN REACHED SOS LOCATION */}
        {isReached && (
          <button
            onClick={() => onResolve(alert.id)}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all transform hover:scale-105 cursor-pointer animate-bounce"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>RESOLVE EMERGENCY & CLOSE CASE ✓</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Response Command Portal (Role 3)
   ───────────────────────────────────────────────────────────── */
export default function ResponsePage() {
  const router = useRouter();
  const { profile, role, isAuthenticated, loading: authLoading } = useAuth();
  const { sosAlerts, acknowledgeSOS, dispatchResponseTeam, resolveSOS, addAuditLog } = useSafety();

  // Auth Guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("Please login to access Response Command.");
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Active SOS Alerts Queue (Shows ONLY after Command Center acknowledges/dispatches)
  const activeEmergencies = sosAlerts.filter(
    (a) => a.status === "acknowledged" || a.status === "dispatched" || a.status === "on_scene"
  );
  const resolvedEmergencies = sosAlerts.filter((a) => a.status === "resolved");

  // Selected Alert for Location Display
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const currentAlert = activeEmergencies.find((a) => a.id === selectedAlertId) || activeEmergencies[0];

  // Arrival Handler
  const handleReachLocation = (alertId) => {
    addAuditLog("QRF_ON_SCENE", "info", `QRF Response Team arrived at SOS location for alert ${alertId}`);
  };

  // Resolve Handler
  const handleResolveAlert = (alertId) => {
    resolveSOS(alertId, "QRF Team arrived at SOS location, verified worker safe and resolved emergency.");
    toast.success("Emergency officially resolved! SOS status cleared across all portals.");
    setSelectedAlertId(null);
  };

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-6 bg-slate-50 min-h-screen">
      
      {/* Response Command Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">
                {profile?.full_name || "QRF Emergency Responder"}
              </h1>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-amber-500/30 uppercase tracking-wider">
                QRF Dispatch Unit
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-Time Navigation & Emergency Dispatch
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs px-3 py-1 rounded-xl font-bold border flex items-center gap-1.5 ${
            activeEmergencies.length > 0
              ? "bg-red-500/20 text-red-300 border-red-500/30"
              : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
          }`}>
            <span className={`w-2 h-2 rounded-full ${activeEmergencies.length > 0 ? "bg-red-500 animate-ping" : "bg-emerald-400 animate-pulse"}`}></span>
            {activeEmergencies.length} Active Emergency{activeEmergencies.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {activeEmergencies.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-2.5 shadow-xs">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">All Sectors Safe & Operational</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No active SOS distress signals in queue. Workers are within safe parameters. Live GPS tracking active.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Request Selection Tabs (if multiple SOS exist) */}
          {activeEmergencies.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-slate-500">Select SOS:</span>
              {activeEmergencies.map((alert) => (
                <button
                  key={alert.id}
                  onClick={() => setSelectedAlertId(alert.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    currentAlert?.id === alert.id
                      ? "bg-red-600 text-white shadow-md"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{alert.worker_name} ({alert.employee_code})</span>
                </button>
              ))}
            </div>
          )}

          {/* Current SOS Details Card */}
          {currentAlert && (
            <div className="bg-white border-2 border-red-200 rounded-3xl p-6 shadow-lg space-y-6">
              
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                    SOS
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-red-600 uppercase tracking-wider">
                      DISTRESS SIGNAL RECEIVED
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {currentAlert.worker_name} ({currentAlert.employee_code})
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="tel:9265318481"
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <PhoneCall className="w-4 h-4 text-white animate-pulse" />
                    <span>Call Worker (9265318481)</span>
                  </a>
                </div>
              </div>

              {/* Location & Worker Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400">Department</span>
                  <div className="font-bold text-slate-900 mt-0.5">{currentAlert.department}</div>
                </div>
                <div>
                  <span className="text-slate-400">Blood Group</span>
                  <div className="font-bold text-red-600 mt-0.5">{currentAlert.blood_group || "O+"}</div>
                </div>
                <div>
                  <span className="text-slate-400">SOS Area Zone</span>
                  <div className="font-bold text-slate-900 mt-0.5">{currentAlert.zone_name || "Plant Complex"}</div>
                </div>
                <div>
                  <span className="text-slate-400">Target GPS Lock</span>
                  <div className="font-mono text-slate-900 font-bold mt-0.5">
                    {currentAlert.latitude?.toFixed(4)}°, {currentAlert.longitude?.toFixed(4)}°
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 font-medium">
                <strong className="font-bold">Distress Remarks:</strong> &quot;{currentAlert.remarks || "SOS Emergency Triggered"}&quot;
              </div>

              {/* LIVE SOS LOCATION & ROUTE MAP */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-red-600" />
                    SOS Target Location & Navigation Route
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    GPS Fix: [{currentAlert.latitude?.toFixed(4)}, {currentAlert.longitude?.toFixed(4)}]
                  </span>
                </div>

                <SOSLocationMap
                  alert={currentAlert}
                  onReachLocation={handleReachLocation}
                  onResolve={handleResolveAlert}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resolved Archive Section */}
      {resolvedEmergencies.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Resolved Emergency History ({resolvedEmergencies.length})
            </h3>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {resolvedEmergencies.map((alert) => (
              <div
                key={alert.id}
                className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl text-xs flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-bold text-slate-900">{alert.worker_name} ({alert.employee_code})</span>
                  <span className="text-slate-500 text-[11px] hidden sm:inline">• Resolved on scene</span>
                </div>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 text-[10px] font-mono">
                  {alert.resolved_at || alert.created_at || "Resolved"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
