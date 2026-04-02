// apps/client/src/components/shared/screen/SplashScreen.jsx
"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Brain, Sparkles, Loader2 } from "lucide-react";

export function SplashScreen() {
  const [loadingText, setLoadingText] = useState("");
  const loadingMessages = [
    "Initializing intelligence engine...",
    "Scanning global networks...",
    "Analyzing wealth signals...",
    "Preparing your insights...",
    "Almost ready...",
  ];

  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      setLoadingText(loadingMessages[idx % loadingMessages.length]);
      idx++;
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%)",
      }}
    >
      {/* Animated Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Aurora Gradient Orbs */}
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 80, 0],
            scale: [1.2, 1, 1.2],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />

        {/* Grid Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo Icon with Glow */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            duration: 1.2,
            type: "spring",
            stiffness: 100,
            damping: 15,
          }}
          className="relative mb-8"
        >
          <motion.div
            animate={{
              boxShadow: [
                "0 0 40px rgba(59, 130, 246, 0.3)",
                "0 0 80px rgba(139, 92, 246, 0.4)",
                "0 0 40px rgba(16, 185, 129, 0.3)",
              ],
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="relative w-28 h-28 rounded-3xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #1e1e3f 0%, #2d1f4e 100%)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <Brain className="w-14 h-14 text-blue-400" />

            {/* Sparkle Accents */}
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-1 -right-1"
            >
              <Sparkles className="w-6 h-6 text-amber-400" />
            </motion.div>
          </motion.div>

          {/* Orbiting Dots */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ rotate: 360 }}
              transition={{
                duration: 8 + i * 2,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute inset-0"
              style={{
                width: "140px",
                height: "140px",
                left: "50%",
                top: "50%",
                marginLeft: "-70px",
                marginTop: "-70px",
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background:
                    i === 0 ? "#3b82f6" : i === 1 ? "#8b5cf6" : "#10b981",
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  marginLeft: "-4px",
                }}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Brand Name - Large Bold Typography */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-center mb-2"
        >
          <h1
            className="text-6xl font-bold tracking-tight"
            style={{
              background:
                "linear-gradient(135deg, #fff 0%, #94a3b8 50%, #fff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 0 60px rgba(59, 130, 246, 0.3)",
            }}
          >
            HEADLINES
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-lg text-blue-200/60 font-light tracking-widest uppercase mb-8"
        >
          Wealth Intelligence Engine
        </motion.p>

        {/* Loading Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="flex flex-col items-center gap-3"
        >
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          <p className="text-sm text-blue-200/50 font-mono">{loadingText}</p>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 200 }}
          transition={{ delay: 1.5, duration: 2 }}
          className="h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-full mt-6"
          style={{ maxWidth: "200px" }}
        />
      </div>

      {/* Footer Version */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 text-xs text-blue-200/40 font-mono"
      >
        v2.0.0 • Enterprise Edition
      </motion.p>
    </motion.div>
  );
}
