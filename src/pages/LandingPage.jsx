import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Spline from '@splinetool/react-spline';
import {
    ArrowRight,
    Sparkles,
    Brain,
    Trophy,
    Users,
    Zap,
    BookOpen,
    Target
} from 'lucide-react';

const LandingPage = () => {
    const features = [
        {
            icon: Brain,
            title: 'AI-Powered Learning',
            description: 'Advanced AI analyzes your PDFs and creates personalized quizzes and study plans'
        },
        {
            icon: Sparkles,
            title: 'Smart Summaries',
            description: 'Get instant summaries, notes, and flow charts from any document'
        },
        {
            icon: Trophy,
            title: 'Gamification',
            description: 'Earn XP, unlock badges, and compete on leaderboards'
        },
        {
            icon: Users,
            title: 'Study Rooms',
            description: 'Collaborate with peers in real-time video study sessions'
        },
        {
            icon: Target,
            title: 'Adaptive Quizzes',
            description: 'AI orchestrator selects perfect activities based on your mastery'
        },
        {
            icon: Zap,
            title: 'Instant Feedback',
            description: 'Get immediate results and detailed explanations'
        }
    ];

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0 -z-10">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950"></div>
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-slow"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse-slow delay-1000"></div>
            </div>

            {/* Navigation */}
            <nav className="glass border-b border-white/10">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <img
                                src="/src/assets/logo/logo.svg"
                                alt="StudyGloqe"
                                className="h-8 w-8"
                            />
                            <span className="text-xl font-display font-bold gradient-text">
                                StudyGloqe
                            </span>
                        </div>
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

            {/* Hero Section */}
            <section className="relative min-h-[90vh] flex items-center">
                <div className="container mx-auto px-4">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left Content */}
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                            className="space-y-8"
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-accent/30">
                                <Sparkles size={16} className="text-accent" />
                                <span className="text-sm">AI-Powered Study Platform</span>
                            </div>

                            <h1 className="text-5xl lg:text-7xl font-display font-bold leading-tight">
                                Study Smarter,
                                <br />
                                <span className="gradient-text">Not Harder</span>
                            </h1>

                            <p className="text-xl text-primary-300 max-w-xl">
                                Transform any PDF into interactive quizzes, flashcards, and personalized learning paths.
                                Powered by cutting-edge AI technology.
                            </p>

                            <div className="flex flex-wrap gap-4">
                                <Link
                                    to="/register"
                                    className="btn-primary flex items-center gap-2 text-lg px-8 py-4"
                                >
                                    Start Learning Free
                                    <ArrowRight size={20} />
                                </Link>
                                <button className="btn-secondary text-lg px-8 py-4">
                                    Watch Demo
                                </button>
                            </div>

                            {/* Stats */}
                            <div className="flex gap-8 pt-8">
                                <div>
                                    <div className="text-3xl font-bold gradient-text">10K+</div>
                                    <div className="text-sm text-primary-400">Active Students</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold gradient-text">500K+</div>
                                    <div className="text-sm text-primary-400">Quizzes Generated</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold gradient-text">95%</div>
                                    <div className="text-sm text-primary-400">Success Rate</div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Right Content - Spline 3D */}
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="relative h-[600px] rounded-2xl overflow-hidden"
                        >
                            {/* Fallback gradient if Spline not loaded */}
                            <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-blue-600/20 rounded-2xl animate-float"></div>

                            {/* Uncomment when you have Spline scene URL */}
                            {/* <Spline scene="YOUR_SPLINE_SCENE_URL" /> */}

                            {/* Placeholder */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <BookOpen size={120} className="text-accent/30 animate-float" />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 relative">
                <div className="container mx-auto px-4">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl lg:text-5xl font-display font-bold mb-4">
                            Everything You Need to <span className="gradient-text">Excel</span>
                        </h2>
                        <p className="text-xl text-primary-300 max-w-2xl mx-auto">
                            Comprehensive tools designed to maximize your learning potential
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                className="card-hover group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-accent to-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <feature.icon size={24} />
                                </div>
                                <h3 className="text-xl font-display font-semibold mb-2">
                                    {feature.title}
                                </h3>
                                <p className="text-primary-300">
                                    {feature.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 relative">
                <div className="container mx-auto px-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="card text-center max-w-4xl mx-auto bg-gradient-to-br from-accent/20 to-blue-600/20 border-accent/30"
                    >
                        <h2 className="text-4xl lg:text-5xl font-display font-bold mb-4">
                            Ready to Transform Your Learning?
                        </h2>
                        <p className="text-xl text-primary-300 mb-8 max-w-2xl mx-auto">
                            Join thousands of students who are already studying smarter with StudyGloqe
                        </p>
                        <Link
                            to="/register"
                            className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4"
                        >
                            Start Your Free Trial
                            <ArrowRight size={20} />
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/10 py-8">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <img
                                src="/src/assets/logo/logo.svg"
                                alt="StudyGloqe"
                                className="h-6 w-6"
                            />
                            <span className="font-display font-bold">StudyGloqe</span>
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