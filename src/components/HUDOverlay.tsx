import React from "react";
import { Heart, Shield, Target, Volume2, VolumeX } from "lucide-react";

interface HUDOverlayProps {
  playerHealth: number;
  playerShield: number;
  playerScore: number;
  enemyHealth: number;
  enemyState: string;
  gameStatus: "START" | "PLAYING" | "PAUSED" | "GAMEOVER" | "VICTORY";
  droneKills: number;
  playerX: number;
  playerZ: number;
  enemyX: number;
  enemyZ: number;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const HUDOverlay: React.FC<HUDOverlayProps> = ({
  playerHealth,
  playerShield,
  playerScore,
  enemyHealth,
  enemyState,
  gameStatus,
  droneKills,
  playerX,
  playerZ,
  enemyX,
  enemyZ,
  isMuted,
  onToggleMute,
}) => {
  if (gameStatus !== "PLAYING") return null;

  // Map 3D arena coordinates (-40 to 40) to Radar pixels (0 to 110)
  const mapCoordToRadar = (val: number) => {
    const clamped = Math.max(-40, Math.min(40, val));
    return ((clamped + 40) / 80) * 110;
  };

  const pRadarX = mapCoordToRadar(playerX);
  const pRadarY = mapCoordToRadar(playerZ);
  const eRadarX = mapCoordToRadar(enemyX);
  const eRadarY = mapCoordToRadar(enemyZ);

  return (
    <>
      {/* 1. Main tactical HUD layer */}
      <div className="hud-layer">
        
        {/* --- HUD TOP COLUMN --- */}
        <div className="hud-top-row">
          
          {/* RADAR SCANNER */}
          <div className="cyber-panel radar-panel">
            <div className="panel-title" style={{ marginBottom: "6px" }}>RADAR SCANNER</div>
            <div className="radar-screen">
              <div className="radar-sweep"></div>
              {/* Player dot */}
              <div
                className="radar-blip player"
                style={{ left: `${pRadarX}px`, top: `${pRadarY}px` }}
              ></div>
              {/* Enemy dot (only if not destroyed) */}
              {enemyState !== "DESTROYED" && (
                <div
                  className="radar-blip enemy"
                  style={{ left: `${eRadarX}px`, top: `${eRadarY}px` }}
                ></div>
              )}
            </div>
          </div>

          {/* OBJECTIVE */}
          <div className="cyber-panel objective-panel">
            <span className="obj-header">TACTICAL GRID OVERRIDE</span>
            <span className="obj-desc">ELIMINATE THE HEAVY GUARD DRONE ({droneKills} / 5)</span>
          </div>

          {/* ENEMY MONITOR */}
          <div className="cyber-panel enemy-panel">
            <div className="panel-title">
              <span>TARGET SIG: G-DRONE v2</span>
              <span className={`enemy-state-badge ${enemyState.toLowerCase()}`}>
                {enemyState}
              </span>
            </div>
            <div className="cyber-bar-container">
              <div
                className="cyber-bar enemy-hp"
                style={{ width: `${enemyHealth}%` }}
              ></div>
            </div>
            <div className="panel-title" style={{ fontSize: "11px", justifyContent: "flex-end" }}>
              HP: {enemyHealth}%
            </div>
          </div>
        </div>

        {/* --- HUD CENTER CROSSHAIR --- */}
        <div className="crosshair-container">
          <div className="crosshair"></div>
        </div>

        {/* --- HUD BOTTOM COLUMN --- */}
        <div className="hud-bottom-row">
          
          {/* PLAYER VITALS */}
          <div className="cyber-panel vitals-panel">
            {/* Health Bar */}
            <div className="vital-row">
              <div className="vital-label">
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Heart size={12} color="var(--neon-cyan)" /> HULL INTEGRITY
                </span>
              </div>
              <div className="vital-bar-container">
                <div className="vital-bar hp" style={{ width: `${playerHealth}%` }}></div>
                <span className="vital-value">{playerHealth}</span>
              </div>
            </div>

            {/* Shield Bar */}
            <div className="vital-row">
              <div className="vital-label">
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Shield size={12} color="var(--neon-magenta)" /> FORCE SHIELDS
                </span>
              </div>
              <div className="vital-bar-container">
                <div className="vital-bar shield" style={{ width: `${playerShield}%` }}></div>
                <span className="vital-value">{playerShield}</span>
              </div>
            </div>
          </div>

          {/* PLAYER STATS & AMMO */}
          <div className="cyber-panel stats-panel">
            <div className="stat-item">
              <span>PILOT SCORE:</span>
              <span>{playerScore}</span>
            </div>
            <div className="stat-item">
              <span>DRONE KILLS:</span>
              <span>{droneKills} / 5</span>
            </div>
            <div className="stat-item ammo-item">
              <span>BLASTER CORE:</span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Target size={12} /> READY
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Audio Mute button (absolutely floated above canvas) */}
      <button className="mute-button" onClick={onToggleMute} title={isMuted ? "Unmute Audio" : "Mute Audio"}>
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>
    </>
  );
};
