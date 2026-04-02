// apps/client/src/app/(client)/settings/layout.jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@headlines/utils-shared";
import { User, Bell, CreditCard, Activity, Shield } from "lucide-react";

const settingsNav = [
  { name: "Profile", href: "/settings", icon: User },
  { name: "Security", href: "/settings/security", icon: Shield },
  { name: "Notifications", href: "/settings/notifications", icon: Bell },
  { name: "Subscription", href: "/settings/subscription", icon: CreditCard },
  { name: "Activity", href: "/settings/activity", icon: Activity },
];

export default function SettingsLayout({ children }) {
  const router = useRouter();
  const pathname = router.pathname;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Navigation */}
        <nav className="md:w-56 shrink-0">
          <ul className="space-y-1">
            {settingsNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Settings Content */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
