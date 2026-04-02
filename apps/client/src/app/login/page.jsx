// File: client/src/app/login/page.jsx
"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Input, Button, Label } from "@/components/shared";
import { LoadingOverlay } from "@/components/shared/screen/LoadingOverlay";
import { useAuth } from "@/lib/auth/client";
import {
  KeyRound,
  Shield,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { user, login, isLoading } = useAuth();
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push("/events");
    }
  }, [user, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsError(false);
    setErrorMessage("");
    const loginSuccessful = await login(email, password);
    if (!loginSuccessful) {
      setIsError(true);
      setErrorMessage("Invalid email or password");
    }
  };

  if (user || isLoading) {
    return <LoadingOverlay isLoading={true} text="Authorizing..." />;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #0a0a0f 0%, #12121f 50%, #0a0a0f 100%)",
      }}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <motion.div
          animate={{ x: [0, -80, 0], y: [0, 80, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: "rgba(15, 15, 25, 0.9)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Gradient Border Effect */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              padding: "1px",
              background:
                "linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(139, 92, 246, 0.2) 50%, rgba(16, 185, 129, 0.2) 100%)",
              WebkitMask:
                "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          />

          {/* Header */}
          <div className="pt-10 pb-6 px-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #1e1e3f 0%, #2d1f4e 100%)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 0 30px rgba(59, 130, 246, 0.2)",
              }}
            >
              <Shield className="w-8 h-8 text-blue-400" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-bold text-white mb-2"
              style={{
                background: "linear-gradient(135deg, #fff 0%, #94a3b8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              HEADLINES
            </motion.h1>
            <p className="text-sm text-blue-200/50 font-light tracking-wide">
              Secure Access Portal
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="px-8 pb-8 space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-xs text-blue-200/60 uppercase tracking-wider flex items-center gap-2"
              >
                <Mail className="w-3 h-3" />
                Email Address
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  placeholder="Enter your email..."
                  className="h-12 pl-10 bg-white/5 border-white/10 text-white placeholder:text-blue-200/30 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all"
                  required
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-200/30" />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-xs text-blue-200/60 uppercase tracking-wider flex items-center gap-2"
              >
                <Lock className="w-3 h-3" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  placeholder="Enter your password..."
                  className="h-12 pl-10 bg-white/5 border-white/10 text-white placeholder:text-blue-200/30 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all"
                  required
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-200/30" />
              </div>
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-xs text-blue-200/40 hover:text-blue-400 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {isError && errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-red-500/10 border border-red-500/20"
              >
                <p className="text-sm text-red-400 text-center">
                  {errorMessage}
                </p>
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className="w-full h-12 text-base font-medium relative overflow-hidden group"
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                boxShadow: "0 4px 20px rgba(59, 130, 246, 0.3)",
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Authorize Access
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </Button>
          </form>

          {/* Footer */}
          <div className="px-8 pb-6 text-center">
            <p className="text-xs text-blue-200/30">
              Protected by enterprise-grade security
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
