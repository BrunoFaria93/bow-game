const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});
const rooms = new Map();

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function initializeGameState(roomCode) {
  const worldWidth = 2000 + Math.random() * 2000;
  return {
    players: [
      { x: 150, health: 100, isActive: true },
      { x: worldWidth - 150, health: 100, isActive: true },
    ],
    arrows: [],
    currentPlayer: 1,
    gamePhase: "playing",
    winner: null,
    isAiming: false,
    aimData: { startX: 0, startY: 0, currentX: 0, currentY: 0 },
    turnInProgress: false,
    worldWidth,
    roomCode,
  };
}

io.on("connection", (socket) => {
  socket.on("createRoom", () => {
    const roomCode = generateRoomCode();
    rooms.set(roomCode, {
      players: [socket.id],
      gameState: initializeGameState(roomCode),
    });
    socket.join(roomCode);
    socket.emit("playerJoined", { playerId: 1, roomCode });
  });

  socket.on("joinRoom", (roomCode) => {
    const room = rooms.get(roomCode);
    if (!room) return socket.emit("roomNotFound");
    if (room.players.length >= 2) return socket.emit("roomFull");
    room.players.push(socket.id);
    socket.join(roomCode);
    socket.emit("playerJoined", { playerId: 2, roomCode });
    io.to(roomCode).emit("gameStart", room.gameState);
  });

  socket.on("startAiming", (aimData) => {
    const roomCode = Array.from(socket.rooms).find((r) => r !== socket.id);
    const room = rooms.get(roomCode);
    if (
      room &&
      room.gameState.currentPlayer === room.players.indexOf(socket.id) + 1
    ) {
      room.gameState.isAiming = true;
      room.gameState.aimData = aimData;
      socket.to(roomCode).emit("opponentAiming", aimData);
    }
  });

  socket.on("updateAim", (aimData) => {
    const roomCode = Array.from(socket.rooms).find((r) => r !== socket.id);
    const room = rooms.get(roomCode);
    if (
      room &&
      room.gameState.currentPlayer === room.players.indexOf(socket.id) + 1
    ) {
      room.gameState.aimData = { ...room.gameState.aimData, ...aimData };
      socket.to(roomCode).emit("opponentAiming", room.gameState.aimData);
    }
  });

  socket.on("shootArrow", (arrow) => {
    const roomCode = Array.from(socket.rooms).find((r) => r !== socket.id);
    const room = rooms.get(roomCode);
    if (
      room &&
      room.gameState.currentPlayer === room.players.indexOf(socket.id) + 1
    ) {
      room.gameState.arrows = [arrow];
      room.gameState.turnInProgress = true;
      room.gameState.isAiming = false;
      io.to(roomCode).emit("arrowShot", arrow);
    }
  });

  socket.on("playerHit", ({ playerId, damage, newHealth }) => {
    const roomCode = Array.from(socket.rooms).find((r) => r !== socket.id);
    const room = rooms.get(roomCode);
    if (room && playerId <= room.gameState.players.length) {
      room.gameState.players[playerId - 1].health = newHealth;
      if (newHealth <= 0) {
        room.gameState.players[playerId - 1].isActive = false;
        room.gameState.winner = playerId === 1 ? 2 : 1;
        room.gameState.gamePhase = "gameOver";
      }
      io.to(roomCode).emit("playerHit", { playerId, damage, newHealth });
      if (room.gameState.gamePhase === "gameOver") {
        io.to(roomCode).emit("gameOver", room.gameState.winner);
      }
    }
  });

  socket.on("turnEnded", () => {
    const roomCode = Array.from(socket.rooms).find((r) => r !== socket.id);
    const room = rooms.get(roomCode);
    if (room) {
      room.gameState.turnInProgress = false;
      room.gameState.currentPlayer = room.gameState.currentPlayer === 1 ? 2 : 1;
      io.to(roomCode).emit("gameStateUpdate", {
        currentPlayer: room.gameState.currentPlayer,
        turnInProgress: false,
        isAiming: false,
      });
    }
  });

  socket.on("requestGameState", () => {
    const roomCode = Array.from(socket.rooms).find((r) => r !== socket.id);
    if (roomCode && rooms.has(roomCode)) {
      socket.emit("gameStateUpdate", rooms.get(roomCode).gameState);
    }
  });

  socket.on("disconnect", () => {
    const roomCode = Array.from(socket.rooms).find((r) => r !== socket.id);
    if (roomCode && rooms.has(roomCode)) {
      const room = rooms.get(roomCode);
      room.players = room.players.filter((id) => id !== socket.id);
      if (room.players.length === 0) {
        rooms.delete(roomCode);
      } else {
        room.gameState.gamePhase = "gameOver";
        room.gameState.winner = room.players[0] === socket.id ? 2 : 1;
        io.to(roomCode).emit("gameOver", room.gameState.winner);
      }
    }
  });
});

server.listen(3001, () =>
  console.log("Server running on http://localhost:3001")
);
