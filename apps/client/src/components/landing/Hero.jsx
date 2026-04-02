// apps/client/src/app/(public)/_components/Hero.jsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/shared";
import { LiquidityTicker } from "./LiquidityTicker";
import { LoginModal } from "./LoginModal";
import {
  Zap,
  Target,
  Layers,
  Share2,
  Brain,
  Shield,
  Globe,
} from "lucide-react";
import Link from "next/link";

const FeatureCard = ({ icon, title, description, delay }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: "easeOut", delay },
      },
    }}
    className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-lg backdrop-blur-sm text-left hover:border-blue-500/30 transition-colors group"
  >
    <div className="flex items-center gap-4">
      <div className="flex-shrink-0 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-100">{title}</h3>
    </div>
    <p className="mt-3 text-sm text-slate-400">{description}</p>
  </motion.div>
);

export function Hero({ tickerEvents }) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const handleScrollToSignUp = () => {
    document.getElementById("signup-flow")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 p-4 bg-background/30 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #1e1e3f 0%, #2d1f4e 100%)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <Brain className="w-4 h-4 text-blue-400" />
            </div>
            <span
              className="text-xl font-bold tracking-tight"
              style={{
                background: "linear-gradient(135deg, #fff 0%, #94a3b8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              HEADLINES
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => setIsLoginOpen(true)}
              className="text-sm"
            >
              Member Login
            </Button>
            <Button
              onClick={handleScrollToSignUp}
              className="text-sm bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 shadow-lg shadow-blue-500/20"
            >
              Start Free Trial
            </Button>
          </div>
        </div>
      </header>

      <section className="relative w-full min-h-screen flex flex-col justify-between overflow-hidden pt-24 pb-8 px-4">
        {/* Animated Background */}
        <div className="absolute inset-0 z-0 hero-aurora" />
        <div className="absolute inset-0 z-0 hero-grid-background" />

        {/* Main Content Area */}
        <div className="relative z-10 container mx-auto flex flex-col items-center justify-center flex-grow">
          <motion.div
            className="text-center"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
          >
            {/* Animated badge */}
            <motion.div
              variants={{
                hidden: { opacity: 0, scale: 0.9 },
                visible: { opacity: 1, scale: 1 },
              }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8"
            >
              <Globe className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-blue-200/80 font-medium">
                Active in 73 Countries
              </span>
            </motion.div>

            <motion.h1
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-8"
              style={{
                background:
                  "linear-gradient(135deg, #fff 0%, #94a3b8 50%, #fff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              We Find Your Next Mandate.
            </motion.h1>

            <motion.p
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
              className="max-w-3xl mx-auto text-lg sm:text-xl text-slate-400"
            >
              Our AI engine delivers verified private wealth opportunities
              across 73 countries, ensuring you never miss a mandate in your
              region.
            </motion.p>

            <motion.div
              variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
              className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto"
            >
              <FeatureCard
                icon={<Zap className="h-6 w-6 text-blue-400" />}
                title="Events Dashboard"
                description="Track global liquidity events in real-time. Filter by country, sector, and deal size to focus on what matters."
                delay={0.2}
              />
              <FeatureCard
                icon={<Target className="h-6 w-6 text-green-400" />}
                title="Prospect Dossiers"
                description="AI-generated dossiers on key individuals, complete with estimated liquidity and outreach points."
                delay={0.3}
              />
              <FeatureCard
                icon={<Layers className="h-6 w-6 text-yellow-400" />}
                title="Unrivaled Sourcing"
                description="Our autonomous agents ingest data from thousands of global newspapers, regulatory filings, and PE/VC portfolio updates daily."
                delay={0.4}
              />
              <FeatureCard
                icon={<Share2 className="h-6 w-6 text-cyan-400" />}
                title="Seamless Delivery"
                description="Receive critical alerts through email, push notifications, or WhatsApp, and export any view to Excel for deeper analysis."
                delay={0.5}
              />
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
              className="mt-16"
            >
              <Button
                size="lg"
                onClick={handleScrollToSignUp}
                className="text-lg px-8 py-6 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 font-bold hover:from-amber-300 hover:to-yellow-400 shadow-lg shadow-yellow-500/20 transform hover:scale-105 transition-transform"
              >
                Claim Your Intelligence Briefing
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Ticker Area */}
        <div className="relative z-10 container mx-auto w-full mt-16">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
          >
            <LiquidityTicker events={tickerEvents} />
          </motion.div>
        </div>
      </section>

      <LoginModal open={isLoginOpen} onOpenChange={setIsLoginOpen} />
    </>
  );
}
