// apps/client/src/app/(client)/settings/security/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/client";
import {
  Button,
  Input,
  Label,
  Switch,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/shared";
import { toast } from "sonner";
import {
  Loader2,
  Shield,
  ShieldCheck,
  ShieldOff,
  Key,
  AlertTriangle,
} from "lucide-react";
import QRCode from "qrcode";

export default function SecuritySettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const is2FAEnabled = user?.twoFactorEnabled || false;

  useEffect(() => {
    setLoading(false);
  }, [user]);

  const handleStartSetup = async () => {
    setEnabling(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const data = await res.json();

      if (res.ok && data.otpauthUrl) {
        // Generate QR code
        const qrDataUrl = await QRCode.toDataURL(data.otpauthUrl);
        setQrCode(qrDataUrl);
        setShowSetup(true);
      } else {
        toast.error(data.error || "Failed to start 2FA setup");
      }
    } catch (error) {
      toast.error("Failed to start 2FA setup");
    } finally {
      setEnabling(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (!verificationCode) {
      toast.error("Please enter the verification code");
      return;
    }

    setEnabling(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCode }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("2FA enabled successfully!");
        setShowSetup(false);
        setVerificationCode("");
        window.location.reload();
      } else {
        toast.error(data.error || "Invalid code");
      }
    } catch (error) {
      toast.error("Failed to verify code");
    } finally {
      setEnabling(false);
    }
  };

  const handleDisable = async () => {
    if (!passwordConfirm) {
      toast.error("Please enter your password to disable 2FA");
      return;
    }

    setEnabling(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "DELETE" });
      const data = await res.json();

      if (res.ok) {
        toast.success("2FA disabled successfully");
        window.location.reload();
      } else {
        toast.error(data.error || "Failed to disable 2FA");
      }
    } catch (error) {
      toast.error("Failed to disable 2FA");
    } finally {
      setEnabling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 2FA Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          {is2FAEnabled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-green-600">
                <ShieldCheck className="w-5 h-5" />
                <span className="font-medium">2FA is enabled</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your account is protected with two-factor authentication using
                an authenticator app.
              </p>

              {!showSetup && (
                <div className="pt-4 border-t">
                  <label className="text-sm font-medium">Disable 2FA</label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Enter your password to confirm disabling 2FA
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="Enter password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                    />
                    <Button
                      variant="destructive"
                      onClick={handleDisable}
                      disabled={enabling || !passwordConfirm}
                    >
                      {enabling ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Disable"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">2FA is not enabled</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security by enabling two-factor
                authentication.
              </p>

              {showSetup && qrCode ? (
                <div className="mt-4 p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">
                    Scan this QR code with your authenticator app
                  </h4>
                  <div className="flex justify-center mb-4">
                    <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                  <div className="space-y-2">
                    <Label>Enter verification code</Label>
                    <Input
                      type="text"
                      placeholder="123456"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      maxLength={6}
                      className="text-center tracking-widest"
                    />
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowSetup(false);
                          setQrCode("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleVerifyAndEnable}
                        disabled={enabling || verificationCode.length !== 6}
                      >
                        {enabling ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Verify & Enable
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button onClick={handleStartSetup} disabled={enabling}>
                  {enabling ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Key className="w-4 h-4 mr-2" />
                  )}
                  Enable 2FA
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldOff className="w-5 h-5" />
            Session Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <p>
              <strong>Last login:</strong>{" "}
              {user?.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleString()
                : "Unknown"}
            </p>
            <p className="text-muted-foreground">
              Your session is protected with a 24-hour JWT. A refresh token
              allows you to stay logged in for up to 7 days.
            </p>
          </div>

          <div className="pt-2 border-t">
            <Button
              variant="destructive"
              onClick={async () => {
                if (
                  confirm("This will log you out everywhere. Are you sure?")
                ) {
                  await fetch("/api/auth/revoke-sessions", { method: "POST" });
                  window.location.href = "/";
                }
              }}
            >
              Sign Out Everywhere
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
