"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldAlert,
  Lock,
  Mail,
  User,
  ArrowRight,
  Phone,
  Building2,
  Droplet,
  UserCheck,
  IdCard,
  PhoneCall,
  Eye,
  EyeOff,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const ROLES = [
  {
    value: "worker",
    label: "Worker",
    sub: "Field Operator — SOS & GPS",
    color: "blue",
    num: "01",
  },
  {
    value: "command_operator",
    label: "Command Operator",
    sub: "Central GIS Dashboard",
    color: "purple",
    num: "02",
  },
  {
    value: "response_team",
    label: "Response Team (QRF)",
    sub: "Emergency Dispatch",
    color: "amber",
    num: "03",
  },
];

const colorMap = {
  blue: {
    border: "border-blue-500",
    bg: "bg-blue-50",
    text: "text-blue-700",
    ring: "ring-blue-400",
    dot: "bg-blue-600",
    numBg: "bg-blue-600",
  },
  purple: {
    border: "border-purple-500",
    bg: "bg-purple-50",
    text: "text-purple-700",
    ring: "ring-purple-400",
    dot: "bg-purple-600",
    numBg: "bg-purple-600",
  },
  amber: {
    border: "border-amber-500",
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-400",
    dot: "bg-amber-500",
    numBg: "bg-amber-500",
  },
};

function InputField({ icon: Icon, label, required, ...props }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-bold text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}
        <input
          {...props}
          className={`w-full bg-white border border-slate-200 rounded-xl ${Icon ? "pl-9" : "pl-3"} pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition`}
        />
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { signInWithEmail, signUpWithEmail } = auth || {};

  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState("worker");

  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    employeeCode: "",
    department: "",
    phone: "",
    emergencyContact: "",
    bloodGroup: "O+",
  });

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const redirectByRole = (role) => {
    if (role === "worker") router.push("/worker");
    else if (role === "response_team") router.push("/response");
    else router.push("/command");
  };

  const validateSignUp = () => {
    const required = [
      { key: "fullName", label: "Full Name" },
      { key: "employeeCode", label: "Employee ID" },
      { key: "department", label: "Department" },
      { key: "phone", label: "Phone Number" },
      { key: "emergencyContact", label: "Emergency Contact" },
      { key: "email", label: "Email" },
      { key: "password", label: "Password" },
    ];
    for (const f of required) {
      if (!form[f.key]?.trim()) {
        toast.error(`${f.label} is required.`);
        return false;
      }
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSignUp) {
      if (!validateSignUp()) return;
    } else {
      if (!form.email || !form.password) {
        toast.error("Email and password are required.");
        return;
      }
    }

    setLoading(true);

    if (isSignUp) {
      const res = await signUpWithEmail(
        form.email,
        form.password,
        form.fullName,
        selectedRole,
        form.employeeCode,
        form.department,
        form.phone,
        form.bloodGroup,
        form.emergencyContact
      );
      setLoading(false);
      if (res?.success) {
        toast.success(`Welcome, ${form.fullName}! Account created.`);
        redirectByRole(selectedRole);
      } else {
        toast.error(res?.error || "Registration failed. Try again.");
      }
    } else {
      const res = await signInWithEmail(form.email, form.password, selectedRole);
      setLoading(false);
      if (res?.success) {
        const role = res.user?.role || selectedRole;
        toast.success(`Welcome back, ${res.user?.full_name || "User"}!`);
        redirectByRole(role);
      } else {
        toast.error(res?.error || "Invalid email or password.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }}
      />

      <div className="relative w-full max-w-md">
        {/* Header Badge */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-red-600 to-amber-500 shadow-2xl shadow-red-900/40 mb-4">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Employee Safety App
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">
            RYM Grenergy Solution Pvt. Ltd.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Tab Switch */}
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-3.5 text-sm font-bold transition-colors ${
                !isSignUp
                  ? "bg-white text-slate-900 border-b-2 border-red-600"
                  : "bg-slate-50 text-slate-500 hover:text-slate-700"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-3.5 text-sm font-bold transition-colors ${
                isSignUp
                  ? "bg-white text-slate-900 border-b-2 border-red-600"
                  : "bg-slate-50 text-slate-500 hover:text-slate-700"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* ── REGISTER FIELDS ── */}
            {isSignUp && (
              <>
                {/* Role selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Select Role<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {ROLES.map((r) => {
                      const c = colorMap[r.color];
                      const active = selectedRole === r.value;
                      return (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setSelectedRole(r.value)}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                            active
                              ? `${c.border} ${c.bg}`
                              : "border-slate-200 bg-slate-50 hover:border-slate-300"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg ${active ? c.numBg : "bg-slate-300"} flex items-center justify-center text-white text-xs font-black shrink-0`}
                          >
                            {r.num}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-bold ${active ? c.text : "text-slate-700"}`}>
                              {r.label}
                            </div>
                            <div className="text-[11px] text-slate-500">{r.sub}</div>
                          </div>
                          {active && (
                            <div className={`w-4 h-4 rounded-full ${c.dot} shrink-0`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <InputField
                  icon={User}
                  label="Full Name"
                  required
                  type="text"
                  placeholder="e.g. Rajesh Kumar"
                  value={form.fullName}
                  onChange={set("fullName")}
                  autoComplete="name"
                />

                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    icon={IdCard}
                    label="Employee ID"
                    required
                    type="text"
                    placeholder="e.g. VED-1001"
                    value={form.employeeCode}
                    onChange={set("employeeCode")}
                  />
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Blood Group<span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <select
                      value={form.bloodGroup}
                      onChange={set("bloodGroup")}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
                    >
                      {BLOOD_GROUPS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <InputField
                  icon={Building2}
                  label="Department"
                  required
                  type="text"
                  placeholder="e.g. Smelter Operations"
                  value={form.department}
                  onChange={set("department")}
                />

                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    icon={Phone}
                    label="Phone Number"
                    required
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={set("phone")}
                    autoComplete="tel"
                  />
                  <InputField
                    icon={PhoneCall}
                    label="Emergency Contact"
                    required
                    type="tel"
                    placeholder="+91 98111 00000"
                    value={form.emergencyContact}
                    onChange={set("emergencyContact")}
                  />
                </div>
              </>
            )}

            {/* ── LOGIN ROLE SELECT ── */}
            {!isSignUp && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Login As<span className="text-red-500 ml-0.5">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map((r) => {
                    const c = colorMap[r.color];
                    const active = selectedRole === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setSelectedRole(r.value)}
                        className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all text-center ${
                          active
                            ? `${c.border} ${c.bg}`
                            : "border-slate-200 bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg ${active ? c.numBg : "bg-slate-300"} flex items-center justify-center text-white text-[10px] font-black`}
                        >
                          {r.num}
                        </div>
                        <div className={`text-[11px] font-bold leading-tight ${active ? c.text : "text-slate-600"}`}>
                          {r.label.split(" ")[0]}
                          <br />
                          {r.label.split(" ").slice(1).join(" ")}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Email */}
            <InputField
              icon={Mail}
              label="Email Address"
              required
              type="email"
              placeholder="name@company.com"
              value={form.email}
              onChange={set("email")}
              autoComplete="email"
            />

            {/* Password */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Password<span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={set("password")}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-black py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {isSignUp ? "Create Account & Enter" : "Sign In"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Footer note */}
            <p className="text-center text-[11px] text-slate-500">
              {isSignUp
                ? "All fields marked * are mandatory for safety compliance."
                : "You will be redirected to your role's dashboard."}
            </p>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          Vedanta Safety 360 v2.0 • Industrial Emergency Management
        </p>
      </div>
    </div>
  );
}
