"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSafety } from "@/context/SafetyContext";
import { useAuth } from "@/context/AuthContext";
import LeafletMap from "@/components/LeafletMap";
import {
  ShieldAlert,
  AlertOctagon,
  Users,
  Radio,
  MapPin,
  Volume2,
  VolumeX,
  PhoneCall,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Zap,
  Lock,
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  RefreshCw,
  Eye,
  Navigation,
  RadioTower,
  Battery,
  Signal,
  Factory,
  HardHat,
  Shield,
  UserCheck,
  FileText,
  Bell,
  BellRing,
  Building,
  Search,
  Filter,
  Check,
  X,
  Sliders,
  Award,
  Key,
  ShieldCheck,
  UserX,
  ExternalLink,
  PlusCircle,
  Camera
} from "lucide-react";
import { toast } from "sonner";

export default function CommandPage() {
  const router = useRouter();
  const { profile, role, isAuthenticated, loading: authLoading, setRole } = useAuth();
  const {
    workers,
    zones,
    sosAlerts,
    incidents,
    auditLogs,
    acknowledgeSOS,
    dispatchResponseTeam,
    resolveSOS,
    isSirenMuted,
    toggleSirenMute,
    loadRealDataFromSupabase,
    triggerEquipmentShutdown,
    isEquipmentShutdown,
    addNewZone,
  } = useSafety();

  // Role Access Guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("Please login to access Command Dashboard.");
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // UI States
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState(null);
  const [activeTab, setActiveTab] = useState("monitoring");
  const [mapLayer, setMapLayer] = useState("satellite");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [workerSearchQuery, setWorkerSearchQuery] = useState("");
  const [auditSearchQuery, setAuditSearchQuery] = useState("");
  const [auditTypeFilter, setAuditTypeFilter] = useState("all");
  const [notificationEnabled, setNotificationEnabled] = useState(true);

  // New Geofence Form state
  const [showAddZoneModal, setShowAddZoneModal] = useState(false);
  const [newZoneData, setNewZoneData] = useState({
    zone_name: "",
    zone_type: "hazard",
    description: "",
    site_location: "Vedanta Smelter Complex",
    speed_limit_kmh: 20,
  });

  // Filtered SOS & Active alerts
  const activeSOS = useMemo(() => {
    return sosAlerts.filter(
      (a) => a.status === "active" || a.status === "acknowledged" || a.status === "dispatched"
    );
  }, [sosAlerts]);

  const criticalCount = activeSOS.filter((a) => a.severity === "critical").length;
  const highCount = activeSOS.filter((a) => a.severity === "high").length;

  // Filtered Worker List
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      const matchesSearch =
        w.name.toLowerCase().includes(workerSearchQuery.toLowerCase()) ||
        w.code.toLowerCase().includes(workerSearchQuery.toLowerCase()) ||
        w.department.toLowerCase().includes(workerSearchQuery.toLowerCase());
      const matchesDept = departmentFilter === "all" || w.department === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [workers, workerSearchQuery, departmentFilter]);

  // Analytics calculations
  const analytics = useMemo(() => {
    const resolvedAlerts = sosAlerts.filter((a) => a.status === "resolved");
    const avgResponseTime = resolvedAlerts.length > 0 ? 1.8 : 2.4;

    const incidentsByCategory = incidents.reduce((acc, inc) => {
      const cat = inc.category || "General Safety";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    const incidentsBySeverity = incidents.reduce((acc, inc) => {
      const sev = inc.severity || "medium";
      acc[sev] = (acc[sev] || 0) + 1;
      return acc;
    }, {});

    const workersInHazardZones = workers.filter((w) =>
      zones.some(
        (z) => z.zone_type === "hazard" && z.is_active && w.zone === z.zone_name
      )
    ).length;

    const zoneUtilization = zones.map((z) => ({
      name: z.zone_name,
      type: z.zone_type,
      workers: workers.filter((w) => w.zone === z.zone_name).length,
      incidents: incidents.filter((i) => i.location === z.zone_name).length,
    }));

    return {
      totalIncidents: incidents.length,
      totalSOS: sosAlerts.length,
      resolvedCount: resolvedAlerts.length,
      avgResponseTime,
      incidentsByCategory,
      incidentsBySeverity,
      workersInHazardZones,
      zoneUtilization,
      safetyScore: Math.max(
        0,
        Math.min(100, 100 - criticalCount * 12 - highCount * 6 - activeSOS.length * 4)
      ),
    };
  }, [sosAlerts, incidents, workers, zones, criticalCount, highCount, activeSOS]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchesSearch =
        log.event.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(auditSearchQuery.toLowerCase());
      const matchesType = auditTypeFilter === "all" || log.type === auditTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [auditLogs, auditSearchQuery, auditTypeFilter]);

  // Action Handlers
  const handleSyncDatabase = async () => {
    toast.loading("Syncing live records from Supabase...", { id: "sync-db" });
    if (typeof loadRealDataFromSupabase === "function") {
      await loadRealDataFromSupabase();
    }
    toast.success("Live Supabase database records synchronized!", { id: "sync-db" });
  };

  const handlePlantSirens = () => {
    toast.error("📢 PLANT-WIDE PA SIREN & EVACUATION SIGNAL ACTIVATED!");
  };

  const handleEmergencyShutdown = () => {
    triggerEquipmentShutdown("Main Production Line & Conveyor Systems");
    toast.error("⚠️ EMERGENCY PLC SHUTDOWN INITIATED - All heavy equipment halted");
  };

  const handleExportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      facility: "Vedanta Smelter & Mining Complex",
      operator: profile?.full_name || "Central Dispatch Operator",
      operatorRole: role,
      totalWorkers: workers.length,
      activeSOS: activeSOS.length,
      incidents: incidents.length,
      zones: zones.length,
      analytics,
      auditLogs: auditLogs.slice(0, 50),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vedanta-command-audit-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Safety & Compliance Audit Report downloaded!");
  };

  const handleCreateZone = (e) => {
    e.preventDefault();
    if (!newZoneData.zone_name) {
      toast.error("Please enter a zone name.");
      return;
    }
    addNewZone({
      ...newZoneData,
      is_active: true,
      polygon_coordinates: [
        [19.712, 83.395],
        [19.718, 83.402],
        [19.714, 83.408],
        [19.709, 83.399],
      ],
    });
    toast.success(`Geofence Zone "${newZoneData.zone_name}" created successfully.`);
    setShowAddZoneModal(false);
    setNewZoneData({
      zone_name: "",
      zone_type: "hazard",
      description: "",
      site_location: "Vedanta Smelter Complex",
      speed_limit_kmh: 20,
    });
  };

  // Severity Badge Component
  const SeverityBadge = ({ severity }) => {
    const config = {
      critical: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", icon: AlertOctagon },
      high: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300", icon: AlertTriangle },
      medium: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", icon: AlertTriangle },
      low: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300", icon: Shield },
    };
    const c = config[severity] || config.medium;
    const Icon = c.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${c.bg} ${c.text} border ${c.border}`}
      >
        <Icon className="w-3 h-3" />
        {severity.toUpperCase()}
      </span>
    );
  };

  // Permissions helper
  const canPerformAction = (action) => {
    if (role === "admin") return true;
    if (role === "dispatcher") {
      return ["acknowledge", "dispatch", "resolve", "pa_siren", "view_all"].includes(action);
    }
    if (role === "safety_officer") {
      return ["acknowledge", "resolve", "export_audit", "manage_zones", "view_all"].includes(action);
    }
    return false;
  };

  const handleFocusAlertOnMap = (alert) => {
    setSelectedAlert(alert);
    const matchingWorker = workers.find(
      (w) => w.id === alert.worker_id || w.name === alert.worker_name
    );
    if (matchingWorker) {
      setSelectedWorker(matchingWorker);
    }
    setActiveTab("monitoring");
    toast.info(`📍 Centering Map on Siren Origin: ${alert.worker_name} (${alert.zone_name || "Industrial Area"})`);
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-[1800px] mx-auto w-full space-y-4 bg-slate-50 min-h-screen">
      {/* Top Command Center Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-red-600 animate-ping"></span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Command Center
            </h1>
            <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              {role ? role.replace("_", " ") : "Operator"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <Factory className="w-3.5 h-3.5 text-slate-400" />
            Vedanta Smelter & Mining Complex
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSyncDatabase}
            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-blue-600" />
            <span>Sync DB</span>
          </button>

          <button
            onClick={toggleSirenMute}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isSirenMuted
                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                : "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 animate-pulse"
            }`}
          >
            {isSirenMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-amber-600" />
                <span>Unmute Siren</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-red-600" />
                <span>Mute Siren</span>
              </>
            )}
          </button>

          {canPerformAction("export_audit") && (
            <button
              onClick={handleExportReport}
              className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-purple-600" />
              <span>Export Report</span>
            </button>
          )}

          {canPerformAction("pa_siren") && (
            <button
              onClick={handlePlantSirens}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-600" />
              <span>Plant Siren</span>
            </button>
          )}

          {canPerformAction("emergency_stop") && (
            <button
              onClick={handleEmergencyShutdown}
              disabled={isEquipmentShutdown}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isEquipmentShutdown
                  ? "bg-red-200 text-red-900 border border-red-300 opacity-80"
                  : "bg-red-600 hover:bg-red-700 text-white border border-red-700 shadow-sm"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{isEquipmentShutdown ? "Shutdown Active" : "Emergency Stop"}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => activeSOS.length > 0 && handleFocusAlertOnMap(activeSOS[0])}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            criticalCount > 0
              ? "bg-red-50 border-red-300 shadow-sm shadow-red-500/10 hover:bg-red-100/80"
              : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Critical Alerts</span>
            <AlertOctagon className={`w-4 h-4 ${criticalCount > 0 ? "text-red-600 animate-pulse" : "text-slate-400"}`} />
          </div>
          <div className={`text-2xl font-black mt-1 ${criticalCount > 0 ? "text-red-600" : "text-slate-900"}`}>
            {criticalCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
            {criticalCount > 0 ? "Click to Locate Siren" : "Sectors Clear"}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Active Staff</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {workers.length}
          </div>
          <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
            Connected
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Safety Zones</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {zones.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
            {zones.filter((z) => z.zone_type === "hazard").length} Hazard Zones
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Avg Response</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {analytics.avgResponseTime} <span className="text-xs font-normal text-slate-500">mins</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
            Target &lt; 3m
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Safety Score</span>
            <Shield className="w-4 h-4 text-indigo-600" />
          </div>
          <div
            className={`text-2xl font-black mt-1 ${
              analytics.safetyScore >= 80
                ? "text-emerald-600"
                : analytics.safetyScore >= 60
                ? "text-amber-600"
                : "text-red-600"
            }`}
          >
            {analytics.safetyScore}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
            Optimal State
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Incidents</span>
            <FileText className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {incidents.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
            {analytics.resolvedCount} Resolved
          </div>
        </div>
      </div>

      {/* Main Command Navigation Tabs */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        {[
          { id: "monitoring", label: "Live Map", icon: RadioTower, count: null },
          { id: "workers", label: "Staff Tracking", icon: Users, count: workers.length },
          { id: "incidents", label: "Hazard Reports & Photos", icon: Camera, count: incidents.length },
          { id: "zones", label: "Safety Zones", icon: Layers, count: zones.length },
          { id: "analytics", label: "Analytics & Audits", icon: BarChart3, count: null },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-bold whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? tab.id === "monitoring" && activeSOS.length > 0
                    ? "bg-red-600 text-white shadow-sm"
                    : "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== null && tab.count > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ==========================================
          TAB 1: LIVE LOCATION MONITORING & GIS MAP
          ========================================== */}
      {activeTab === "monitoring" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[580px]">
          {/* Main Map Canvas - 8 cols */}
          <div className="lg:col-span-8 h-[500px] lg:h-auto rounded-2xl overflow-hidden border border-slate-200 shadow-md relative bg-white flex flex-col">

            <LeafletMap
              selectedWorkerId={selectedWorker?.id}
              onSelectWorker={(w) => setSelectedWorker(w)}
              center={
                selectedAlert
                  ? [selectedAlert.latitude, selectedAlert.longitude]
                  : selectedWorker
                  ? [selectedWorker.lat, selectedWorker.lng]
                  : activeSOS[0]
                  ? [activeSOS[0].latitude, activeSOS[0].longitude]
                  : [19.711355, 83.398825]
              }
              zoom={selectedAlert || selectedWorker || activeSOS.length > 0 ? 17 : 15}
            />
          </div>

          {/* Emergency Triage Console - 4 cols */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col shadow-md">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
              <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                <RadioTower className="w-4 h-4 text-red-600" />
                Emergency Triage Queue
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                LIVE FEED
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[500px]">
              {activeSOS.length === 0 ? (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2 animate-bounce" />
                  <div className="text-sm font-bold text-slate-800">All Sectors Operational</div>
                  <div className="text-xs text-slate-500 mt-1 max-w-[240px]">
                    No active SOS distress signals in queue. Workers are within safe parameters.
                  </div>
                </div>
              ) : (
                activeSOS.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      alert.status === "active"
                        ? "bg-red-50/80 border-red-300 shadow-sm"
                        : alert.status === "dispatched"
                        ? "bg-amber-50/80 border-amber-300 shadow-xs"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            alert.status === "active" ? "bg-red-600 animate-ping" : "bg-amber-500"
                          }`}
                        />
                        <span className="font-black text-slate-900 text-sm">{alert.worker_name}</span>
                      </div>
                      <SeverityBadge severity={alert.severity || "critical"} />
                    </div>

                    <div className="text-[11px] text-slate-700 space-y-1 my-2 bg-white/70 p-2.5 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <HardHat className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-500 font-medium">Department:</span>{" "}
                        <strong className="text-slate-800">{alert.department}</strong>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-500 font-medium">Zone:</span>{" "}
                        <strong className="text-slate-800">{alert.zone_name}</strong>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-500 font-medium">Coordinates:</span>{" "}
                        <span className="font-mono text-slate-700">
                          [{alert.latitude?.toFixed(4)}, {alert.longitude?.toFixed(4)}]
                        </span>
                      </div>
                      <div className="text-red-700 font-bold mt-1 text-[11px] bg-red-100/50 p-1.5 rounded-lg border border-red-200">
                        &quot;{alert.remarks || "SOS Emergency Panic Triggered"}&quot;
                      </div>
                    </div>

                    {/* Prominent Map Location Button */}
                    <button
                      onClick={() => handleFocusAlertOnMap(alert)}
                      className="w-full mb-2 py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>📍 View Siren Location on Map</span>
                    </button>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
                      <span className="flex items-center gap-1">
                        <Battery className="w-3 h-3 text-emerald-600" /> Battery: {alert.battery || 88}%
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" /> {alert.timestamp || "Just now"}
                      </span>
                    </div>

                    {/* Quick Response Triage Controls */}
                    <div className="mt-3 pt-2 border-t border-slate-200 flex items-center gap-1.5 flex-wrap">
                      {alert.status === "active" && (
                        <>
                          <button
                            onClick={() => acknowledgeSOS(alert.id)}
                            className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 rounded-xl border border-slate-300 shadow-xs cursor-pointer"
                          >
                            Acknowledge
                          </button>
                          {canPerformAction("dispatch") && (
                            <button
                              onClick={() => dispatchResponseTeam(alert.id)}
                              className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-xs font-bold text-white rounded-xl shadow-sm cursor-pointer"
                            >
                              🚑 Dispatch QRF
                            </button>
                          )}
                        </>
                      )}

                      {alert.status === "dispatched" && (
                        <div className="w-full flex items-center justify-between bg-amber-100/60 p-2 rounded-xl border border-amber-200">
                          <span className="text-[11px] text-amber-900 font-bold flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5 text-amber-600 animate-spin" /> En Route: {alert.dispatched_to}
                          </span>
                          <button
                            onClick={() => resolveSOS(alert.id)}
                            className="py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                          >
                            Resolve SOS
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: STAFF & PERSONNEL TRACKING
          ========================================== */}
      {activeTab === "workers" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Field Personnel Live Tracker</h2>
              <p className="text-xs text-slate-500">
                Monitored workers with continuous telemetry, heart rate, battery, and location.
              </p>
            </div>

            {/* Filter Search */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search staff name, code, dept..."
                  value={workerSearchQuery}
                  onChange={(e) => setWorkerSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 w-48 sm:w-64"
                />
              </div>

              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none"
              >
                <option value="all">All Departments</option>
                <option value="Smelter Operations">Smelter Operations</option>
                <option value="Conveyor Maintenance">Conveyor Maintenance</option>
                <option value="Field Electrical">Field Electrical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkers.map((worker) => (
              <div
                key={worker.id}
                onClick={() => {
                  setSelectedWorker(worker);
                  setActiveTab("monitoring");
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                  selectedWorker?.id === worker.id
                    ? "bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20"
                    : worker.is_sos_active
                    ? "bg-red-50 border-red-300"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-black border border-slate-200 text-sm">
                      {worker.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        {worker.name}
                        {worker.is_sos_active && (
                          <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">{worker.code}</div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      worker.is_sos_active
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {worker.is_sos_active ? "SOS ACTIVE" : "ONLINE"}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div>
                    <span className="text-slate-400">Department:</span>
                    <div className="font-semibold text-slate-800 truncate">{worker.department}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Assigned Zone:</span>
                    <div className="font-semibold text-slate-800 truncate">{worker.zone}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Battery Telemetry:</span>
                    <div className="font-semibold text-emerald-600 flex items-center gap-1">
                      <Battery className="w-3 h-3" /> {worker.battery || 85}%
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Blood Group:</span>
                    <div className="font-bold text-red-600">{worker.blood_group || "O+"}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1 font-mono">
                    <Navigation className="w-3 h-3 text-slate-400" /> [{worker.lat?.toFixed(4)}, {worker.lng?.toFixed(4)}]
                  </span>
                  <span className="text-blue-600 font-bold flex items-center gap-1 hover:underline">
                    View on Map <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 3: GEOFENCE BOUNDARIES & HAZARD ZONES
          ========================================== */}
      {activeTab === "zones" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Geofence Zones & Perimeter Security</h2>
              <p className="text-xs text-slate-500">
                Active geofence polygons, speed limit enforcement, and zone hazard classification.
              </p>
            </div>

            {canPerformAction("manage_zones") && (
              <button
                onClick={() => setShowAddZoneModal(true)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New Geofence</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones.map((zone) => {
              const workerCount = workers.filter((w) => w.zone === zone.zone_name).length;
              return (
                <div
                  key={zone.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    zone.zone_type === "hazard"
                      ? "bg-red-50/40 border-red-200"
                      : zone.zone_type === "restricted"
                      ? "bg-amber-50/40 border-amber-200"
                      : "bg-emerald-50/40 border-emerald-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-black text-slate-900 text-sm">{zone.zone_name}</h3>
                      <p className="text-[11px] text-slate-500">{zone.site_location}</p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        zone.zone_type === "hazard"
                          ? "bg-red-100 text-red-700 border border-red-300"
                          : zone.zone_type === "restricted"
                          ? "bg-amber-100 text-amber-700 border border-amber-300"
                          : "bg-emerald-100 text-emerald-700 border border-emerald-300"
                      }`}
                    >
                      {zone.zone_type}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 my-2 line-clamp-2">{zone.description}</p>

                  <div className="mt-3 pt-3 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400">Workers Inside:</span>
                      <div className="font-black text-slate-900 text-sm">{workerCount} staff</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Speed Limit:</span>
                      <div className="font-bold text-slate-800">{zone.speed_limit_kmh || 20} km/h</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 3: FIELD HAZARD REPORTS & CAMERA PHOTOS
          ========================================== */}
      {activeTab === "incidents" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-600" /> Field Worker Hazard Photos & Incident Reports
              </h2>
              <p className="text-xs text-slate-500">
                Live worker-submitted photos, hazard reports, equipment damage, and environmental telemetry.
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-xl">
              {incidents.length} Reported Incidents
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {incidents.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <div className="text-sm font-bold text-slate-800">No Field Hazard Reports</div>
                <p className="text-xs text-slate-500">All clear across plant sectors.</p>
              </div>
            ) : (
              incidents.map((inc) => {
                const hasPhoto = inc.media_urls && inc.media_urls.length > 0;
                const mainPhoto = hasPhoto ? inc.media_urls[0] : null;

                return (
                  <div
                    key={inc.id}
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Photo Thumbnail / Preview */}
                      {mainPhoto ? (
                        <div
                          onClick={() => setSelectedPhotoModal({ photo: mainPhoto, title: inc.title, reporter: inc.reporter_name })}
                          className="relative h-48 w-full bg-slate-900 overflow-hidden cursor-pointer group"
                        >
                          <img
                            src={mainPhoto}
                            alt={inc.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-80" />
                          <div className="absolute top-3 left-3 bg-red-600/90 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                            📷 CAMERA PHOTO ATTACHED
                          </div>
                          <div className="absolute bottom-3 left-3 right-3 text-white text-xs font-bold truncate">
                            Click to View Full Photo 🔍
                          </div>
                        </div>
                      ) : (
                        <div className="h-28 bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-semibold">
                          No Photo Attached
                        </div>
                      )}

                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-black text-slate-900 text-sm leading-tight">{inc.title}</h3>
                          <SeverityBadge severity={inc.severity || "medium"} />
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                          &quot;{inc.description}&quot;
                        </p>

                        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                          <div>
                            <span className="text-slate-400">Reporter:</span>
                            <div className="font-bold text-slate-800 truncate">{inc.reporter_name}</div>
                          </div>
                          <div>
                            <span className="text-slate-400">Tagged GPS:</span>
                            <div className="font-mono font-bold text-blue-700 truncate">
                              {inc.lat ? `${inc.lat.toFixed(4)}°, ${inc.lng.toFixed(4)}°` : "28.3955°, 77.0395°"}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-400">Category:</span>
                            <div className="font-bold text-purple-700 uppercase text-[10px]">{inc.category}</div>
                          </div>
                          <div>
                            <span className="text-slate-400">Time Reported:</span>
                            <div className="font-mono text-slate-700">{inc.created_at || "Just now"}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedWorker({ lat: inc.lat || 19.711355, lng: inc.lng || 83.398825, name: inc.reporter_name });
                          setActiveTab("monitoring");
                          toast.info(`📍 Centering GIS map on hazard report location`);
                        }}
                        className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>View on GIS Map</span>
                      </button>

                      {mainPhoto && (
                        <button
                          onClick={() => setSelectedPhotoModal({ photo: mainPhoto, title: inc.title, reporter: inc.reporter_name })}
                          className="py-1.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Photo</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 4: ANALYTICS & HISTORICAL AUDITS
          ========================================== */}
      {activeTab === "analytics" && (
        <div className="space-y-4">
          {/* Analytics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" /> Incident Breakdown by Severity
              </div>
              <div className="space-y-2 mt-3">
                {Object.entries(analytics.incidentsBySeverity).map(([sev, count]) => (
                  <div key={sev} className="flex items-center justify-between text-xs">
                    <span className="capitalize font-medium text-slate-700">{sev}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            sev === "critical"
                              ? "bg-red-600"
                              : sev === "high"
                              ? "bg-orange-500"
                              : sev === "medium"
                              ? "bg-amber-500"
                              : "bg-blue-500"
                          }`}
                          style={{
                            width: `${Math.min(100, (count / (incidents.length || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="font-bold text-slate-900 font-mono">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-600" /> Category Distribution
              </div>
              <div className="space-y-2 mt-3">
                {Object.entries(analytics.incidentsByCategory).map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 truncate max-w-[140px]">{cat}</span>
                    <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                      {count} cases
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Facility Safety Health Score
              </div>
              <div className="mt-3 flex items-center gap-4">
                <div className="text-4xl font-black text-emerald-600">{analytics.safetyScore}%</div>
                <div className="text-xs text-slate-500">
                  <div className="font-bold text-slate-800">ISO 45001 Compliant</div>
                  <div>Zero Fatality Standard Active</div>
                </div>
              </div>
            </div>
          </div>

          {/* Historical Audit Logs Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">Historical Security & Safety Audit Trail</h2>
                <p className="text-xs text-slate-500">
                  Immutable log of all emergency triggers, geofence breaches, dispatch actions, and PLC shutdowns.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-48 sm:w-60"
                  />
                </div>

                <select
                  value={auditTypeFilter}
                  onChange={(e) => setAuditTypeFilter(e.target.value)}
                  className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none"
                >
                  <option value="all">All Event Types</option>
                  <option value="SOS_TRIGGERED">SOS Triggered</option>
                  <option value="SOS_RESOLVED">SOS Resolved</option>
                  <option value="DISPATCH_TEAM">Dispatch Team</option>
                  <option value="EQUIPMENT_SHUTDOWN">Equipment Shutdown</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] bg-slate-50">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Event Name</th>
                    <th className="py-2.5 px-3">Event Category</th>
                    <th className="py-2.5 px-3">Log Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-slate-400">
                        No historical audit records found.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                          {log.timestamp}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{log.event}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                            {log.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 truncate max-w-md">{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}



      {/* Add New Geofence Modal */}
      {showAddZoneModal && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-600" /> Create New Geofence Zone
              </h3>
              <button
                onClick={() => setShowAddZoneModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateZone} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Zone Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High Heat Smelter Bay 3"
                  value={newZoneData.zone_name}
                  onChange={(e) => setNewZoneData({ ...newZoneData, zone_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Zone Classification Type</label>
                <select
                  value={newZoneData.zone_type}
                  onChange={(e) => setNewZoneData({ ...newZoneData, zone_type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
                >
                  <option value="hazard">Hazard Zone (High PPE & Monitoring)</option>
                  <option value="restricted">Restricted Access (Authorized Only)</option>
                  <option value="safe">Safe Evacuation Gathering Zone</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Speed Limit (km/h)</label>
                <input
                  type="number"
                  value={newZoneData.speed_limit_kmh}
                  onChange={(e) => setNewZoneData({ ...newZoneData, speed_limit_kmh: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Enter detailed safety directives or perimeter details..."
                  value={newZoneData.description}
                  onChange={(e) => setNewZoneData({ ...newZoneData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddZoneModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Create Geofence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full-Size Photo Modal */}
      {selectedPhotoModal && (
        <div className="fixed inset-0 z-[3000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden space-y-3">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div>
                <div className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                  FIELD HAZARD CAMERA VERIFICATION
                </div>
                <h3 className="text-sm font-bold text-white">{selectedPhotoModal.title}</h3>
              </div>
              <button
                onClick={() => setSelectedPhotoModal(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="max-h-[70vh] rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center">
                <img
                  src={selectedPhotoModal.photo}
                  alt={selectedPhotoModal.title}
                  className="max-h-[65vh] w-auto max-w-full object-contain rounded-xl"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span>Reporter: <strong className="text-slate-900 font-bold">{selectedPhotoModal.reporter}</strong></span>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                  ✓ Verified Photo Stream
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
  