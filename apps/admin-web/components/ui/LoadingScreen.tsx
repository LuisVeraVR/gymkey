'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LOADING_MESSAGES = [
  "Calentando motores...",
  "Preparando el equipo...",
  "Organizando las pesas...",
  "Verificando membresías...",
  "Limpiando máquinas...",
  "Cargando motivación..."
];

export function LoadingScreen() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
        <div className="absolute -top-[20%] -left-[20%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute top-[40%] right-[10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-primary/15 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Animated Logo/Icon Container */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative w-32 h-32 mb-12"
        >
          {/* Outer Ring */}
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-t-primary border-r-primary border-b-transparent border-l-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Inner Dumbbell Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.svg 
              viewBox="0 0 24 24" 
              className="w-16 h-16 text-primary"
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5"
              strokeLinecap="round" 
              strokeLinejoin="round"
              animate={{ 
                y: [0, -5, 0],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut"
              }}
            >
              <path d="M6.75 7.5l2.25 2.25m-2.25 2.25l2.25-2.25M6.75 7.5a2.25 2.25 0 01-2.25 2.25m2.25-2.25a2.25 2.25 0 00-2.25 2.25m10.5-4.5l2.25 2.25m-2.25 2.25l2.25-2.25M17.25 7.5a2.25 2.25 0 01-2.25 2.25m2.25-2.25a2.25 2.25 0 00-2.25 2.25m-10.5 9l2.25 2.25m-2.25 2.25l2.25-2.25M6.75 16.5a2.25 2.25 0 01-2.25 2.25m2.25-2.25a2.25 2.25 0 00-2.25 2.25m10.5-4.5l2.25 2.25m-2.25 2.25l2.25-2.25M17.25 16.5a2.25 2.25 0 01-2.25 2.25m2.25-2.25a2.25 2.25 0 00-2.25 2.25" />
              <path d="M8.25 9.75h7.5" />
              <path d="M8.25 18.75h7.5" />
            </motion.svg>
          </div>
        </motion.div>

        {/* Text Animation */}
        <div className="h-8 flex items-center justify-center overflow-hidden relative w-64">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-lg font-medium text-foreground absolute text-center w-full"
            >
              {LOADING_MESSAGES[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Loading Bar */}
        <div className="mt-8 w-64 h-2 bg-muted rounded-full overflow-hidden relative">
          <motion.div
            className="absolute top-0 left-0 h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
        
        <p className="mt-4 text-xs text-muted-foreground font-mono tracking-widest uppercase opacity-70">
          GymKey v1.0
        </p>
      </div>
    </div>
  );
}
