"use client";

import type React from "react";
import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface BloodStain {
  x: number;
  y: number;
  size: number;
  opacity: number;
  angle: number;
}

interface Player {
  x: number;
  health: number;
  isActive: boolean;
}

interface Arrow {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  trail: { x: number; y: number }[];
  shooterId: number;
}

interface BloodParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface Camera {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}

interface GameState {
  players: Player[];
  arrows: Arrow[];
  bloodParticles: BloodParticle[];
  bloodStains: BloodStain[]; // <- ADICIONAR esta linha
  currentPlayer: number;
  gamePhase: "menu" | "playing" | "gameOver";
  winner: number | null;
  isAiming: boolean;
  aimStartX: number;
  aimStartY: number;
  aimCurrentX: number;
  aimCurrentY: number;
  turnInProgress: boolean;
  camera: Camera;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const WORLD_WIDTH = 1400;
const GROUND_HEIGHT = 100;
const GROUND_Y = CANVAS_HEIGHT - GROUND_HEIGHT;
const GRAVITY = 0.3;
const MAX_POWER = 25;

export default function BowmanGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>({
    players: [
      { x: 100, health: 100, isActive: true },
      { x: 1200, health: 100, isActive: true },
    ],
    arrows: [],
    bloodParticles: [],
    bloodStains: [], // <- ADICIONAR esta linha
    currentPlayer: 1,
    gamePhase: "menu",
    winner: null,
    isAiming: false,
    aimStartX: 0,
    aimStartY: 0,
    aimCurrentX: 0,
    aimCurrentY: 0,
    turnInProgress: false,
    camera: { x: 0, y: 0, targetX: 0, targetY: 0 },
  });

  const animationRef = useRef<number | null>(null);
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameOver">(
    "menu"
  );
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [winner, setWinner] = useState<number | null>(null);
  const [players, setPlayers] = useState<Player[]>([
    { x: 100, health: 100, isActive: true },
    { x: 1200, health: 100, isActive: true },
  ]);

  const updateCamera = () => {
    const currentGameState = gameStateRef.current;
    const camera = currentGameState.camera;

    const activeArrow = currentGameState.arrows.find((a) => a.active);

    if (activeArrow) {
      camera.targetX = activeArrow.x - CANVAS_WIDTH / 2;
      camera.targetY = 0;
    } else if (!currentGameState.turnInProgress) {
      const currentPlayerObj =
        currentGameState.players[currentGameState.currentPlayer - 1];
      camera.targetX = currentPlayerObj.x - CANVAS_WIDTH / 2;
      camera.targetY = 0;
    }

    camera.targetX = Math.max(
      0,
      Math.min(WORLD_WIDTH - CANVAS_WIDTH, camera.targetX)
    );
    camera.targetY = 0;

    const lerpFactor = activeArrow ? 0.1 : 0.05;
    camera.x += (camera.targetX - camera.x) * lerpFactor;
    camera.y += (camera.targetY - camera.y) * lerpFactor;
  };

  const calculateAimValues = () => {
    const currentGameState = gameStateRef.current;
    if (!currentGameState.isAiming) return { angle: 0, power: 0, direction: 1 };

    const player = currentGameState.players[currentGameState.currentPlayer - 1];
    const camera = currentGameState.camera;

    const worldMouseX = currentGameState.aimCurrentX + camera.x;
    const worldMouseY = currentGameState.aimCurrentY + camera.y;

    const dx = worldMouseX - player.x;
    const dy = worldMouseY - (GROUND_Y - 25);

    let angle = Math.atan2(-dy, Math.abs(dx)) * (180 / Math.PI);
    angle = Math.max(-85, Math.min(85, angle));

    const horizontalDistance = Math.abs(dx);
    const power = Math.min(100, Math.max(5, (horizontalDistance / 200) * 100));

    const direction = dx >= 0 ? 1 : -1;

    return { angle, power, direction };
  };

  const createBloodParticles = (x: number, y: number, count = 8) => {
    const currentGameState = gameStateRef.current;

    // Partículas de sangue temporárias
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 3;

      currentGameState.bloodParticles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 2,
        life: 60 + Math.random() * 40,
        maxLife: 60 + Math.random() * 40,
      });
    }

    // Criar manchas de sangue permanentes no chão
    for (let i = 0; i < 3 + Math.random() * 4; i++) {
      currentGameState.bloodStains.push({
        x: x + (Math.random() - 0.5) * 80,
        y: GROUND_Y + Math.random() * 15,
        size: 3 + Math.random() * 8,
        opacity: 0.3 + Math.random() * 0.4,
        angle: Math.random() * Math.PI * 2,
      });
    }
  };
  // SUBSTITUIR a função drawBloodStains (remover o "xiadinho")
  const drawBloodStains = (ctx: CanvasRenderingContext2D) => {
    const currentGameState = gameStateRef.current;
    const camera = currentGameState.camera;

    currentGameState.bloodStains.forEach((stain) => {
      const screenX = stain.x - camera.x;
      const screenY = stain.y - camera.y;

      if (
        screenX >= -20 &&
        screenX <= CANVAS_WIDTH + 20 &&
        screenY >= -20 &&
        screenY <= CANVAS_HEIGHT + 20
      ) {
        // Sangue principal - SEM random para evitar "xiadinho"
        ctx.fillStyle = `rgba(120, 15, 15, ${stain.opacity})`;
        ctx.beginPath();
        ctx.ellipse(
          screenX,
          screenY,
          stain.size,
          stain.size * 0.6,
          stain.angle,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    });
  };

  // SUBSTITUIR completamente a função draw (corrigir todos os problemas)
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentGameState = gameStateRef.current;
    const camera = currentGameState.camera;

    // Limpar canvas completamente
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // === FUNDO ÉPICO CORRIGIDO ===
    // Céu com múltiplas camadas
    const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT * 0.7);
    skyGradient.addColorStop(0, "#1e3a8a");
    skyGradient.addColorStop(0.3, "#3b82f6");
    skyGradient.addColorStop(0.6, "#60a5fa");
    skyGradient.addColorStop(1, "#bfdbfe");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Nuvens distantes (usando valores fixos baseados na posição, sem random)
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    const cloudOffset1 = camera.x * 0.1;
    for (let i = 0; i < 8; i++) {
      const cloudX = ((i * 180 - cloudOffset1) % (CANVAS_WIDTH + 200)) - 100;
      const cloudY = 40 + Math.sin(i * 0.7) * 20;

      if (cloudX > -100 && cloudX < CANVAS_WIDTH + 100) {
        ctx.beginPath();
        ctx.arc(cloudX, cloudY, 25, 0, Math.PI * 2);
        ctx.arc(cloudX + 20, cloudY, 35, 0, Math.PI * 2);
        ctx.arc(cloudX + 40, cloudY, 25, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Nuvens médias
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    const cloudOffset2 = camera.x * 0.2;
    for (let i = 0; i < 6; i++) {
      const cloudX = ((i * 220 - cloudOffset2) % (CANVAS_WIDTH + 240)) - 120;
      const cloudY = 80 + Math.cos(i * 1.2) * 15;

      if (cloudX > -120 && cloudX < CANVAS_WIDTH + 120) {
        ctx.beginPath();
        ctx.arc(cloudX, cloudY, 18, 0, Math.PI * 2);
        ctx.arc(cloudX + 15, cloudY, 25, 0, Math.PI * 2);
        ctx.arc(cloudX + 30, cloudY, 18, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // === MONTANHAS CORRIGIDAS ===
    ctx.fillStyle = "rgba(51, 65, 85, 0.6)";
    const mountainOffset = camera.x * 0.3;

    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT * 0.7);

    // Criar pontos das montanhas de forma mais controlada
    const mountainPoints = [];
    for (let i = 0; i <= 15; i++) {
      const x = i * 100 - mountainOffset;
      const height = 60 + Math.sin(i * 0.5) * 30 + Math.cos(i * 0.8) * 20;
      mountainPoints.push({ x, y: CANVAS_HEIGHT * 0.7 - height });
    }

    // Desenhar as montanhas apenas na área visível
    mountainPoints.forEach((point, index) => {
      if (point.x >= -200 && point.x <= CANVAS_WIDTH + 200) {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      }
    });

    // Fechar o path corretamente
    ctx.lineTo(CANVAS_WIDTH + 200, CANVAS_HEIGHT * 0.7);
    ctx.lineTo(CANVAS_WIDTH + 200, CANVAS_HEIGHT);
    ctx.lineTo(0, CANVAS_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // === CHÃO CORRIGIDO ===
    const groundScreenY = CANVAS_HEIGHT - GROUND_HEIGHT;

    // Base do chão com gradiente
    const groundGradient = ctx.createLinearGradient(
      0,
      groundScreenY,
      0,
      CANVAS_HEIGHT
    );
    groundGradient.addColorStop(0, "#16a34a");
    groundGradient.addColorStop(0.3, "#15803d");
    groundGradient.addColorStop(0.7, "#166534");
    groundGradient.addColorStop(1, "#14532d");
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, groundScreenY, CANVAS_WIDTH, GROUND_HEIGHT);

    // Textura do solo (SEM random para evitar "xiadinho")
    ctx.fillStyle = "rgba(20, 83, 45, 0.3)";
    for (
      let x = Math.floor(camera.x / 8) * 8;
      x < camera.x + CANVAS_WIDTH + 8;
      x += 8
    ) {
      for (let y = groundScreenY + 20; y < CANVAS_HEIGHT; y += 8) {
        // Usar função determinística baseada na posição
        const seed = Math.sin(x * 0.01) * Math.cos(y * 0.01);
        if (seed > 0.4) {
          const screenX = x - camera.x;
          if (screenX >= 0 && screenX <= CANVAS_WIDTH) {
            ctx.fillRect(screenX + seed * 4, y + seed * 4, 2, 2);
          }
        }
      }
    }

    // Desenhar manchas de sangue no chão
    drawBloodStains(ctx);

    // Grama detalhada (SEM random para evitar "xiadinho")
    for (
      let i = Math.floor(camera.x / 10) * 10;
      i < camera.x + CANVAS_WIDTH + 10;
      i += 10
    ) {
      const grassScreenX = i - camera.x;
      if (grassScreenX >= -20 && grassScreenX <= CANVAS_WIDTH + 20) {
        // Grama alta (fundo) - valores determinísticos
        ctx.fillStyle = "#22c55e";
        for (let j = 0; j < 4; j++) {
          const bladeX = grassScreenX + j * 2.5 + Math.sin(i * 0.01 + j) * 1.5;
          const bladeHeight = 8 + Math.sin(i * 0.02 + j) * 2;
          ctx.fillRect(bladeX, groundScreenY - bladeHeight, 1, bladeHeight);
        }

        // Grama média
        ctx.fillStyle = "#16a34a";
        for (let j = 0; j < 3; j++) {
          const bladeX = grassScreenX + j * 3 + Math.cos(i * 0.015 + j) * 1;
          const bladeHeight = 6 + Math.cos(i * 0.025 + j) * 1.5;
          ctx.fillRect(bladeX, groundScreenY - bladeHeight, 1.5, bladeHeight);
        }

        // Pequenas flores (determinísticas)
        const flowerSeed = Math.sin(i * 0.1);
        if (flowerSeed > 0.8) {
          ctx.fillStyle = flowerSeed > 0.9 ? "#fbbf24" : "#f472b6";
          ctx.beginPath();
          ctx.arc(grassScreenX + 5, groundScreenY - 3, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Sangue dos players no chão (SEM random para evitar "xiadinho")
    currentGameState.players.forEach((player, index) => {
      const bloodIntensity = Math.max(0, (100 - player.health) / 100);
      if (bloodIntensity > 0.1) {
        const playerScreenX = player.x - camera.x;

        if (playerScreenX >= -100 && playerScreenX <= CANVAS_WIDTH + 100) {
          // Criar poça de sangue determinística
          for (let i = 0; i < Math.floor(10 * bloodIntensity); i++) {
            const angle = (Math.PI * 2 * i) / Math.floor(10 * bloodIntensity);
            const distance = 15 + Math.sin(i * 0.5) * 20 * bloodIntensity;
            const x = playerScreenX + Math.cos(angle) * distance;
            const y = groundScreenY + 5 + Math.sin(i * 0.3) * 8;

            if (x >= 0 && x <= CANVAS_WIDTH) {
              ctx.fillStyle = `rgba(139, 15, 15, ${0.15 * bloodIntensity})`;
              ctx.beginPath();
              ctx.arc(
                x,
                y,
                3 + Math.sin(i) * 2 * bloodIntensity,
                0,
                Math.PI * 2
              );
              ctx.fill();
            }
          }
        }
      }
    });

    // Resto do código permanece igual
    currentGameState.players.forEach((player, index) => {
      if (player.isActive) {
        const { angle } = calculateAimValues();
        drawStickFigure(
          ctx,
          player.x,
          index === 0,
          true,
          currentGameState.currentPlayer === index + 1,
          angle,
          currentGameState.isAiming &&
            currentGameState.currentPlayer === index + 1
        );
      }
    });

    drawAimingGuide(ctx);
    currentGameState.arrows.forEach((arrow) => drawArrow(ctx, arrow));
    drawBloodParticles(ctx);
    drawUI(ctx);

    if (currentGameState.gamePhase === "gameOver" && currentGameState.winner) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = "#FFF";
      ctx.font = "36px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        `Player ${currentGameState.winner} Venceu!`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2
      );
      ctx.font = "18px Arial";
      ctx.fillText(
        "Clique em 'Jogar Novamente' para uma nova partida",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 40
      );
      ctx.textAlign = "left";
    }
  };
  const updateBloodParticles = () => {
    const currentGameState = gameStateRef.current;

    currentGameState.bloodParticles = currentGameState.bloodParticles.filter(
      (particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.2;
        particle.vx *= 0.98;
        particle.life--;

        return particle.life > 0;
      }
    );
  };

  const drawBloodParticles = (ctx: CanvasRenderingContext2D) => {
    const currentGameState = gameStateRef.current;
    const camera = currentGameState.camera;

    currentGameState.bloodParticles.forEach((particle) => {
      const screenX = particle.x - camera.x;
      const screenY = particle.y - camera.y;

      if (
        screenX >= -10 &&
        screenX <= CANVAS_WIDTH + 10 &&
        screenY >= -10 &&
        screenY <= CANVAS_HEIGHT + 10
      ) {
        const alpha = particle.life / particle.maxLife;
        ctx.fillStyle = `rgba(220, 20, 20, ${alpha})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 2 + Math.random(), 0, Math.PI * 2);
        ctx.fill();
      }
    });
  };

  const drawStickFigure = (
    ctx: CanvasRenderingContext2D,
    worldX: number,
    facingRight: boolean,
    isActive: boolean,
    isCurrentPlayer: boolean,
    aimAngle = 0,
    isAiming = false
  ) => {
    const camera = gameStateRef.current.camera;
    const screenX = worldX - camera.x;
    const screenY = GROUND_Y - camera.y;

    if (
      screenX < -50 ||
      screenX > CANVAS_WIDTH + 50 ||
      screenY < -50 ||
      screenY > CANVAS_HEIGHT + 50
    )
      return;

    ctx.strokeStyle = isActive ? "#000" : "#666";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(screenX, screenY - 40, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(screenX, screenY - 32);
    ctx.lineTo(screenX, screenY - 10);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(screenX, screenY - 10);
    ctx.lineTo(screenX - 8, screenY);
    ctx.moveTo(screenX, screenY - 10);
    ctx.lineTo(screenX + 8, screenY);
    ctx.stroke();

    if (isActive && isCurrentPlayer) {
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;

      if (isAiming) {
        const bowArmAngle = (aimAngle * Math.PI) / 180;
        const bowArmX =
          screenX + Math.cos(bowArmAngle) * 15 * (facingRight ? 1 : -1);
        const bowArmY = screenY - 25 + Math.sin(bowArmAngle) * 15;

        ctx.beginPath();
        ctx.moveTo(screenX, screenY - 25);
        ctx.lineTo(bowArmX, bowArmY);
        ctx.stroke();

        const stringArmX = screenX - (facingRight ? 15 : -15);
        const stringArmY = screenY - 30;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - 25);
        ctx.lineTo(stringArmX, stringArmY);
        ctx.stroke();

        ctx.strokeStyle = "#8B4513";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(
          bowArmX,
          bowArmY,
          15,
          bowArmAngle - Math.PI / 3,
          bowArmAngle + Math.PI / 3
        );
        ctx.stroke();

        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        const stringStart = {
          x: bowArmX + Math.cos(bowArmAngle - Math.PI / 3) * 15,
          y: bowArmY + Math.sin(bowArmAngle - Math.PI / 3) * 15,
        };
        const stringEnd = {
          x: bowArmX + Math.cos(bowArmAngle + Math.PI / 3) * 15,
          y: bowArmY + Math.sin(bowArmAngle + Math.PI / 3) * 15,
        };

        ctx.beginPath();
        ctx.moveTo(stringStart.x, stringStart.y);
        ctx.lineTo(stringArmX, stringArmY);
        ctx.lineTo(stringEnd.x, stringEnd.y);
        ctx.stroke();

        ctx.strokeStyle = "#8B4513";
        ctx.lineWidth = 3;
        const arrowLength = 25;
        const arrowEndX =
          stringArmX +
          Math.cos(bowArmAngle) * arrowLength * (facingRight ? 1 : -1);
        const arrowEndY = stringArmY + Math.sin(bowArmAngle) * arrowLength;

        ctx.beginPath();
        ctx.moveTo(stringArmX, stringArmY);
        ctx.lineTo(arrowEndX, arrowEndY);
        ctx.stroke();

        ctx.fillStyle = "#8B4513";
        ctx.beginPath();
        ctx.arc(arrowEndX, arrowEndY, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - 25);
        ctx.lineTo(screenX + (facingRight ? 15 : -15), screenY - 20);
        ctx.moveTo(screenX, screenY - 25);
        ctx.lineTo(screenX + (facingRight ? -10 : 10), screenY - 30);
        ctx.stroke();

        ctx.strokeStyle = "#8B4513";
        ctx.lineWidth = 3;
        const bowX = screenX + (facingRight ? -15 : 15);
        const bowY = screenY - 25;

        ctx.beginPath();
        ctx.arc(
          bowX,
          bowY,
          12,
          facingRight ? Math.PI * 0.3 : Math.PI * 0.7,
          facingRight ? Math.PI * 1.7 : Math.PI * 1.3
        );
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(screenX, screenY - 25);
      ctx.lineTo(screenX + (facingRight ? 15 : -15), screenY - 20);
      ctx.moveTo(screenX, screenY - 25);
      ctx.lineTo(screenX + (facingRight ? -10 : 10), screenY - 30);
      ctx.stroke();
    }
  };

  const drawAimingGuide = (ctx: CanvasRenderingContext2D) => {
    const currentGameState = gameStateRef.current;
    if (!currentGameState.isAiming || currentGameState.gamePhase !== "playing")
      return;

    const player = currentGameState.players[currentGameState.currentPlayer - 1];
    const camera = currentGameState.camera;
    const { angle, power, direction } = calculateAimValues();

    if (power < 5) return;

    const radians = (angle * Math.PI) / 180;
    const screenX = player.x - camera.x;
    const screenY = GROUND_Y - camera.y;

    ctx.strokeStyle = "rgba(255, 100, 100, 0.8)";
    ctx.lineWidth = 3;
    ctx.setLineDash([]);

    const startX = screenX;
    const startY = screenY - 25;

    for (let i = 1; i <= 5; i++) {
      const distance = i * 20;
      const lineX = startX + Math.cos(radians) * distance * direction;
      const lineY = startY + Math.sin(radians) * distance * direction;

      const lineEndX = lineX + Math.cos(radians) * 8 * direction;
      const lineEndY = lineY + Math.sin(radians) * 8 * direction;

      ctx.beginPath();
      ctx.moveTo(lineX, lineY);
      ctx.lineTo(lineEndX, lineEndY);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(screenX - 40, screenY - 90, 80, 50);

    ctx.fillStyle = "#FFF";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`Ângulo: ${Math.round(angle)}°`, screenX, screenY - 70);
    ctx.fillText(`Força: ${Math.round(power)}%`, screenX, screenY - 50);
    ctx.textAlign = "left";
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, arrow: Arrow) => {
    if (!arrow.active) return;

    const camera = gameStateRef.current.camera;
    const screenX = arrow.x - camera.x;
    const screenY = arrow.y - camera.y;

    ctx.strokeStyle = "rgba(255, 50, 50, 0.6)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < arrow.trail.length - 1; i++) {
      const alpha = (i / arrow.trail.length) * 0.8;
      ctx.globalAlpha = alpha;
      const trailScreenX = arrow.trail[i].x - camera.x;
      const trailScreenY = arrow.trail[i].y - camera.y;
      const trailScreenX2 = arrow.trail[i + 1].x - camera.x;
      const trailScreenY2 = arrow.trail[i + 1].y - camera.y;
      ctx.moveTo(trailScreenX, trailScreenY);
      ctx.lineTo(trailScreenX2, trailScreenY2);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = "#8B4513";
    ctx.fillStyle = "#8B4513";
    ctx.lineWidth = 4;

    const angle = Math.atan2(arrow.vy, arrow.vx);
    const length = 25;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(-length / 2, 0);
    ctx.lineTo(length / 2, 0);
    ctx.stroke();

    ctx.fillStyle = "#654321";
    ctx.beginPath();
    ctx.moveTo(length / 2, 0);
    ctx.lineTo(length / 2 - 10, -5);
    ctx.lineTo(length / 2 - 10, 5);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#FF4444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-length / 2, -3);
    ctx.lineTo(-length / 2 - 8, -6);
    ctx.moveTo(-length / 2, 3);
    ctx.lineTo(-length / 2 - 8, 6);
    ctx.stroke();

    ctx.restore();

    const groundScreenY = GROUND_Y - camera.y;
    if (screenY < groundScreenY) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.beginPath();
      ctx.ellipse(screenX, groundScreenY + 5, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawUI = (ctx: CanvasRenderingContext2D) => {
    const currentGameState = gameStateRef.current;

    // Background com gradiente sutil
    const gradient = ctx.createLinearGradient(0, 0, 0, 80);
    gradient.addColorStop(0, "rgba(15, 23, 42, 0.95)");
    gradient.addColorStop(1, "rgba(15, 23, 42, 0.85)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, 80);

    // Linha decorativa no bottom
    ctx.fillStyle = "rgba(59, 130, 246, 0.8)";
    ctx.fillRect(0, 78, CANVAS_WIDTH, 2);

    // Player cards
    currentGameState.players.forEach((player, index) => {
      const isLeft = index === 0;
      const cardX = isLeft ? 20 : CANVAS_WIDTH - 200;
      const cardY = 15;
      const cardWidth = 180;
      const cardHeight = 50;

      // Card background com bordas arredondadas
      ctx.fillStyle = "rgba(30, 41, 59, 0.9)";
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 8);
      ctx.fill();

      // Borda sutil
      ctx.strokeStyle = "rgba(71, 85, 105, 0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Player indicator (dot)
      const dotX = cardX + 12;
      const dotY = cardY + 15;
      const isCurrentPlayer = currentGameState.currentPlayer === index + 1;

      ctx.fillStyle = isCurrentPlayer ? "#10b981" : "rgba(156, 163, 175, 0.5)";
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Player name
      ctx.fillStyle = "#f8fafc";
      ctx.font = "500 14px 'Inter', system-ui, sans-serif";
      ctx.fillText(`P${index + 1}`, cardX + 25, cardY + 19);

      // Health bar background
      const barX = cardX + 12;
      const barY = cardY + 28;
      const barWidth = cardWidth - 24;
      const barHeight = 8;

      ctx.fillStyle = "rgba(51, 65, 85, 0.8)";
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth, barHeight, 4);
      ctx.fill();

      // Health bar fill
      const healthPercent = Math.max(0, player.health / 100);
      let healthColor;

      if (healthPercent > 0.6) {
        healthColor = "#10b981"; // Green
      } else if (healthPercent > 0.3) {
        healthColor = "#f59e0b"; // Amber
      } else {
        healthColor = "#ef4444"; // Red
      }

      if (healthPercent > 0) {
        ctx.fillStyle = healthColor;
        ctx.beginPath();
        ctx.roundRect(
          barX + 1,
          barY + 1,
          (barWidth - 2) * healthPercent,
          barHeight - 2,
          3
        );
        ctx.fill();

        // Subtle glow effect
        ctx.shadowColor = healthColor;
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Health percentage text
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "400 11px 'Inter', system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(
        `${Math.round(player.health)}%`,
        cardX + cardWidth - 12,
        cardY + 19
      );
      ctx.textAlign = "left";
    });

    // Turn indicator (center)
    if (currentGameState.gamePhase === "playing") {
      const centerX = CANVAS_WIDTH / 2;
      const hasActiveArrow = currentGameState.arrows.some((a) => a.active);

      // Status background
      ctx.fillStyle = "rgba(30, 41, 59, 0.9)";
      ctx.beginPath();
      ctx.roundRect(centerX - 80, 20, 160, 35, 8);
      ctx.fill();

      // Status border
      ctx.strokeStyle = "rgba(71, 85, 105, 0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = "center";

      if (hasActiveArrow) {
        // Tracking arrow status
        ctx.fillStyle = "#f59e0b";
        ctx.font = "500 12px 'Inter', system-ui, sans-serif";
        ctx.fillText("● SEGUINDO", centerX, 35);
        ctx.fillStyle = "#fbbf24";
        ctx.font = "400 10px 'Inter', system-ui, sans-serif";
        ctx.fillText("Flecha em vôo", centerX, 47);
      } else if (currentGameState.turnInProgress) {
        // Awaiting landing status
        ctx.fillStyle = "#ef4444";
        ctx.font = "500 12px 'Inter', system-ui, sans-serif";
        ctx.fillText("● ESPERANDO", centerX, 35);
        ctx.fillStyle = "#fca5a5";
        ctx.font = "400 10px 'Inter', system-ui, sans-serif";
        ctx.fillText("Pousando...", centerX, 47);
      } else if (currentGameState.isAiming) {
        // Aiming status
        ctx.fillStyle = "#3b82f6";
        ctx.font = "500 12px 'Inter', system-ui, sans-serif";
        ctx.fillText("● MIRANDO", centerX, 35);
        ctx.fillStyle = "#93c5fd";
        ctx.font = "400 10px 'Inter', system-ui, sans-serif";
        ctx.fillText("Solte para atirar!", centerX, 47);
      } else {
        // Current turn
        ctx.fillStyle = "#10b981";
        ctx.font = "500 12px 'Inter', system-ui, sans-serif";
        ctx.fillText(`● PLAYER ${currentGameState.currentPlayer}`, centerX, 35);
        ctx.fillStyle = "#6ee7b7";
        ctx.font = "400 10px 'Inter', system-ui, sans-serif";
        ctx.fillText("Sua vez", centerX, 47);
      }

      ctx.textAlign = "left";
    }
  };

  const checkCollision = (arrow: Arrow): boolean => {
    const currentGameState = gameStateRef.current;

    if (arrow.y >= GROUND_Y - 5) {
      return true;
    }

    if (arrow.x < -50 || arrow.x > WORLD_WIDTH + 50) {
      return true;
    }

    for (let i = 0; i < currentGameState.players.length; i++) {
      const player = currentGameState.players[i];
      if (!player.isActive) continue;

      if (i + 1 === arrow.shooterId) continue;

      const dx = arrow.x - player.x;
      const dy = arrow.y - (GROUND_Y - 20);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 30) {
        const isHeadshot = dy < -15;
        const damage = isHeadshot ? 60 : 35;

        createBloodParticles(arrow.x, arrow.y, isHeadshot ? 12 : 8);

        currentGameState.players[i].health = Math.max(
          0,
          currentGameState.players[i].health - damage
        );

        if (currentGameState.players[i].health <= 0) {
          currentGameState.players[i].isActive = false;
          currentGameState.winner = i === 0 ? 2 : 1;
          currentGameState.gamePhase = "gameOver";

          setWinner(currentGameState.winner);
          setGameState("gameOver");
        }

        setPlayers([...currentGameState.players]);
        return true;
      }
    }

    return false;
  };

  const updateArrows = () => {
    const currentGameState = gameStateRef.current;
    let arrowLanded = false;

    currentGameState.arrows = currentGameState.arrows.map((arrow) => {
      if (!arrow.active) return arrow;

      arrow.trail.push({ x: arrow.x, y: arrow.y });
      if (arrow.trail.length > 20) {
        arrow.trail.shift();
      }

      arrow.x += arrow.vx;
      arrow.y += arrow.vy;
      arrow.vy += GRAVITY;

      if (checkCollision(arrow)) {
        arrow.active = false;
        arrowLanded = true;
      }

      return arrow;
    });

    if (arrowLanded && currentGameState.gamePhase === "playing") {
      const hasActiveArrows = currentGameState.arrows.some((a) => a.active);
      if (!hasActiveArrows) {
        currentGameState.turnInProgress = false;
        currentGameState.currentPlayer =
          currentGameState.currentPlayer === 1 ? 2 : 1;
        setCurrentPlayer(currentGameState.currentPlayer);
      }
    }
  };

  const gameLoop = () => {
    if (gameStateRef.current.gamePhase === "playing") {
      updateArrows();
      updateBloodParticles();
      updateCamera();
    }
    draw();
    animationRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    gameLoop();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameStateRef.current.gamePhase !== "playing") return;
    if (gameStateRef.current.turnInProgress) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    gameStateRef.current.isAiming = true;
    gameStateRef.current.aimStartX = mouseX;
    gameStateRef.current.aimStartY = mouseY;
    gameStateRef.current.aimCurrentX = mouseX;
    gameStateRef.current.aimCurrentY = mouseY;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameStateRef.current.isAiming) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    gameStateRef.current.aimCurrentX = mouseX;
    gameStateRef.current.aimCurrentY = mouseY;
  };

  const handleMouseUp = () => {
    if (
      !gameStateRef.current.isAiming ||
      gameStateRef.current.gamePhase !== "playing"
    )
      return;
    if (gameStateRef.current.turnInProgress) return;

    const { angle, power, direction } = calculateAimValues();

    if (power < 10) {
      gameStateRef.current.isAiming = false;
      return;
    }

    const player =
      gameStateRef.current.players[gameStateRef.current.currentPlayer - 1];
    const radians = (angle * Math.PI) / 180;
    const velocity = (power / 100) * MAX_POWER;

    const newArrow: Arrow = {
      x: player.x,
      y: GROUND_Y - 25,
      vx: Math.cos(radians) * velocity * direction,
      vy: Math.sin(radians) * velocity * direction,
      active: true,
      trail: [],
      shooterId: gameStateRef.current.currentPlayer,
    };

    gameStateRef.current.turnInProgress = true;
    gameStateRef.current.arrows = gameStateRef.current.arrows.filter(
      (a) => a.active
    );
    gameStateRef.current.arrows.push(newArrow);
    gameStateRef.current.isAiming = false;
  };

  const startGame = () => {
    const newPlayers = [
      { x: 100, health: 100, isActive: true },
      { x: 1200, health: 100, isActive: true },
    ];

    gameStateRef.current = {
      players: newPlayers,
      arrows: [],
      bloodParticles: [],
      bloodStains: [], // <- ADICIONAR esta linha
      currentPlayer: 1,
      gamePhase: "playing",
      winner: null,
      isAiming: false,
      aimStartX: 0,
      aimStartY: 0,
      aimCurrentX: 0,
      aimCurrentY: 0,
      turnInProgress: false,
      camera: { x: 0, y: 0, targetX: 0, targetY: 0 },
    };

    setGameState("playing");
    setPlayers(newPlayers);
    setCurrentPlayer(1);
    setWinner(null);
  };

  const resetGame = () => {
    gameStateRef.current.gamePhase = "menu";
    gameStateRef.current.arrows = [];
    gameStateRef.current.bloodParticles = [];
    gameStateRef.current.isAiming = false;
    gameStateRef.current.turnInProgress = false;
    setGameState("menu");
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800">Bowman Archery Game</h1>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-2 border-gray-400 bg-white cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      <div className="flex gap-4">
        {gameState === "menu" && (
          <Button onClick={startGame} className="px-6 py-2">
            Iniciar Jogo
          </Button>
        )}

        {gameState === "playing" && (
          <Button
            onClick={resetGame}
            variant="outline"
            className="px-6 py-2 bg-transparent"
          >
            Resetar Jogo
          </Button>
        )}

        {gameState === "gameOver" && (
          <Button onClick={startGame} className="px-6 py-2">
            Jogar Novamente
          </Button>
        )}
      </div>

      <div className="text-sm text-gray-600 max-w-md text-center">
        <p>
          <strong>Como jogar:</strong> A câmera segue você e depois a flecha!
          Calcule bem a trajetória para acertar o oponente que está longe. Agora
          com maior alcance e precisão!
        </p>
      </div>
    </div>
  );
}
