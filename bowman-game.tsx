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
    const isPlayer1 = currentGameState.currentPlayer === 1;

    // Movimento do mouse desde o clique inicial
    const horizontalMovement =
      currentGameState.aimCurrentX - currentGameState.aimStartX;
    const verticalMovement =
      currentGameState.aimCurrentY - currentGameState.aimStartY;

    // ÂNGULO: baseado no movimento VERTICAL, mas invertido para player 2
    let angle;
    if (isPlayer1) {
      angle = Math.max(-85, Math.min(85, -verticalMovement * 0.5)); // Player 1 normal
    } else {
      angle = Math.max(-85, Math.min(85, verticalMovement * 0.5)); // Player 2 invertido
    }

    // FORÇA: baseada apenas no movimento HORIZONTAL (esquerda/direita)
    const horizontalDistance = Math.abs(horizontalMovement);
    let power = Math.min(100, Math.max(5, (horizontalDistance / 100) * 100));

    // INVERSÃO DA FORÇA baseada no jogador e direção do movimento:
    // Player 1 (verde): força aumenta movendo para ESQUERDA (horizontalMovement negativo)
    // Player 2 (roxo): força aumenta movendo para DIREITA (horizontalMovement positivo)
    if (isPlayer1 && horizontalMovement > 0) {
      power = 100 - power + 10; // Inverte quando move para direita
    }

    if (!isPlayer1 && horizontalMovement < 0) {
      power = 100 - power + 10; // Inverte quando move para esquerda
    }

    // DIREÇÃO: sempre fixa baseada no jogador (Player 1 atira para direita, Player 2 para esquerda)
    const direction = isPlayer1 ? 1 : -1;

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
      screenX < -80 ||
      screenX > CANVAS_WIDTH + 80 ||
      screenY < -80 ||
      screenY > CANVAS_HEIGHT + 80
    )
      return;

    // Definir cores dos players (Player 1 = Verde, Player 2 = Roxo)
    const currentGameState = gameStateRef.current;
    const playerIndex = currentGameState.players.findIndex(
      (p) => Math.abs(p.x - worldX) < 10
    );
    const isPlayer1 = playerIndex === 0;

    // Cores baseadas no player e estado
    const skinColor = isActive ? "#fdbcb4" : "#d5dbdb";
    const tunicColor = isPlayer1 ? "#22c55e" : "#7c3aed"; // Verde vs Roxo
    const tunicDark = isPlayer1 ? "#16a34a" : "#5b21b6";
    const leatherColor = "#8b4513";
    const beardColor = "#654321";
    const hatColor = isPlayer1 ? "#15803d" : "#4c1d95";
    const bowColor = "#8B4513";
    const stringColor = "#654321";

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // === CABEÇA E CHAPÉU ===
    // Cabeça principal (pele)
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(screenX, screenY - 40, 12, 0, Math.PI * 2);
    ctx.fill();

    // Contorno da cabeça
    ctx.strokeStyle = "#2c3e50";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // === CHAPÉU DE ARQUEIRO ===
    ctx.fillStyle = hatColor;
    ctx.beginPath();
    // Base do chapéu
    ctx.ellipse(screenX, screenY - 48, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Copa do chapéu (cônica)
    ctx.beginPath();
    ctx.moveTo(screenX - 10, screenY - 48);
    ctx.quadraticCurveTo(screenX, screenY - 58, screenX + 10, screenY - 48);
    ctx.fill();

    // Contorno do chapéu
    ctx.strokeStyle = "#2c3e50";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pluma no chapéu
    ctx.strokeStyle = isPlayer1 ? "#ef4444" : "#f59e0b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(screenX + 8, screenY - 52);
    ctx.lineTo(screenX + 12, screenY - 60);
    ctx.moveTo(screenX + 10, screenY - 58);
    ctx.lineTo(screenX + 14, screenY - 62);
    ctx.stroke();

    // === BARBA ===
    ctx.fillStyle = beardColor;
    ctx.beginPath();
    ctx.ellipse(screenX, screenY - 30, 8, 6, 0, 0, Math.PI);
    ctx.fill();

    // Detalhes da barba
    ctx.strokeStyle = "#4a3728";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const barbX = screenX - 6 + i * 3;
      ctx.beginPath();
      ctx.moveTo(barbX, screenY - 32);
      ctx.lineTo(barbX + Math.sin(i) * 2, screenY - 25);
      ctx.stroke();
    }

    // Olhos - ajustados para direção correta
    ctx.fillStyle = "#2c3e50";
    const eyeOffset = isPlayer1 ? 3 : -3; // Player 1 olha direita, Player 2 esquerda
    ctx.beginPath();
    ctx.arc(screenX + eyeOffset, screenY - 42, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Pupila
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(screenX + eyeOffset, screenY - 42, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Sobrancelha
    ctx.strokeStyle = beardColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(screenX + eyeOffset - 3, screenY - 44);
    ctx.lineTo(screenX + eyeOffset + 3, screenY - 44);
    ctx.stroke();

    // === TÚNICA DE ARQUEIRO ===
    // Túnica principal
    ctx.fillStyle = tunicColor;
    ctx.beginPath();
    ctx.roundRect(screenX - 10, screenY - 28, 20, 24, 4);
    ctx.fill();

    // Contorno da túnica
    ctx.strokeStyle = tunicDark;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cinto de couro
    ctx.fillStyle = leatherColor;
    ctx.fillRect(screenX - 10, screenY - 12, 20, 4);

    // Fivela do cinto
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.roundRect(screenX - 2, screenY - 11, 4, 2, 1);
    ctx.fill();

    // Detalhes da túnica (bordados)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(screenX - 8, screenY - 20);
    ctx.lineTo(screenX + 8, screenY - 20);
    ctx.moveTo(screenX - 6, screenY - 16);
    ctx.lineTo(screenX + 6, screenY - 16);
    ctx.stroke();

    // Emblema no peito
    ctx.fillStyle = tunicDark;
    ctx.beginPath();
    ctx.arc(screenX, screenY - 18, 3, 0, Math.PI * 2);
    ctx.fill();

    // Símbolo do arco no emblema
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(screenX, screenY - 18, 2, Math.PI * 0.3, Math.PI * 1.7);
    ctx.stroke();

    // === CALÇAS E BOTAS ===
    // Calças
    ctx.fillStyle = "#654321";
    ctx.strokeStyle = "#4a3728";
    ctx.lineWidth = 3;

    // Perna esquerda
    ctx.beginPath();
    ctx.moveTo(screenX - 4, screenY - 4);
    ctx.lineTo(screenX - 8, screenY + 8);
    ctx.stroke();

    // Perna direita
    ctx.beginPath();
    ctx.moveTo(screenX + 4, screenY - 4);
    ctx.lineTo(screenX + 8, screenY + 8);
    ctx.stroke();

    // Botas de couro
    ctx.fillStyle = leatherColor;
    ctx.beginPath();
    ctx.ellipse(screenX - 8, screenY + 8, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(screenX + 8, screenY + 8, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Detalhes das botas
    ctx.strokeStyle = "#5d4037";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(screenX - 12, screenY + 6);
    ctx.lineTo(screenX - 4, screenY + 6);
    ctx.moveTo(screenX + 4, screenY + 6);
    ctx.lineTo(screenX + 12, screenY + 6);
    ctx.stroke();

    // === ALJAVA (PORTA-FLECHAS) ===
    const quiverX = screenX + (isPlayer1 ? -12 : 12); // Player 1 aljava esquerda, Player 2 direita
    const quiverY = screenY - 15;

    ctx.fillStyle = leatherColor;
    ctx.beginPath();
    ctx.roundRect(quiverX - 3, quiverY - 8, 6, 16, 2);
    ctx.fill();

    // Alça da aljava
    ctx.strokeStyle = leatherColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(quiverX, quiverY - 10, 8, Math.PI * 0.8, Math.PI * 1.2);
    ctx.stroke();

    // Flechas na aljava
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(quiverX - 1 + i, quiverY - 6);
      ctx.lineTo(quiverX - 1 + i, quiverY - 12);
      ctx.stroke();
    }

    // === ARCO E ANIMAÇÃO CORRIGIDOS ===
    if (isActive && isCurrentPlayer) {
      const radians = (aimAngle * Math.PI) / 180;

      if (isAiming) {
        // === MODO MIRANDO - ARCO TENSIONADO ===

        // Posicionamento baseado no player
        const bowSide = isPlayer1 ? 1 : -1; // Player 1 segura à direita, Player 2 à esquerda
        const aimDirection = isPlayer1 ? 1 : -1; // Player 1 mira direita, Player 2 esquerda

        // Braço que segura o arco
        const bowArmAngle = radians + (Math.PI / 6) * bowSide;
        const bowArmX = screenX + Math.cos(bowArmAngle) * 20 * bowSide;
        const bowArmY = screenY - 25 + Math.sin(bowArmAngle) * 20;

        // Braço que segura o arco
        ctx.strokeStyle = skinColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - 25);
        ctx.lineTo(bowArmX, bowArmY);
        ctx.stroke();

        // Braçadeira de couro
        ctx.fillStyle = leatherColor;
        const armguardX = screenX + Math.cos(bowArmAngle) * 12 * bowSide;
        const armguardY = screenY - 25 + Math.sin(bowArmAngle) * 12;
        ctx.beginPath();
        ctx.roundRect(armguardX - 2, armguardY - 4, 4, 8, 1);
        ctx.fill();

        // Braço que puxa a corda
        const { power } = calculateAimValues();
        const pullDistance = 18 + (power / 100) * 12;

        const stringArmX = screenX - bowSide * pullDistance;
        const stringArmY = screenY - 25 + Math.sin(radians) * 8 * aimDirection;

        // Braço da corda
        ctx.strokeStyle = skinColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - 25);
        ctx.lineTo(stringArmX, stringArmY);
        ctx.stroke();

        // Luva de arqueiro
        ctx.fillStyle = leatherColor;
        ctx.beginPath();
        ctx.arc(stringArmX, stringArmY, 3, 0, Math.PI * 2);
        ctx.fill();

        // === ARCO DETALHADO ===
        ctx.strokeStyle = bowColor;
        ctx.lineWidth = 6;

        // Arco principal (orientado corretamente por player)
        const bowRadius = 20;
        const bowStartAngle = radians - (Math.PI / 2.2) * aimDirection;
        const bowEndAngle = radians + (Math.PI / 2.2) * aimDirection;

        ctx.beginPath();
        ctx.arc(bowArmX, bowArmY, bowRadius, bowStartAngle, bowEndAngle);
        ctx.stroke();

        // Detalhes do arco
        ctx.strokeStyle = "#654321";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bowArmX, bowArmY, bowRadius - 2, bowStartAngle, bowEndAngle);
        ctx.stroke();

        // Empunhadura do arco
        ctx.fillStyle = leatherColor;
        ctx.beginPath();
        ctx.arc(bowArmX, bowArmY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Pontas do arco
        ctx.fillStyle = "#2c3e50";
        const tipSize = 4;

        const topTipX = bowArmX + Math.cos(bowStartAngle) * bowRadius;
        const topTipY = bowArmY + Math.sin(bowStartAngle) * bowRadius;
        ctx.beginPath();
        ctx.arc(topTipX, topTipY, tipSize, 0, Math.PI * 2);
        ctx.fill();

        const botTipX = bowArmX + Math.cos(bowEndAngle) * bowRadius;
        const botTipY = bowArmY + Math.sin(bowEndAngle) * bowRadius;
        ctx.beginPath();
        ctx.arc(botTipX, botTipY, tipSize, 0, Math.PI * 2);
        ctx.fill();

        // === CORDA TENSIONADA ===
        ctx.strokeStyle = stringColor;
        ctx.lineWidth = 3;

        const midPointX =
          (topTipX + botTipX) / 2 +
          (stringArmX - (topTipX + botTipX) / 2) * 0.8;
        const midPointY =
          (topTipY + botTipY) / 2 +
          (stringArmY - (topTipY + botTipY) / 2) * 0.8;

        ctx.beginPath();
        ctx.moveTo(topTipX, topTipY);
        ctx.quadraticCurveTo(midPointX, midPointY, stringArmX, stringArmY);
        ctx.quadraticCurveTo(midPointX, midPointY, botTipX, botTipY);
        ctx.stroke();

        // === FLECHA ===
        const arrowLength = 35;
        const arrowStartX = stringArmX;
        const arrowStartY = stringArmY;
        const arrowEndX =
          arrowStartX + Math.cos(radians) * arrowLength * aimDirection;
        const arrowEndY =
          arrowStartY + Math.sin(radians) * arrowLength * aimDirection;

        // Haste da flecha
        ctx.strokeStyle = "#deb887";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(arrowStartX, arrowStartY);
        ctx.lineTo(arrowEndX, arrowEndY);
        ctx.stroke();

        // Ponta da flecha
        ctx.fillStyle = "#708090";
        ctx.strokeStyle = "#2c3e50";
        ctx.lineWidth = 1;

        ctx.save();
        ctx.translate(arrowEndX, arrowEndY);
        ctx.rotate(radians * aimDirection);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-10, -4);
        ctx.lineTo(-8, 0);
        ctx.lineTo(-10, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        // Penas da flecha
        ctx.strokeStyle = isPlayer1 ? "#22c55e" : "#7c3aed";
        ctx.lineWidth = 3;

        ctx.save();
        ctx.translate(arrowStartX, arrowStartY);
        ctx.rotate(radians * aimDirection);

        ctx.beginPath();
        ctx.moveTo(0, -3);
        ctx.lineTo(-8, -5);
        ctx.moveTo(0, 3);
        ctx.lineTo(-8, 5);
        ctx.stroke();

        ctx.restore();
      } else {
        // === MODO RELAXADO - CORRIGIDO ===

        // Posição dos braços baseada na direção do player
        const armDirection = isPlayer1 ? 1 : -1;

        // Braços em posição natural
        ctx.strokeStyle = skinColor;
        ctx.lineWidth = 4;

        // Braço direito (ou esquerdo para player 2)
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - 25);
        ctx.lineTo(screenX + 15 * armDirection, screenY - 15);
        ctx.stroke();

        // Braço esquerdo (ou direito para player 2)
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - 25);
        ctx.lineTo(screenX - 12 * armDirection, screenY - 18);
        ctx.stroke();

        // Arco em descanso (posicionado corretamente)
        const bowX = screenX - 15 * armDirection; // Arco do lado correto
        const bowY = screenY - 20;

        ctx.strokeStyle = bowColor;
        ctx.lineWidth = 5;
        ctx.beginPath();

        // Arco orientado corretamente para cada player
        if (isPlayer1) {
          ctx.arc(bowX, bowY, 16, Math.PI * 0.2, Math.PI * 1.8);
        } else {
          ctx.arc(bowX, bowY, 16, Math.PI * 1.2, Math.PI * 0.2);
        }
        ctx.stroke();

        // Empunhadura
        ctx.fillStyle = leatherColor;
        ctx.beginPath();
        ctx.arc(bowX, bowY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // === PLAYER INATIVO - BRAÇOS BÁSICOS ===
      const armDirection = isPlayer1 ? 1 : -1;

      ctx.strokeStyle = skinColor;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(screenX, screenY - 25);
      ctx.lineTo(screenX + 12 * armDirection, screenY - 15);
      ctx.moveTo(screenX, screenY - 25);
      ctx.lineTo(screenX - 8 * armDirection, screenY - 18);
      ctx.stroke();
    }

    // === SOMBRA ===
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + 12, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();
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

    // Calcular o comprimento baseado na força (40% até 100% do poder)
    const baseLength = 80; // Comprimento base
    const powerMultiplier = 0.4 + (power / 100) * 0.6; // 0.4 a 1.0
    const totalLength = baseLength * powerMultiplier;

    // Número de segmentos baseado na força (3 a 7 segmentos)
    const segmentCount = Math.floor(3 + (power / 100) * 4);
    const segmentLength = totalLength / segmentCount;

    const startX = screenX;
    const startY = screenY - 25;

    // Desenhar linha principal com gradiente de opacidade
    for (let i = 0; i < segmentCount; i++) {
      const segmentStart = i * segmentLength;
      const segmentEnd = (i + 1) * segmentLength;

      const startPosX = startX + Math.cos(radians) * segmentStart * direction;
      const startPosY = startY + Math.sin(radians) * segmentStart * direction;
      const endPosX = startX + Math.cos(radians) * segmentEnd * direction;
      const endPosY = startY + Math.sin(radians) * segmentEnd * direction;

      // Opacidade diminui conforme a distância (mais realista)
      const opacity = 0.9 - (i / segmentCount) * 0.4;

      // Cor baseada na força
      let color;
      if (power < 30) {
        color = `rgba(34, 197, 94, ${opacity})`; // Verde (força baixa)
      } else if (power < 70) {
        color = `rgba(251, 191, 36, ${opacity})`; // Amarelo (força média)
      } else {
        color = `rgba(239, 68, 68, ${opacity})`; // Vermelho (força alta)
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 3 + power / 100; // Linha mais grossa com mais força
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.moveTo(startPosX, startPosY);
      ctx.lineTo(endPosX, endPosY);
      ctx.stroke();

      // Adicionar seta no final de cada segmento (exceto o último)
      if (i < segmentCount - 1) {
        const arrowSize = 4 + (power / 100) * 2; // Seta maior com mais força

        ctx.fillStyle = color;
        ctx.save();
        ctx.translate(endPosX, endPosY);
        ctx.rotate(radians * direction);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-arrowSize, -arrowSize / 2);
        ctx.lineTo(-arrowSize, arrowSize / 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }

    // Seta final maior
    const finalArrowSize = 6 + (power / 100) * 3;
    const finalX = startX + Math.cos(radians) * totalLength * direction;
    const finalY = startY + Math.sin(radians) * totalLength * direction;

    let finalColor;
    if (power < 30) {
      finalColor = "rgba(34, 197, 94, 0.9)";
    } else if (power < 70) {
      finalColor = "rgba(251, 191, 36, 0.9)";
    } else {
      finalColor = "rgba(239, 68, 68, 0.9)";
    }

    ctx.fillStyle = finalColor;
    ctx.strokeStyle = finalColor;
    ctx.lineWidth = 2;

    ctx.save();
    ctx.translate(finalX, finalY);
    ctx.rotate(radians * direction);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-finalArrowSize, -finalArrowSize / 2);
    ctx.lineTo(-finalArrowSize * 0.7, 0);
    ctx.lineTo(-finalArrowSize, finalArrowSize / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // HUD de informações melhorado
    const hudWidth = 90;
    const hudHeight = 55;
    const hudX = screenX - hudWidth / 2;
    const hudY = screenY - 100;

    // Fundo do HUD com borda
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.beginPath();
    ctx.roundRect(hudX, hudY, hudWidth, hudHeight, 8);
    ctx.fill();

    // Borda colorida baseada na força
    let borderColor;
    if (power < 30) {
      borderColor = "rgba(34, 197, 94, 0.8)";
    } else if (power < 70) {
      borderColor = "rgba(251, 191, 36, 0.8)";
    } else {
      borderColor = "rgba(239, 68, 68, 0.8)";
    }

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Textos do HUD
    ctx.fillStyle = "#f8fafc";
    ctx.font = "500 12px 'Inter', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round(angle)}°`, screenX, hudY + 18);

    // Barra de força visual
    const barWidth = 60;
    const barHeight = 8;
    const barX = screenX - barWidth / 2;
    const barY = hudY + 25;

    // Fundo da barra
    ctx.fillStyle = "rgba(51, 65, 85, 0.8)";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 4);
    ctx.fill();

    // Preenchimento da barra
    ctx.fillStyle = borderColor;
    ctx.beginPath();
    ctx.roundRect(
      barX + 1,
      barY + 1,
      (barWidth - 2) * (power / 100),
      barHeight - 2,
      3
    );
    ctx.fill();

    // Texto da força
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "400 10px 'Inter', system-ui, sans-serif";
    ctx.fillText(`${Math.round(power)}%`, screenX, hudY + 45);

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
      <h1 className="text-3xl font-bold text-gray-800">Arquearia</h1>

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

      <div className="text-sm text-gray-600 max-w-md text-left">
        <p>
          <strong>Como jogar:</strong>
          <br />
          • Objetivo: Atingir o oponente com uma flecha, sendo o tiro na cabeça
          a forma mais eficaz de eliminá-lo.
          <br />• Controles: Os jogadores ajustam o ângulo e a força dos tiros
          com um mecanismo simples de arrastar e soltar o mouse, mirando para
          acertar o oponente.
        </p>
      </div>
    </div>
  );
}
