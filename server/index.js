import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname } from "path";
import cors from "cors";
import * as path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const messages = [];

const generateNickname = () => {
  const adjectives = ["빠른", "느린", "행복한", "슬픈", "용감한"];
  const animals = ["사자", "호랑이", "토끼", "거북이", "독수리"];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${adjective} ${animal}`;
};

io.on("connection", (socket) => {
  console.log("사용자가 연결되었습니다", socket.id);

  const uniqueId = `${socket.id}-${Math.floor(Math.random() * 10000)}`;
  socket.uniqueId = uniqueId;

  const nickname = generateNickname();
  socket.nickname = nickname;

  const welcome = {
    id: uniqueId,
    sender: nickname,
    content: `새로운 유저 ${nickname} 가 입장했습니다.`,
    timestamp: new Date(),
  };

  socket.broadcast.emit("SEND_MESSAGE", JSON.stringify(welcome));

  socket.on("SEND_MESSAGE", (msg) => {
    console.log(msg);
    const message = {
      id: uniqueId,
      sender: nickname,
      content: msg,
      timestamp: new Date(),
    };

    messages.push(message);

    io.emit("SEND_MESSAGE", JSON.stringify(message));
  });

  //## 힌트
  // - socket.join(room)을 사용하여 사용자를 특정 방에 참여시킬 수 있습니다. 이때 room은 사용자가 참여할 방의 이름이며,
  // 같은 이름의 방에 참여한 사용자끼리 메시지를 주고받을 수 있습니다.
  // - io.to(room).emit(event, data)를 사용하면 특정 방에 있는 사용자에게만 메시지를 전송할 수 있습니다.

  // io.on("connection", async (socket) => {
  //   const projects = await fetchProjects(socket);

  //   projects.forEach(project => socket.join("project:" + project.id));

  //   // and then later
  //   io.to("project:4321").emit("project updated");
  // });

  // 로그 메세지 : JOIN_ROOM - 이벤트  room1 - 데이터

  socket.on("JOIN_ROOM", (room) => {
    console.log("JOIN_ROOM", room);
    socket.join(room);

    io.to("").emit("JOIN_ROOM", room);
  });

  socket.on("LEAVE_ROOM", (room) => {
    console.log("LEAVE_ROOM", room);
  });

  socket.on("disconnect", () => {
    console.log("사용자가 연결을 끊었습니다");
  });
});

app.get("/messages", (req, res) => {
  res.json(messages);
});

app.use(express.static(path.join(path.resolve(), "public")));
app.get("/*", (req, res) => {
  res.sendFile(path.join(path.resolve(), "public", "index.html"));
});

const PORT = 4000;
httpServer.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다`);
});
