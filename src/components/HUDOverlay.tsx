import React from "react";
import { Heart, Shield, Target, Volume2, VolumeX } from "lucide-react";

interface HUDOverlayProps {
  playerHealth: number;
  playerShield: number;
  playerScore: number;
  enemyHealth: number;
  enemyState: string;
  gameStatus: "START" | "PLAYING" | "PAUSED" | "GAMEOVER" | "VICTORY" | "TIMEOUT";
  gameMode: "ARENA" | "GALLERY";
  timeLeft: number;
  highScore: number;
  droneKills: number;
  playerX: number;
  playerZ: number;
  enemyX: number;
  enemyZ: number;
  targetsPos: { x: number; z: number }[];
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
  gameMode,
  timeLeft,
  highScore,
  droneKills,
  playerX,
  playerZ,
  enemyX,
  enemyZ,
  targetsPos,
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
              
              {/* Enemy dot (only in Arena mode if not destroyed) */}
              {gameMode === "ARENA" && enemyState !== "DESTROYED" && (
                <div
                  className="radar-blip enemy"
                  style={{ left: `${eRadarX}px`, top: `${eRadarY}px` }}
                ></div>
              )}

              {/* Dynamic Targets dots (only in Gallery mode) */}
              {gameMode === "GALLERY" && targetsPos.map((t, idx) => {
                const tRadarX = mapCoordToRadar(t.x);
                const tRadarY = mapCoordToRadar(t.z);
                return (
                  <div
                    key={idx}
                    className="radar-blip"
                    style={{
                      left: `${tRadarX}px`,
                      top: `${tRadarY}px`,
                      backgroundColor: "#ffaa00",
                      boxShadow: "0 0 6px #ffaa00",
                      animation: "pulse-blip 0.8s infinite alternate",
                      width: "5px",
                      height: "5px"
                    }}
                  ></div>
                );
              })}
            </div>
          </div>

          {/* OBJECTIVE */}
          <div className="cyber-panel objective-panel" style={{ borderColor: gameMode === "GALLERY" ? "rgba(255, 234, 0, 0.3)" : "rgba(0, 255, 255, 0.3)" }}>
            {gameMode === "ARENA" ? (
              <>
                <span className="obj-header">TACTICAL GRID OVERRIDE</span>
                <span className="obj-desc">ELIMINATE THE HEAVY GUARD DRONE ({droneKills} / 5)</span>
              </>
            ) : (
              <>
                <span className="obj-header" style={{ color: "var(--neon-yellow)" }}>AIM WARMUP TARGETS</span>
                <span className="obj-desc">DESTROY THE FLOATING NODES ({playerScore / 100} HIT)</span>
              </>
            )}
          </div>

          {/* DYNAMIC METRIC TIMER OR ENEMY MONITOR */}
          {gameMode === "ARENA" ? (
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
          ) : (
            <div className="cyber-panel enemy-panel" style={{ borderColor: "rgba(255, 234, 0, 0.3)" }}>
              <div className="panel-title">
                <span style={{ color: "var(--neon-yellow)" }}>CHRONO TIME REMAINING</span>
                <span style={{ color: "var(--neon-yellow)", fontWeight: "bold" }}>
                  {Math.ceil(timeLeft)}s
                </span>
              </div>
              <div className="cyber-bar-container" style={{ borderColor: "rgba(255, 234, 0, 0.2)" }}>
                <div
                  className="cyber-bar"
                  style={{
                    width: `${(timeLeft / 60) * 100}%`,
                    background: "linear-gradient(90deg, #ff9900, #ffea00)",
                    boxShadow: "0 0 10px rgba(255, 234, 0, 0.4)"
                  }}
                ></div>
              </div>
              <div className="panel-title" style={{ fontSize: "11px", justifyContent: "space-between", marginTop: "2px" }}>
                <span style={{ color: "rgba(255, 255, 255, 0.4)" }}>RECORD: {highScore} PTS</span>
                <span style={{ color: "var(--neon-yellow)" }}>CHRONO TIMER</span>
              </div>
            </div>
          )}
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
          <div className="cyber-panel stats-panel" style={{ borderColor: gameMode === "GALLERY" ? "rgba(255, 234, 0, 0.3)" : "rgba(0, 255, 255, 0.3)" }}>
            <div className="stat-item">
              <span style={{ color: gameMode === "GALLERY" ? "rgba(255, 234, 0, 0.5)" : "rgba(255, 255, 255, 0.5)" }}>
                {gameMode === "ARENA" ? "PILOT SCORE:" : "TARGET SCORE:"}
              </span>
              <span style={{ color: gameMode === "GALLERY" ? "var(--neon-yellow)" : "var(--neon-cyan)" }}>{playerScore}</span>
            </div>
            <div className="stat-item">
              <span>{gameMode === "ARENA" ? "DRONE KILLS:" : "RECORD RECORD:"}</span>
              <span style={{ color: gameMode === "GALLERY" ? "var(--neon-yellow)" : "var(--neon-cyan)" }}>
                {gameMode === "ARENA" ? `${droneKills} / 5` : `${highScore}`}
              </span>
            </div>
            <div className="stat-item ammo-item">
              <span>BLASTER CORE:</span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px", color: gameMode === "GALLERY" ? "var(--neon-yellow)" : "var(--neon-cyan)", textShadow: gameMode === "GALLERY" ? "0 0 5px var(--neon-yellow)" : "0 0 5px var(--neon-cyan)" }}>
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
