"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSafety } from "@/context/SafetyContext";
import {
  Send,
  Radio,
  ShieldAlert,
  Zap,
  CheckCircle2,
  Clock,
  MessageSquare,
  Ambulance,
  Building,
  UserCheck,
  Volume2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

const COMMAND_PRESETS = [
  "🚨 QRF: Confirm ETA to SOS location",
  "⚠️ Standby: Additional hazard reported near site",
  "📢 Evacuation clearance granted for Sector 69",
  "🚒 Backup Rescue Unit Bravo dispatched to assist",
  "🩺 Medical Bay prepared for patient reception",
];

const QRF_PRESETS = [
  "🚗 En Route to SOS Location (ETA 2 mins)",
  "📍 Arrived on Scene - Assessing Situation",
  "🩺 Worker Stabilized - First Aid Rendered",
  "🚨 Requesting Backup: Heavy Obstruction",
  "✅ Sector Clear - Mission Accomplished",
  "🚑 Transporting Worker to Medical Base",
];

export default function TwoWayChat({ currentRole = "command", currentUserName = "Command Chief" }) {
  const { chatMessages, sendChatMessage } = useSafety();
  const [inputText, setInputText] = useState("");
  const [activeChannel, setActiveChannel] = useState("all"); // 'all' | 'tactical' | 'sos'
  const chatEndRef = useRef(null);

  const isCommand = currentRole === "command" || currentRole === "admin";
  const presets = isCommand ? COMMAND_PRESETS : QRF_PRESETS;

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSend = (textToSend = inputText, presetType = "normal") => {
    const finalMsg = textToSend.trim();
    if (!finalMsg) return;

    sendChatMessage({
      sender_role: isCommand ? "command" : "qrf",
      sender_name: currentUserName || (isCommand ? "Command Controller" : "QRF Squad Leader"),
      message: finalMsg,
      preset_type: presetType,
    });

    setInputText("");
    toast.success("Radio transmission sent!");
  };

  const filteredMessages = chatMessages.filter((msg) => {
    if (activeChannel === "tactical") return msg.preset_type === "tactical" || msg.preset_type === "status_update";
    if (activeChannel === "sos") return msg.preset_type === "alert" || msg.emergency_id;
    return true;
  });

  return (
    <div className="flex flex-col h-[480px] sm:h-[600px] w-full bg-white text-slate-900 rounded-2xl sm:rounded-3xl border-2 border-slate-200 shadow-xl overflow-hidden mb-6">
      {/* Unified Light Header Bar */}
      <div className="px-3.5 py-3 sm:px-5 sm:py-3.5 bg-slate-100/90 border-b border-slate-200 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="relative shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-xs">
              <Radio className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse text-indigo-600" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 rounded-full border-2 border-white animate-ping"></span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h3 className="font-extrabold text-xs sm:text-base text-slate-900 tracking-tight whitespace-nowrap">
                Command ↔ QRF 2-Way Chat
              </h3>
              <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                LIVE SECURE
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 truncate mt-0.5 font-medium">
              Role: <strong className={isCommand ? "text-indigo-700 font-bold" : "text-emerald-700 font-bold"}>{currentUserName}</strong> ({isCommand ? "Command Control" : "QRF Unit"})
            </p>
          </div>
        </div>

        {/* Filter Channels */}
        <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl border border-slate-300 shrink-0">
          <button
            onClick={() => setActiveChannel("all")}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-[11px] font-bold rounded-lg sm:rounded-xl transition-all cursor-pointer ${
              activeChannel === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Stream
          </button>
          <button
            onClick={() => setActiveChannel("tactical")}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-[11px] font-bold rounded-lg sm:rounded-xl transition-all cursor-pointer ${
              activeChannel === "tactical"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Tactical
          </button>
          <button
            onClick={() => setActiveChannel("sos")}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-[11px] font-bold rounded-lg sm:rounded-xl transition-all cursor-pointer ${
              activeChannel === "sos"
                ? "bg-red-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            SOS Alerts
          </button>
        </div>
      </div>

      {/* Message Stream Container */}
      <div className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-3.5 sm:space-y-4 bg-slate-50/80 border-b border-slate-200 custom-scrollbar">
        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-4 sm:p-6 space-y-2">
            <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300 stroke-[1.5]" />
            <p className="text-[11px] sm:text-xs font-bold text-slate-600">No channel transmissions recorded yet.</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 max-w-sm">
              Use the tactical presets below or type a message to broadcast live.
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isCommandSender = msg.sender_role === "command";

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isCommandSender ? "items-start" : "items-end"} space-y-1`}
              >
                {/* Sender Title Header */}
                <div className="flex items-center gap-1 sm:gap-1.5 px-1 text-[9px] sm:text-[11px]">
                  {isCommandSender ? (
                    <span className="flex items-center gap-1 text-indigo-700 font-extrabold bg-indigo-100/80 px-2 py-0.5 rounded-full border border-indigo-200">
                      <Building className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-600" /> Command Center
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-800 font-extrabold bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                      <Ambulance className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" /> QRF Rescue Team
                    </span>
                  )}
                  <span className="text-slate-600 font-semibold">• {msg.sender_name}</span>
                  <span className="font-mono text-slate-400 text-[9px] sm:text-[10px]">{msg.timestamp}</span>
                </div>

                {/* Distinct Message Bubble Colors */}
                <div
                  className={`max-w-[88%] sm:max-w-[76%] rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 text-[11px] sm:text-xs leading-snug sm:leading-relaxed shadow-xs sm:shadow-md border ${
                    msg.preset_type === "alert"
                      ? "bg-amber-50 border-2 border-amber-300 text-amber-950 font-semibold shadow-amber-500/10"
                      : isCommandSender
                      ? "bg-indigo-600 text-white border-indigo-700 font-medium rounded-tl-none shadow-indigo-600/20"
                      : "bg-slate-900 text-white border-slate-800 font-medium rounded-tr-none shadow-slate-900/20"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Tactical Presets Bar */}
      <div className="px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-100 border-t border-slate-200 shrink-0">
        <div className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
          <span>Quick Tactical Transmissions:</span>
        </div>
        <div
          className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 text-[10px] sm:text-[11px]"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {presets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(preset, isCommand ? "alert" : "status_update")}
              className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl bg-white hover:bg-slate-200 active:bg-slate-300 border border-slate-200 text-slate-800 font-bold whitespace-nowrap transition-all transform hover:scale-105 active:scale-95 cursor-pointer shadow-2xs flex items-center gap-1 text-[10px] sm:text-[11px]"
            >
              <span>{preset}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Controls */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-2.5 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2 sm:gap-3 shrink-0"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isCommand
              ? "Type command broadcast..."
              : "Type field tactical update..."
          }
          className="flex-1 bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 focus:border-indigo-600 rounded-xl sm:rounded-2xl h-10 sm:h-12 px-3 sm:px-4 text-[11px] sm:text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none transition-all shadow-inner"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className={`h-10 sm:h-12 px-3.5 sm:px-6 rounded-xl sm:rounded-2xl font-black text-[11px] sm:text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer shrink-0 ${
            inputText.trim()
              ? isCommand
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30 transform hover:scale-105"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 transform hover:scale-105"
              : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
          }`}
        >
          <span>Transmit</span>
          <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </form>
    </div>
  );
}
