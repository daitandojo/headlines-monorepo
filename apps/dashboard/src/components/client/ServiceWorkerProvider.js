// src/components/ServiceWorkerProvider.js
"use client";

import { useEffect } from 'react';

export function ServiceWorkerProvider({ children }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerServiceWorker = async () => {
        try {
          console.log('[SW] Registering service worker...');
          
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          });
          
          console.log('[SW] Service Worker registered successfully:', registration);
          
          // Handle updates
          registration.addEventListener('updatefound', () => {
            console.log('[SW] Service Worker update found');
            const newWorker = registration.installing;
            
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[SW] New service worker installed, refresh recommended');
                // Optionally show a toast here about app update
              }
            });
          });
          
        } catch (error) {
          console.error('[SW] Service Worker registration failed:', error);
        }
      };

      // Register immediately
      registerServiceWorker();
      
      // Also listen for the page becoming visible (tab focus)
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            if (registrations.length === 0) {
              console.log('[SW] No service worker found, re-registering...');
              registerServiceWorker();
            }
          });
        }
      });
    }
  }, []);

  return children;
}