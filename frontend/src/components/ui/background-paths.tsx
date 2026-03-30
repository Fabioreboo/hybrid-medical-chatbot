"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from "framer-motion";
import { Box, Typography, Button, useTheme } from "@mui/material";

function FloatingPaths({ position, isDark }: { position: number; isDark: boolean }) {
    const paths = Array.from({ length: 36 }, (_, i) => ({
        id: i,
        d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
            380 - i * 5 * position
        } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
            152 - i * 5 * position
        } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
            684 - i * 5 * position
        } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
        width: 0.5 + i * 0.03,
    }));

    return (
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <svg
                style={{ width: '100%', height: '100%', color: isDark ? '#ffffff' : '#0f172a' }}
                viewBox="0 0 696 316"
                fill="none"
            >
                <title>Background Paths</title>
                {paths.map((path) => (
                    <motion.path
                        key={path.id}
                        d={path.d}
                        stroke="currentColor"
                        strokeWidth={path.width}
                        strokeOpacity={0.1 + path.id * 0.03}
                        initial={{ pathLength: 0.3, opacity: 0.6 }}
                        animate={{
                            pathLength: 1,
                            opacity: [0.3, 0.6, 0.3],
                            pathOffset: [0, 1, 0],
                        }}
                        transition={{
                            duration: 20 + Math.random() * 10,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                        }}
                    />
                ))}
            </svg>
        </Box>
    );
}

export function BackgroundPaths({
    title = "Medical Platform",
    onGoogleLogin,
}: {
    title?: string;
    onGoogleLogin?: () => void;
}) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const words = title.split(" ");

    const LetterBump = ({ letter, index }: { letter: string; index: number }) => {
        const letterRef = useRef<HTMLSpanElement>(null);
        const [letterPos, setLetterPos] = useState({ x: 0, y: 0, width: 0, height: 0 });
        
        useEffect(() => {
            const updateLetterPos = () => {
                if (letterRef.current) {
                    const rect = letterRef.current.getBoundingClientRect();
                    setLetterPos({
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2,
                        width: rect.width,
                        height: rect.height
                    });
                }
            };
            
            updateLetterPos();
            window.addEventListener('resize', updateLetterPos);
            return () => window.removeEventListener('resize', updateLetterPos);
        }, []);

        const distance = useMotionValue(0);
        const springDistance = useSpring(distance, { stiffness: 300, damping: 20 });
        
        useEffect(() => {
            const handleMouseMove = (e: MouseEvent) => {
                const dx = e.clientX - letterPos.x;
                const dy = e.clientY - letterPos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                distance.set(dist);
            };

            window.addEventListener('mousemove', handleMouseMove);
            return () => window.removeEventListener('mousemove', handleMouseMove);
        }, [letterPos, distance]);

        const scale = useTransform(
            springDistance,
            [0, 80, 150, 300],
            [1.25, 1.15, 1.05, 1]
        );

        const translateY = useTransform(
            springDistance,
            [0, 80, 150, 300],
            [-15, -8, -3, 0]
        );

        const springScale = useSpring(scale, { stiffness: 400, damping: 15 });
        const springTranslate = useSpring(translateY, { stiffness: 300, damping: 20 });

        return (
            <motion.span
                ref={letterRef}
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                    delay: index * 0.02,
                    type: "spring",
                    stiffness: 150,
                    damping: 25,
                }}
                style={{
                    display: 'inline-block',
                    color: 'transparent',
                    backgroundImage: isDark 
                        ? 'linear-gradient(to right, #ffffff, rgba(255,255,255,0.6))'
                        : 'linear-gradient(to right, #171717, rgba(23,23,23,0.6))',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    scale: springScale,
                    y: springTranslate,
                    transformOrigin: 'center bottom',
                    willChange: 'transform',
                }}
            >
                {letter}
            </motion.span>
        );
    };

    return (
        <Box
            sx={{
                position: 'relative',
                minHeight: '100vh',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                backgroundColor: isDark ? '#09090b' : '#ffffff',
                transition: 'background-color 0.3s ease',
            }}
        >
            <Box sx={{ position: 'absolute', inset: 0 }}>
                <FloatingPaths position={1} isDark={isDark} />
                <FloatingPaths position={-1} isDark={isDark} />
            </Box>

            <Box sx={{ position: 'relative', zIndex: 10, textAlign: 'center', px: { xs: 2, md: 4 } }}>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 2 }}
                >
                    <Typography
                        variant="h1"
                        sx={{
                            fontSize: { xs: '3rem', sm: '4.5rem', md: '5.5rem' },
                            fontWeight: 800,
                            mb: 6,
                            letterSpacing: '-0.03em',
                            fontFamily: 'Inter, system-ui, sans-serif',
                            cursor: 'default',
                            userSelect: 'none',
                        }}
                    >
                        {words.map((word, wordIndex) => (
                            <Box component="span" key={wordIndex} sx={{ display: 'inline-block', mr: wordIndex === words.length - 1 ? 0 : 3 }}>
                                {word.split("").map((letter, letterIndex) => (
                                    <LetterBump
                                        key={`${wordIndex}-${letterIndex}`}
                                        letter={letter}
                                        index={wordIndex * 10 + letterIndex}
                                    />
                                ))}
                            </Box>
                        ))}
                    </Typography>

                    <Box sx={{ mt: 5, mb: 3 }}>
                        <Button
                            onClick={onGoogleLogin}
                            component={motion.button}
                            whileHover={{ scale: 1.05, translateY: -2 }}
                            whileTap={{ scale: 0.95 }}
                            disableRipple
                            sx={{
                                borderRadius: '30px',
                                px: 4,
                                py: 2,
                                fontSize: '1.125rem',
                                fontWeight: 600,
                                textTransform: 'none',
                                color: isDark ? '#000' : '#fff',
                                backgroundColor: isDark ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.9)',
                                border: '1px solid',
                                borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                                boxShadow: isDark 
                                    ? '0 8px 32px rgba(255,255,255,0.1)' 
                                    : '0 8px 32px rgba(0,0,0,0.1)',
                                backdropFilter: 'blur(10px)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 1.5,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    backgroundColor: isDark ? '#ffffff' : '#000000',
                                    boxShadow: isDark 
                                        ? '0 12px 40px rgba(255,255,255,0.2)' 
                                        : '0 12px 40px rgba(0,0,0,0.2)',
                                }
                            }}
                        >
                            <svg style={{ width: 24, height: 24 }} viewBox="0 0 24 24">
                              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Sign in with Google
                            <motion.span
                                style={{ marginLeft: 4 }}
                                initial={{ x: 0 }}
                                animate={{ x: [0, 5, 0] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                            >
                                →
                            </motion.span>
                        </Button>
                    </Box>

                    <Typography
                        variant="body2"
                        sx={{
                            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                            mt: 5,
                            maxWidth: 400,
                            mx: 'auto'
                        }}
                    >
                        By signing in, you agree to our Terms of Service and Privacy Policy. Your data is encrypted and secure.
                    </Typography>
                </motion.div>
            </Box>
        </Box>
    );
}
