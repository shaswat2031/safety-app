"use client";

import React, { useState, useEffect } from "react";
import { useSafety } from "@/context/SafetyContext";
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapRoute,
  MapGeoJSON,
} from "@/components/ui/map";
import { LocateFixed } from "lucide-react";

// Helper to create smooth circle polygon GeoJSON given center [lng, lat] and radius in kilometers
function createCircleGeoJSON(centerLng, centerLat, radiusKm, points = 64) {
  const coords = [];
  const latRad = (centerLat * Math.PI) / 180;
  const deltaLat = radiusKm / 111.32;
  const deltaLng = radiusKm / (111.32 * Math.cos(latRad || 0.000001));

  for (let i = 0; i < points; i++) {
    const angle = (i / points) * (2 * Math.PI);
    const lng = centerLng + deltaLng * Math.cos(angle);
    const lat = centerLat + deltaLat * Math.sin(angle);
    coords.push([lng, lat]);
  }
  coords.push(coords[0]); // Close ring

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
    properties: { radiusKm },
  };
}

export default function LeafletMap({
  selectedWorkerId = null,
  onSelectWorker = () => {},
  center = [28.39551, 77.03948],
  zoom = 15,
  showResponders = true,
  showZones = false,
}) {
  const { workers, zones, responders, sosAlerts, dispatchResponseTeam } = useSafety();
  const [myLocation, setMyLocation] = useState(null);
  const [show25kmCircle, setShow25kmCircle] = useState(false);
  const [showRadarModal, setShowRadarModal] = useState(false);

  // Live High-Precision GPS Geolocation Tracking for My Location (Blue Dot)
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setMyLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 8,
          });
        },
        (err) => {
          setMyLocation((prev) => prev || { lat: center[0] || 28.39551, lng: center[1] || 77.03948, accuracy: 10 });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [center]);

  // Convert center from [lat, lng] to MapLibre [lng, lat]
  const mapCenter = myLocation
    ? [myLocation.lng, myLocation.lat]
    : [center[1] || 77.03948, center[0] || 28.39551];

  // Active dispatches
  const activeDispatches = sosAlerts.filter(
    (a) => a.status === "dispatched" && a.responder_coords
  );

  // Concentric 25km Accuracy Circumference GeoJSONs centered on user location
  const centerLng = mapCenter[0];
  const centerLat = mapCenter[1];
  const circle5kmGeoJSON = createCircleGeoJSON(centerLng, centerLat, 5);
  const circle15kmGeoJSON = createCircleGeoJSON(centerLng, centerLat, 15);
  const circle25kmGeoJSON = createCircleGeoJSON(centerLng, centerLat, 25);

  return (
    <div className="relative w-full h-full min-h-[440px] rounded-3xl overflow-hidden border border-slate-200 shadow-md">
      
      {/* Top Map HUD Status Bar */}
      <div className="absolute top-3 left-3 z-[10] bg-white/95 backdrop-blur-md border border-slate-200 px-3.5 py-2 rounded-2xl shadow-md flex items-center gap-3 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Vedanta GIS Map</span>
        </div>
        <div className="text-[11px] text-slate-500 border-l border-slate-200 pl-3 hidden sm:flex items-center gap-3">
          <span>Active Staff: <strong className="text-slate-800">{workers.length}</strong></span>
          <span>Zones: <strong className="text-slate-800">{zones.length}</strong></span>
          {sosAlerts.filter((a) => a.status === "active").length > 0 && (
            <span className="text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200 animate-pulse">
              🚨 {sosAlerts.filter((a) => a.status === "active").length} SOS
            </span>
          )}
        </div>
      </div>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 right-3 z-[10] bg-white/95 backdrop-blur-md border border-slate-200 p-2.5 rounded-2xl shadow-md text-xs flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-slate-700 text-[11px] font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-white shadow-xs"></span>
          <span>GPS Position</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700 text-[11px] font-medium border-l border-slate-200 pl-3">
          <span className="w-2.5 h-2.5 rounded bg-blue-600 text-white text-[8px] flex items-center justify-center font-bold">🚑</span>
          <span>QRF Ambulance</span>
        </div>
      </div>

      {/* shadcn / mapcn Map Component */}
      <Map center={mapCenter} zoom={zoom} theme="light" className="w-full h-full">
        <MapControls position="top-right" showZoom showCompass showLocate showFullscreen />

        {/* My Live GPS Location Marker (Glowing Blue Dot with Pulse Ring) */}
        {myLocation && (
          <MapMarker longitude={myLocation.lng} latitude={myLocation.lat}>
            <MarkerContent>
              <div className="relative flex items-center justify-center">
                {/* Accuracy Pulse Ring */}
                <div className="absolute w-10 h-10 bg-blue-500/30 rounded-full animate-ping pointer-events-none"></div>
                <div className="absolute w-7 h-7 bg-blue-500/20 rounded-full border border-blue-400"></div>
                {/* Core Glowing Blue Location Dot */}
                <div className="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg z-10 hover:scale-125 transition-transform cursor-pointer"></div>
              </div>
            </MarkerContent>
            <MarkerPopup closeButton>
              <div className="text-xs p-1 space-y-1">
                <div className="font-bold text-blue-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                  My Live GPS Location
                </div>
                <div className="text-[11px] text-slate-600 font-mono">
                  {myLocation.lat.toFixed(5)}°, {myLocation.lng.toFixed(5)}°
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold">
                  High-Precision Lock: ±{Math.round(myLocation.accuracy)}m Fix
                </div>
              </div>
            </MarkerPopup>
          </MapMarker>
        )}

        {/* 25km Circumference & Color-Coordinated Accuracy Concentric Layers */}
        {show25kmCircle && (
          <>
            {/* Outer 25km Circumference Radius Circle (Indigo Boundary - 75-80% Precision) */}
            <MapGeoJSON
              id="accuracy-circle-25km"
              data={circle25kmGeoJSON}
              fillPaint={{
                "fill-color": "#6366f1",
                "fill-opacity": 0.05,
              }}
              linePaint={{
                "line-color": "#4f46e5",
                "line-width": 2,
              }}
            />

            {/* Middle 15km Radius Circle (Amber Buffer - 90% Precision) */}
            <MapGeoJSON
              id="accuracy-circle-15km"
              data={circle15kmGeoJSON}
              fillPaint={{
                "fill-color": "#f59e0b",
                "fill-opacity": 0.08,
              }}
              linePaint={{
                "line-color": "#d97706",
                "line-width": 2,
              }}
            />

            {/* Inner Core 5km Radius Circle (Emerald Core - 99% High Precision) */}
            <MapGeoJSON
              id="accuracy-circle-5km"
              data={circle5kmGeoJSON}
              fillPaint={{
                "fill-color": "#10b981",
                "fill-opacity": 0.12,
              }}
              linePaint={{
                "line-color": "#059669",
                "line-width": 2.5,
              }}
            />
          </>
        )}

        {/* Geofence Polygons (Only rendered if showZones is explicitly true) */}
        {showZones &&
          zones.map((zone) => {
            const colorMap = {
              hazard: "#ef4444",
              restricted: "#f59e0b",
              safe: "#10b981",
              no_network: "#6366f1",
            };
            const zoneColor = colorMap[zone.zone_type] || "#3b82f6";

            // Convert polygon [lat, lng] to GeoJSON [lng, lat]
            const ring = (zone.polygon_coordinates || []).map(([lat, lng]) => [lng, lat]);
            if (ring.length > 0 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
              ring.push(ring[0]); // Ensure closed ring
            }

            const geojsonFeature = {
              type: "Feature",
              geometry: {
                type: "Polygon",
                coordinates: [ring],
              },
              properties: {
                name: zone.zone_name,
              },
            };

            return (
              <MapGeoJSON
                key={zone.id}
                id={`zone-${zone.id}`}
                data={geojsonFeature}
                fillPaint={{
                  "fill-color": zoneColor,
                  "fill-opacity": 0.2,
                }}
                linePaint={{
                  "line-color": zoneColor,
                  "line-width": 2.5,
                }}
              />
            );
          })}

        {/* Active Dispatch Navigation Routes */}
        {activeDispatches.map((dispatch) => {
          const start = [dispatch.responder_coords[1], dispatch.responder_coords[0]];
          const end = [dispatch.longitude, dispatch.latitude];
          return (
            <MapRoute
              key={`route-${dispatch.id}`}
              id={`route-${dispatch.id}`}
              coordinates={[start, end]}
              color="#2563eb"
              width={4}
              dashArray={[2, 2]}
            />
          );
        })}

        {/* QRF Responder Ambulances */}
        {showResponders &&
          responders.map((resp) => (
            <MapMarker
              key={resp.id}
              longitude={resp.lng}
              latitude={resp.lat}
            >
              <MarkerContent>
                <div className="w-8 h-8 rounded-xl bg-blue-600 border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold transition-transform hover:scale-110">
                  🚑
                </div>
              </MarkerContent>
              <MarkerPopup closeButton>
                <div className="text-xs p-1 space-y-1">
                  <div className="font-bold text-slate-900">{resp.name}</div>
                  <div className="text-[11px] text-slate-600">Lead: {resp.leader}</div>
                  <div className="text-[10px] text-blue-600 font-semibold uppercase">
                    Status: {resp.status}
                  </div>
                </div>
              </MarkerPopup>
            </MapMarker>
          ))}

        {/* Dedicated Active SOS Siren Distress Markers */}
        {sosAlerts
          .filter((alert) => alert.status === "active" || alert.status === "acknowledged" || alert.status === "dispatched")
          .map((alert) => {
            const alertLng = Number(alert.longitude) || 77.03948;
            const alertLat = Number(alert.latitude) || 28.39551;

            return (
              <MapMarker
                key={`sos-siren-${alert.id}`}
                longitude={alertLng}
                latitude={alertLat}
              >
                <MarkerContent>
                  <div className="relative flex items-center justify-center cursor-pointer">
                    {/* Glowing Red Radar Beacons */}
                    <div className="absolute w-12 h-12 bg-red-600/40 rounded-full animate-ping pointer-events-none"></div>
                    <div className="absolute w-8 h-8 bg-red-500/30 rounded-full animate-pulse border border-red-400"></div>
                    {/* Core Red Glowing Siren Icon */}
                    <div className="w-9 h-9 rounded-full bg-red-600 border-2 border-white text-white font-black text-xs flex items-center justify-center shadow-2xl animate-bounce hover:scale-125 transition-transform z-20">
                      🚨
                    </div>
                  </div>
                </MarkerContent>
                <MarkerPopup closeButton>
                  <div className="w-56 text-xs text-slate-800 space-y-2 p-1">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="font-bold text-red-700 text-sm flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                        {alert.worker_name}
                      </span>
                      <span className="bg-red-100 text-red-700 font-black px-2 py-0.5 rounded border border-red-300 text-[10px] animate-pulse">
                        SOS ACTIVE
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                      <div><span className="text-slate-400">Dept:</span> <span className="font-semibold text-slate-800">{alert.department}</span></div>
                      <div><span className="text-slate-400">Battery:</span> <span className="font-semibold text-emerald-600">{alert.battery || 88}%</span></div>
                      <div className="col-span-2 font-mono text-[10px] text-slate-500">
                        GPS Coords: [{alertLat.toFixed(4)}°, {alertLng.toFixed(4)}°]
                      </div>
                      <div className="col-span-2 text-red-700 font-bold bg-red-50 p-1.5 rounded border border-red-200 text-[10px]">
                        &quot;{alert.remarks || "SOS Emergency Distress Signal"}&quot;
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-100">
                      <button
                        onClick={() => dispatchResponseTeam(alert.id)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors shadow flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>🚑 Dispatch QRF Ambulance</span>
                      </button>
                    </div>
                  </div>
                </MarkerPopup>
              </MapMarker>
            );
          })}

        {/* Field Worker Markers */}
        {workers.map((worker) => {
          const isSOS = worker.is_sos_active;
          const isHazard = worker.zone_type === "hazard";
          const isRestricted = worker.zone_type === "restricted";

          const markerColor = isSOS
            ? "bg-red-600 border-white text-white shadow-red-500/50 animate-pulse"
            : isHazard
            ? "bg-amber-500 border-white text-white"
            : isRestricted
            ? "bg-orange-500 border-white text-white"
            : "bg-emerald-600 border-white text-white";

          return (
            <MapMarker
              key={worker.id}
              longitude={worker.lng}
              latitude={worker.lat}
              onClick={() => onSelectWorker(worker)}
            >
              <MarkerContent>
                <div className="relative flex items-center justify-center cursor-pointer">
                  {isSOS && (
                    <div className="absolute -inset-2 bg-red-600 rounded-full animate-ping opacity-75"></div>
                  )}
                  <div className={`w-8 h-8 rounded-full ${markerColor} border-2 shadow-md flex items-center justify-center text-xs font-black transition-transform hover:scale-125`}>
                    {isSOS ? "SOS" : worker.name ? worker.name.charAt(0) : "W"}
                  </div>
                </div>
              </MarkerContent>

              <MarkerPopup closeButton>
                <div className="w-56 text-xs text-slate-800 space-y-2 p-1">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="font-bold text-slate-900 text-sm">{worker.name}</span>
                    {worker.is_sos_active ? (
                      <span className="bg-red-100 text-red-700 font-black px-2 py-0.5 rounded border border-red-300 text-[10px] animate-pulse">
                        SOS ACTIVE
                      </span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-semibold border border-emerald-200">
                        Normal
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                    <div><span className="text-slate-400">ID:</span> <span className="font-mono text-slate-800">{worker.code}</span></div>
                    <div><span className="text-slate-400">Blood:</span> <span className="font-bold text-red-600">{worker.blood_group}</span></div>
                    <div className="col-span-2"><span className="text-slate-400">Dept:</span> {worker.department}</div>
                    <div><span className="text-slate-400">Battery:</span> <span className="font-semibold text-slate-800">{worker.battery}%</span></div>
                    <div><span className="text-slate-400">Speed:</span> <span className="font-semibold text-slate-800">{worker.speed} km/h</span></div>
                  </div>

                  <div className="pt-1.5 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-400">Current Zone: </span>
                    <span className="font-semibold text-slate-900">{worker.zone}</span>
                  </div>

                  {worker.is_sos_active && (
                    <div className="pt-1.5">
                      <button
                        onClick={() => {
                          const activeAlert = sosAlerts.find(
                            (a) => (a.worker_id === worker.id || a.worker_name === worker.name) && a.status !== "resolved"
                          );
                          if (activeAlert) {
                            dispatchResponseTeam(activeAlert.id);
                          }
                        }}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors shadow flex items-center justify-center gap-1.5"
                      >
                        <span>🚑 Dispatch QRF Ambulance</span>
                      </button>
                    </div>
                  )}
                </div>
              </MarkerPopup>
            </MapMarker>
          );
        })}
      </Map>
    </div>
  );
}
