import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Spline from '@splinetool/react-spline';
import { Mail, Lock, Eye, EyeOff, LogIn, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import toast from 'react-hot-toast';

const LoginPage = () => {
    const navigate = useNavigate();
    const { login, loginWithGoogle } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await login(formData.email, formData.password);
            toast.success('Welcome back!');
            navigate('/dashboard');
        } catch (error) {
            console.error('Login error:', error);
            toast.error(error.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            await loginWithGoogle();
            toast.success('Welcome!');
            navigate('/dashboard');
        } catch (error) {
            console.error('Google login error:', error);
            toast.error(error.message || 'Failed to login with Google');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
            {/* Ambient Background */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-[100px] animate-pulse-slow"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-dark/5 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

            <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
                {/* Left - Spline 3D Silver Robot */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 1 }}
                    className="hidden lg:block relative h-[600px]"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-accent-dark/10 rounded-3xl"></div>
                    <div className="spline-container h-full rounded-3xl overflow-hidden">
                        <Spline 
                            scene="https://prod.spline.design/8cfb6748-f3dd-44dd-89fb-f46c7ab4186e/scene.splinecode"
                            className="w-full h-full"
                        />
                    </div>
                    <div className="absolute inset-0 rounded-3xl border border-accent/20 pointer-events-none"></div>
                </motion.div>

                {/* Right - Login Form */}
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 1 }}
                    className="w-full max-w-md mx-auto"
                >
                    {/* Logo */}
                    <Link to="/" className="flex items-center justify-center gap-4 mb-12 group">
                        <div className="relative">
                            <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full group-hover:bg-accent/40 transition-all"></div>
                            <img
                                src="/logo.svg"
                                alt="StudyGloqe"
                                className="h-12 w-12 relative z-10 drop-shadow-[0_0_15px_rgba(229,231,235,0.5)]"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextElementSibling.style.display = 'flex';
                                }}
                            />
                            <div className="hidden h-12 w-12 rounded-2xl bg-gradient-to-br from-accent to-accent-dark items-center justify-center shadow-glass-lg relative z-10">
                                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                    <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2" className="text-primary-950"/>
                                    <circle cx="16" cy="16" r="6" fill="currentColor" className="text-primary-950"/>
                                </svg>
                            </div>
                        </div>
                        <span className="text-2xl font-display font-bold gradient-text">
                            StudyGloqe
                        </span>
                    </Link>

                    {/* Login Card */}
                    <div className="card">
                        {/* Header */}
                        <div className="text-center mb-10">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-accent/30 mb-6 glow">
                                <Sparkles size={16} className="text-accent" />
                                <span className="text-sm font-semibold">Premium Access</span>
                            </div>
                            <h1 className="text-4xl font-display font-bold mb-3">Welcome Back</h1>
                            <p className="text-primary-300">Sign in to continue your learning journey</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium mb-3">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-primary-400" size={20} />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="your@email.com"
                                        className="input pl-14"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-medium mb-3">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-primary-400" size={20} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className="input pl-14 pr-14"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-primary-400 hover:text-accent transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            {/* Forgot Password */}
                            <div className="text-right">
                                <Link to="/forgot-password" className="text-sm text-accent hover:text-accent-light transition-colors">
                                    Forgot password?
                                </Link>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full flex items-center justify-center gap-3 group"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-primary-950 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <LogIn size={20} />
                                        <span>Sign In</span>
                                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="flex items-center gap-4 my-8">
                            <div className="flex-1 divider"></div>
                            <span className="text-sm text-primary-400">or continue with</span>
                            <div className="flex-1 divider"></div>
                        </div>

                        {/* Google Login */}
                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="btn-secondary w-full flex items-center justify-center gap-3"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span>Google</span>
                        </button>

                        {/* Sign Up Link */}
                        <p className="text-center mt-8 text-sm text-primary-300">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-accent hover:text-accent-light font-semibold transition-colors">
                                Create one now
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default LoginPage;