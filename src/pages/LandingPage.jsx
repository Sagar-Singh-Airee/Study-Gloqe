import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Spline from '@splinetool/react-spline';
import { ArrowRight, Sparkles, Zap, Shield, Award } from 'lucide-react';

const LandingPage = () => {
    const features = [
        {
            icon: Sparkles,
            title: 'AI-Powered Learning',
            description: 'Advanced AI analyzes your PDFs and creates personalized study materials'
        },
        {
            icon: Zap,
            title: 'Instant Results',
            description: 'Get immediate feedback and detailed explanations on every question'
        },
        {
            icon: Shield,
            title: 'Secure & Private',
            description: 'Your data is encrypted and protected with enterprise-grade security'
        },
        {
            icon: Award,
            title: 'Gamified Experience',
            description: 'Earn XP, unlock achievements, and compete on global leaderboards'
        }
    ];

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Premium Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/[0.08]">
                <div className="container mx-auto px-6">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-4 group">
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
                                {/* Fallback Logo */}
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

                        {/* Auth Buttons */}
                        <div className="flex items-center gap-4">
                            <Link to="/login" className="btn-ghost">
                                Sign In
                            </Link>
                            <Link to="/register" className="btn-primary">
                                Get Started
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section with Spline */}
            <section className="relative min-h-screen flex items-center pt-20">
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        {/* Left Content */}
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="space-y-8 z-10"
                        >
                            {/* Badge */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.8 }}
                                className="inline-flex items-center gap-3 px-6 py-3 rounded-full glass border border-accent/30 glow"
                            >
                                <Sparkles size={18} className="text-accent" />
                                <span className="text-sm font-semibold">Premium AI-Powered Platform</span>
                            </motion.div>

                            {/* Headline */}
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4, duration: 0.8 }}
                                className="text-6xl lg:text-7xl font-display font-black leading-tight"
                            >
                                Study Smarter,
                                <br />
                                <span className="gradient-text">Not Harder</span>
                            </motion.h1>

                            {/* Description */}
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6, duration: 0.8 }}
                                className="text-xl text-primary-300 leading-relaxed max-w-xl"
                            >
                                Transform any PDF into interactive quizzes, flashcards, and personalized learning paths. 
                                Powered by cutting-edge AI technology.
                            </motion.p>

                            {/* CTA Buttons */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8, duration: 0.8 }}
                                className="flex flex-wrap gap-4"
                            >
                                <Link
                                    to="/register"
                                    className="btn-primary flex items-center gap-3 text-lg group"
                                >
                                    Start Learning Free
                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                                <button className="btn-secondary text-lg">
                                    Watch Demo
                                </button>
                            </motion.div>

                            {/* Stats */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1, duration: 0.8 }}
                                className="flex gap-12 pt-8"
                            >
                                {[
                                    { label: 'Active Students', value: '10K+' },
                                    { label: 'Quizzes Generated', value: '500K+' },
                                    { label: 'Success Rate', value: '95%' }
                                ].map((stat, i) => (
                                    <div key={i}>
                                        <div className="text-4xl font-bold gradient-text mb-1">
                                            {stat.value}
                                        </div>
                                        <div className="text-sm text-primary-400">
                                            {stat.label}
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        </motion.div>

                        {/* Right - Spline 3D */}
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                            className="relative h-[700px] rounded-3xl overflow-hidden"
                        >
                            {/* Glow Effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-accent-dark/10 rounded-3xl animate-pulse-slow"></div>
                            
                            {/* Spline Scene */}
                            <div className="spline-container h-full">
                                <Spline 
                                    scene="https://prod.spline.design/8cfb6748-f3dd-44dd-89fb-f46c7ab4186e/scene.splinecode"
                                    className="w-full h-full"
                                />
                            </div>

                            {/* Border Glow */}
                            <div className="absolute inset-0 rounded-3xl border border-accent/20 pointer-events-none"></div>
                        </motion.div>
                    </div>
                </div>

                {/* Ambient Background */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-dark/5 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            </section>

            {/* Features Section */}
            <section className="py-32 relative">
                <div className="container mx-auto px-6">
                    {/* Section Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-20"
                    >
                        <h2 className="text-5xl lg:text-6xl font-display font-bold mb-6">
                            Everything You Need to <span className="gradient-text">Excel</span>
                        </h2>
                        <p className="text-xl text-primary-300 max-w-2xl mx-auto">
                            Premium tools designed to maximize your learning potential
                        </p>
                    </motion.div>

                    {/* Feature Cards */}
                    <div className="grid md:grid-cols-2 gap-8">
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                className="card-hover group"
                            >
                                <div className="flex items-start gap-6">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent-dark/20 border border-accent/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform glow">
                                        <feature.icon size={28} className="text-accent" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-display font-semibold mb-3">
                                            {feature.title}
                                        </h3>
                                        <p className="text-primary-300 leading-relaxed">
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 relative">
                <div className="container mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="card text-center max-w-4xl mx-auto relative overflow-hidden"
                    >
                        {/* Animated Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent-dark/5"></div>
                        
                        <div className="relative z-10">
                            <h2 className="text-5xl lg:text-6xl font-display font-bold mb-6">
                                Ready to Transform Your Learning?
                            </h2>
                            <p className="text-xl text-primary-300 mb-10 max-w-2xl mx-auto">
                                Join thousands of students who are already studying smarter with StudyGloqe
                            </p>
                            <Link
                                to="/register"
                                className="btn-primary inline-flex items-center gap-3 text-lg group"
                            >
                                Start Your Free Trial
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/[0.08] py-12 glass">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4">
                            <img
                                src="/logo.svg"
                                alt="StudyGloqe"
                                className="h-8 w-8"
                            />
                            <span className="font-display font-bold text-lg">StudyGloqe</span>
                        </div>
                        <div className="text-sm text-primary-400">
                            © 2024 StudyGloqe. All rights reserved.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;