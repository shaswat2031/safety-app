"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSafety } from "@/context/SafetyContext";
import {
  ShieldAlert,
  Radio,
  MapPin,
  Flame,
  BarChart3,
  Layers,
  ArrowRight,
  Zap,
  Activity,
  Users,
  CheckCircle2,
  Clock,
  Building2,
  Lock,
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { profile, role, isAuthenticated, loading: authLoading } = useAuth();
  const { sosAlerts, workers, zones } = useSafety();

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (role === "worker") {
        router.push("/worker");
      }
    }
  }, [isAuthenticated, authLoading, role, router]);

  const activeSOSCount = sosAlerts.filter((a) => a.status === "active" || a.status === "dispatched").length;

  const roleModules = [
    {
      roleNumber: "01",
      title: "Worker (Field App)",
      description: "1-Tap SOS Panic Button, real-time GPS telemetry broadcast, active geofence proximity alerts, and instant photo hazard reporting.",
      features: null,
      href: "/worker",
      icon: Radio,
      badge: "Role 1 • Field Staff",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      accent: "bg-blue-600",
      targetUser: "Field Workers, Mining Operators & Plant Technicians",
    },
    {
      roleNumber: "02",
      title: "Command Dashboard",
      description: null,
      features: [
        "Live Location Monitoring",
        "Map-Based Incident Visualization",
        "Severity Classification",
        "Zone & Geo-Fence Tracking",
        "Analytics & Historical Audits",
        "Role-Based Access Management",
      ],
      href: "/command",
      icon: MapPin,
      badge: activeSOSCount > 0 ? `${activeSOSCount} Active SOS` : "Role 2 • Control Center",
      badgeColor: activeSOSCount > 0 ? "bg-red-600 text-white animate-pulse" : "bg-purple-50 text-purple-700 border-purple-200",
      accent: "bg-purple-600",
      targetUser: "Central Safety Chiefs & Command Operators",
    },
    {
      roleNumber: "03",
      title: "Response Team Portal",
      description: null,
      features: [
        "Incident Assignment & Acknowledge",
        "Response Personnel Dispatch",
        "Two-Way Communication",
        "Incident Escalation & Closure",
        "Equipment Shutdown Actions",
        "Comprehensive Case Logging",
      ],
      href: "/response",
      icon: ShieldAlert,
      badge: "Role 3 • QRF Unit",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      accent: "bg-amber-600",
      targetUser: "Quick Response Units, Medics & Safety Marshals",
    },
  ];

  const supportingModules = [
    {
      title: "Geofencing & Safety Zones",
      description: "Define restricted blast zones, high-heat smelter areas, safe assembly gathering points, and speed limits with ray-casting perimeter detection.",
      href: "/zones",
      icon: Layers,
      badge: `${zones.length} Active Zones`,
    },
    {
      title: "Safety Analytics & Audit Trail",
      description: "Departmental incident frequency heatmaps, emergency turnaround time (TAT) tracking, and immutable CSV statutory audit logs.",
      href: "/analytics",
      icon: BarChart3,
      badge: "EHS Compliance",
    },
  ];

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-8 bg-slate-50">
      
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden bg-white border border-slate-200 p-6 sm:p-10 shadow-lg">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
            <ShieldAlert className="w-4 h-4 text-red-600" />
            <span>Vedanta Limited • Industrial Safety 360 Ecosystem</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Employee Safety Response & <span className="text-red-600">Emergency Management</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Enterprise digital safety ecosystem by <strong>RYM Grenergy Solution Pvt. Ltd.</strong> Real-time GPS telemetry, high-precision geofencing, 1-tap SOS panic mechanisms, and instant QRF ambulance dispatch across 3 core operational roles.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/worker"
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-red-600/20 flex items-center gap-2 transition-all group"
            >
              <Radio className="w-4 h-4" />
              <span>Launch Worker SOS App</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/command"
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs sm:text-sm font-bold rounded-xl border border-slate-200 flex items-center gap-2 transition-all"
            >
              <MapPin className="w-4 h-4 text-red-600" />
              <span>Open Command Center</span>
            </Link>
          </div>
        </div>

        {/* Floating Telemetry Box */}
        <div className="mt-8 sm:mt-0 sm:absolute sm:top-8 sm:right-8 bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2 text-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Live System Telemetry
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-slate-600">Field Personnel:</span>
            <span className="font-mono font-bold text-emerald-600">{workers.length} Online</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-slate-600">Critical SOS:</span>
            <span className={`font-mono font-bold ${activeSOSCount > 0 ? "text-red-600 animate-pulse" : "text-slate-500"}`}>
              {activeSOSCount}
            </span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-slate-600">Active Geofences:</span>
            <span className="font-mono font-bold text-amber-600">{zones.length} Protected</span>
          </div>
        </div>
      </div>

      {/* 3 Core Roles Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900">3 Core Operational Roles</h2>
          <p className="text-xs text-slate-500">Select a workspace below to enter the dedicated role workflow</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {roleModules.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.href}
                href={m.href}
                className="group bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 p-6 rounded-3xl transition-all shadow-sm hover:shadow-md flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-2xl ${m.accent} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform font-black text-sm`}>
                      {m.roleNumber}
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${m.badgeColor}`}>
                      {m.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                    {m.title}
                  </h3>

                  {m.description && (
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {m.description}
                    </p>
                  )}

                  {m.features && (
                    <ul className="mt-2 space-y-1">
                      {m.features.map((f, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500 font-medium">{m.targetUser}</span>
                  <span className="font-bold text-red-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Open →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Supporting Tools Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {supportingModules.map((sm) => {
          const Icon = sm.icon;
          return (
            <Link
              key={sm.href}
              href={sm.href}
              className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 p-5 rounded-2xl transition-all shadow-xs flex items-center justify-between gap-4 group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-red-50 text-slate-700 group-hover:text-red-600 flex items-center justify-center transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                    {sm.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-1">{sm.description}</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-700 shrink-0 bg-slate-100 px-2.5 py-1 rounded-xl">
                {sm.badge}
              </span>
            </Link>
          );
        })}
      </div>

      {/* End-to-End Emergency Response Lifecycle */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          End-to-End Emergency Response Lifecycle
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="font-black text-red-600">01. SOS</div>
            <div className="text-[11px] text-slate-600 mt-1">1-Tap Panic Trigger</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="font-black text-amber-600">02. GPS</div>
            <div className="text-[11px] text-slate-600 mt-1">Live Telemetry Capture</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="font-black text-purple-600">03. Geofence</div>
            <div className="text-[11px] text-slate-600 mt-1">Hazard Breach Check</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="font-black text-blue-600">04. Triage</div>
            <div className="text-[11px] text-slate-600 mt-1">Severity & Siren Alert</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="font-black text-cyan-600">05. Dispatch</div>
            <div className="text-[11px] text-slate-600 mt-1">QRF Ambulance Route</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="font-black text-orange-600">06. Action</div>
            <div className="text-[11px] text-slate-600 mt-1">Plant PLC Shutdown</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="font-black text-emerald-600">07. Audit</div>
            <div className="text-[11px] text-slate-600 mt-1">Immutable Digital Log</div>
          </div>
        </div>
      </div>

    </div>
  );
}
