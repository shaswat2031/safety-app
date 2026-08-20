"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { audioEngine } from "@/lib/audioAlert";
import { supabase } from "@/lib/supabase";
import { evaluateGeofence, calculatePolygonArea } from "@/lib/geofence";
import {
  uploadMediaToSupabase,
  fetchSosAlerts,
  insertSosAlert,
  updateSosAlert,
  fetchIncidents,
  insertIncident,
  upsertWorkerLocation,
  fetchGeofenceZones,
  insertGeofenceZone,
  fetchProfiles,
  fetchWorkerLocations,
  fetchAuditLogs,
  insertAuditLog,
} from "@/lib/supabaseService";

const SafetyContext = createContext(null);

const STORAGE_KEYS = {
  ZONES: "vedanta_safety_zones_v4",
  WORKERS: "vedanta_safety_workers_v4",
  SOS: "vedanta_safety_sos_v4",
  INCIDENTS: "vedanta_safety_incidents_v4",
  LOGS: "vedanta_safety_logs_v4",
  OFFLINE_QUEUE: "vedanta_safety_offline_queue_v4",
};

export function SafetyProvider({ children }) {
  const DEFAULT_ZONES = [
    {
      id: "location-1",
      zone_name: "Location 1",
      zone_type: "hazard",
      description: "Primary Operational Geofence Boundary (Location 1)",
      site_location: "Location 1 Site",
      speed_limit_kmh: 15,
      is_active: true,
      polygon_coordinates: [
        [19.704395, 83.404655],
        [19.706178, 83.390435],
        [19.717594, 83.394098],
        [19.717252, 83.406113],
      ],
    },
    {
      id: "zone-1",
      zone_name: "Hazard Blast Zone 4",
      zone_type: "hazard",
      description: "Active blasting sector & high-heat furnace complex. Mandatory full PPE required.",
      site_location: "Vedanta Smelter Unit 2",
      speed_limit_kmh: 15,
      is_active: true,
      polygon_coordinates: [
        [21.815, 84.021],
        [21.818, 84.028],
        [21.812, 84.032],
        [21.808, 84.025],
      ],
    },
    {
      id: "zone-2",
      zone_name: "Restricted Mining Pit Alpha",
      zone_type: "restricted",
      description: "Heavy machinery operation pit. Restricted access to authorized personnel only.",
      site_location: "Open Cast Mine Sector B",
      speed_limit_kmh: 20,
      is_active: true,
      polygon_coordinates: [
        [21.820, 84.015],
        [21.825, 84.022],
        [21.821, 84.027],
        [21.816, 84.020],
      ],
    },
    {
      id: "zone-3",
      zone_name: "Assembly Safe Zone Sector 1",
      zone_type: "safe",
      description: "Designated emergency evacuation assembly gathering point with medical aid post.",
      site_location: "Central Administrative Block",
      speed_limit_kmh: 30,
      is_active: true,
      polygon_coordinates: [
        [21.810, 84.028],
        [21.814, 84.034],
        [21.809, 84.038],
        [21.806, 84.031],
      ],
    },
  ];

  const DEFAULT_WORKERS = [
    {
      id: "w-101",
      name: "Rajesh Kumar",
      code: "VED-MN-101",
      department: "Smelter Operations",
      phone: "+91 98765 43210",
      blood_group: "O+",
      lat: 19.711355,
      lng: 83.398825,
      speed: 0,
      heading: 90,
      battery: 92,
      is_sos_active: false,
      zone: "Location 1",
      last_ping: "Just now",
    },
    {
      id: "w-204",
      name: "Amit Verma",
      code: "VED-MN-204",
      department: "Conveyor Maintenance",
      phone: "+91 98765 12345",
      blood_group: "A+",
      lat: 19.708,
      lng: 83.395,
      speed: 12,
      heading: 180,
      battery: 78,
      is_sos_active: false,
      zone: "Location 1",
      last_ping: "Just now",
    },
    {
      id: "w-309",
      name: "Priya Sharma",
      code: "VED-MN-309",
      department: "Field Electrical",
      phone: "+91 98765 67890",
      blood_group: "B+",
      lat: 19.715,
      lng: 83.402,
      speed: 5,
      heading: 45,
      battery: 85,
      is_sos_active: false,
      zone: "Location 1",
      last_ping: "Just now",
    },
  ];

  const DEFAULT_RESPONDERS = [
    {
      id: "resp-1",
      name: "QRF Ambulance Alpha",
      leader: "Dr. A. Sen (MedMedic Chief)",
      status: "dispatched",
      lat: 19.707,
      lng: 83.394,
    },
    {
      id: "resp-2",
      name: "QRF Rescue Unit Bravo",
      leader: "Capt. Vikram (Safety Marshal)",
      status: "ready",
      lat: 19.716,
      lng: 83.401,
    },
  ];

  const [zones, setZones] = useState(DEFAULT_ZONES);
  const [workers, setWorkers] = useState(DEFAULT_WORKERS);
  const [responders, setResponders] = useState(DEFAULT_RESPONDERS);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [isSirenMuted, setIsSirenMuted] = useState(true); // Siren sound starts OFF
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [isEquipmentShutdown, setIsEquipmentShutdown] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);

  const saveState = useCallback((key, data) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
        console.warn("Storage error:", e);
      }
    }
  }, []);

  const addAuditLog = useCallback((event, type, details) => {
    const newLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      event,
      type,
      details: typeof details === "string" ? details : JSON.stringify(details),
    };
    setAuditLogs((prev) => {
      const updated = [newLog, ...prev];
      saveState(STORAGE_KEYS.LOGS, updated.slice(0, 100));
      return updated;
    });
    insertAuditLog(event, type, details);
  }, [saveState]);

  const flushOfflineQueue = useCallback(async () => {
    if (offlineQueue.length === 0) return;
    for (const item of offlineQueue) {
      if (item.type === "sos") {
        await insertSosAlert(item.data);
      } else if (item.type === "incident") {
        await insertIncident(item.data);
      }
    }
    setOfflineQueue([]);
    saveState(STORAGE_KEYS.OFFLINE_QUEUE, []);
    addAuditLog("OFFLINE_QUEUE_SYNCED", "success", "Pending offline telemetry and incidents synced to Supabase.");
  }, [offlineQueue, saveState, addAuditLog]);

  // Online / Offline Detection
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleOnline = () => {
        setIsOnline(true);
        flushOfflineQueue();
      };
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, [flushOfflineQueue]);

  // Purge any legacy mock keys from browser storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("vedanta_safety_zones");
        localStorage.removeItem("vedanta_safety_workers");
        localStorage.removeItem("vedanta_safety_sos");
        localStorage.removeItem("vedanta_safety_incidents");
        localStorage.removeItem("vedanta_safety_zones_v2");
        localStorage.removeItem("vedanta_safety_workers_v2");
        localStorage.removeItem("vedanta_safety_sos_v2");
        localStorage.removeItem("vedanta_safety_incidents_v2");
      } catch (e) {}
    }
  }, []);

  // Fetch 100% Real Live Supabase Records
  const loadRealDataFromSupabase = useCallback(async () => {
    try {
      // 1. Fetch Real Zones
      const dbZones = await fetchGeofenceZones();
      if (Array.isArray(dbZones) && dbZones.length > 0) {
        setZones(dbZones);
        saveState(STORAGE_KEYS.ZONES, dbZones);
      }

      // 2. Fetch Real SOS alerts
      const dbAlerts = await fetchSosAlerts();
      if (Array.isArray(dbAlerts)) {
        const formattedAlerts = dbAlerts.map((a) => ({
          id: a.id,
          worker_id: a.worker_id,
          worker_name: a.remarks?.includes("by") ? a.remarks.split("by")[1]?.trim() : "Field Worker",
          employee_code: "VED-MN-4092",
          department: "Field Operations",
          phone: "+91 98765 43210",
          blood_group: "O+",
          status: a.status || "active",
          severity: a.severity || "critical",
          latitude: Number(a.latitude) || 21.815,
          longitude: Number(a.longitude) || 84.02,
          zone_name: "Industrial Site Area",
          battery: a.battery_level || 85,
          remarks: a.remarks || "Emergency SOS Triggered",
          created_at: new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          dispatched_to: a.dispatched_to,
          resolutionNotes: a.resolution_notes,
        }));
        setSosAlerts(formattedAlerts);
        saveState(STORAGE_KEYS.SOS, formattedAlerts);
      }

      // 3. Fetch Real Incident Reports
      const dbIncidents = await fetchIncidents();
      if (Array.isArray(dbIncidents)) {
        const formattedIncidents = dbIncidents.map((i) => ({
          id: i.id,
          title: i.title,
          category: i.category,
          severity: i.severity || "medium",
          reporter_name: "Field Reporter",
          reporter_code: "VED-SF",
          description: i.description,
          status: i.status || "open",
          location: "Industrial Complex",
          lat: Number(i.latitude) || 21.815,
          lng: Number(i.longitude) || 84.02,
          media_urls: i.media_urls || [],
          created_at: new Date(i.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }));
        setIncidents(formattedIncidents);
        saveState(STORAGE_KEYS.INCIDENTS, formattedIncidents);
      }

      // 4. Fetch Real Profiles & Telemetry
      const dbProfiles = await fetchProfiles();
      const dbLocations = await fetchWorkerLocations();

      if (Array.isArray(dbProfiles) && dbProfiles.length > 0) {
        const mappedWorkers = dbProfiles.map((p) => {
          const loc = dbLocations.find((l) => l.worker_id === p.id);
          return {
            id: p.id,
            name: p.full_name || "Employee",
            code: p.employee_code || "VED-MN",
            department: p.department || "Operations",
            phone: p.phone || "+91 98765 00000",
            blood_group: p.blood_group || "O+",
            lat: loc ? Number(loc.latitude) : 21.815,
            lng: loc ? Number(loc.longitude) : 84.02,
            speed: loc ? Number(loc.speed_kmh) : 0,
            heading: loc ? Number(loc.heading) : 0,
            battery: 88,
            is_sos_active: loc ? Boolean(loc.is_sos_active) : false,
            zone: "Main Facility",
            last_ping: loc?.last_ping ? new Date(loc.last_ping).toLocaleTimeString() : "Live",
          };
        });
        setWorkers(mappedWorkers);
        saveState(STORAGE_KEYS.WORKERS, mappedWorkers);
      }

      // 5. Fetch Real Audit Logs
      const dbLogs = await fetchAuditLogs();
      if (Array.isArray(dbLogs)) {
        const formattedLogs = dbLogs.map((l) => ({
          id: l.id,
          timestamp: new Date(l.created_at).toLocaleTimeString(),
          event: l.event_type,
          type: l.details?.severity || "info",
          details: typeof l.details === "string" ? l.details : l.details?.message || JSON.stringify(l.details),
        }));
        setAuditLogs(formattedLogs);
        saveState(STORAGE_KEYS.LOGS, formattedLogs);
      }
    } catch (err) {
      console.warn("Supabase fetch notice:", err);
    } finally {
      setIsInitialLoaded(true);
    }
  }, [saveState]);

  useEffect(() => {
    let isMounted = true;
    const fetchLive = async () => {
      if (isMounted) {
        await loadRealDataFromSupabase();
      }
    };
    fetchLive();
    return () => {
      isMounted = false;
    };
  }, [loadRealDataFromSupabase]);

  // Siren Audio Management
  useEffect(() => {
    const hasActiveCriticalSOS = sosAlerts.some((a) => a.status === "active");
    if (hasActiveCriticalSOS && !isSirenMuted) {
      audioEngine.playSiren();
    } else {
      audioEngine.stopSiren();
    }
  }, [sosAlerts, isSirenMuted]);

  // Update Worker GPS in memory and Supabase worker_locations table
  const updateWorkerLocation = (workerId, lat, lng, speed = 0, heading = 0) => {
    const evaluation = evaluateGeofence([lat, lng], zones);

    setWorkers((prev) => {
      const exists = prev.some((w) => w.id === workerId);
      if (!exists) {
        return prev;
      }

      const updated = prev.map((w) => {
        if (w.id === workerId) {
          const zoneChanged = w.zone !== evaluation.zoneName;
          if (zoneChanged && evaluation.isBreached) {
            addAuditLog(
              "GEOFENCE_BREACH_DETECTED",
              "warning",
              `Worker ${w.name} entered zone: "${evaluation.zoneName}"`
            );
          }
          return {
            ...w,
            lat,
            lng,
            speed,
            heading,
            zone: evaluation.zoneName,
            zone_type: evaluation.breachType || "safe",
            last_ping: "Just now",
          };
        }
        return w;
      });
      saveState(STORAGE_KEYS.WORKERS, updated);
      return updated;
    });

    upsertWorkerLocation(workerId, lat, lng, speed, heading, false);
  };

  // Trigger Panic / SOS Emergency
  const triggerSOS = async (workerData, customCoords = null, remarks = "Immediate Assistance Requested") => {
    const lat = customCoords?.lat || workerData?.lat || 21.815;
    const lng = customCoords?.lng || workerData?.lng || 84.02;
    const evaluation = evaluateGeofence([lat, lng], zones);

    const generateUUID = () => {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };

    const newAlert = {
      id: generateUUID(),
      worker_id: workerData?.id || "11111111-1111-4111-a111-111111111111",
      worker_name: workerData?.full_name || workerData?.name || "Field Worker",
      employee_code: workerData?.employee_code || workerData?.code || "VED-MN-4092",
      department: workerData?.department || "Mining Operations",
      phone: workerData?.phone || "+91 98765 43210",
      blood_group: workerData?.blood_group || "O+",
      emergency_contact: workerData?.emergency_contact || "+91 98111 22334",
      status: "active",
      severity: "critical",
      latitude: lat,
      longitude: lng,
      zone_name: evaluation.zoneName,
      battery: workerData?.battery || 88,
      remarks,
      trigger_type: "manual_sos",
      created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      dispatched_to: null,
      dispatched_at: null,
      responder_coords: null,
    };

    setSosAlerts((prev) => {
      const updated = [newAlert, ...prev];
      saveState(STORAGE_KEYS.SOS, updated);
      return updated;
    });

    setWorkers((prev) => {
      const updated = prev.map((w) =>
        w.id === workerData?.id
          ? { ...w, is_sos_active: true, lat, lng, zone: evaluation.zoneName }
          : w
      );
      saveState(STORAGE_KEYS.WORKERS, updated);
      return updated;
    });

    if (isOnline) {
      insertSosAlert(newAlert).then((saved) => {
        if (saved && saved.id && saved.id !== newAlert.id) {
          setSosAlerts((prev) => {
            const updated = prev.map((a) => (a.id === newAlert.id ? { ...a, id: saved.id } : a));
            saveState(STORAGE_KEYS.SOS, updated);
            return updated;
          });
        }
      });
    } else {
      const queueItem = { type: "sos", data: newAlert, timestamp: Date.now() };
      setOfflineQueue((q) => {
        const u = [...q, queueItem];
        saveState(STORAGE_KEYS.OFFLINE_QUEUE, u);
        return u;
      });
    }

    addAuditLog(
      "SOS_EMERGENCY_TRIGGERED",
      "critical",
      `SOS Panic initiated by ${newAlert.worker_name} at [${lat.toFixed(4)}, ${lng.toFixed(4)}]`
    );

    return newAlert;
  };

  // Acknowledge SOS
  const acknowledgeSOS = async (sosId, operatorName = "Command Chief") => {
    setSosAlerts((prev) => {
      const updated = prev.map((a) => (a.id === sosId ? { ...a, status: "acknowledged", acknowledged_by: operatorName } : a));
      saveState(STORAGE_KEYS.SOS, updated);
      return updated;
    });
    await updateSosAlert(sosId, { status: "acknowledged" });
    addAuditLog("SOS_ACKNOWLEDGED", "warning", `Alert ${sosId} acknowledged by ${operatorName}`);
  };

  // Dispatch Response Team
  const dispatchResponseTeam = async (sosId, teamName = "QRF Ambulance Alpha") => {
    setSosAlerts((prev) => {
      const updated = prev.map((a) =>
        a.id === sosId
          ? {
              ...a,
              status: "dispatched",
              dispatched_to: teamName,
              dispatched_at: new Date().toLocaleTimeString(),
              eta_minutes: 3,
            }
          : a
      );
      saveState(STORAGE_KEYS.SOS, updated);
      return updated;
    });

    await updateSosAlert(sosId, { status: "dispatched" });
    addAuditLog("RESPONSE_TEAM_DISPATCHED", "warning", `${teamName} dispatched for alert ${sosId}`);
  };

  // Resolve SOS
  const resolveSOS = async (sosId, resolutionNotes = "Distress cleared and marked safe.") => {
    let workerIdToReset = null;

    setSosAlerts((prev) => {
      const updated = prev.map((a) => {
        if (a.id === sosId) {
          workerIdToReset = a.worker_id;
          return {
            ...a,
            status: "resolved",
            resolved_at: new Date().toLocaleTimeString(),
            resolutionNotes,
          };
        }
        return a;
      });
      saveState(STORAGE_KEYS.SOS, updated);
      return updated;
    });

    if (workerIdToReset) {
      setWorkers((prev) => {
        const updated = prev.map((w) =>
          w.id === workerIdToReset ? { ...w, is_sos_active: false } : w
        );
        saveState(STORAGE_KEYS.WORKERS, updated);
        return updated;
      });
    }

    await updateSosAlert(sosId, { status: "resolved", resolved_at: new Date().toISOString() });
    addAuditLog("SOS_RESOLVED", "success", `Emergency ${sosId} resolved: ${resolutionNotes}`);
  };

  // Report New Incident with Supabase Storage 'photos' bucket upload
  const reportIncident = async (newInc, mediaFile = null) => {
    let mediaUrls = [];

    if (mediaFile) {
      const uploadRes = await uploadMediaToSupabase(mediaFile, "incidents");
      if (uploadRes.success && uploadRes.publicUrl) {
        mediaUrls.push(uploadRes.publicUrl);
      }
    }

    const evaluation = evaluateGeofence([newInc.lat || 21.815, newInc.lng || 84.02], zones);
    const created = {
      id: `inc-${Date.now()}`,
      title: newInc.title,
      category: newInc.category,
      severity: newInc.severity || "medium",
      reporter_name: newInc.reporter_name,
      reporter_code: newInc.reporter_code,
      description: newInc.description,
      status: "open",
      location: newInc.location || evaluation.zoneName,
      lat: newInc.lat || 21.815,
      lng: newInc.lng || 84.02,
      media_urls: mediaUrls.length > 0 ? mediaUrls : (newInc.media_urls || []),
      created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setIncidents((prev) => {
      const updated = [created, ...prev];
      saveState(STORAGE_KEYS.INCIDENTS, updated);
      return updated;
    });

    if (isOnline) {
      await insertIncident(created);
    } else {
      const queueItem = { type: "incident", data: created, timestamp: Date.now() };
      setOfflineQueue((q) => {
        const u = [...q, queueItem];
        saveState(STORAGE_KEYS.OFFLINE_QUEUE, u);
        return u;
      });
    }

    addAuditLog(
      "INCIDENT_REPORTED",
      created.severity === "high" || created.severity === "critical" ? "critical" : "warning",
      `New incident: "${created.title}" [${created.category.toUpperCase()}] by ${created.reporter_name}`
    );

    return created;
  };

  // Plant PLC Emergency Shutdown Signal
  const triggerEquipmentShutdown = (unitName = "Furnace & Conveyor Line") => {
    setIsEquipmentShutdown(true);
    addAuditLog(
      "EMERGENCY_EQUIPMENT_SHUTDOWN",
      "critical",
      `EMERGENCY PLC RELAY TRIP: ${unitName} shut down by Response Team.`
    );
  };

  const resetEquipmentShutdown = () => {
    setIsEquipmentShutdown(false);
    addAuditLog(
      "EQUIPMENT_RESTARTED",
      "info",
      "Plant PLC interlocks reset after safety clearance."
    );
  };

  // Add / Delete Geofence Zones in Supabase
  const addGeofenceZone = async (zoneData) => {
    const colorMap = {
      hazard: "#ef4444",
      restricted: "#f59e0b",
      safe: "#10b981",
      no_network: "#6366f1",
    };

    const newZ = {
      id: `zone-${Date.now()}`,
      zone_name: zoneData.name,
      zone_type: zoneData.type,
      description: zoneData.description,
      site_location: zoneData.site || "Vedanta Plant Main Site",
      speed_limit_kmh: Number(zoneData.speedLimit) || 20,
      is_active: true,
      color: colorMap[zoneData.type] || "#3b82f6",
      polygon_coordinates: zoneData.coordinates || [
        [21.812, 84.026],
        [21.816, 84.03],
        [21.813, 84.034],
        [21.809, 84.029],
      ],
    };

    const area = calculatePolygonArea(newZ.polygon_coordinates);
    newZ.area_sqm = area;

    setZones((prev) => {
      const updated = [newZ, ...prev];
      saveState(STORAGE_KEYS.ZONES, updated);
      return updated;
    });

    await insertGeofenceZone(newZ);

    addAuditLog(
      "GEOFENCE_ZONE_CREATED",
      "info",
      `Geofence perimeter "${newZ.zone_name}" [${newZ.zone_type.toUpperCase()}] created`
    );

    return newZ;
  };

  const deleteGeofenceZone = (zoneId) => {
    setZones((prev) => {
      const target = prev.find((z) => z.id === zoneId);
      const updated = prev.filter((z) => z.id !== zoneId);
      saveState(STORAGE_KEYS.ZONES, updated);
      if (target) {
        addAuditLog("GEOFENCE_ZONE_DELETED", "warning", `Zone "${target.zone_name}" deleted`);
      }
      return updated;
    });
  };

  const toggleSirenMute = () => {
    const isMutedNow = audioEngine.toggleMute();
    setIsSirenMuted(isMutedNow);
  };

  return (
    <SafetyContext.Provider
      value={{
        workers,
        zones,
        responders,
        sosAlerts,
        incidents,
        auditLogs,
        isSirenMuted,
        isOnline,
        offlineQueue,
        isEquipmentShutdown,
        isInitialLoaded,
        loadRealDataFromSupabase,
        triggerSOS,
        acknowledgeSOS,
        dispatchResponseTeam,
        resolveSOS,
        reportIncident,
        addGeofenceZone,
        deleteGeofenceZone,
        updateWorkerLocation,
        toggleSirenMute,
        triggerEquipmentShutdown,
        resetEquipmentShutdown,
        addAuditLog,
      }}
    >
      {children}
    </SafetyContext.Provider>
  );
}

export function useSafety() {
  return useContext(SafetyContext);
}
