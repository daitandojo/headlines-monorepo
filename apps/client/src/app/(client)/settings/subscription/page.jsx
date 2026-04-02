// apps/client/src/app/(client)/settings/subscription/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/client";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared";
import { toast } from "sonner";
import { Loader2, CreditCard, Crown, Zap, Building2 } from "lucide-react";

const TIERS = {
  free: {
    name: "Free",
    price: "$0",
    features: ["100 events/month", "Email only", "Basic filters"],
  },
  premium: {
    name: "Premium",
    price: "€99/mo",
    features: [
      "Unlimited events",
      "All features",
      "Priority support",
      "Export CSV",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: "€499/mo",
    features: [
      "API access",
      "White-label",
      "Dedicated support",
      "Custom integrations",
    ],
  },
};

export default function SubscriptionSettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const currentTier = user?.subscriptionTier || "free";
  const tierInfo = TIERS[currentTier];

  const handleUpgrade = async (targetTier) => {
    if (targetTier === currentTier) return;

    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: targetTier }),
      });

      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        // For demo purposes, just show success
        toast.success(
          `Upgrade to ${targetTier} requested. This would open Stripe.`,
        );
      }
    } catch (error) {
      toast.error("Failed to initiate upgrade");
    } finally {
      setLoading(false);
    }
  };

  const getTierIcon = (tier) => {
    switch (tier) {
      case "premium":
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case "enterprise":
        return <Building2 className="w-6 h-6 text-purple-500" />;
      default:
        return <Zap className="w-6 h-6 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Current Plan</h2>

        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          {getTierIcon(currentTier)}
          <div>
            <p className="text-xl font-bold">{tierInfo.name}</p>
            <p className="text-muted-foreground">{tierInfo.price}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Your features:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {tierInfo.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-green-500">✓</span> {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Available Plans */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Available Plans</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(TIERS).map(([tier, info]) => (
            <Card
              key={tier}
              className={tier === currentTier ? "border-primary" : ""}
            >
              <CardHeader className="text-center">
                <div className="flex justify-center mb-2">
                  {getTierIcon(tier)}
                </div>
                <CardTitle>{info.name}</CardTitle>
                <p className="text-2xl font-bold">{info.price}</p>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 mb-4">
                  {info.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={tier === currentTier ? "outline" : "default"}
                  disabled={tier === currentTier || loading}
                  onClick={() => handleUpgrade(tier)}
                >
                  {tier === currentTier ? "Current Plan" : "Upgrade"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
