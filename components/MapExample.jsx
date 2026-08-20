"use client";

import { Map, MapControls } from "@/components/ui/map";

export default function MapExample() {
  return (
    <div className="w-full h-[400px] overflow-hidden rounded-2xl border border-slate-200 shadow-sm relative">
      <Map center={[84.0225, 21.8165]} zoom={13}>
        <MapControls showZoom showCompass showLocate showFullscreen />
      </Map>
    </div>
  );
}
