// File: client/src/components/client/shared/Header.jsx
"use client";

import {
  Briefcase,
  LogOut,
  Settings,
  User,
  Shield,
  Crown,
  CalendarClock,
  Brain,
} from "lucide-react";
import { InstallPwaButton } from "../../shared/buttons/InstallPwaButton";
import { GlobalCountrySelector } from "../countries/GlobalCountrySelector";
import { useAuth } from "@/lib/auth/client.js";
import { NotificationToggles } from "../../shared/buttons/NotificationToggles";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shared";
import Link from "next/link";
import { differenceInDays } from "date-fns";
import useAppStore from "@/lib/store/use-app-store";

const UserSubscriptionStatus = () => {
  const { user } = useAuth();
  if (!user) return null;

  if (user.subscriptionTier === "trial" && user.subscriptionExpiresAt) {
    const daysLeft = differenceInDays(
      new Date(user.subscriptionExpiresAt),
      new Date(),
    );
    if (daysLeft >= 0) {
      return (
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-yellow-400" />
          <span className="text-sm text-yellow-400">
            Trial: {daysLeft} days left
          </span>
        </div>
      );
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Crown className="h-4 w-4 text-amber-400" />
      <span className="capitalize text-sm text-amber-400">
        {user.subscriptionTier}
      </span>
    </div>
  );
};

export const Header = ({ globalCountries }) => {
  const { user, logout } = useAuth();
  const { eventTotal, articleTotal, opportunityTotal } = useAppStore();

  return (
    <header className="mb-4 sm:mb-6 relative">
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {user && (
          <>
            {user.role === "admin" && (
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label="Admin Panel"
              >
                <Link href="/admin/dashboard">
                  <Shield className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <GlobalCountrySelector allCountries={globalCountries || []} />
            <NotificationToggles />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex items-center gap-2 rounded-full"
                >
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-secondary">
                <DropdownMenuLabel>Hi, {user.firstName}</DropdownMenuLabel>
                <div className="px-2 pb-2">
                  <UserSubscriptionStatus />
                </div>
                <DropdownMenuSeparator />
                <Link href="/settings" passHref>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/settings/security" passHref>
                  <DropdownMenuItem>
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Security</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        <InstallPwaButton />
      </div>
      <div className="flex flex-row items-center justify-center gap-x-3 sm:gap-x-4 mb-3 pt-8 sm:pt-0">
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #1e1e3f 0%, #2d1f4e 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 0 20px rgba(59, 130, 246, 0.2)",
          }}
        >
          <Brain className="text-blue-400 w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <h1
          className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center sm:text-left"
          style={{
            background: "linear-gradient(135deg, #fff 0%, #94a3b8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          HEADLINES
        </h1>
      </div>
      <p className="text-center text-sm sm:text-base text-blue-200/50 max-w-3xl mx-auto">
        Analyzing{" "}
        <span className="font-bold text-blue-200">
          {(eventTotal || 0).toLocaleString()}{" "}
        </span>
        events,{" "}
        <span className="font-bold text-blue-200">
          {(opportunityTotal || 0).toLocaleString()}{" "}
        </span>
        opportunities from{" "}
        <span className="font-bold text-blue-200">
          {(articleTotal || 0).toLocaleString()}{" "}
        </span>
        articles
      </p>
    </header>
  );
};
