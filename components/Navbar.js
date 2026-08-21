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

  const { switchActiveRole } = useAuth();

  // Navigation Links across all 3 portals
  const getNavLinks = () => {
    if (!isAuthenticated) return [];

    return [
      {
        name: "Worker App",
        href: "/worker",
        icon: Radio,
        targetRole: "worker",
        badge: null,
      },
      {
        name: "Command Center",
        href: "/command",
        icon: MapPin,
        targetRole: "command_operator",
        badge: activeSOS.length > 0 ? `${activeSOS.length} SOS` : null,
      },
      {
        name: "Response Team",
        href: "/response",
        icon: ShieldAlert,
        targetRole: "response_team",
        badge: sosAlerts.filter((a) => a.status === "dispatched").length || null,
      },
      {
        name: "Safety Zones",
        href: "/zones",
        icon: Layers,
        targetRole: "command_operator",
        badge: null,
      },
      {
        name: "EHS Analytics",
        href: "/analytics",
        icon: BarChart3,
        targetRole: "command_operator",
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

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          <Link href={!isAuthenticated ? "/login" : role === "worker" ? "/worker" : "/"} className="flex items-center gap-2 sm:gap-2.5 group min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform text-white shrink-0">
              <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-black text-xs sm:text-base tracking-tight sm:tracking-wide text-slate-900 truncate">
                  EMPLOYEE SAFETY APP
                </span>
              </div>
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium block truncate">
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
                  onClick={() => link.targetRole && switchActiveRole(link.targetRole)}
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
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {isAuthenticated && profile && role ? (
            <>
              {/* Direct 2-Way Voice Call Link (No Popup, Direct 9265318481) */}
              {role !== "command_operator" && pathname !== "/command" && (
                <a
                  href="tel:9265318481"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold transition-colors shadow-xs shrink-0"
                  title="Direct Call Emergency Hotline: 9265318481"
                >
                  <PhoneCall className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white animate-pulse" />
                  <span className="hidden xs:inline sm:inline font-mono">9265318481</span>
                  <span className="xs:hidden sm:hidden">Call</span>
                </a>
              )}

              {/* User Profile & Logout */}
              <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-slate-200">
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
                  className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors"
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
    </header>
  );
}
