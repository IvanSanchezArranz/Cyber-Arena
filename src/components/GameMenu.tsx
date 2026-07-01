import React from "react";

interface GameMenuProps {
  gameStatus: "START" | "PLAYING" | "PAUSED" | "GAMEOVER" | "VICTORY";
  onStart: () => void;
  onResume: () => void;
  onRestart: () => void;
  score: number;
  droneKills: number;
}

export const GameMenu: React.FC<GameMenuProps> = ({
  gameStatus,
  onStart,
  onResume,
  onRestart,
  score,
  droneKills,
}) => {
  if (gameStatus === "PLAYING") return null;

  return (
    <div className="menu-layer">
      {gameStatus === "START" && (
        <div className="menu-card">
          <div className="menu-title cyan">CYBER-ARENA</div>
          <div className="menu-subtitle">TACTICAL PILOT HUD v1.0.4</div>
          <div className="menu-desc">
            Welcome, Pilot. Access has been restricted. You must infiltrate the cyber-grid and destroy the heavy AI guard drone <strong>5 times</strong> to bypass security and override the firewall.
          </div>
          
          <div className="controls-hint-list">
            <div className="controls-hint-row">
              <span>MOVE FORWARD / BACK:</span>
              <span className="controls-key">W / S (or UP / DOWN)</span>
            </div>
            <div className="controls-hint-row">
              <span>STRAFE LEFT / RIGHT:</span>
              <span className="controls-key">A / D</span>
            </div>
            <div className="controls-hint-row">
              <span>LOOK AROUND:</span>
              <span className="controls-key">ARROW KEYS (or Drag Mouse)</span>
            </div>
            <div className="controls-hint-row">
              <span>FIRE PLASMA BLASTER:</span>
              <span className="controls-key">SPACE BAR (or Click)</span>
            </div>
            <div className="controls-hint-row">
              <span>PAUSE SYSTEM:</span>
              <span className="controls-key">ESCAPE KEY</span>
            </div>
          </div>

          <button className="cyber-button" onClick={onStart}>
            INITIALIZE SIMULATION
          </button>
        </div>
      )}

      {gameStatus === "PAUSED" && (
        <div className="menu-card">
          <div className="menu-title cyan">SIMULATION PAUSED</div>
          <div className="menu-subtitle">SYSTEM HOLD ACTIVE</div>
          <div className="menu-desc">
            Simulation loop paused. Vitals, ammo levels, and drone coordinates have been held at status freeze.
          </div>
          
          <button className="cyber-button" style={{ marginBottom: "12px" }} onClick={onResume}>
            RESUME SIMULATION
          </button>
          <button className="cyber-button" style={{ border: "1px solid rgba(255,255,255,0.2)", color: "#a0aec0" }} onClick={onRestart}>
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

          <button className="cyber-button" style={{ borderColor: "#ff3333", color: "#ff3333" }} onClick={onRestart}>
            RE-INJECT LOGINS
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

          <button className="cyber-button" style={{ borderColor: "var(--neon-yellow)", color: "var(--neon-yellow)" }} onClick={onRestart}>
            RUN SIMULATION AGAIN
          </button>
        </div>
      )}
    </div>
  );
};
