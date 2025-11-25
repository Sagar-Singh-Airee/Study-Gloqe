import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Zap, Shield, Award } from 'lucide-react';
import robotGif from '@/assets/robo/robot.gif'; // Your robot image (static)

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

    // Static Robot Component - No animations
    const StaticRobot = () => {
        return (
            <div className="relative w-full h-full flex items-center justify-center">
                {/* Static Background Gradient */}
                <div
                    className="absolute w-[500px] h-[500px] rounded-full opacity-10 blur-[80px]"
                    style={{
                        background: 'radial-gradient(circle, rgba(192, 192, 192, 0.5) 0%, transparent 70%)',
                        top: '5%',
                        left: '5%',
                    }}
                />
                <div
                    className="absolute w-[450px] h-[450px] rounded-full opacity-10 blur-[80px]"
                    style={{
                        background: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 70%)',
                        bottom: '5%',
                        right: '5%',
                    }}
                />

                {/* Static Light Rays */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(8)].map((_, i) => (
                        <div
                            key={`ray-${i}`}
                            className="absolute top-0 left-1/2 w-0.5 h-full origin-top opacity-15"
                            style={{
                                background: i % 2 === 0
                                    ? 'linear-gradient(to bottom, rgba(192, 192, 192, 0.2) 0%, transparent 60%)'
                                    : 'linear-gradient(to bottom, rgba(255, 255, 255, 0.15) 0%, transparent 60%)',
                                transform: `translateX(-50%) rotate(${i * 22.5}deg)`,
                            }}
                        />
                    ))}
                </div>

                {/* Robot Image - Static Display */}
                <div className="relative z-10">
                    <img
                        src={robotGif}
                        alt="AI Robot"
                        className="max-w-md h-auto"
                        style={{
                            filter: 'drop-shadow(0 0 30px rgba(192, 192, 192, 0.3))',
                        }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-black">
            {/* Premium Navigation with Silver Accent */}
            <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl bg-black/80 border-b border-white/10">
                <div className="container mx-auto px-6">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-white/10 blur-xl rounded-full" />
                                <img
                                    src="/logo.svg"
                                    alt="StudyGloqe"
                                    className="h-12 w-12 relative z-10"
                                    style={{
                                        filter: 'drop-shadow(0 0 20px rgba(192, 192, 192, 0.6))',
                                    }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextElementSibling.style.display = 'flex';
                                    }}
                                />
                                {/* Fallback Logo */}
                                <div className="hidden h-12 w-12 rounded-2xl bg-gradient-to-br from-white to-gray-400 items-center justify-center relative z-10">
                                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                        <circle cx="16" cy="16" r="12" stroke="#000000" strokeWidth="2" />
                                        <circle cx="16" cy="16" r="6" fill="#000000" />
                                    </svg>
                                </div>
                            </div>
                            <span
                                className="text-2xl font-bold tracking-tight"
                                style={{
                                    fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
                                    background: 'linear-gradient(135deg, #FFFFFF 0%, #C0C0C0 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                StudyGloqe
                            </span>
                        </Link>

                        {/* Auth Buttons */}
                        <div className="flex items-center gap-4">
                            <Link
                                to="/login"
                                className="px-6 py-2.5 rounded-xl font-semibold text-white/90 hover:text-white hover:bg-white/5 transition-colors"
                                style={{
                                    fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
                                }}
                            >
                                Sign In
                            </Link>
                            <Link
                                to="/register"
                                className="px-6 py-2.5 rounded-xl font-semibold text-black hover:opacity-90 transition-opacity shadow-lg shadow-white/20"
                                style={{
                                    background: 'linear-gradient(135deg, #FFFFFF 0%, #C0C0C0 100%)',
                                    fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
                                }}
                            >
                                Get Started
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section with Static Robot */}
            <section className="relative min-h-screen flex items-center pt-20">
                <div className="container mx-auto px-6 py-16">
                    <div className="grid lg:grid-cols-2 gap-24 items-center">
                        {/* Left Content - No animations */}
                        <div className="space-y-10 z-10">
                            {/* Badge */}
                            <div
                                className="inline-flex items-center gap-3 px-7 py-3.5 rounded-full backdrop-blur-xl bg-white/5 border border-white/10"
                                style={{
                                    boxShadow: '0 0 30px rgba(192, 192, 192, 0.1)',
                                }}
                            >
                                <Sparkles size={19} className="text-white" />
                                <span
                                    className="text-sm font-semibold tracking-wide text-white/90"
                                    style={{
                                        fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
                                    }}
                                >
                                    Premium AI-Powered Platform
                                </span>
                            </div>

                            {/* Main Heading */}
                            <div className="space-y-6">
                                <h1
                                    className="text-6xl font-black tracking-tight leading-tight"
                                    style={{
                                        fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
                                        background: 'linear-gradient(135deg, #FFFFFF 0%, #C0C0C0 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                    }}
                                >
                                    Master Any Subject with AI-Powered Learning
                                </h1>
                                <p className="text-xl text-white/70 max-w-xl leading-relaxed">
                                    Transform your PDFs into interactive study materials. Get instant quizzes, detailed explanations, and personalized learning paths powered by advanced AI.
                                </p>
                            </div>

                            {/* CTA Buttons */}
                            <div className="flex flex-wrap gap-4 pt-6">
                                <Link
                                    to="/register"
                                    className="px-8 py-4 rounded-xl font-semibold text-black hover:opacity-90 transition-opacity shadow-lg shadow-white/20 flex items-center gap-2"
                                    style={{
                                        background: 'linear-gradient(135deg, #FFFFFF 0%, #C0C0C0 100%)',
                                        fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
                                    }}
                                >
                                    Start Learning Free
                                    <ArrowRight size={20} />
                                </Link>
                                <Link
                                    to="/demo"
                                    className="px-8 py-4 rounded-xl font-semibold text-white border border-white/20 hover:bg-white/5 transition-colors"
                                    style={{
                                        fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
                                    }}
                                >
                                    Watch Demo
                                </Link>
                            </div>
                        </div>

                        {/* Right Side - Static Robot */}
                        <div className="hidden lg:flex items-center justify-center">
                            <StaticRobot />
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section - Static */}
            <section className="relative py-24">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2
                            className="text-5xl font-black mb-4"
                            style={{
                                fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
                                background: 'linear-gradient(135deg, #FFFFFF 0%, #C0C0C0 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}
                        >
                            Powerful Features
                        </h2>
                        <p className="text-white/60 text-xl">Everything you need to ace your exams</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, index) => {
                            const IconComponent = feature.icon;
                            return (
                                <div
                                    key={index}
                                    className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 mb-4">
                                        <IconComponent size={24} className="text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                                    <p className="text-white/60">{feature.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
