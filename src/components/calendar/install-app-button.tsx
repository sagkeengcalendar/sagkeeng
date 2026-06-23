"use client";

import { useEffect, useState } from "react";

/**
 * InstallAppButton — shows an "Add to Home Screen" button
 * - On Android/Chrome: uses the beforeinstallprompt event to trigger native install
 * - On iOS/Safari: shows instructions to use Share → Add to Home Screen
 * - Only visible on mobile devices
 */
export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Detect mobile
    const mobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);

    // Check if already installed (running in standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    // Listen for the install prompt (Chrome/Android)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install
    const installedHandler = () => setInstalled(true);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  // Don't show if not mobile, already installed, or no prompt available
  if (!isMobile || installed) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Android/Chrome — trigger native prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // iOS — show instructions
      setShowIOSInstructions(true);
    }
  };

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

  if (showIOSInstructions) {
    return (
      <div className="install-ios-modal" onClick={() => setShowIOSInstructions(false)}>
        <div className="install-ios-box" onClick={(e) => e.stopPropagation()}>
          <button className="install-ios-close" onClick={() => setShowIOSInstructions(false)}>×</button>
          <div className="install-ios-icon">📱</div>
          <h3>Add miina to your Home Screen</h3>
          <ol>
            <li>Tap the <strong>Share</strong> button at the bottom of Safari</li>
            <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
            <li>Tap <strong>Add</strong> — miina will appear on your home screen like an app</li>
          </ol>
          <button className="install-ios-done" onClick={() => setShowIOSInstructions(false)}>Got it</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <button className="install-app-btn" onClick={handleInstall}>
        <span className="install-app-icon">⬇</span>
        Add to Home Screen
      </button>
    </>
  );
}
