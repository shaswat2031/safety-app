"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSafety } from "@/context/SafetyContext";
import {
  Layers,
  ShieldCheck,
  AlertTriangle,
  Flame,
  RadioTower,
  Plus,
  Compass,
  CheckCircle2,
  MapPin,
  Trash2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

export default function ZonesPage() {
  const router = useRouter();
  const { profile, role, isAuthenticated, loading: authLoading } = useAuth();
  const { zones, workers, addGeofenceZone, deleteGeofenceZone } = useSafety();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("Please login to access Geofencing & Zones.");
      router.push("/login");
    } else if (!authLoading && role === "worker") {
      toast.error("Access restricted: Workers cannot edit zones.");
      router.push("/worker");
    }
  }, [isAuthenticated, authLoading, role, router]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newZone, setNewZone] = useState({
    name: "",
    type: "hazard",
    site: "Vedanta Smelter Sector B",
    speedLimit: 15,
    description: "",
  });

  const handleCreateZone = (e) => {
    e.preventDefault();
    if (!newZone.name) {
      toast.error("Please provide a zone name.");
      return;
    }

    addGeofenceZone(newZone);
    toast.success(`Geofence Zone "${newZone.name}" successfully created and broadcasted to worker GPS units!`);
    setIsAddModalOpen(false);
    setNewZone({ name: "", type: "hazard", site: "Vedanta Smelter Sector B", speedLimit: 15, description: "" });
  };

  const handleDeleteZone = (zoneId, zoneName) => {
    deleteGeofenceZone(zoneId);
    toast.info(`Zone "${zoneName}" removed.`);
  };

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-6 bg-slate-50">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-600" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Geofencing & Safety Zone Boundaries
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure dynamic perimeter alerts, restricted blast areas, and speed limit rules across Vedanta sites.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-red-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Define New Geofence</span>
        </button>
      </div>

      {/* Zones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {zones.map((z) => {
          const zoneWorkers = workers.filter((w) => w.zone === z.zone_name);
          const typeBadge = {
            hazard: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: Flame, label: "Hazard Zone" },
            restricted: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: AlertTriangle, label: "Restricted Mining Pit" },
            safe: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: ShieldCheck, label: "Designated Safe Zone" },
            no_network: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", icon: RadioTower, label: "Offline / Beacon Zone" },
          }[z.zone_type] || { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: Layers, label: "General Zone" };

          const Icon = typeBadge.icon;

          return (
            <div
              key={z.id}
              className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold border ${typeBadge.bg} ${typeBadge.text} ${typeBadge.border} mb-2`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span>{typeBadge.label}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{z.zone_name}</h3>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">{z.site_location}</div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Speed Limit</span>
                    <div className="text-sm font-black text-slate-900">{z.speed_limit_kmh} km/h</div>
                  </div>
                  {zones.length > 2 && (
                    <button
                      onClick={() => handleDeleteZone(z.id, z.zone_name)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Remove Zone"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100 leading-relaxed">
                {z.description}
              </p>

              {/* Real-time Workers in this zone */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                <div className="text-slate-500">
                  Current Occupants: <strong className="text-slate-900">{zoneWorkers.length} personnel</strong>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Perimeter Active
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Zone Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-red-600" />
              Define New Geofence Zone
            </h3>

            <form onSubmit={handleCreateZone} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Zone Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acid Storage Tank Farm"
                  value={newZone.name}
                  onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500 shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Zone Type</label>
                  <select
                    value={newZone.type}
                    onChange={(e) => setNewZone({ ...newZone, type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 text-xs text-slate-900 focus:outline-none shadow-xs font-semibold"
                  >
                    <option value="hazard">Hazard Blast Zone</option>
                    <option value="restricted">Restricted Pit</option>
                    <option value="safe">Safe Assembly Point</option>
                    <option value="no_network">Offline / Beacon Zone</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Speed Limit (km/h)</label>
                  <input
                    type="number"
                    value={newZone.speedLimit}
                    onChange={(e) => setNewZone({ ...newZone, speedLimit: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Safety Description</label>
                <textarea
                  rows={2}
                  placeholder="PPE required, mandatory gas detector, etc."
                  value={newZone.description}
                  onChange={(e) => setNewZone({ ...newZone, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-red-500 shadow-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Save Geofence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
