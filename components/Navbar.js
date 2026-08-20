"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSafety } from "@/context/SafetyContext";
import {
  ShieldAlert,
  Radio,
  MapPin,
  Flame,
  BarChart3,
  Volume2,
  VolumeX,
  LogOut,
  ChevronDown,
  Layers,
  CheckCircle2,
  User,
  PhoneCall,
  Wifi,
  WifiOff,
  LogIn,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, role, isAuthenticated, signOut } = useAuth();
  const { sosAlerts, isSirenMuted, toggleSirenMute, isOnline, offlineQueue } = useSafety();
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);

  const activeSOS = sosAlerts.filter((a) => a.status === "active");

  // STRICT Role-Based Navigation Links (Only shown when authenticated)
  const getNavLinks = () => {
    if (!isAuthenticated || !role) return [];

    if (role === "worker") {
      return [
        {
          name: "Worker App",
          href: "/worker",
          icon: Radio,
          badge: null,
        },
      ];
    }

    if (role === "response_team") {
      return [
        {
          name: "Response Team Portal",
          href: "/response",
          icon: ShieldAlert,
          badge: sosAlerts.filter((a) => a.status === "dispatched").length || null,
        },
        {
          name: "Worker App",
          href: "/worker",
          icon: Radio,
          badge: null,
        },
      ];
    }

    // Default: command_operator
    return [
      {
        name: "Command Center",
        href: "/command",
        icon: MapPin,
        badge: activeSOS.length > 0 ? `${activeSOS.length} SOS` : null,
      },
      {
        name: "Safety Zones",
        href: "/zones",
        icon: Layers,
        badge: null,
      },
      {
        name: "EHS Analytics",
        href: "/analytics",
        icon: BarChart3,
        badge: null,
      },
    ];
  };

  const navLinks = getNavLinks();

  const handleRoleChange = (newRole) => {
    switchActiveRole(newRole);
    setIsRoleDropdownOpen(false);
    if (newRole === "worker") router.push("/worker");
    else if (newRole === "response_team") router.push("/response");
    else router.push("/command");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      {/* Emergency Siren Banner if active unacknowledged SOS exists */}
      {activeSOS.length > 0 && isAuthenticated && (
        <div className="w-full bg-red-600 text-white px-4 py-2 flex items-center justify-between text-xs sm:text-sm font-bold animate-siren-flash shadow-md">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <span>
              🚨 CRITICAL EMERGENCY: {activeSOS.length} Worker SOS Panic Broadcast!
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSirenMute}
              className="flex items-center gap-1.5 bg-black/30 hover:bg-black/40 px-3 py-1 rounded-lg text-xs border border-white/40 transition-colors"
            >
              {isSirenMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-yellow-300" /> Unmute
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-green-300" /> Mute
                </>
              )}
            </button>
            {role !== "worker" && (
              <Link
                href="/command"
                className="bg-white text-red-700 px-3 py-1 rounded-lg font-black hover:bg-slate-100 transition-colors text-xs shadow"
              >
                Triage Console →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Offline Status Warning Bar */}
      {!isOnline && (
        <div className="w-full bg-amber-500 text-slate-950 px-4 py-1 flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span>OFFLINE MODE ACTIVE: Telemetry & SOS events are queued locally and will auto-sync on reconnect.</span>
          </div>
          {offlineQueue.length > 0 && (
            <span className="bg-black/20 px-2 py-0.5 rounded text-[11px]">
              {offlineQueue.length} Queued
            </span>
          )}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <Link href={!isAuthenticated ? "/login" : role === "worker" ? "/worker" : "/"} className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform text-white">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base tracking-wide text-slate-900">
                  EMPLOYEE SAFETY APP
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium block">
                RYM Grenergy Solution
              </span>
            </div>
          </Link>
        </div>

        {/* Role-Protected Navigation Tabs (Hidden if not logged in) */}
        {isAuthenticated && navLinks.length > 0 && (
          <nav className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    isActive
                      ? "bg-slate-100 text-slate-900 border border-slate-200 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-red-600" : "text-slate-400"}`} />
                  <span>{link.name}</span>
                  {link.badge && (
                    <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right side: Authenticated User Controls vs Login Button */}
        <div className="flex items-center gap-3">
          {isAuthenticated && profile && role ? (
            <>
              {/* Two-Way Voice Call Speed Button (Hidden in Command Center) */}
              {role !== "command_operator" && pathname !== "/command" && (
                <button
                  onClick={() => setIsCallModalOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs sm:text-sm font-bold transition-colors shadow-xs"
                  title="Two-Way Emergency Comms"
                >
                  <PhoneCall className="w-4 h-4 text-red-600" />
                  <span className="hidden sm:inline">2-Way Comms (SIM)</span>
                </button>
              )}

              {/* User Profile & Logout */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="hidden lg:block text-right">
                  <div className="text-xs font-bold text-slate-900">
                    {profile?.full_name?.split(" ")[0]}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {profile?.employee_code}
                  </div>
                </div>
                <button
                  onClick={() => {
                    signOut();
                    router.push("/login");
                  }}
                  title="Sign Out"
                  className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In / Register</span>
            </Link>
          )}
        </div>
      </div>

      {/* Two-Way Voice Call Speed Dial Modal */}
      {isCallModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-red-600" />
                Two-Way Voice Calling (SIM)
              </h3>
              <button
                onClick={() => setIsCallModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              <a
                href="tel:108"
                className="p-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-2xl flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-red-900">Vedanta Emergency 108 Hotline</div>
                  <div className="text-[10px] text-red-700">Immediate Medical & Fire Dispatch</div>
                </div>
                <span className="text-xs font-black text-red-600 bg-white px-2 py-1 rounded-lg">
                  Dial 108
                </span>
              </a>

              <a
                href="tel:+919876511223"
                className="p-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-2xl flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-purple-900">Control Room (Priya Sharma)</div>
                  <div className="text-[10px] text-purple-700">Direct Command Dispatch Desk</div>
                </div>
                <span className="text-xs font-bold text-purple-600 bg-white px-2 py-1 rounded-lg">
                  Dial SIM
                </span>
              </a>

              <a
                href="tel:+919876599887"
                className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-amber-900">QRF Ambulance (Capt. Vikram)</div>
                  <div className="text-[10px] text-amber-700">Quick Response Vehicle Radio / SIM</div>
                </div>
                <span className="text-xs font-bold text-amber-600 bg-white px-2 py-1 rounded-lg">
                  Dial SIM
                </span>
              </a>
            </div>

            <button
              onClick={() => setIsCallModalOpen(false)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl"
            >
              Close Dialer
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
