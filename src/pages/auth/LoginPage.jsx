// src/pages/LoginPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, LogIn, Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "@contexts/AuthContext";
import toast from "react-hot-toast";

/* ---------- Small helper ---------- */
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
 * FloatingSubjects
 * - Inlined upgraded monochrome floating scene (based on EnhancedFloatingLibrary)
 * - Hidden on small screens (keeps LoginPage responsive)
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

    // Strict monochrome palette
    const palette = useMemo(() => ["#FFFFFF", "#E6E6E6", "#BFBFBF", "#9A9A9A"], []);

    // Subjects (simple names)
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
        // keep the component hidden on small screens — 'hidden lg:block'
        <div aria-hidden className="hidden lg:block relative" style={{ width: size, height: size, transform: `translateZ(0)` }}>
            {/* subtle blurred orb behind */}
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

            {/* central subjects cluster */}
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

/* ---------- LoginPage (keeps your original logic & layout) ---------- */
const LoginPage = () => {
    const navigate = useNavigate();
    const { login, loginWithGoogle } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ email: "", password: "" });

    const handleChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(formData.email, formData.password);
            toast.success("Welcome back!");
            navigate("/dashboard");
        } catch (err) {
            console.error("Login error:", err);
            toast.error(err?.message || "Failed to login");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            await loginWithGoogle();
            toast.success("Welcome!");
            navigate("/dashboard");
        } catch (err) {
            console.error("Google login error:", err);
            toast.error(err?.message || "Failed to login with Google");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center relative overflow-hidden px-4"
            style={{
                background: "linear-gradient(180deg,#000000 0%, #070707 45%, #0f0f10 100%)",
                color: "#fff",
            }}
        >
            {/* subtle soft silver glows */}
            <div
                className="absolute -left-40 -top-24 w-96 h-96 rounded-full"
                style={{ filter: "blur(90px)", background: "radial-gradient(circle, rgba(255,255,255,0.04), transparent 40%)" }}
            />
            <div
                className="absolute -right-24 bottom-24 w-80 h-80 rounded-full"
                style={{ filter: "blur(60px)", background: "radial-gradient(circle, rgba(255,255,255,0.02), transparent 40%)" }}
            />

            <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
                {/* Left - Floating subjects art (inlined improved component) */}
                <div className="flex items-center justify-center">
                    <FloatingSubjects size={520} intensity={1.0} particleCount={14} />
                </div>

                {/* Right - Login Card (centered) */}
                <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="w-full max-w-md mx-auto">
                    {/* Logo */}
                    <Link to="/" className="flex items-center justify-center gap-4 mb-10 group">
                        <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl overflow-hidden" aria-hidden>
                            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#cfcfcf,#8f8f8f)" }} />
                            <svg viewBox="0 0 32 32" width="32" height="32" className="relative z-10">
                                <circle cx="16" cy="16" r="12" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" fill="rgba(255,255,255,0.9)" />
                            </svg>
                        </div>
                        <span style={{ fontSize: 22, fontWeight: 700, background: "linear-gradient(90deg,#fff,#e6e6e6)", WebkitBackgroundClip: "text", color: "transparent" }}>
                            StudyGloqe
                        </span>
                    </Link>

                    {/* Login Card */}
                    <div className="bg-black/60 backdrop-blur-lg border border-white/6 rounded-2xl p-8 shadow-xl">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/6 border border-white/8 mb-4">
                                <Sparkles size={14} className="text-gray-300" />
                                <span className="text-sm font-semibold text-gray-300">Premium Access</span>
                            </div>
                            <h1 className="text-3xl font-bold mb-1">Welcome Back</h1>
                            <p className="text-gray-300 text-sm">Sign in to continue your learning</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-300">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="you@example.com"
                                        className="w-full pl-12 pr-4 py-3 bg-white/6 border border-white/6 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-white/20 transition"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-300">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className="w-full pl-12 pr-12 py-3 bg-white/6 border border-white/6 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-white/20 transition"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((s) => !s)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="text-right">
                                <Link to="/forgot-password" className="text-sm text-gray-400 hover:text-gray-200 transition">Forgot password?</Link>
                            </div>

                            {/* Sign In */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 bg-gradient-to-r from-gray-300/8 to-white/6 text-white rounded-xl font-semibold flex items-center justify-center gap-3 border border-white/6 hover:brightness-105 transition disabled:opacity-60"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <LogIn size={18} />
                                        <span>Sign in</span>
                                        <ArrowRight size={18} className="ml-1" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* divider */}
                        <div className="flex items-center gap-3 my-6">
                            <div className="flex-1 h-px bg-white/6" />
                            <span className="text-sm text-gray-400">or continue with</span>
                            <div className="flex-1 h-px bg-white/6" />
                        </div>

                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full py-3 px-4 border border-white/8 bg-white/4 text-white rounded-xl font-medium flex items-center justify-center gap-3 transition disabled:opacity-60"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span>Google</span>
                        </button>

                        <p className="text-center mt-5 text-sm text-gray-400">
                            Don't have an account?{" "}
                            <Link to="/register" className="text-white font-semibold hover:underline">Create one</Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default LoginPage;
