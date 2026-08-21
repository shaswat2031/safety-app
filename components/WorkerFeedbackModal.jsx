"use client";

import React, { useState } from "react";
import { useSafety } from "@/context/SafetyContext";
import {
  Star,
  MessageSquare,
  CheckCircle2,
  ThumbsUp,
  Award,
  Sparkles,
  X,
  Send,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

const FEEDBACK_TAGS = [
  "⚡ Fast Response",
  "🩺 Medical Care Provided",
  "📢 Clear Instructions",
  "⏳ Arrival Delayed",
  "🦺 PPE/Equipment Clear",
  "🤝 Helpful QRF Team",
];

export default function WorkerFeedbackModal({ itemToFeedback = null, onClose = () => {} }) {
  const { submitResolutionFeedback } = useSafety();

  const [rating, setRating] = useState(5);
  const [satisfaction, setSatisfaction] = useState("Excellent");
  const [comments, setComments] = useState("");
  const [selectedTags, setSelectedTags] = useState(["⚡ Fast Response", "🩺 Medical Care Provided"]);

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitResolutionFeedback({
      sos_id: itemToFeedback?.id || null,
      worker_id: itemToFeedback?.worker_id || "w-101",
      worker_name: itemToFeedback?.worker_name || itemToFeedback?.reporter_name || "Field Worker",
      rating,
      satisfaction,
      comments,
      tags: selectedTags,
    });

    toast.success("Thank you! Your resolution feedback has been submitted to Command Center.");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 to-teal-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0">
              <Award className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white leading-tight">Resolution Feedback</h3>
              <p className="text-[10px] sm:text-xs text-emerald-100 font-medium">Rate QRF emergency response & rescue quality</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 sm:space-y-5">
          {/* Resolved Item Summary */}
          {itemToFeedback && (
            <div className="bg-slate-950 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-800 text-[11px] sm:text-xs space-y-0.5">
              <div className="text-slate-400 font-medium">Resolved Event:</div>
              <div className="font-bold text-slate-200 truncate">{itemToFeedback.title || itemToFeedback.remarks || "SOS Emergency Clear"}</div>
              <div className="text-[10px] text-slate-500 font-mono">ID: {itemToFeedback.id}</div>
            </div>
          )}

          {/* Star Rating */}
          <div className="text-center space-y-1.5 sm:space-y-2">
            <label className="text-[11px] sm:text-xs font-semibold text-slate-300">
              Overall Response Star Rating:
            </label>
            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                >
                  <Star
                    className={`w-7 h-7 sm:w-8 sm:h-8 ${
                      star <= rating
                        ? "text-amber-400 fill-amber-400"
                        : "text-slate-700 fill-slate-800"
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="text-[11px] sm:text-xs font-bold text-amber-400">
              {rating === 5 ? "⭐⭐⭐⭐⭐ Excellent Response" : rating === 4 ? "⭐⭐⭐⭐ Satisfactory" : rating === 3 ? "⭐⭐⭐ Average" : "⭐⭐ Poor Response"}
            </div>
          </div>

          {/* Quick Tags */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[11px] sm:text-xs font-semibold text-slate-300">
              Quick Service Feedback Tags:
            </label>
            <div className="flex flex-wrap gap-1 sm:gap-1.5">
              {FEEDBACK_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-emerald-600/30 border-emerald-500 text-emerald-300 font-bold"
                        : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment Box */}
          <div className="space-y-1 sm:space-y-1.5">
            <label className="text-[11px] sm:text-xs font-semibold text-slate-300">
              Additional Feedback / Field Notes:
            </label>
            <textarea
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Provide comments for EHS & Command Center..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 text-[11px] sm:text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center gap-2.5 sm:gap-3 pt-1 sm:pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 sm:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] sm:text-xs transition-colors cursor-pointer"
            >
              Skip / Close
            </button>
            <button
              type="submit"
              className="flex-1 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] sm:text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-transform hover:scale-105 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Submit Feedback</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
