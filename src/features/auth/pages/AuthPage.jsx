// frontend/src/features/auth/pages/AuthPage.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    User,
    GraduationCap,
    Sparkles,
    Check,
    X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import logoImage from "@assets/logo/loma.png";
import "../styles/AuthPage.css";

const MIN_PASSWORD_LENGTH = 6;
const MIN_USERNAME_LENGTH = 3;

const AuthPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { signup, login, loginWithGoogle, checkUsernameAvailability } = useAuth();

    // ---------------- UI STATE ----------------
    // ✅ CHANGED: Start with Sign Up (true) instead of Sign In (false)
    const [isSignUp, setIsSignUp] = useState(true);
    const [showPassword, setShowPassword] = useState(false);

    // Separate loading states so one form doesn't block the other
    const [signUpLoading, setSignUpLoading] = useState(false);
    const [signInLoading, setSignInLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const isAnyLoading = signUpLoading || signInLoading || googleLoading;

    // If navigated with `/auth` and state.mode = 'signup' | 'signin'
    useEffect(() => {
        if (location.state?.mode === "signup") {
            setIsSignUp(true);
        } else if (location.state?.mode === "signin") {
            setIsSignUp(false);
        }
    }, [location.state]);

    // ---------------- FORM STATE ----------------
    const [signUpData, setSignUpData] = useState({
        name: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "student",
    });

    const [signInData, setSignInData] = useState({
        emailOrUsername: "",
        password: "",
    });

    // Username availability state
    const [usernameCheck, setUsernameCheck] = useState({
        checking: false,
        available: null,
        message: "",
    });

    // Field-level error messages
    const [errors, setErrors] = useState({
        signUpName: "",
        signUpUsername: "",
        signUpEmail: "",
        signUpPassword: "",
        signUpConfirmPassword: "",
        signInId: "",
        signInPassword: "",
    });

    // ---------------- HELPERS ----------------
    const resetForms = () => {
        setSignUpData({
            name: "",
            username: "",
            email: "",
            password: "",
            confirmPassword: "",
            role: "student",
        });
        setSignInData({
            emailOrUsername: "",
            password: "",
        });
        setErrors({
            signUpName: "",
            signUpUsername: "",
            signUpEmail: "",
            signUpPassword: "",
            signUpConfirmPassword: "",
            signInId: "",
            signInPassword: "",
        });
        setUsernameCheck({ checking: false, available: null, message: "" });
        setShowPassword(false);
    };

    // Toggle between Sign In and Sign Up
    const toggleMode = () => {
        setIsSignUp((prev) => !prev);
        resetForms();
    };

    // ---------------- USERNAME HANDLING ----------------
    const handleUsernameChange = (e) => {
        const value = e.target.value
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "")
            .slice(0, 20);

        setSignUpData((prev) => ({ ...prev, username: value }));
        setErrors((prev) => ({ ...prev, signUpUsername: "" }));
    };

    // Debounced username availability check
    useEffect(() => {
        const username = signUpData.username;

        if (!username || username.length < MIN_USERNAME_LENGTH) {
            setUsernameCheck({
                checking: false,
                available: null,
                message: "",
            });
            return;
        }

        let cancelled = false;
        const timeoutId = setTimeout(async () => {
            setUsernameCheck({
                checking: true,
                available: null,
                message: "Checking...",
            });

            try {
                const isAvailable = await checkUsernameAvailability(username);
                if (cancelled) return;

                setUsernameCheck({
                    checking: false,
                    available: isAvailable,
                    message: isAvailable
                        ? "Username available!"
                        : "Username already taken",
                });
            } catch (error) {
                if (cancelled) return;
                setUsernameCheck({
                    checking: false,
                    available: false,
                    message: error.message || "Error checking username",
                });
            }
        }, 500);

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
    }, [signUpData.username, checkUsernameAvailability]);

    // ---------------- VALIDATION ----------------
    const validateSignUp = useCallback(() => {
        const nextErrors = {
            signUpName: "",
            signUpUsername: "",
            signUpEmail: "",
            signUpPassword: "",
            signUpConfirmPassword: "",
            signInId: "",
            signInPassword: "",
        };
        let valid = true;

        if (!signUpData.name.trim()) {
            nextErrors.signUpName = "Full name is required";
            valid = false;
        }

        if (!signUpData.username.trim()) {
            nextErrors.signUpUsername = "Username is required";
            valid = false;
        } else if (signUpData.username.length < MIN_USERNAME_LENGTH) {
            nextErrors.signUpUsername = `At least ${MIN_USERNAME_LENGTH} characters`;
            valid = false;
        } else if (!usernameCheck.available) {
            nextErrors.signUpUsername = "Please choose an available username";
            valid = false;
        }

        if (!signUpData.email.trim()) {
            nextErrors.signUpEmail = "Email is required";
            valid = false;
        } else if (!signUpData.email.includes("@")) {
            nextErrors.signUpEmail = "Enter a valid email address";
            valid = false;
        }

        if (!signUpData.password) {
            nextErrors.signUpPassword = "Password is required";
            valid = false;
        } else if (signUpData.password.length < MIN_PASSWORD_LENGTH) {
            nextErrors.signUpPassword = `At least ${MIN_PASSWORD_LENGTH} characters`;
            valid = false;
        }

        if (!signUpData.confirmPassword) {
            nextErrors.signUpConfirmPassword = "Please confirm your password";
            valid = false;
        } else if (signUpData.confirmPassword !== signUpData.password) {
            nextErrors.signUpConfirmPassword = "Passwords do not match";
            valid = false;
        }

        setErrors((prev) => ({ ...prev, ...nextErrors }));
        return valid;
    }, [signUpData, usernameCheck.available]);

    const validateSignIn = useCallback(() => {
        const nextErrors = {
            signInId: "",
            signInPassword: "",
        };
        let valid = true;

        if (!signInData.emailOrUsername.trim()) {
            nextErrors.signInId = "Enter email or username";
            valid = false;
        }

        if (!signInData.password) {
            nextErrors.signInPassword = "Password is required";
            valid = false;
        }

        setErrors((prev) => ({ ...prev, ...nextErrors }));
        return valid;
    }, [signInData]);

    // ---------------- HANDLERS ----------------
    const handleSignUp = async (e) => {
        e.preventDefault();
        if (!validateSignUp()) {
            toast.error("Please fix the highlighted fields");
            return;
        }

        setSignUpLoading(true);
        try {
            await signup(
                signUpData.email.trim(),
                signUpData.password,
                signUpData.username.trim(),
                signUpData.name.trim(),
                signUpData.role
            );

            toast.success(`Welcome to StudyGloqe, ${signUpData.name.trim()}!`);
            navigate("/onboarding");
        } catch (error) {
            console.error("Registration error:", error);
            toast.error(error.message || "Failed to create account");
        } finally {
            setSignUpLoading(false);
        }
    };

    const handleSignIn = async (e) => {
        e.preventDefault();
        if (!validateSignIn()) {
            toast.error("Please fill in all required fields");
            return;
        }

        setSignInLoading(true);
        try {
            await login(signInData.emailOrUsername.trim(), signInData.password);

            toast.success("Welcome back!");
            navigate("/dashboard");
        } catch (error) {
            console.error("Login error:", error);
            toast.error(error.message || "Failed to login");
        } finally {
            setSignInLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        setGoogleLoading(true);
        try {
            await loginWithGoogle();
            toast.success("Welcome to StudyGloqe!");
            navigate("/dashboard");
        } catch (error) {
            console.error("Google auth error:", error);
            toast.error(error.message || "Failed to authenticate with Google");
        } finally {
            setGoogleLoading(false);
        }
    };

    // ---------------- RENDER ----------------
    return (
        <div className="auth-page">
            <div className="ambient-glow glow-1" />
            <div className="ambient-glow glow-2" />

            <div className={`auth-container ${isSignUp ? "active" : ""}`}>
                {/* ---------------- SIGN UP FORM ---------------- */}
                <div className="form-container sign-up">
                    <form onSubmit={handleSignUp} noValidate>
                        <div className="form-header">
                            <Sparkles size={24} className="sparkle-icon" />
                            <h1>Create Account</h1>
                        </div>

                        <div className="social-icons">
                            <button
                                type="button"
                                onClick={handleGoogleAuth}
                                disabled={isAnyLoading}
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

                        <div className="input-group">
                            <User size={18} className="input-icon" />
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={signUpData.name}
                                onChange={(e) => {
                                    setSignUpData((prev) => ({ ...prev, name: e.target.value }));
                                    setErrors((prev) => ({ ...prev, signUpName: "" }));
                                }}
                                required
                                disabled={isAnyLoading}
                            />
                        </div>
                        {errors.signUpName && <div className="username-message taken">{errors.signUpName}</div>}

                        <div className="input-group">
                            <User size={18} className="input-icon" />
                            <input
                                type="text"
                                placeholder="Username (e.g., john_doe_123)"
                                value={signUpData.username}
                                onChange={handleUsernameChange}
                                required
                                minLength={MIN_USERNAME_LENGTH}
                                maxLength={20}
                                disabled={isAnyLoading}
                            />
                            {signUpData.username && (
                                <div className="username-status">
                                    {usernameCheck.checking && <div className="checking-spinner" />}
                                    {!usernameCheck.checking && usernameCheck.available === true && (
                                        <Check size={18} className="status-icon available" />
                                    )}
                                    {!usernameCheck.checking && usernameCheck.available === false && (
                                        <X size={18} className="status-icon taken" />
                                    )}
                                </div>
                            )}
                        </div>
                        {(errors.signUpUsername || usernameCheck.message) && (
                            <div className={`username-message ${errors.signUpUsername || usernameCheck.available === false ? "taken" : "available"}`}>
                                {errors.signUpUsername || usernameCheck.message}
                            </div>
                        )}

                        <div className="input-group">
                            <Mail size={18} className="input-icon" />
                            <input
                                type="email"
                                placeholder="Email Address"
                                value={signUpData.email}
                                onChange={(e) => {
                                    setSignUpData((prev) => ({ ...prev, email: e.target.value }));
                                    setErrors((prev) => ({ ...prev, signUpEmail: "" }));
                                }}
                                required
                                disabled={isAnyLoading}
                            />
                        </div>
                        {errors.signUpEmail && <div className="username-message taken">{errors.signUpEmail}</div>}

                        <div className="role-selection">
                            <button
                                type="button"
                                className={`role-btn ${signUpData.role === "student" ? "active" : ""}`}
                                onClick={() => setSignUpData((prev) => ({ ...prev, role: "student" }))}
                                disabled={isAnyLoading}
                            >
                                <GraduationCap size={20} />
                                <span>Student</span>
                            </button>
                            <button
                                type="button"
                                className={`role-btn ${signUpData.role === "teacher" ? "active" : ""}`}
                                onClick={() => setSignUpData((prev) => ({ ...prev, role: "teacher" }))}
                                disabled={isAnyLoading}
                            >
                                <User size={20} />
                                <span>Teacher</span>
                            </button>
                        </div>

                        <div className="input-group">
                            <Lock size={18} className="input-icon" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={signUpData.password}
                                onChange={(e) => {
                                    setSignUpData((prev) => ({ ...prev, password: e.target.value }));
                                    setErrors((prev) => ({ ...prev, signUpPassword: "" }));
                                }}
                                required
                                minLength={MIN_PASSWORD_LENGTH}
                                disabled={isAnyLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="toggle-password"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                disabled={isAnyLoading}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {errors.signUpPassword && <div className="username-message taken">{errors.signUpPassword}</div>}

                        <div className="input-group">
                            <Lock size={18} className="input-icon" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Confirm Password"
                                value={signUpData.confirmPassword}
                                onChange={(e) => {
                                    setSignUpData((prev) => ({ ...prev, confirmPassword: e.target.value }));
                                    setErrors((prev) => ({ ...prev, signUpConfirmPassword: "" }));
                                }}
                                required
                                disabled={isAnyLoading}
                            />
                        </div>
                        {errors.signUpConfirmPassword && (
                            <div className="username-message taken">{errors.signUpConfirmPassword}</div>
                        )}

                        <button
                            type="submit"
                            className="submit-btn"
                            disabled={signUpLoading || usernameCheck.checking || signUpData.username.length < MIN_USERNAME_LENGTH}
                        >
                            {signUpLoading ? <div className="spinner" /> : "Sign Up"}
                        </button>
                    </form>
                </div>

                {/* ---------------- SIGN IN FORM ---------------- */}
                <div className="form-container sign-in">
                    <form onSubmit={handleSignIn} noValidate>
                        <div className="form-header">
                            <Sparkles size={24} className="sparkle-icon" />
                            <h1>Sign In</h1>
                        </div>

                        <div className="social-icons">
                            <button
                                type="button"
                                onClick={handleGoogleAuth}
                                disabled={isAnyLoading}
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

                        <span className="divider-text">or use your email/username</span>

                        <div className="input-group">
                            <Mail size={18} className="input-icon" />
                            <input
                                type="text"
                                placeholder="Email or Username"
                                value={signInData.emailOrUsername}
                                onChange={(e) => {
                                    setSignInData((prev) => ({ ...prev, emailOrUsername: e.target.value }));
                                    setErrors((prev) => ({ ...prev, signInId: "" }));
                                }}
                                required
                                disabled={isAnyLoading}
                            />
                        </div>
                        {errors.signInId && <div className="username-message taken">{errors.signInId}</div>}

                        <div className="input-group">
                            <Lock size={18} className="input-icon" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={signInData.password}
                                onChange={(e) => {
                                    setSignInData((prev) => ({ ...prev, password: e.target.value }));
                                    setErrors((prev) => ({ ...prev, signInPassword: "" }));
                                }}
                                required
                                disabled={isAnyLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="toggle-password"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                disabled={isAnyLoading}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {errors.signInPassword && <div className="username-message taken">{errors.signInPassword}</div>}

                        <a href="/forgot-password" className="forgot-link">
                            Forgot Your Password?
                        </a>

                        <button type="submit" className="submit-btn" disabled={signInLoading}>
                            {signInLoading ? <div className="spinner" /> : "Sign In"}
                        </button>
                    </form>
                </div>

                {/* ---------------- TOGGLE CONTAINER ---------------- */}
                <div className="toggle-container">
                    <div className="toggle">
                        <div className="toggle-panel toggle-left">
                            <div className="logo-container">
                                {/* ✅ CHANGED: Updated logo path */}
                                <img src={logoImage} alt="StudyGloqe Logo" className="logo-image" />
                                <h2 className="logo-text">StudyGloqe</h2>
                            </div>
                            <h1>Welcome Back!</h1>
                            <p>Enter your details to access all premium features</p>
                            <button className="toggle-btn" onClick={toggleMode} disabled={isAnyLoading}>
                                Sign In
                            </button>
                        </div>

                        <div className="toggle-panel toggle-right">
                            <div className="logo-container">
                                {/* ✅ CHANGED: Updated logo path */}
                                <img src={logoImage} alt="StudyGloqe Logo" className="logo-image" />
                                <h2 className="logo-text">StudyGloqe</h2>
                            </div>
                            <h1>Hello, Friend!</h1>
                            <p>Register to unlock premium learning experience</p>
                            <button className="toggle-btn" onClick={toggleMode} disabled={isAnyLoading}>
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
