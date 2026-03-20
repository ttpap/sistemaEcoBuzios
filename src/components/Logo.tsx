"use client";

import React, { useEffect, useState } from "react";
import { getSystemLogo, onSystemLogoChange } from "@/utils/system-settings";
import defaultLogo from "@/assets/logo-ecobuzios.png";

const DEFAULT_LOGO = defaultLogo;

const Logo = ({ className = "" }: { className?: string }) => {
  const [logoUrl, setLogoUrl] = useState<string>(getSystemLogo() || DEFAULT_LOGO);

  useEffect(() => {
    const sync = () => setLogoUrl(getSystemLogo() || DEFAULT_LOGO);
    sync();
    return onSystemLogoChange(sync);
  }, []);

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src={logoUrl}
        alt="EcoBúzios Logo"
        className="max-w-full max-h-full h-auto w-auto object-contain"
      />
    </div>
  );
};

export default Logo;