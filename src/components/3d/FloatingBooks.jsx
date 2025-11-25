import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const FloatingBooks = () => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 30;
            const y = (e.clientY / window.innerHeight - 0.5) * 30;
            setMousePosition({ x, y });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const books = [
        { delay: 0, rotation: -15, x: -100, y: -50 },
        { delay: 0.2, rotation: 10, x: 0, y: 100 },
        { delay: 0.4, rotation: -5, x: 100, y: -30 },
        { delay: 0.6, rotation: 20, x: -50, y: 80 },
    ];

    return (
        <div className="relative w-full h-full" style={{ perspective: '1200px' }}>
            {/* Glowing Orb Center */}
            <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64"
                animate={{
                    scale: [1, 1.2, 1],
                    rotate: 360,
                }}
                transition={{
                    scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
                    rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
                }}
            >
                {/* Outer Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-accent-dark/30 rounded-full blur-3xl"></div>
                
                {/* Inner Core */}
                <div className="absolute inset-8 bg-gradient-to-br from-accent/20 to-accent-dark/20 rounded-full border border-accent/30 backdrop-blur-xl">
                    {/* Rotating Rings */}
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="absolute inset-0 border-2 border-accent/20 rounded-full"
                            animate={{
                                rotate: 360,
                                scale: [1, 1.1, 1],
                            }}
                            transition={{
                                rotate: { duration: 8 - i * 2, repeat: Infinity, ease: 'linear' },
                                scale: { duration: 3, repeat: Infinity, delay: i * 0.5 },
                            }}
                            style={{
                                transformStyle: 'preserve-3d',
                            }}
                        />
                    ))}
                </div>
            </motion.div>

            {/* Floating Books */}
            {books.map((book, index) => (
                <motion.div
                    key={index}
                    className="absolute top-1/2 left-1/2"
                    style={{
                        x: book.x,
                        y: book.y,
                        transformStyle: 'preserve-3d',
                    }}
                    animate={{
                        y: [book.y, book.y - 30, book.y],
                        rotateY: [book.rotation, book.rotation + 10, book.rotation],
                        x: [book.x + mousePosition.x * 0.3, book.x + mousePosition.x * 0.5],
                    }}
                    transition={{
                        y: {
                            duration: 3 + index * 0.5,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: book.delay,
                        },
                        rotateY: {
                            duration: 4,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        },
                        x: {
                            type: 'spring',
                            stiffness: 50,
                            damping: 20,
                        },
                    }}
                >
                    {/* Book */}
                    <div className="relative" style={{ transformStyle: 'preserve-3d' }}>
                        {/* Book Glow */}
                        <div className="absolute inset-0 bg-accent/30 blur-2xl rounded-lg"></div>
                        
                        {/* Book Cover */}
                        <div className="relative w-32 h-40 bg-gradient-to-br from-accent/20 to-accent-dark/20 rounded-lg border border-accent/30 backdrop-blur-xl overflow-hidden">
                            {/* Shine Effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent"></div>
                            
                            {/* Book Spine */}
                            <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-accent/40 to-transparent"></div>
                            
                            {/* Book Lines */}
                            <div className="absolute inset-4 space-y-2">
                                {[...Array(6)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="h-1 bg-accent/20 rounded"
                                        animate={{
                                            width: ['70%', '90%', '70%'],
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            delay: i * 0.1,
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Book Icon */}
                            <div className="absolute bottom-4 right-4 w-8 h-8 bg-accent/30 rounded-lg flex items-center justify-center">
                                <div className="w-4 h-4 border-2 border-accent rounded"></div>
                            </div>
                        </div>

                        {/* Book Pages (Side View) */}
                        <div
                            className="absolute top-1 right-0 w-32 h-40 bg-gradient-to-r from-accent/5 to-accent/10 rounded-r-lg"
                            style={{
                                transform: 'translateZ(-10px) translateX(2px)',
                            }}
                        >
                            {/* Page Lines */}
                            {[...Array(8)].map((_, i) => (
                                <div
                                    key={i}
                                    className="absolute right-0 w-full h-px bg-accent/10"
                                    style={{ top: `${(i + 1) * 12}%` }}
                                />
                            ))}
                        </div>
                    </div>
                </motion.div>
            ))}

            {/* Floating Particles */}
            <div className="absolute inset-0">
                {[...Array(30)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-accent/40 rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                            y: [0, -100, 0],
                            opacity: [0, 0.8, 0],
                            scale: [0, 1, 0],
                        }}
                        transition={{
                            duration: 4 + Math.random() * 3,
                            repeat: Infinity,
                            delay: Math.random() * 5,
                            ease: 'easeInOut',
                        }}
                    />
                ))}
            </div>

            {/* Geometric Shapes */}
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={`geo-${i}`}
                    className="absolute"
                    style={{
                        top: `${20 + i * 30}%`,
                        left: `${10 + i * 35}%`,
                        transformStyle: 'preserve-3d',
                    }}
                    animate={{
                        rotate: 360,
                        y: [0, -20, 0],
                    }}
                    transition={{
                        rotate: { duration: 15 + i * 5, repeat: Infinity, ease: 'linear' },
                        y: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 },
                    }}
                >
                    <div className="w-16 h-16 border-2 border-accent/20 rounded-lg backdrop-blur-sm" style={{ transform: 'rotateX(45deg) rotateZ(45deg)' }}>
                        <div className="absolute inset-2 border border-accent/10 rounded"></div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default FloatingBooks;