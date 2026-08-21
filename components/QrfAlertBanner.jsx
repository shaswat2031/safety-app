"use client";

import React, { useEffect, useState } from "react";
import { useSafety } from "@/context/SafetyContext";
import {
  ShieldAlert,
  Volume2,
  VolumeX,
  Bell,
  CheckCircle2,
  MapPin,
  Ambulance,
  AlertTriangle,
  X,
  Radio,
} from "lucide-react";
import { audioEngine } from "@/lib/audioAlert";
import { toast } from "sonner";

export default function QrfAlertBanner() {
  const { qrfAlerts, acknowledgeQrfAlert, sosAlerts, dispatchResponseTeam } = useSafety();
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Unacknowledged QRF alerts or active un-dispatched critical SOS alerts
  const activeQrfAlerts = qrfAlerts.filter((a) => !a.acknowledged);
  const activeSos = sosAlerts.find((s) => s.status === "active" || s.status === "acknowledged");

  const latestAlert = activeQrfAlerts[0];

  useEffect(() => {
    if (latestAlert && !isAudioMuted) {
      audioEngine.playAlertBeep();
    }
  }, [latestAlert, isAudioMuted]);

  if (!latestAlert && !activeSos) return null;

  return (
    <div className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-3.5 sm:p-4 shadow-xl rounded-2xl sm:rounded-3xl border-2 border-red-400/40 relative overflow-hidden animate-pulse mb-4 sm:mb-6">
      {/* Background Strobe Effect */}
      <div className="absolute inset-0 bg-red-500/10 pointer-events-none animate-ping"></div>

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        {/* Alert Info Header */}
        <div className="flex items-start gap-2.5 sm:gap-3.5">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white flex-shrink-0 animate-bounce">
            <ShieldAlert className="w-5 h-5 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="px-2 py-0.5 rounded-full bg-white text-red-700 font-black text-[9px] sm:text-[10px] tracking-wider uppercase shadow-xs">
                HIGH-PRIORITY QRF ALERT
              </span>
              <span className="text-[10px] sm:text-xs text-red-100 font-mono font-bold">
                {latestAlert ? latestAlert.created_at : "LIVE EMERGENCY"}
              </span>
            </div>
            <h2 className="font-extrabold text-sm sm:text-lg text-white mt-0.5">
              {latestAlert ? latestAlert.title : `SOS EMERGENCY: ${activeSos?.worker_name}`}
            </h2>
            <p className="text-[11px] sm:text-xs text-red-100 font-medium max-w-2xl mt-0.5 leading-snug">
              {latestAlert ? latestAlert.message : `Worker ${activeSos?.worker_name} (${activeSos?.employee_code}) requires immediate QRF dispatch at ${activeSos?.zone_name || "Industrial Zone"}.`}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end pt-1 md:pt-0">
          <button
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title={isAudioMuted ? "Unmute Alert Chime" : "Mute Alert Chime"}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {activeSos && activeSos.status !== "dispatched" && (
            <button
              onClick={() => {
                dispatchResponseTeam(activeSos.id, "QRF Rescue Squad Alpha");
                toast.success("Ambulance Alpha Dispatched to SOS location!");
              }}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-white text-red-700 font-black text-[11px] sm:text-xs rounded-xl shadow-lg hover:bg-red-50 flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer"
            >
              <Ambulance className="w-4 h-4" />
              <span>DISPATCH NOW</span>
            </button>
          )}

          {latestAlert && (
            <button
              onClick={() => {
                acknowledgeQrfAlert(latestAlert.id);
                toast.info("QRF Broadcast Acknowledged.");
              }}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-red-950/80 hover:bg-red-950 border border-white/30 text-white font-bold text-[11px] sm:text-xs rounded-xl shadow flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>ACKNOWLEDGE</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
