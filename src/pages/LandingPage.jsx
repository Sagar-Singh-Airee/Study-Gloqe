import { Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { 
    ArrowRight, Sparkles, Zap, Shield, Award, 
    Upload, Brain, Users, Trophy, MessageSquare, 
    BarChart3, Lock, Clock, BookOpen, Target,
    Lightbulb, Gift, GraduationCap, Mic, Check, X, Flame
} from 'lucide-react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import mascotImage from '@/assets/Landing/mascot.png';
import logoImage from '@/assets/logo/logo.svg';

const LandingPage = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState('monthly');
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const textBehindRef = useRef(null);
    const mascotRef = useRef(null);
    const heroRef = useRef(null);
    const rafId = useRef(null);

    useEffect(() => {
        AOS.init({
            duration: 800,
            easing: 'ease-out-cubic',
            once: true,
            offset: 50,
        });

        // Smooth scroll handler with requestAnimationFrame
        const handleScroll = () => {
            if (rafId.current) {
                cancelAnimationFrame(rafId.current);
            }

            rafId.current = requestAnimationFrame(() => {
                const scrolled = window.pageYOffset;
                setIsScrolled(scrolled > 30);

                // Optimized parallax with smooth transforms
                if (textBehindRef.current && heroRef.current) {
                    const heroHeight = heroRef.current.offsetHeight;
                    const scrollProgress = Math.min(scrolled / heroHeight, 1);
                    
                    const textYPos = scrolled * 0.25;
                    const textOpacity = Math.max(0, 1 - scrollProgress * 1.2);
                    
                    textBehindRef.current.style.transform = `translate(-50%, -50%) translate3d(0, ${textYPos}px, 0)`;
                    textBehindRef.current.style.opacity = textOpacity;
                }

                // Smooth mascot parallax
                if (mascotRef.current) {
                    const mascotYPos = scrolled * 0.1;
                    const scale = Math.max(0.95, 1 - (scrolled * 0.0002));
                    
                    mascotRef.current.style.transform = `translate3d(0, ${mascotYPos}px, 0) scale(${scale})`;
                }
            });
        };

        // Throttled mouse move
        let mouseTimer;
        const handleMouseMove = (e) => {
            if (mouseTimer) return;
            
            mouseTimer = setTimeout(() => {
                const x = (e.clientX / window.innerWidth) * 2 - 1;
                const y = (e.clientY / window.innerHeight) * 2 - 1;
                setMousePosition({ x, y });
                mouseTimer = null;
            }, 16); // ~60fps
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('mousemove', handleMouseMove, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('mousemove', handleMouseMove);
            if (rafId.current) {
                cancelAnimationFrame(rafId.current);
            }
        };
    }, []);

    const pricingPlans = [
        {
            name: 'Student Free',
            price: '₹0',
            period: '/forever',
            description: 'Perfect for individual learners',
            features: [
                { text: '5 PDF uploads per month', included: true },
                { text: '10 AI-generated quizzes', included: true },
                { text: 'Basic flashcards', included: true },
                { text: 'XP & achievements', included: true },
                { text: 'Class leaderboards', included: true },
                { text: 'Voice assistant (limited)', included: false },
                { text: 'Study rooms', included: false },
                { text: 'Advanced analytics', included: false }
            ],
            highlighted: false
        },
        {
            name: 'Student Pro',
            price: selectedPlan === 'monthly' ? '₹299' : '₹2,999',
            period: selectedPlan === 'monthly' ? '/month' : '/year',
            description: 'For serious learners',
            features: [
                { text: 'Unlimited PDF uploads', included: true },
                { text: 'Unlimited AI quizzes', included: true },
                { text: 'Advanced flashcards with SRS', included: true },
                { text: 'Full gamification suite', included: true },
                { text: 'Global leaderboards', included: true },
                { text: 'Voice assistant (unlimited)', included: true },
                { text: 'Study rooms (video/audio)', included: true },
                { text: 'Premium analytics dashboard', included: true }
            ],
            highlighted: true,
            badge: 'Most Popular'
        },
        {
            name: 'Teacher',
            price: selectedPlan === 'monthly' ? '₹999' : '₹9,999',
            period: selectedPlan === 'monthly' ? '/month' : '/year',
            description: 'Complete teaching solution',
            features: [
                { text: 'Everything in Student Pro', included: true },
                { text: 'Unlimited students per class', included: true },
                { text: 'Create & assign custom quizzes', included: true },
                { text: 'Monthly reward automation', included: true },
                { text: 'Advanced class analytics', included: true },
                { text: 'Export detailed reports', included: true },
                { text: 'Priority support', included: true },
                { text: 'Bulk operations', included: true }
            ],
            highlighted: false
        },
        {
            name: 'School/Institution',
            price: 'Custom',
            period: '/year',
            description: 'For schools & coaching centers',
            features: [
                { text: 'Everything in Teacher plan', included: true },
                { text: 'Unlimited teachers & students', included: true },
                { text: 'White-label branding', included: true },
                { text: 'Custom integrations', included: true },
                { text: 'Dedicated account manager', included: true },
                { text: 'Custom analytics & reports', included: true },
                { text: 'SLA guarantee', included: true },
                { text: 'Training & onboarding', included: true }
            ],
            highlighted: false
        }
    ];

    const coreFeatures = [
        {
            icon: Upload,
            title: 'Smart PDF Processing',
            description: 'Upload PDFs and let AI extract text, images, tables, and auto-detect subjects'
        },
        {
            icon: Brain,
            title: 'AI Quiz Generator',
            description: 'Auto-generate MCQs, flashcards, and detailed explanations from any document'
        },
        {
            icon: Lightbulb,
            title: 'Personalized Learning',
            description: 'Adaptive learning paths powered by AI that adjust to your mastery level'
        },
        {
            icon: BarChart3,
            title: 'Real-Time Analytics',
            description: 'Track progress with detailed insights and performance metrics'
        }
    ];

    const teacherFeatures = [
        {
            icon: GraduationCap,
            title: 'Create & Assign',
            description: 'Build custom quizzes and assign to students or classes',
        },
        {
            icon: Gift,
            title: 'Monthly Rewards',
            description: 'Set up automated rewards for top-performing students',
        },
        {
            icon: BarChart3,
            title: 'Class Analytics',
            description: 'Monitor student progress with comprehensive dashboards',
        },
        {
            icon: Target,
            title: 'Custom Assessments',
            description: 'Design assessments tailored to your curriculum',
        }
    ];

    const gamificationFeatures = [
        {
            icon: Trophy,
            title: 'XP & Levels',
            description: 'Earn experience points and level up as you learn',
        },
        {
            icon: Award,
            title: 'Badges & Achievements',
            description: 'Unlock special badges for milestones and streaks',
        },
        {
            icon: BarChart3,
            title: 'Leaderboards',
            description: 'Compete with classmates on global and class leaderboards',
        },
        {
            icon: Zap,
            title: 'Seasonal Competitions',
            description: 'Participate in monthly challenges with exclusive prizes',
        }
    ];

    const collaborationTools = [
        {
            icon: Users,
            title: 'Study Rooms',
            description: 'Collaborate in real-time with video, audio, and shared notes',
        },
        {
            icon: MessageSquare,
            title: 'Live Chat',
            description: 'Discuss topics and share insights with peers',
        },
        {
            icon: Clock,
            title: 'Shared Timers',
            description: 'Pomodoro-style timers synced across your study group',
        },
        {
            icon: Mic,
            title: 'Voice Assistant',
            description: 'Read questions aloud and answer with voice commands',
        }
    ];

    const securityFeatures = [
        {
            icon: Lock,
            title: 'Enterprise Security',
            description: 'Bank-grade encryption for all your data',
        },
        {
            icon: Shield,
            title: 'Privacy First',
            description: 'GDPR & COPPA compliant with full data control',
        },
        {
            icon: BookOpen,
            title: 'Audit Logs',
            description: 'Complete transparency with detailed activity logs',
        }
    ];

    return (
        <div className="min-h-screen relative overflow-x-hidden bg-black font-sans antialiased selection:bg-white/10">

            {/* Enhanced gradient background */}
            <div className="fixed inset-0 z-0 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 pointer-events-none" />

            {/* Dynamic Gradient Orbs */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div 
                    className="absolute top-1/4 -left-32 w-96 h-96 bg-gradient-to-r from-white/[0.03] to-transparent rounded-full blur-3xl transition-transform duration-700 ease-out"
                    style={{
                        transform: `translate(${mousePosition.x * 40}px, ${mousePosition.y * 40}px)`,
                        willChange: 'transform'
                    }}
                />
                <div 
                    className="absolute bottom-1/4 -right-32 w-80 h-80 bg-gradient-to-l from-white/[0.02] to-transparent rounded-full blur-3xl transition-transform duration-700 ease-out"
                    style={{
                        transform: `translate(${mousePosition.x * -30}px, ${mousePosition.y * -30}px)`,
                        willChange: 'transform'
                    }}
                />
            </div>

            {/* Premium Navigation */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                isScrolled 
                    ? 'backdrop-blur-2xl bg-black/70 border-b border-white/10 shadow-2xl' 
                    : 'bg-transparent'
            }`}>
                <div className="container mx-auto px-8">
                    <div className="flex items-center justify-between h-20">
                        <Link to="/" className="flex items-center gap-3 group relative">
                            <div className="absolute -inset-2 bg-gradient-to-r from-white/10 to-transparent rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <img
                                src={logoImage}
                                alt="StudyGloqe"
                                className="relative h-10 w-10 transition-transform duration-300 group-hover:scale-110"
                            />
                            <span className="relative text-xl font-black tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                                StudyGloqe
                            </span>
                        </Link>

                        <div className="hidden md:flex items-center gap-8">
                            {['Features', 'Teachers', 'Pricing'].map((item) => (
                                <a 
                                    key={item}
                                    href={`#${item.toLowerCase()}`}
                                    className="relative text-sm font-semibold text-gray-400 hover:text-white transition-colors group"
                                >
                                    {item}
                                    <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-gradient-to-r from-white to-gray-500 group-hover:w-full transition-all duration-300" />
                                </a>
                            ))}
                        </div>

                        <div className="flex items-center gap-3">
                            <Link
                                to="/auth"
                                className="group relative px-5 py-2 rounded-lg text-sm font-medium text-white/80 hover:text-white transition-all duration-300 overflow-hidden"
                            >
                                <span className="relative z-10">Sign In</span>
                                <span className="absolute inset-0 rounded-lg border border-transparent group-hover:border-white/20 transition-all duration-300">
                                    <span className="absolute inset-0 rounded-lg border-2 border-white/0 group-hover:border-white/40 animate-border-draw" />
                                </span>
                            </Link>
                            <Link
                                to="/auth"
                                className="group relative px-5 py-2 bg-white text-black rounded-lg text-sm font-semibold transition-all duration-300 hover:scale-105 overflow-hidden"
                            >
                                <span className="relative z-10">Get Started</span>
                                <span className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <span className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gray-400 to-transparent animate-line-x" />
                                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gray-400 to-transparent animate-line-x-reverse" />
                                </span>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Enhanced Hero Section */}
            <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-20 pb-16 z-10 overflow-hidden">
                <div className="container mx-auto px-8">
                    <div className="flex flex-col items-center text-center">

                        {/* Top Badge */}
                        <div
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-xl bg-white/5 border border-white/10 mb-8"
                            data-aos="fade-down"
                            data-aos-delay="100"
                        >
                            <Sparkles size={16} className="text-white" />
                            <span className="text-sm font-bold tracking-widest text-white uppercase">
                                Introducing
                            </span>
                        </div>

                        {/* MINIMALIST Background Text - Bigger, Clearer, Dull */}
                        <div 
                            ref={textBehindRef}
                            className="absolute top-1/2 left-1/2 w-[98vw] max-w-[1800px] text-center pointer-events-none select-none z-0"
                            style={{
                                transform: 'translate(-50%, -50%)',
                                willChange: 'transform, opacity'
                            }}
                        >
                            <h1 
                                className="text-[18vw] sm:text-[16vw] md:text-[15vw] lg:text-[14vw] xl:text-[13vw] leading-[0.9] font-black tracking-tighter"
                                style={{
                                    background: 'linear-gradient(180deg, rgba(140,140,140,0.35) 0%, rgba(120,120,120,0.28) 35%, rgba(100,100,100,0.22) 70%, rgba(80,80,80,0.18) 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    fontFamily: 'system-ui, -apple-system, sans-serif',
                                    letterSpacing: '-0.055em',
                                    textAlign: 'center'
                                }}
                            >
                                LET'S BUILD
                                <br />
                                CULTURE
                            </h1>
                        </div>

                        {/* Mascot Container */}
                        <div className="relative z-10 w-full max-w-md mx-auto px-6 mb-8">
                            <div 
                                ref={mascotRef} 
                                className="relative"
                                style={{ willChange: 'transform' }}
                            >
                                {/* Glow Effects */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-gradient-radial from-white/15 via-white/5 to-transparent blur-3xl animate-pulse" 
                                     style={{ animationDuration: '5s' }} />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[100%] bg-white/8 blur-2xl" />

                                {/* Mascot Image */}
                                <img
                                    src={mascotImage}
                                    alt="StudyGloqe AI Robot"
                                    className="relative w-full h-auto mx-auto"
                                    style={{
                                        filter: 'drop-shadow(0 25px 50px rgba(255, 255, 255, 0.2))',
                                        animation: 'gentle-float 8s ease-in-out infinite'
                                    }}
                                />

                                {/* Floating Elements */}
                                <div 
                                    className="absolute top-[15%] -left-4 md:-left-8 p-3 rounded-xl bg-black/60 backdrop-blur-2xl border border-white/10 shadow-2xl transition-transform duration-300 ease-out"
                                    style={{
                                        transform: `translate(${mousePosition.x * 8}px, ${mousePosition.y * 8}px)`,
                                        willChange: 'transform'
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                        <div>
                                            <div className="text-sm font-semibold text-white whitespace-nowrap">AI Ready</div>
                                            <div className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">Physics Detected</div>
                                        </div>
                                    </div>
                                </div>

                                <div 
                                    className="absolute bottom-[18%] -right-4 md:-right-8 p-3 rounded-xl bg-black/60 backdrop-blur-2xl border border-white/10 shadow-2xl transition-transform duration-300 ease-out"
                                    style={{
                                        transform: `translate(${mousePosition.x * -6}px, ${mousePosition.y * -6}px)`,
                                        willChange: 'transform'
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center">
                                            <Brain size={16} className="text-white" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white whitespace-nowrap">Quiz Ready</div>
                                            <div className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">15 questions</div>
                                        </div>
                                    </div>
                                </div>

                                <div 
                                    className="absolute top-[45%] -right-3 md:-right-6 p-2 rounded-lg bg-black/60 backdrop-blur-2xl border border-white/10 shadow-2xl transition-transform duration-300 ease-out"
                                    style={{
                                        transform: `translateY(${mousePosition.y * 4}px)`,
                                        willChange: 'transform'
                                    }}
                                >
                                    <div className="flex items-center gap-1">
                                        <Flame size={14} className="text-orange-400" />
                                        <span className="text-sm font-bold text-white whitespace-nowrap">+250 XP</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Description */}
                        <div 
                            className="relative z-20 space-y-4 max-w-2xl mx-auto mb-10 px-4"
                            data-aos="fade-up"
                            data-aos-delay="400"
                        >
                            <p className="text-lg text-gray-300 leading-relaxed font-medium text-center">
                                Where AI meets empathy. We're building more than smart machines - 
                                we're creating meaningful learning connections that transform education.
                            </p>
                        </div>

                        {/* Enhanced CTA Button */}
                        <div
                            className="relative z-20"
                            data-aos="fade-up"
                            data-aos-delay="500"
                        >
                            <Link
                                to="/auth"
                                className="group relative inline-flex items-center justify-center gap-2.5 px-9 py-4 bg-white text-black rounded-xl text-lg font-bold transition-all duration-300 hover:scale-105 overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center gap-2.5 whitespace-nowrap">
                                    Start Learning Free
                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform duration-300" />
                                </span>

                                <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <span className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gray-400 to-transparent animate-line-x" />
                                    <span className="absolute bottom-0 right-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gray-400 to-transparent animate-line-x-reverse" />
                                    <span className="absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-transparent via-gray-400 to-transparent animate-line-y" />
                                    <span className="absolute top-0 right-0 w-[2px] h-full bg-gradient-to-b from-transparent via-gray-400 to-transparent animate-line-y-reverse" />
                                </span>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Core Features Section */}
            <section id="features" className="relative py-20 z-10">
                <div className="container mx-auto px-8">
                    <div className="text-center mb-16" data-aos="fade-up">
                        <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent px-4">
                            Core Features
                        </h2>
                        <p className="text-lg text-gray-400 max-w-2xl mx-auto px-4">
                            Everything you need for modern education
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                        {coreFeatures.map((feature, index) => (
                            <div
                                key={index}
                                className="group relative p-6 rounded-2xl backdrop-blur-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300"
                                data-aos="fade-up"
                                data-aos-delay={index * 50}
                            >
                                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 mb-5 group-hover:bg-white/10 transition-colors duration-300">
                                    <feature.icon size={24} className="text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">
                                    {feature.title}
                                </h3>
                                <p className="text-base text-gray-400 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="relative py-20 z-10">
                <div className="container mx-auto px-8">
                    <div className="text-center mb-16" data-aos="fade-up">
                        <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent px-4">
                            Simple Pricing
                        </h2>
                        <p className="text-lg text-gray-400 mb-8 px-4">
                            Choose the plan that fits your needs
                        </p>

                        <div className="inline-flex items-center gap-2 p-1 rounded-lg backdrop-blur-xl bg-white/5 border border-white/10">
                            <button
                                onClick={() => setSelectedPlan('monthly')}
                                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                                    selectedPlan === 'monthly'
                                        ? 'bg-white text-black'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setSelectedPlan('yearly')}
                                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 relative ${
                                    selectedPlan === 'yearly'
                                        ? 'bg-white text-black'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                Yearly
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                            </button>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
                        {pricingPlans.map((plan, index) => (
                            <div
                                key={index}
                                className={`relative p-6 rounded-2xl backdrop-blur-xl border transition-all duration-300 ${
                                    plan.highlighted
                                        ? 'bg-white/[0.05] border-white/20 scale-[1.02]'
                                        : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                                }`}
                                data-aos="fade-up"
                                data-aos-delay={index * 50}
                            >
                                {plan.badge && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white text-black text-xs font-bold z-10 whitespace-nowrap">
                                        {plan.badge}
                                    </div>
                                )}

                                <div className="text-center mb-6">
                                    <h3 className="text-base font-bold text-white mb-2">
                                        {plan.name}
                                    </h3>
                                    <div className="flex items-baseline justify-center mb-1">
                                        <span className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                                            {plan.price}
                                        </span>
                                        <span className="text-gray-500 text-xs ml-1 whitespace-nowrap">{plan.period}</span>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        {plan.description}
                                    </p>
                                </div>

                                <ul className="space-y-2 mb-6">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            {feature.included ? (
                                                <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                                            ) : (
                                                <X size={14} className="text-white/20 mt-0.5 flex-shrink-0" />
                                            )}
                                            <span className={`text-xs ${feature.included ? 'text-gray-300' : 'text-gray-600'}`}>
                                                {feature.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                <Link
                                    to="/auth"
                                    className={`group/btn relative block w-full py-2.5 rounded-lg text-sm font-semibold text-center transition-all duration-300 overflow-hidden ${
                                        plan.highlighted
                                            ? 'bg-white text-black'
                                            : 'border border-white/20 text-white hover:bg-white/5'
                                    }`}
                                >
                                    <span className="relative z-10 whitespace-nowrap">
                                        {plan.price === 'Custom' ? 'Contact Sales' : 'Get Started'}
                                    </span>
                                    
                                    <span className="absolute inset-0 rounded-lg opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300">
                                        <span className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-line-x" />
                                        <span className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-line-x-reverse" />
                                    </span>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Teacher Section */}
            <section id="teachers" className="relative py-20 z-10">
                <div className="container mx-auto px-8">
                    <div className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
                        <div data-aos="fade-right">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl bg-white/5 border border-white/10 mb-6">
                                <GraduationCap size={16} className="text-white" />
                                <span className="text-sm font-semibold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent whitespace-nowrap">
                                    For Educators
                                </span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                                Teaching Suite
                            </h2>
                            <p className="text-lg text-gray-400 mb-6 leading-relaxed">
                                Create custom quizzes, assign to classes, track student progress, and reward top performers 
                                with comprehensive educator tools.
                            </p>
                            <Link
                                to="/teachers"
                                className="group relative inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-base text-black bg-white transition-all duration-300 hover:scale-105 overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center gap-2 whitespace-nowrap">
                                    Explore Tools
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </span>
                                
                                <span className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <span className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gray-400 to-transparent animate-line-x" />
                                    <span className="absolute bottom-0 right-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gray-400 to-transparent animate-line-x-reverse" />
                                </span>
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 gap-4" data-aos="fade-left">
                            {teacherFeatures.map((feature, index) => (
                                <div
                                    key={index}
                                    className="relative p-5 rounded-xl backdrop-blur-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300"
                                    data-aos="fade-up"
                                    data-aos-delay={index * 50}
                                >
                                    <feature.icon size={22} className="text-white mb-4" />
                                    <h4 className="text-base font-semibold text-white mb-1.5">
                                        {feature.title}
                                    </h4>
                                    <p className="text-sm text-gray-500">
                                        {feature.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Gamification Section */}
            <section className="relative py-20 z-10">
                <div className="container mx-auto px-8">
                    <div 
                        className="relative p-12 rounded-3xl backdrop-blur-xl bg-white/[0.02] border border-white/5 max-w-5xl mx-auto"
                        data-aos="fade-up"
                    >
                        <div className="text-center mb-12">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl bg-white/5 border border-white/10 mb-6">
                                <Trophy size={16} className="text-white" />
                                <span className="text-sm font-semibold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent whitespace-nowrap">
                                    Gamification
                                </span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent px-4">
                                Learn & Compete
                            </h2>
                            <p className="text-lg text-gray-400 px-4">
                                Earn XP, unlock achievements, and climb leaderboards
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {gamificationFeatures.map((feature, index) => (
                                <div
                                    key={index}
                                    className="p-5 rounded-xl backdrop-blur-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 text-center"
                                    data-aos="zoom-in"
                                    data-aos-delay={index * 50}
                                >
                                    <feature.icon size={22} className="text-white mb-4 mx-auto" />
                                    <h4 className="text-base font-semibold text-white mb-1.5">
                                        {feature.title}
                                    </h4>
                                    <p className="text-sm text-gray-500">
                                        {feature.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Collaboration Section */}
            <section className="relative py-20 z-10">
                <div className="container mx-auto px-8">
                    <div className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
                        <div className="grid grid-cols-2 gap-4" data-aos="fade-right">
                            {collaborationTools.map((tool, index) => (
                                <div
                                    key={index}
                                    className="p-5 rounded-xl backdrop-blur-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300"
                                    data-aos="fade-up"
                                    data-aos-delay={index * 50}
                                >
                                    <tool.icon size={22} className="text-white mb-4" />
                                    <h4 className="text-base font-semibold text-white mb-1.5">
                                        {tool.title}
                                    </h4>
                                    <p className="text-sm text-gray-500">
                                        {tool.description}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div data-aos="fade-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl bg-white/5 border border-white/10 mb-6">
                                <Users size={16} className="text-white" />
                                <span className="text-sm font-semibold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent whitespace-nowrap">
                                    Collaboration
                                </span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                                Learn Together
                            </h2>
                            <p className="text-lg text-gray-400 mb-6 leading-relaxed">
                                Join study rooms with video/audio, share notes in real-time, sync timers with your group, 
                                and use voice commands.
                            </p>
                            <Link
                                to="/study-rooms"
                                className="group relative inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-base text-white border border-white/20 hover:bg-white/5 transition-all duration-300 overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center gap-2 whitespace-nowrap">
                                    Explore Rooms
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </span>

                                <span className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <span className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-line-x" />
                                    <span className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-line-x-reverse" />
                                </span>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Security Section */}
            <section className="relative py-20 z-10">
                <div className="container mx-auto px-8">
                    <div className="text-center mb-16" data-aos="fade-up">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl bg-white/5 border border-white/10 mb-6">
                            <Lock size={16} className="text-white" />
                            <span className="text-sm font-semibold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent whitespace-nowrap">
                                Security
                            </span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent px-4">
                            Your Data, Protected
                        </h2>
                        <p className="text-lg text-gray-400 px-4">
                            Enterprise-grade security with full compliance
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        {securityFeatures.map((feature, index) => (
                            <div
                                key={index}
                                className="p-6 rounded-2xl backdrop-blur-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 text-center"
                                data-aos="fade-up"
                                data-aos-delay={index * 50}
                            >
                                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 mb-4 mx-auto">
                                    <feature.icon size={24} className="text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">
                                    {feature.title}
                                </h3>
                                <p className="text-base text-gray-500">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative py-20 z-10">
                <div className="container mx-auto px-8">
                    <div 
                        className="relative p-12 rounded-3xl backdrop-blur-xl bg-white/[0.02] border border-white/5 text-center max-w-3xl mx-auto"
                        data-aos="fade-up"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent px-4">
                            Ready to Get Started?
                        </h2>
                        <p className="text-lg text-gray-400 mb-8 px-4">
                            Join thousands transforming their learning experience
                        </p>
                        <Link
                            to="/auth"
                            className="group relative inline-flex items-center gap-2 px-8 py-3.5 bg-white text-black rounded-xl text-lg font-bold transition-all duration-300 hover:scale-105 overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center gap-2 whitespace-nowrap">
                                Start Free Today
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </span>

                            <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <span className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gray-400 to-transparent animate-line-x" />
                                <span className="absolute bottom-0 right-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gray-400 to-transparent animate-line-x-reverse" />
                                <span className="absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-transparent via-gray-400 to-transparent animate-line-y" />
                                <span className="absolute top-0 right-0 w-[2px] h-full bg-gradient-to-b from-transparent via-gray-400 to-transparent animate-line-y-reverse" />
                            </span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative py-16 z-10 border-t border-white/5">
                <div className="container mx-auto px-8">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <img src={logoImage} alt="StudyGloqe" className="h-7 w-7" />
                                <span className="text-base font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent whitespace-nowrap">
                                    StudyGloqe
                                </span>
                            </div>
                            <p className="text-sm text-gray-600">
                                AI-powered learning platform
                            </p>
                        </div>

                        {[
                            { title: 'Product', links: ['Features', 'Pricing', 'Updates'] },
                            { title: 'Company', links: ['About', 'Blog', 'Careers'] },
                            { title: 'Legal', links: ['Privacy', 'Terms', 'Security'] }
                        ].map((section, index) => (
                            <div key={index}>
                                <h4 className="text-base font-semibold text-white mb-4">
                                    {section.title}
                                </h4>
                                <ul className="space-y-2">
                                    {section.links.map((link) => (
                                        <li key={link}>
                                            <Link 
                                                to={`/${link.toLowerCase()}`} 
                                                className="text-sm text-gray-500 hover:text-white transition-colors"
                                            >
                                                {link}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="pt-8 border-t border-white/5 text-center text-sm text-gray-600">
                        © 2025 StudyGloqe. All rights reserved.
                    </div>
                </div>
            </footer>

            {/* Optimized Animations CSS */}
            <style>{`
                @keyframes gentle-float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    33% { transform: translateY(-10px) rotate(0.5deg); }
                    66% { transform: translateY(5px) rotate(-0.5deg); }
                }

                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes line-x {
                    0% { transform: translateX(-100%); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateX(100%); opacity: 0; }
                }

                @keyframes line-x-reverse {
                    0% { transform: translateX(100%); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateX(-100%); opacity: 0; }
                }

                @keyframes line-y {
                    0% { transform: translateY(-100%); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(100%); opacity: 0; }
                }

                @keyframes line-y-reverse {
                    0% { transform: translateY(100%); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(-100%); opacity: 0; }
                }

                @keyframes border-draw {
                    0% { clip-path: inset(0 100% 100% 0); }
                    25% { clip-path: inset(0 0 100% 0); }
                    50% { clip-path: inset(0 0 0 0); }
                    75% { clip-path: inset(0 0 0 100%); }
                    100% { clip-path: inset(100% 0 0 100%); }
                }

                .animate-line-x {
                    animation: line-x 2s ease-in-out infinite;
                }

                .animate-line-x-reverse {
                    animation: line-x-reverse 2s ease-in-out infinite;
                    animation-delay: 1s;
                }

                .animate-line-y {
                    animation: line-y 2s ease-in-out infinite;
                    animation-delay: 0.5s;
                }

                .animate-line-y-reverse {
                    animation: line-y-reverse 2s ease-in-out infinite;
                    animation-delay: 1.5s;
                }

                .animate-border-draw {
                    animation: border-draw 3s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default LandingPage;
