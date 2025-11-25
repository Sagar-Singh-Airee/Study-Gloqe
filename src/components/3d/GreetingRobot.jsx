import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const GreetingRobot = () => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isWaving, setIsWaving] = useState(true);

    useEffect(() => {
        const handleMouseMove = (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 20;
            const y = (e.clientY / window.innerHeight - 0.5) * 20;
            setMousePosition({ x, y });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        const waveInterval = setInterval(() => {
            setIsWaving(true);
            setTimeout(() => setIsWaving(false), 2000);
        }, 5000);

        return () => clearInterval(waveInterval);
    }, []);

    return (
        <div className="relative w-full h-full flex items-center justify-center" style={{ perspective: '1000px' }}>
            {/* Floating Particles */}
            <div className="absolute inset-0">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-accent rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                            y: [0, -30, 0],
                            opacity: [0.2, 0.8, 0.2],
                        }}
                        transition={{
                            duration: 3 + Math.random() * 2,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                        }}
                    />
                ))}
            </div>

            {/* Robot Container */}
            <motion.div
                className="relative"
                animate={{
                    rotateY: mousePosition.x * 0.5,
                    rotateX: -mousePosition.y * 0.5,
                }}
                transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* Robot Body */}
                <motion.div
                    className="relative"
                    animate={{
                        y: [0, -10, 0],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                >
                    {/* Head */}
                    <motion.div
                        className="relative w-48 h-48 mx-auto mb-4"
                        animate={{
                            rotate: [0, 5, -5, 0],
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    >
                        {/* Head Glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-accent-dark/30 rounded-3xl blur-2xl animate-pulse-slow"></div>
                        
                        {/* Head Main */}
                        <div className="relative w-full h-full bg-gradient-to-br from-accent/20 to-accent-dark/20 rounded-3xl border-2 border-accent/30 backdrop-blur-xl overflow-hidden">
                            {/* Shine Effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent"></div>
                            
                            {/* Antenna */}
                            <motion.div
                                className="absolute -top-8 left-1/2 -translate-x-1/2 w-2 h-8 bg-gradient-to-t from-accent to-accent-light rounded-full"
                                animate={{
                                    scaleY: [1, 1.2, 1],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                }}
                            >
                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-accent rounded-full animate-pulse"></div>
                            </motion.div>

                            {/* Eyes */}
                            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 flex gap-8">
                                {[0, 1].map((i) => (
                                    <motion.div
                                        key={i}
                                        className="relative"
                                        animate={{
                                            scale: [1, 1.1, 1],
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            delay: i * 0.1,
                                        }}
                                    >
                                        {/* Eye Glow */}
                                        <div className="absolute inset-0 bg-accent/50 rounded-full blur-xl"></div>
                                        {/* Eye */}
                                        <div className="relative w-12 h-12 bg-gradient-to-br from-accent-light to-accent rounded-full border-2 border-accent-light flex items-center justify-center">
                                            {/* Pupil */}
                                            <motion.div
                                                className="w-4 h-4 bg-primary-950 rounded-full"
                                                animate={{
                                                    x: mousePosition.x * 0.5,
                                                    y: mousePosition.y * 0.5,
                                                }}
                                                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                                            />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Mouth */}
                            <motion.div
                                className="absolute bottom-12 left-1/2 -translate-x-1/2 w-16 h-2 bg-accent/80 rounded-full"
                                animate={{
                                    width: [64, 48, 64],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                }}
                            />

                            {/* Face Lines */}
                            <div className="absolute inset-4 border border-accent/20 rounded-2xl"></div>
                        </div>
                    </motion.div>

                    {/* Body */}
                    <div className="relative w-56 h-64 mx-auto">
                        {/* Body Glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-accent-dark/20 rounded-3xl blur-xl"></div>
                        
                        {/* Body Main */}
                        <div className="relative w-full h-full bg-gradient-to-br from-accent/10 to-accent-dark/10 rounded-3xl border border-accent/20 backdrop-blur-xl overflow-hidden">
                            {/* Shine */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent"></div>
                            
                            {/* Chest Panel */}
                            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-32 h-32 bg-gradient-to-br from-accent/20 to-accent-dark/20 rounded-2xl border border-accent/30">
                                {/* LED Indicators */}
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-3">
                                    {[0, 1, 2].map((i) => (
                                        <motion.div
                                            key={i}
                                            className="w-3 h-3 bg-accent rounded-full"
                                            animate={{
                                                opacity: [0.3, 1, 0.3],
                                            }}
                                            transition={{
                                                duration: 1.5,
                                                repeat: Infinity,
                                                delay: i * 0.3,
                                            }}
                                        />
                                    ))}
                                </div>

                                {/* Power Core */}
                                <motion.div
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-gradient-to-br from-accent to-accent-dark rounded-full"
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        boxShadow: [
                                            '0 0 20px rgba(229, 231, 235, 0.3)',
                                            '0 0 40px rgba(229, 231, 235, 0.6)',
                                            '0 0 20px rgba(229, 231, 235, 0.3)',
                                        ],
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                    }}
                                >
                                    <div className="absolute inset-2 bg-primary-950 rounded-full"></div>
                                </motion.div>
                            </div>
                        </div>
                    </div>

                    {/* Arms */}
                    <div className="absolute top-52 left-0 right-0 flex justify-between px-4">
                        {/* Left Arm */}
                        <motion.div
                            className="w-12 h-32 bg-gradient-to-b from-accent/20 to-accent-dark/20 rounded-2xl border border-accent/20 backdrop-blur-xl"
                            animate={{
                                rotate: [-10, 0, -10],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                            }}
                        >
                            <div className="absolute bottom-0 w-full h-12 bg-gradient-to-b from-accent/30 to-accent-dark/30 rounded-xl"></div>
                        </motion.div>

                        {/* Right Arm - Waving */}
                        <motion.div
                            className="w-12 h-32 bg-gradient-to-b from-accent/20 to-accent-dark/20 rounded-2xl border border-accent/20 backdrop-blur-xl origin-top"
                            animate={
                                isWaving
                                    ? {
                                          rotate: [0, -45, -20, -45, -20, -45, 0],
                                      }
                                    : {
                                          rotate: [10, 0, 10],
                                      }
                            }
                            transition={
                                isWaving
                                    ? {
                                          duration: 1.5,
                                          ease: 'easeInOut',
                                      }
                                    : {
                                          duration: 2,
                                          repeat: Infinity,
                                      }
                            }
                        >
                            <motion.div
                                className="absolute bottom-0 w-full h-12 bg-gradient-to-b from-accent/30 to-accent-dark/30 rounded-xl"
                                animate={
                                    isWaving
                                        ? {
                                              rotate: [0, 20, 0, 20, 0, 20, 0],
                                          }
                                        : {}
                                }
                                transition={{
                                    duration: 1.5,
                                    ease: 'easeInOut',
                                }}
                            ></motion.div>
                        </motion.div>
                    </div>

                    {/* Base */}
                    <motion.div
                        className="relative w-40 h-16 mx-auto mt-8 bg-gradient-to-b from-accent/20 to-accent-dark/30 rounded-t-3xl rounded-b-full border border-accent/20 backdrop-blur-xl"
                        animate={{
                            scaleX: [1, 1.05, 1],
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                        }}
                    >
                        <div className="absolute inset-2 bg-gradient-to-b from-white/5 to-transparent rounded-t-2xl rounded-b-full"></div>
                    </motion.div>
                </motion.div>

                {/* Greeting Text */}
                <motion.div
                    className="absolute -bottom-32 left-1/2 -translate-x-1/2 whitespace-nowrap"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <div className="relative">
                        <motion.div
                            className="text-4xl font-display font-bold gradient-text"
                            animate={{
                                scale: [1, 1.05, 1],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                            }}
                        >
                            Hello! 👋
                        </motion.div>
                        <div className="text-center text-sm text-primary-400 mt-2">
                            Your AI Study Companion
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default GreetingRobot;