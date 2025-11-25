// src/pages/RegisterPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    motion,
    useMotionValue,
    useSpring,
    useTransform,
    useReducedMotion,
    AnimatePresence,
} from "framer-motion";
import { Mail, Lock, Eye, EyeOff, User, GraduationCap, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@contexts/AuthContext";
import toast from "react-hot-toast";

/* ---------- Small helper for rgba from hex ---------- */
const hexToRgb = (hex = "#000000") => {
    let h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const bigint = parseInt(h, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
};
const hexToRgba = (hex, alpha = 1) => {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * FloatingSubjects (inlined)
 * - Monochrome: black / white / silver
 * - Hidden on small screens (keeps the form focused)
 */
const FloatingSubjects = ({ size = 520, intensity = 1.0, particleCount = 14 }) => {
    const reduceMotion = useReducedMotion();
    const pointerX = useMotionValue(0);
    const pointerY = useMotionValue(0);
    const smoothX = useSpring(pointerX, { stiffness: 150, damping: 30 });
    const smoothY = useSpring(pointerY, { stiffness: 150, damping: 30 });

    useEffect(() => {
        if (reduceMotion) return;
        const handler = (e) => {
            const nx = (e.clientX / window.innerWidth - 0.5) * 2;
            const ny = (e.clientY / window.innerHeight - 0.5) * 2;
            pointerX.set(nx);
            pointerY.set(ny);
        };
        window.addEventListener("mousemove", handler, { passive: true });
        return () => window.removeEventListener("mousemove", handler);
    }, [pointerX, pointerY, reduceMotion]);

    const palette = useMemo(() => ["#FFFFFF", "#E6E6E6", "#BFBFBF", "#9A9A9A"], []);
    const subjects = useMemo(
        () => [
            { id: "subject-math", title: "Math", x: -180, y: -120, w: 110, h: 140, color: palette[2], delay: 0 },
            { id: "subject-science", title: "Science", x: 160, y: -80, w: 98, h: 128, color: palette[1], delay: 0.25 },
            { id: "subject-history", title: "History", x: 140, y: 100, w: 96, h: 120, color: palette[3], delay: 0.5 },
            { id: "subject-english", title: "English", x: -160, y: 80, w: 92, h: 122, color: palette[1], delay: 0.8 },
            { id: "subject-physics", title: "Physics", x: -40, y: -160, w: 112, h: 142, color: palette[2], delay: 1.1 },
            { id: "subject-chemistry", title: "Chemistry", x: 60, y: 140, w: 88, h: 118, color: palette[0], delay: 1.4 },
        ],
        [palette]
    );

    const particles = useMemo(() => Array.from({ length: particleCount }), [particleCount]);

    return (
        <div aria-hidden className="hidden lg:block relative" style={{ width: size, height: size, transform: `translateZ(0)` }}>
            {/* soft silver blurred orb */}
            <div
                className="absolute -inset-8 rounded-full pointer-events-none"
                style={{
                    filter: "blur(64px)",
                    background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.04), rgba(255,255,255,0.01) 40%, transparent 60%)",
                }}
            />

            {/* ambient particles */}
            {particles.map((_, i) => (
                <motion.span
                    key={i}
                    className="absolute rounded-full"
                    style={{
                        width: 1 + (i % 3),
                        height: 1 + (i % 3),
                        backgroundColor: "rgba(255,255,255,0.06)",
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                    }}
                    animate={reduceMotion ? {} : { opacity: [0, 1, 0], y: [0, -18 - (i % 6), 0] }}
                    transition={{ duration: 3 + Math.random() * 3.5, repeat: Infinity, delay: Math.random() * 4 }}
                />
            ))}

            {/* subjects cluster */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                {subjects.map((s, idx) => {
                    const x = useTransform(smoothX, (v) => s.x + v * 60 * intensity);
                    const y = useTransform(smoothY, (v) => s.y + v * 36 * intensity);
                    const rotateZ = useTransform(smoothX, (v) => Math.sin(idx + v * 1.2) * 5);
                    const z = useTransform([smoothX, smoothY], ([sx, sy]) => 18 + (Math.abs(sx) + Math.abs(sy)) * 12);

                    return (
                        <motion.div
                            key={s.id}
                            className="absolute cursor-default"
                            style={{ x, y, rotateZ, z, width: s.w, height: s.h, transformStyle: "preserve-3d" }}
                            animate={reduceMotion ? {} : { y: [s.y, s.y - 16 * intensity, s.y] }}
                            transition={{ y: { duration: 5 + idx * 0.28, repeat: Infinity, ease: "easeInOut", delay: s.delay } }}
                        >
                            <div
                                className="relative rounded-lg overflow-hidden"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    background: `linear-gradient(135deg, ${s.color}, rgba(0,0,0,0.06))`,
                                    border: "1px solid rgba(255,255,255,0.06)",
                                    boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
                                }}
                            >
                                <div style={{ padding: 12 }}>
                                    <div
                                        className="text-sm font-semibold truncate"
                                        style={{
                                            color: parseInt(s.color.replace("#", ""), 16) > 0xaaaaaa ? "#000" : "#fff",
                                            textShadow: "0 1px 8px rgba(0,0,0,0.25)",
                                        }}
                                    >
                                        {s.title}
                                    </div>
                                    <div className="mt-2 h-1 rounded-full" style={{ background: "rgba(0,0,0,0.06)", width: "60%" }} />
                                </div>

                                <div
                                    style={{
                                        position: "absolute",
                                        right: 10,
                                        bottom: 10,
                                        width: 12,
                                        height: 12,
                                        borderRadius: 6,
                                        background: "linear-gradient(180deg,#fff,#bfbfbf)",
                                        boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                                    }}
                                />
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

/* ---------- RegisterPage (keeps your logic & structure) ---------- */
const RegisterPage = () => {
    const navigate = useNavigate();
    const { signup, loginWithGoogle } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "student",
    });

    const handleChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (formData.password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        try {
            await signup(formData.email, formData.password, { name: formData.name, role: formData.role });
            toast.success("Account created successfully!");
            navigate("/dashboard");
        } catch (error) {
            console.error("Registration error:", error);
            toast.error(error.message || "Failed to create account");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        setLoading(true);
        try {
            await loginWithGoogle();
            toast.success("Welcome to StudyGloqe!");
            navigate("/dashboard");
        } catch (error) {
            console.error("Google signup error:", error);
            toast.error(error.message || "Failed to sign up with Google");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-12"
            style={{
                background: "linear-gradient(180deg,#000000 0%, #070707 45%, #0f0f10 100%)",
                color: "#fff",
            }}
        >
            {/* subtle monochrome glows replacing previous accent colors */}
            <div
                className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
                style={{ filter: "blur(100px)", background: "radial-gradient(circle, rgba(255,255,255,0.04), transparent 40%)" }}
            />
            <div
                className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full"
                style={{ filter: "blur(100px)", background: "radial-gradient(circle, rgba(255,255,255,0.02), transparent 40%)", animationDelay: "2s" }}
            />

            <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
                {/* Left - FloatingSubjects (inlined improved monochrome art) */}
                <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9 }} className="hidden lg:block relative h-[700px]">
                    <FloatingSubjects size={520} intensity={1.0} particleCount={16} />
                </motion.div>

                {/* Right - Register Form */}
                <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9 }} className="w-full max-w-md mx-auto">
                    {/* Logo */}
                    <Link to="/" className="flex items-center justify-center gap-4 mb-12 group">
                        <div className="relative">
                            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#cfcfcf,#8f8f8f)", filter: "blur(8px)" }} />
                            <svg width="48" height="48" viewBox="0 0 32 32" className="relative z-10">
                                <circle cx="16" cy="16" r="12" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" fill="rgba(255,255,255,0.92)" />
                            </svg>
                        </div>
                        <span style={{ fontSize: 22, fontWeight: 700, background: "linear-gradient(90deg,#fff,#e6e6e6)", WebkitBackgroundClip: "text", color: "transparent" }}>
                            StudyGloqe
                        </span>
                    </Link>

                    {/* Register Card */}
                    <div className="bg-black/60 backdrop-blur-lg border border-white/6 rounded-2xl p-8 shadow-xl">
                        <div className="text-center mb-10">
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 9999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 }}>
                                <Sparkles size={16} className="text-gray-300" />
                                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(230,230,230,0.85)" }}>Join Premium</span>
                            </div>

                            <h1 className="text-4xl font-display font-bold mb-3">Create Account</h1>
                            <p className="text-gray-300">Start your premium learning journey</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium mb-3" style={{ color: "rgba(220,220,220,0.9)" }}>Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" className="w-full pl-14 pr-4 py-3 bg-white/6 border border-white/6 rounded-xl text-white placeholder-gray-400 focus:outline-none transition" required />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium mb-3" style={{ color: "rgba(220,220,220,0.9)" }}>Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" className="w-full pl-14 pr-4 py-3 bg-white/6 border border-white/6 rounded-xl text-white placeholder-gray-400 focus:outline-none transition" required />
                                </div>
                            </div>

                            {/* Role selection */}
                            <div>
                                <label className="block text-sm font-medium mb-3" style={{ color: "rgba(220,220,220,0.9)" }}>I am a...</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, role: "student" })}
                                        className={`p-6 rounded-2xl border-2 transition-all ${formData.role === "student" ? "border-white/40 bg-white/6" : "border-white/[0.08]"}`}
                                        aria-pressed={formData.role === "student"}
                                    >
                                        <GraduationCap className="mx-auto mb-3" size={28} />
                                        <div className="font-semibold">Student</div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, role: "teacher" })}
                                        className={`p-6 rounded-2xl border-2 transition-all ${formData.role === "teacher" ? "border-white/40 bg-white/6" : "border-white/[0.08]"}`}
                                        aria-pressed={formData.role === "teacher"}
                                    >
                                        <User className="mx-auto mb-3" size={28} />
                                        <div className="font-semibold">Teacher</div>
                                    </button>
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-medium mb-3" style={{ color: "rgba(220,220,220,0.9)" }}>Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" className="w-full pl-14 pr-14 py-3 bg-white/6 border border-white/6 rounded-xl text-white placeholder-gray-400 focus:outline-none transition" required />
                                    <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors" aria-label={showPassword ? "Hide password" : "Show password"}>
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-sm font-medium mb-3" style={{ color: "rgba(220,220,220,0.9)" }}>Confirm Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input type={showPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" className="w-full pl-14 pr-4 py-3 bg-white/6 border border-white/6 rounded-xl text-white placeholder-gray-400 focus:outline-none transition" required />
                                </div>
                            </div>

                            {/* Terms */}
                            <div className="text-sm text-gray-400 text-center">
                                By signing up, you agree to our{" "}
                                <Link to="/terms" className="text-white underline">Terms</Link>{" "}
                                and{" "}
                                <Link to="/privacy" className="text-white underline">Privacy Policy</Link>
                            </div>

                            {/* Submit */}
                            <button type="submit" disabled={loading} className="w-full py-3 px-4 bg-gradient-to-r from-white/6 to-gray-200/6 text-white rounded-xl font-semibold flex items-center justify-center gap-3 border border-white/6 hover:brightness-105 transition disabled:opacity-60">
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <GraduationCap size={20} />
                                        <span>Create Account</span>
                                        <ArrowRight size={20} className="ml-1" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="flex items-center gap-4 my-8">
                            <div className="flex-1" style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />
                            <span className="text-sm text-gray-400">or continue with</span>
                            <div className="flex-1" style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />
                        </div>

                        {/* Google signup */}
                        <button onClick={handleGoogleSignup} disabled={loading} className="w-full py-3 px-4 border border-white/8 bg-white/6 text-white rounded-xl font-medium flex items-center justify-center gap-3 transition disabled:opacity-60">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span>Google</span>
                        </button>

                        <p className="text-center mt-8 text-sm text-gray-400">
                            Already have an account?{" "}
                            <Link to="/login" className="text-white font-semibold hover:underline">Sign in instead</Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default RegisterPage;
