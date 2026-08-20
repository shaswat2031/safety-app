"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const ROLES = {
  WORKER: "worker",
  COMMAND_OPERATOR: "command_operator",
  RESPONSE_TEAM: "response_team",
};

export const ROLE_LABELS = {
  worker: "Worker (Field Operations)",
  command_operator: "Command Operator (Central GIS Control)",
  response_team: "Response Team (QRF Ambulance)",
};

const STORAGE_KEY = "vedanta_safety_user_profile";
const AUTH_SESSION_KEY = "vedanta_safety_is_authenticated";

const AuthContext = createContext({
  user: null,
  profile: null,
  role: null,
  isAuthenticated: false,
  loading: true,
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  loginAsRole: () => {},
  switchActiveRole: () => {},
  updateProfile: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Restore saved session if authenticated
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof window !== "undefined") {
          const authFlag = localStorage.getItem(AUTH_SESSION_KEY);
          const savedProfile = localStorage.getItem(STORAGE_KEY);

          if (authFlag === "true" && savedProfile) {
            try {
              const parsed = JSON.parse(savedProfile);
              if (parsed && parsed.role) {
                if (!["worker", "command_operator", "response_team"].includes(parsed.role)) {
                  parsed.role = "worker";
                }
                setProfile(parsed);
                setUser({ id: parsed.id, email: parsed.email });
                setIsAuthenticated(true);
              }
            } catch (e) {
              console.warn("Could not parse saved session:", e);
            }
          }
        }

        // Check Supabase session
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            const { data: profileData } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .maybeSingle();

            const validRole = ["worker", "command_operator", "response_team"].includes(profileData?.role)
              ? profileData.role
              : "worker";

            const merged = {
              id: session.user.id,
              email: session.user.email,
              full_name: profileData?.full_name || session.user.user_metadata?.full_name || session.user.email.split("@")[0],
              employee_code: profileData?.employee_code || `VED-${Math.floor(1000 + Math.random() * 9000)}`,
              role: validRole,
              department: profileData?.department || "Operations",
              phone: profileData?.phone || "",
              blood_group: profileData?.blood_group || "O+",
              emergency_contact: profileData?.emergency_contact || null,
            };

            setProfile(merged);
            setIsAuthenticated(true);
            if (typeof window !== "undefined") {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
              localStorage.setItem(AUTH_SESSION_KEY, "true");
            }
          }
        }
      } catch (err) {
        console.warn("Auth initialization notice:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const saveProfileState = (newProf) => {
    setProfile(newProf);
    setIsAuthenticated(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProf));
      localStorage.setItem(AUTH_SESSION_KEY, "true");
    }
  };

  const loginAsRole = async (targetRole) => {
    const validRole = ["worker", "command_operator", "response_team"].includes(targetRole)
      ? targetRole
      : "worker";

    // 1. Try to fetch existing profile of this role from Supabase
    if (supabase) {
      try {
        const { data: dbProf } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", validRole)
          .limit(1)
          .maybeSingle();

        if (dbProf) {
          saveProfileState(dbProf);
          setUser({ id: dbProf.id, email: dbProf.email });
          return dbProf;
        }
      } catch (e) {
        console.warn("Supabase role profile fetch:", e);
      }
    }

    const roleNameMap = {
      worker: "Field Operations Worker",
      command_operator: "Command Operations Controller",
      response_team: "Emergency Response Officer",
    };

    const roleEmailMap = {
      worker: "operator@vedanta.com",
      command_operator: "command.chief@vedanta.com",
      response_team: "response.unit@vedanta.com",
    };

    const roleDeptMap = {
      worker: "Field Operations",
      command_operator: "Central Command Center",
      response_team: "Quick Response Unit",
    };

    const roleIdMap = {
      worker: "11111111-1111-4111-a111-111111111111",
      command_operator: "22222222-2222-4222-a222-222222222222",
      response_team: "33333333-3333-4333-a333-333333333333",
    };

    const realProf = {
      id: roleIdMap[validRole] || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "11111111-1111-4111-a111-111111111111"),
      email: roleEmailMap[validRole],
      full_name: roleNameMap[validRole],
      role: validRole,
      employee_code: `VED-${validRole.toUpperCase().slice(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`,
      department: roleDeptMap[validRole],
      phone: "+91 98765 43210",
      blood_group: "O+",
    };

    if (supabase) {
      await supabase.from("profiles").upsert([realProf], { onConflict: "id" });
    }

    saveProfileState(realProf);
    setUser({ id: realProf.id, email: realProf.email });
    return realProf;
  };

  const signInWithEmail = async (email, password, preferredRole = "worker") => {
    setLoading(true);
    try {
      // ── Supabase is available: require real authentication ──
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        // Auth failed → return the real error (wrong password, user not found, etc.)
        if (error) {
          const msg = error.message?.toLowerCase();
          const friendlyMsg =
            msg?.includes("invalid login") || msg?.includes("invalid credentials")
              ? "Invalid email or password. Please check your credentials."
              : msg?.includes("email not confirmed") || msg?.includes("not confirmed")
              ? "Your email is not confirmed yet. Check your inbox or ask admin to confirm your account in Supabase Dashboard."
              : msg?.includes("too many")
              ? "Too many login attempts. Please wait a few minutes and try again."
              : error.message || "Sign-in failed. Please try again.";
          return { success: false, error: friendlyMsg };
        }

        if (!data?.user) {
          return { success: false, error: "No account found. Please register first." };
        }

        // Auth succeeded → fetch profile from DB
        setUser(data.user);
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();

        const roleVal =
          profileData?.role ||
          data.user.user_metadata?.role ||
          preferredRole ||
          "worker";

        const fullProf = {
          id: data.user.id,
          email: data.user.email,
          full_name:
            profileData?.full_name ||
            data.user.user_metadata?.full_name ||
            email.split("@")[0],
          employee_code:
            profileData?.employee_code ||
            `VED-${Math.floor(1000 + Math.random() * 9000)}`,
          role: ["worker", "command_operator", "response_team"].includes(roleVal)
            ? roleVal
            : "worker",
          department: profileData?.department || "Operations",
          phone: profileData?.phone || "",
          blood_group: profileData?.blood_group || "O+",
          emergency_contact: profileData?.emergency_contact || null,
        };

        // Backfill email into profiles row if it's missing
        if (!profileData?.email && data.user.email) {
          await supabase
            .from("profiles")
            .update({ email: data.user.email })
            .eq("id", data.user.id);
        }

        saveProfileState(fullProf);
        return { success: true, user: fullProf };
      }

      // ── Supabase not configured: offline/demo mode only ──
      return {
        success: false,
        error: "Authentication service unavailable. Please contact your administrator.",
      };
    } catch (err) {
      console.error("signInWithEmail exception:", err);
      return { success: false, error: err.message || "Failed to sign in" };
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (
    email,
    password,
    fullName,
    selectedRole,
    employeeCode,
    department,
    phone = "",
    bloodGroup = "O+",
    emergencyContact = ""
  ) => {
    setLoading(true);
    try {
      const validRole = ["worker", "command_operator", "response_team"].includes(selectedRole)
        ? selectedRole
        : "worker";

      let userId = null;

      if (supabase) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: validRole,
              employee_code: employeeCode,
              department: department,
              phone,
              blood_group: bloodGroup,
              emergency_contact: emergencyContact,
            },
          },
        });

        if (authError) {
          // Surface real errors (duplicate email, weak password, etc.)
          const msg =
            authError.message?.toLowerCase().includes("already registered") ||
            authError.message?.toLowerCase().includes("already been registered") ||
            authError.message?.toLowerCase().includes("user already")
              ? "This email is already registered. Please sign in instead."
              : authError.message || "Registration failed. Please try again.";
          return { success: false, error: msg };
        }

        if (authData?.user) {
          userId = authData.user.id;
        }
      }

      // Only proceed if we got a real UUID from auth.users
      if (!userId) {
        return { success: false, error: "Could not create account. Please try again." };
      }

      const validProfileId = userId;

      const newProf = {
        id: validProfileId,
        email,
        full_name: fullName || "Employee",
        role: validRole,
        employee_code: employeeCode || `VED-${Math.floor(1000 + Math.random() * 9000)}`,
        department: department || "Operations",
        phone: phone || "",
        blood_group: bloodGroup,
        emergency_contact: emergencyContact || null,
      };

      if (supabase) {
        const { data: insertedData, error: insertError } = await supabase
          .from("profiles")
          .upsert([newProf], { onConflict: "id" })
          .select();

        if (insertError) {
          console.error("❌ Supabase profile register error:", insertError.message, insertError.details);
        } else {
          console.log("✅ Supabase profile registered in table 'profiles':", insertedData);
        }
      }

      saveProfileState(newProf);
      setUser({ id: newProf.id, email });
      return { success: true, user: newProf };
    } catch (err) {
      console.error("signUpWithEmail exception:", err);
      return { success: false, error: err.message || "Registration error" };
    } finally {
      setLoading(false);
    }
  };

  const switchActiveRole = (targetRole) => {
    if (!profile) return;
    if (!["worker", "command_operator", "response_team"].includes(targetRole)) return;

    const deptMap = {
      worker: "Field Operations",
      command_operator: "Central Emergency Control Room",
      response_team: "Quick Response Unit",
    };

    const updated = {
      ...profile,
      role: targetRole,
      department: deptMap[targetRole] || profile.department,
    };
    saveProfileState(updated);
  };

  const updateProfile = (fields) => {
    if (!profile) return;
    const updated = { ...profile, ...fields };
    saveProfileState(updated);
  };

  const signOut = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn("Sign out notice:", e);
    }
    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(AUTH_SESSION_KEY);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role || null,
        isAuthenticated,
        loading,
        signInWithEmail,
        signUpWithEmail,
        loginAsRole,
        switchActiveRole,
        updateProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
