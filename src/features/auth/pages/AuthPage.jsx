// src/features/auth/pages/AuthPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, User, GraduationCap, Sparkles } from "lucide-react";
import { useAuth } from '@auth/contexts/AuthContext';
import toast from "react-hot-toast";
import "../styles/AuthPage.css";


const AuthPage = () => {
    const navigate = useNavigate();
    const { signup, login, loginWithGoogle } = useAuth();
    const [isSignUp, setIsSignUp] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Sign Up Form State
    const [signUpData, setSignUpData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "student",
    });

    // Sign In Form State
    const [signInData, setSignInData] = useState({
        email: "",
        password: "",
    });

    // Toggle between Sign In and Sign Up
    const toggleMode = () => {
        setIsSignUp(!isSignUp);
        setShowPassword(false);
    };

    // Handle Sign Up
    const handleSignUp = async (e) => {
        e.preventDefault();

        if (signUpData.password !== signUpData.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (signUpData.password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        try {
            await signup(signUpData.email, signUpData.password, {
                name: signUpData.name,
                role: signUpData.role,
            });
            toast.success("Account created successfully!");
            navigate("/dashboard");
        } catch (error) {
            console.error("Registration error:", error);
            toast.error(error.message || "Failed to create account");
        } finally {
            setLoading(false);
        }
    };

    // Handle Sign In
    const handleSignIn = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(signInData.email, signInData.password);
            toast.success("Welcome back!");
            navigate("/dashboard");
        } catch (error) {
            console.error("Login error:", error);
            toast.error(error.message || "Failed to login");
        } finally {
            setLoading(false);
        }
    };

    // Handle Google OAuth
    const handleGoogleAuth = async () => {
        setLoading(true);
        try {
            await loginWithGoogle();
            toast.success("Welcome to StudyGloqe!");
            navigate("/dashboard");
        } catch (error) {
            console.error("Google auth error:", error);
            toast.error(error.message || "Failed to authenticate with Google");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            {/* Ambient Background Effects */}
            <div className="ambient-glow glow-1" />
            <div className="ambient-glow glow-2" />

            <div className={`auth-container ${isSignUp ? "active" : ""}`}>
                {/* Sign Up Form */}
                <div className="form-container sign-up">
                    <form onSubmit={handleSignUp}>
                        <div className="form-header">
                            <Sparkles size={24} className="sparkle-icon" />
                            <h1>Create Account</h1>
                        </div>

                        {/* Social Icons */}
                        <div className="social-icons">
                            <button
                                type="button"
                                onClick={handleGoogleAuth}
                                disabled={loading}
                                className="icon"
                                aria-label="Sign up with Google"
                            >
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            </button>
                        </div>

                        <span className="divider-text">or use your email for registration</span>

                        {/* Name Input */}
                        <div className="input-group">
                            <User size={18} className="input-icon" />
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={signUpData.name}
                                onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                                required
                            />
                        </div>

                        {/* Email Input */}
                        <div className="input-group">
                            <Mail size={18} className="input-icon" />
                            <input
                                type="email"
                                placeholder="Email Address"
                                value={signUpData.email}
                                onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                                required
                            />
                        </div>

                        {/* Role Selection */}
                        <div className="role-selection">
                            <button
                                type="button"
                                className={`role-btn ${signUpData.role === "student" ? "active" : ""}`}
                                onClick={() => setSignUpData({ ...signUpData, role: "student" })}
                            >
                                <GraduationCap size={20} />
                                <span>Student</span>
                            </button>
                            <button
                                type="button"
                                className={`role-btn ${signUpData.role === "teacher" ? "active" : ""}`}
                                onClick={() => setSignUpData({ ...signUpData, role: "teacher" })}
                            >
                                <User size={20} />
                                <span>Teacher</span>
                            </button>
                        </div>

                        {/* Password Input */}
                        <div className="input-group">
                            <Lock size={18} className="input-icon" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={signUpData.password}
                                onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="toggle-password"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {/* Confirm Password Input */}
                        <div className="input-group">
                            <Lock size={18} className="input-icon" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Confirm Password"
                                value={signUpData.confirmPassword}
                                onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                                required
                            />
                        </div>

                        {/* Submit Button */}
                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? (
                                <div className="spinner" />
                            ) : (
                                "Sign Up"
                            )}
                        </button>
                    </form>
                </div>

                {/* Sign In Form */}
                <div className="form-container sign-in">
                    <form onSubmit={handleSignIn}>
                        <div className="form-header">
                            <Sparkles size={24} className="sparkle-icon" />
                            <h1>Sign In</h1>
                        </div>

                        {/* Social Icons */}
                        <div className="social-icons">
                            <button
                                type="button"
                                onClick={handleGoogleAuth}
                                disabled={loading}
                                className="icon"
                                aria-label="Sign in with Google"
                            >
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            </button>
                        </div>

                        <span className="divider-text">or use your email and password</span>

                        {/* Email Input */}
                        <div className="input-group">
                            <Mail size={18} className="input-icon" />
                            <input
                                type="email"
                                placeholder="Email Address"
                                value={signInData.email}
                                onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                                required
                            />
                        </div>

                        {/* Password Input */}
                        <div className="input-group">
                            <Lock size={18} className="input-icon" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={signInData.password}
                                onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="toggle-password"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <a href="/forgot-password" className="forgot-link">
                            Forgot Your Password?
                        </a>

                        {/* Submit Button */}
                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? (
                                <div className="spinner" />
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>
                </div>

                {/* Toggle Container */}
                <div className="toggle-container">
                    <div className="toggle">
                        <div className="toggle-panel toggle-left">
                            <div className="logo-container">
                                <img src="/src/assets/logo/logo.svg" alt="StudyGloqe Logo" className="logo-image" />
                                <h2 className="logo-text">StudyGloqe</h2>
                            </div>
                            <h1>Welcome Back!</h1>
                            <p>Enter your personal details to access all premium features</p>
                            <button className="toggle-btn" onClick={toggleMode}>
                                Sign In
                            </button>
                        </div>

                        <div className="toggle-panel toggle-right">
                            <div className="logo-container">
                                <img src="/src/assets/logo/logo.svg" alt="StudyGloqe Logo" className="logo-image" />
                                <h2 className="logo-text">StudyGloqe</h2>
                            </div>
                            <h1>Hello, Friend!</h1>
                            <p>Register with your details to unlock premium learning experience</p>
                            <button className="toggle-btn" onClick={toggleMode}>
                                Sign Up
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;