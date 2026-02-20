"use client";

import React, { useEffect, useState } from "react";
import { getSystemLogo, onSystemLogoChange } from "@/utils/system-settings";

const DEFAULT_LOGO = "https://files.dyad.sh/pasted-image-2026-02-19T16-19-18-020Z.png";

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
        className="max-w-full h-auto object-contain"
      />
    </div>
  );
};

export default Logo;