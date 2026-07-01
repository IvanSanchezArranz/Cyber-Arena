import React from "react";

interface GameMenuProps {
  gameStatus: "START" | "PLAYING" | "PAUSED" | "GAMEOVER" | "VICTORY" | "TIMEOUT";
  onStart: (mode: "ARENA" | "GALLERY") => void;
  onResume: () => void;
  onRestart: (mode: "ARENA" | "GALLERY") => void;
  score: number;
  droneKills: number;
  gameMode: "ARENA" | "GALLERY";
  highScore: number;
}

export const GameMenu: React.FC<GameMenuProps> = ({
  gameStatus,
  onStart,
  onResume,
  onRestart,
  score,
  droneKills,
  gameMode,
  highScore,
}) => {
  if (gameStatus === "PLAYING") return null;

  return (
    <div className="menu-layer">
      {gameStatus === "START" && (
        <div className="menu-card" style={{ width: "450px" }}>
          <div className="menu-title cyan">TACTICAL GRID</div>
          <div className="menu-subtitle">PILOT PILOT CONTROL DECK v1.2.0</div>
          
          <div className="menu-desc" style={{ marginBottom: "16px" }}>
            Select your training protocol. You can either test your survival skills in combat or practice your aim in the time-limited shooting range.
          </div>
          
          <div className="controls-hint-list" style={{ marginBottom: "20px", padding: "10px 0" }}>
            <div className="controls-hint-row">
              <span>W/A/S/D (or ARROWS):</span>
              <span className="controls-key">MOVE</span>
            </div>
            <div className="controls-hint-row">
              <span>MOUSE (or ARROW KEYS):</span>
              <span className="controls-key">LOOK</span>
            </div>
            <div className="controls-hint-row">
              <span>SPACE (or CLICK):</span>
              <span className="controls-key">FIRE BLASTER</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
            {/* Mode 1: Combat Arena */}
            <div style={{
              background: "rgba(0, 255, 255, 0.03)",
              border: "1px solid rgba(0, 255, 255, 0.15)",
              borderRadius: "4px",
              padding: "16px",
              textAlign: "left"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontFamily: "var(--font-title)", fontWeight: 700, fontSize: "14px", color: "var(--neon-cyan)" }}>
                  PROTOCOL A: ARENA COMBAT
                </span>
                <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(255, 51, 51, 0.2)", border: "1px solid #ff3333", borderRadius: "2px", color: "#ff3333" }}>SURVIVAL</span>
              </div>
              <p style={{ fontSize: "12px", margin: "0 0 12px 0", color: "#a0aec0" }}>
                Neutralize the evasive combat drone 5 times. Beware of its Triple Burst and Heavy Charged Laser spreads.
              </p>
              <button className="cyber-button" style={{ width: "100%", padding: "8px 0" }} onClick={() => onStart("ARENA")}>
                LAUNCH ARENA COMBAT
              </button>
            </div>

            {/* Mode 2: Shooting Gallery */}
            <div style={{
              background: "rgba(255, 234, 0, 0.03)",
              border: "1px solid rgba(255, 234, 0, 0.15)",
              borderRadius: "4px",
              padding: "16px",
              textAlign: "left"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontFamily: "var(--font-title)", fontWeight: 700, fontSize: "14px", color: "var(--neon-yellow)" }}>
                  PROTOCOL B: SHOOTING GALLERY
                </span>
                <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(0, 255, 102, 0.2)", border: "1px solid #00ff66", borderRadius: "2px", color: "#00ff66" }}>AIM WARMUP</span>
              </div>
              <p style={{ fontSize: "12px", margin: "0 0 12px 0", color: "#a0aec0" }}>
                Time-limited 60-second aim practice. Destroy as many floating octane targets as possible.
              </p>
              {highScore > 0 && (
                <div style={{ fontSize: "11px", fontFamily: "var(--font-cyber)", color: "var(--neon-yellow)", marginBottom: "8px" }}>
                  CURRENT PERSONAL RECORD: {highScore} PTS
                </div>
              )}
              <button className="cyber-button" style={{ width: "100%", padding: "8px 0", borderColor: "var(--neon-yellow)", color: "var(--neon-yellow)" }} onClick={() => onStart("GALLERY")}>
                LAUNCH SHOOTING GALLERY
              </button>
            </div>
          </div>
        </div>
      )}

      {gameStatus === "PAUSED" && (
        <div className="menu-card">
          <div className="menu-title cyan">SIMULATION PAUSED</div>
          <div className="menu-subtitle">SYSTEM HOLD ACTIVE</div>
          <div className="menu-desc">
            Simulation loop paused. Vitals, timers, and target locations have been held in status freeze.
          </div>
          
          <button className="cyber-button" style={{ marginBottom: "12px", width: "100%" }} onClick={onResume}>
            RESUME SIMULATION
          </button>
          <button className="cyber-button" style={{ border: "1px solid rgba(255,255,255,0.2)", color: "#a0aec0", width: "100%" }} onClick={() => onRestart(gameMode)}>
            ABORT & RESTART
          </button>
        </div>
      )}

      {gameStatus === "GAMEOVER" && (
        <div className="menu-card" style={{ border: "2px solid rgba(255, 51, 51, 0.4)", boxShadow: "0 0 35px rgba(255, 51, 51, 0.15)" }}>
          <div className="menu-title red">VITALS CRITICAL</div>
          <div className="menu-subtitle">CONNECTION TERMINATED</div>
          <div className="menu-desc">
            Your shields collapsed and pilot armor was compromised. The guard drone successfully eliminated your signature.
          </div>

          <div className="controls-hint-list">
            <div className="controls-hint-row">
              <span>DRONES ELIMINATED:</span>
              <span style={{ color: "#ff3333" }}>{droneKills} / 5</span>
            </div>
            <div className="controls-hint-row">
              <span>FINAL SCORE:</span>
              <span style={{ color: "#ffea00" }}>{score} pts</span>
            </div>
          </div>

          <button className="cyber-button" style={{ borderColor: "#ff3333", color: "#ff3333", width: "100%", marginBottom: "12px" }} onClick={() => onRestart("ARENA")}>
            RE-INJECT LOGINS (ARENA)
          </button>
          <button className="cyber-button" style={{ border: "1px solid rgba(255,255,255,0.15)", color: "#e2e8f0", width: "100%" }} onClick={() => onRestart("GALLERY")}>
            SWITCH TO AIM RANGE (GALLERY)
          </button>
        </div>
      )}

      {gameStatus === "VICTORY" && (
        <div className="menu-card" style={{ border: "2px solid var(--neon-yellow)", boxShadow: "0 0 35px rgba(255, 234, 0, 0.2)" }}>
          <div className="menu-title gold">SYSTEM BYPASSED</div>
          <div className="menu-subtitle">FIREWALL OVERRIDDEN</div>
          <div className="menu-desc">
            Outstanding piloting! You neutralized the guard drone 5 times, fully hacking into the core grid. Systems are now fully under your control.
          </div>

          <div className="controls-hint-list">
            <div className="controls-hint-row">
              <span>TOTAL SCORE:</span>
              <span style={{ color: "var(--neon-yellow)" }}>{score} pts</span>
            </div>
            <div className="controls-hint-row">
              <span>RATING:</span>
              <span style={{ color: "var(--neon-cyan)" }}>ELITE COMMANDER</span>
            </div>
          </div>

          <button className="cyber-button" style={{ borderColor: "var(--neon-yellow)", color: "var(--neon-yellow)", width: "100%", marginBottom: "12px" }} onClick={() => onRestart("ARENA")}>
            RUN SIMULATION AGAIN
          </button>
          <button className="cyber-button" style={{ border: "1px solid rgba(255,255,255,0.15)", color: "#e2e8f0", width: "100%" }} onClick={() => onRestart("GALLERY")}>
            SWITCH TO AIM RANGE (GALLERY)
          </button>
        </div>
      )}

      {gameStatus === "TIMEOUT" && (
        <div className="menu-card" style={{ border: "2px solid var(--neon-yellow)", boxShadow: "0 0 35px rgba(255, 234, 0, 0.2)" }}>
          <div className="menu-title gold">PRACTICE COMPLETE</div>
          <div className="menu-subtitle">60S WARMUP TIMER EXPIRED</div>
          <div className="menu-desc">
            Your aiming session has concluded. High-fidelity analytics registered your combat blaster performance metrics.
          </div>

          <div className="controls-hint-list">
            <div className="controls-hint-row">
              <span>TARGETS ELIMINATED:</span>
              <span style={{ color: "var(--neon-cyan)" }}>{score / 100}</span>
            </div>
            <div className="controls-hint-row">
              <span>SCORE RECORDED:</span>
              <span style={{ color: "var(--neon-yellow)" }}>{score} pts</span>
            </div>
            {score >= highScore && score > 0 && (
              <div style={{ color: "#00ff66", fontWeight: "bold", fontSize: "12px", textAlign: "center", marginTop: "8px", textTransform: "uppercase" }}>
                ★ NEW PERSONAL BEST RECORD ★
              </div>
            )}
          </div>

          <button className="cyber-button" style={{ borderColor: "var(--neon-yellow)", color: "var(--neon-yellow)", width: "100%", marginBottom: "12px" }} onClick={() => onRestart("GALLERY")}>
            REPLAY AIM TRAINING
          </button>
          <button className="cyber-button" style={{ border: "1px solid rgba(255,255,255,0.15)", color: "#e2e8f0", width: "100%" }} onClick={() => onRestart("ARENA")}>
            LAUNCH COMBAT ARENA
          </button>
        </div>
      )}
    </div>
  );
};
