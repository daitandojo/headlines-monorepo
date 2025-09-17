// src/components/InstallPwaButton.jsx (version 2.0)
"use client";

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Download, Smartphone } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { IOSInstallInstructions } from './IOSInstallInstructions';

export function InstallPwaButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      // This event only fires on supported browsers (e.g., Chrome on Android/Desktop)
      setInstallPrompt(e);
    };

    const checkInstallStatus = () => {
      // Standalone mode is a strong indicator of an installed PWA
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsAppInstalled(true);
      }
    };

    checkInstallStatus();
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setIsAppInstalled(true);
      setInstallPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const handleIOSClick = () => {
    setShowIOSInstructions(true);
  };

  // If the app is already installed, render nothing.
  if (isAppInstalled) {
    return null;
  }

  // If on iOS, show the button that triggers the instruction modal.
  if (isIOS) {
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleIOSClick}>
                <Smartphone className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Install on iPhone</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <IOSInstallInstructions open={showIOSInstructions} onOpenChange={setShowIOSInstructions} />
      </>
    );
  }

  // If on a compatible browser and the install prompt is available, show the direct install button.
  if (installPrompt) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleInstallClick}>
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Install App</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Fallback for other scenarios (e.g., desktop browser without PWA support) - show nothing.
  return null;
}