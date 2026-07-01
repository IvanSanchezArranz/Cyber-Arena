import React, { useEffect, useState } from "react";

export const LoadingScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [status, setStatus] = useState("INITIALIZING WEAPON SYSTEMS...");

  useEffect(() => {
    const t1 = setTimeout(() => setStatus("COMPILING ARENA GEOMETRY..."), 800);
    const t2 = setTimeout(() => setStatus("BOOTING DRONE AI..."), 1600);
    const t3 = setTimeout(() => {
      setStatus("SYSTEMS ONLINE.");
      setTimeout(onComplete, 300);
    }, 2400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div className="loading-layer">
      <div className="loader-container">
        <div className="loader-title">CYBER-ARENA</div>
        <div className="loader-bar-outer">
          <div className="loader-bar-inner"></div>
        </div>
        <div className="loader-status">{status}</div>
      </div>
    </div>
  );
};
