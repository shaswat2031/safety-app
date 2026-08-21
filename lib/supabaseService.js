/**
 * Real Supabase Database & Storage Integration Service
 * Target Supabase Project: lbphmumunpvdyvwxjqfu
 * Storage Bucket: photos
 */

import { supabase } from "@/lib/supabase";

const BUCKET_NAME = "photos";

// Fallback valid UUID for anonymous / field testing if not yet registered in auth.users
export const DEFAULT_WORKER_UUID = "11111111-1111-4111-a111-111111111111";

/**
 * Ensures a valid profile exists in 'profiles' table before inserting child records with foreign keys
 */
export async function ensureProfileExists(profileData) {
  if (!supabase || !profileData) return profileData?.id || null;

  const validId =
    profileData?.id &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileData.id)
      ? profileData.id
      : typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : null;

  if (!validId) return null;

  try {
    await supabase
      .from("profiles")
      .upsert(
        [
          {
            id: validId,
            full_name: profileData.full_name || profileData.name || "Employee",
            employee_code: profileData.employee_code || profileData.code || null,
            role: profileData.role || "worker",
            department: profileData.department || null,
            phone: profileData.phone || null,
            blood_group: profileData.blood_group || null,
            email: profileData.email || null,
          },
        ],
        { onConflict: "id" }
      );

    return validId;
  } catch (err) {
    return validId;
  }
}

/**
 * Uploads a file (photo or video) directly to Supabase Storage bucket 'photos'
 */
export async function uploadMediaToSupabase(file, folder = "incidents") {
  if (!file) return { success: false, publicUrl: null, error: "No file provided" };

  try {
    const fileExt = file.name ? file.name.split(".").pop() : "jpg";
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

    if (!supabase) {
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      return { success: true, publicUrl: dataUrl, error: null };
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.warn("Supabase storage upload notice:", error.message);
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      return { success: true, publicUrl: dataUrl, error: null };
    }

    const { data: publicData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return {
      success: true,
      publicUrl: publicData?.publicUrl || null,
      error: null,
    };
  } catch (err) {
    console.error("Upload error:", err);
    return { success: false, publicUrl: null, error: err.message };
  }
}

// ----------------- DB OPERATIONS -----------------

export async function fetchSosAlerts() {
  try {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("sos_alerts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.warn("fetchSosAlerts error:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    return [];
  }
}

export async function insertSosAlert(alertData) {
  try {
    if (!supabase) return null;

    const workerId = await ensureProfileExists({
      id: alertData.worker_id,
      full_name: alertData.worker_name,
      employee_code: alertData.employee_code,
      department: alertData.department,
      phone: alertData.phone,
      blood_group: alertData.blood_group,
      role: "worker",
    });

    const isUuid =
      alertData.id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(alertData.id);

    const payload = {
      ...(isUuid ? { id: alertData.id } : {}),
      worker_id: workerId,
      status: alertData.status || "active",
      severity: alertData.severity || "critical",
      latitude: Number(alertData.latitude) || 21.815,
      longitude: Number(alertData.longitude) || 84.02,
      battery_level: Number(alertData.battery) || 88,
      trigger_type: alertData.trigger_type || "manual_sos",
      remarks: alertData.remarks || "Emergency SOS Triggered",
    };

    const { data, error } = await supabase
      .from("sos_alerts")
      .insert([payload])
      .select();

    if (error) {
      console.warn("Supabase insertSosAlert error:", error.message);
      return null;
    }

    console.log("✅ Supabase SOS inserted successfully:", data);
    return data?.[0] || null;
  } catch (err) {
    console.error("insertSosAlert exception:", err.message);
    return null;
  }
}

export async function updateSosAlert(id, updates) {
  try {
    if (!supabase || !id) return null;

    // Supabase sos_alerts table expects UUID for id.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      // Not a valid UUID (e.g. local mock ID), skip remote DB update safely
      return null;
    }

    const { data, error } = await supabase
      .from("sos_alerts")
      .update(updates)
      .eq("id", id)
      .select();
    if (error) {
      console.warn("Supabase updateSosAlert warning:", error.message);
      return null;
    }
    return data?.[0] || null;
  } catch (err) {
    console.warn("updateSosAlert notice:", err.message);
    return null;
  }
}

export async function fetchIncidents() {
  try {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("incident_reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.warn("fetchIncidents error:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    return [];
  }
}

export async function insertIncident(incidentData) {
  try {
    if (!supabase) return null;

    const reporterId = await ensureProfileExists({
      id: incidentData.reporter_id,
      full_name: incidentData.reporter_name,
      employee_code: incidentData.reporter_code,
      role: "worker",
    });

    const payload = {
      reporter_id: reporterId,
      title: incidentData.title || "Safety Hazard Incident",
      category: incidentData.category || "machinery",
      description: incidentData.description || "Field report",
      severity: incidentData.severity || "medium",
      latitude: Number(incidentData.lat || incidentData.latitude) || 21.815,
      longitude: Number(incidentData.lng || incidentData.longitude) || 84.02,
      media_urls: incidentData.media_urls || [],
      status: incidentData.status || "open",
    };

    const { data, error } = await supabase
      .from("incident_reports")
      .insert([payload])
      .select();

    if (error) {
      console.error("Supabase insertIncident error:", error.message, error.details);
      return null;
    }

    console.log("✅ Supabase Incident inserted successfully:", data);
    return data?.[0] || null;
  } catch (err) {
    console.error("insertIncident notice:", err.message);
    return null;
  }
}

export async function fetchGeofenceZones() {
  try {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("geofence_zones")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Supabase fetchGeofenceZones error:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("fetchGeofenceZones notice:", err.message);
    return [];
  }
}

export async function insertGeofenceZone(zoneData) {
  try {
    if (!supabase) return null;

    const payload = {
      zone_name: zoneData.zone_name || zoneData.name,
      zone_type: zoneData.zone_type || zoneData.type || "hazard",
      polygon_coordinates: zoneData.polygon_coordinates || zoneData.coordinates,
      site_location: zoneData.site_location || zoneData.site || "Vedanta Main Site",
      speed_limit_kmh: Number(zoneData.speed_limit_kmh || zoneData.speedLimit) || 20,
      is_active: true,
    };

    const { data, error } = await supabase
      .from("geofence_zones")
      .insert([payload])
      .select();

    if (error) {
      console.error("Supabase insertGeofenceZone error:", error.message, error.details);
      return null;
    }

    console.log("✅ Supabase Zone inserted successfully:", data);
    return data?.[0] || null;
  } catch (err) {
    console.error("insertGeofenceZone notice:", err.message);
    return null;
  }
}

export async function fetchProfiles() {
  try {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Supabase fetchProfiles error:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("fetchProfiles notice:", err.message);
    return [];
  }
}

export async function fetchWorkerLocations() {
  try {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("worker_locations")
      .select("*")
      .order("last_ping", { ascending: false });
    if (error) {
      console.error("Supabase fetchWorkerLocations error:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("fetchWorkerLocations notice:", err.message);
    return [];
  }
}

export async function upsertWorkerLocation(workerId, lat, lng, speed = 0, heading = 0, isSos = false, battery = null) {
  try {
    if (!supabase) return null;

    const validWorkerId = await ensureProfileExists({ id: workerId });

    const payload = {
      worker_id: validWorkerId,
      latitude: Number(lat) || 21.815,
      longitude: Number(lng) || 84.02,
      speed_kmh: Number(speed) || 0,
      heading: Number(heading) || 0,
      is_sos_active: Boolean(isSos),
      last_ping: new Date().toISOString(),
    };

    if (battery != null) {
      payload.battery_level = Number(battery);
    }

    const { data, error } = await supabase
      .from("worker_locations")
      .upsert(payload)
      .select();

    if (error) {
      console.warn("Supabase upsertWorkerLocation notice (RLS policy check required):", error.message);
      return null;
    }
    return data?.[0] || null;
  } catch (err) {
    console.warn("upsertWorkerLocation notice:", err.message);
    return null;
  }
}

export async function fetchAuditLogs() {
  try {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("safety_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("Supabase fetchAuditLogs error:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("fetchAuditLogs notice:", err.message);
    return [];
  }
}

export async function insertAuditLog(event, type, details) {
  try {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("safety_audit_logs")
      .insert([
        {
          event_type: event,
          details: typeof details === "object" ? details : { message: String(details), severity: type },
        },
      ])
      .select();

    if (error) {
      console.warn("Supabase insertAuditLog notice:", error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn("insertAuditLog notice:", err.message);
    return null;
  }
}

// ----------------- 2-WAY CHAT SUPABASE DB INTEGRATION -----------------

export async function fetchChatMessages() {
  try {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("fetchChatMessages error:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn("fetchChatMessages error:", err);
    return [];
  }
}

export async function insertChatMessage(msgData) {
  try {
    if (!supabase) return null;

    const payload = {
      sender_role: msgData.sender_role || "command",
      sender_name: msgData.sender_name || "Operator",
      message: msgData.message,
      preset_type: msgData.preset_type || "normal",
      timestamp: msgData.timestamp || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const { data, error } = await supabase
      .from("chat_messages")
      .insert([payload])
      .select();

    if (error) {
      console.warn("Supabase insertChatMessage error:", error.message);
      return null;
    }

    console.log("✅ Supabase Chat message stored in chat_messages table:", data?.[0]);
    return data?.[0] || null;
  } catch (err) {
    console.warn("insertChatMessage error:", err);
    return null;
  }
}
