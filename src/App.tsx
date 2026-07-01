import React, { useEffect, useRef, useState } from "react";
import { GameManager, GameUIState } from "./game/GameManager";
import { LoadingScreen } from "./components/LoadingScreen";
import { HUDOverlay } from "./components/HUDOverlay";
import { GameMenu } from "./components/GameMenu";
import { sounds } from "./game/SoundEffects";
import "./App.css";

export const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameManagerRef = useRef<GameManager | null>(null);

  // loading state
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // game state
  const [uiState, setUiState] = useState<GameUIState>({
    playerHealth: 100,
    playerShield: 100,
    playerScore: 0,
    enemyHealth: 100,
    enemyState: "PATROL",
    gameStatus: "START",
    droneKills: 0,
    playerX: 0,
    playerZ: 25,
    enemyX: 0,
    enemyZ: -25,
  });

  // Handle escape key to pause/resume
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape" && isLoaded) {
        const mgr = gameManagerRef.current;
        if (!mgr) return;

        if (uiState.gameStatus === "PLAYING") {
          mgr.pauseGame();
        } else if (uiState.gameStatus === "PAUSED") {
          mgr.resumeGame();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoaded, uiState.gameStatus]);

  // Handle game loop and manager instantiation
  useEffect(() => {
    if (!isLoaded || !containerRef.current || !canvasRef.current) return;

    // Instantiate game manager
    const manager = new GameManager(
      containerRef.current,
      canvasRef.current,
      (updatedState) => {
        setUiState(updatedState);
      }
    );

    gameManagerRef.current = manager;

    return () => {
      if (gameManagerRef.current) {
        gameManagerRef.current.dispose();
        gameManagerRef.current = null;
      }
    };
  }, [isLoaded]);

  // Audio Control
  const handleToggleMute = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="app-container" ref={containerRef}>
      {/* 3D Game Canvas */}
      <div className="game-canvas-container">
        <canvas className="game-canvas" ref={canvasRef}></canvas>
      </div>

      {/* Cyber Pilot HUD Layer */}
      {isLoaded && (
        <HUDOverlay
          {...uiState}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Holographic Menus (Start, Game Over, Victory, Pause) */}
      {isLoaded && (
        <GameMenu
          gameStatus={uiState.gameStatus}
          onStart={() => gameManagerRef.current?.startGame()}
          onResume={() => gameManagerRef.current?.resumeGame()}
          onRestart={() => gameManagerRef.current?.restartGame()}
          score={uiState.playerScore}
          droneKills={uiState.droneKills}
        />
      )}

      {/* Simulated Boot Progress */}
      {!isLoaded && (
        <LoadingScreen onComplete={() => setIsLoaded(true)} />
      )}
    </div>
  );
};

export default App;
