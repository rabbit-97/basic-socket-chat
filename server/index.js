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

const messages = {};
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
  const nickname = generateNickname();
  socket.nickname = nickname;

  socket.on("JOIN_ROOM", (room) => {
    console.log(`${nickname}가 방 ${room}에 입장하였습니다.`);
    socket.join(room);

    // 입장하면 입장 메세지가 먼저 출력되고 나중에 이전 메세지들이 나오는 문제 발견
    // 메세지들을 시간 순으로 정렬하여 입장 메세지가 나중에 나오게 문제 해결
    if (messages[room]) {
      const sortedMessages = messages[room].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );
      sortedMessages.forEach((msg) => {
        socket.emit("SEND_MESSAGE", msg);
      });
    } else {
      messages[room] = [];
    }

    const welcomeMessage = {
      id: uniqueId,
      sender: "bot",
      content: `새로운 유저 ${nickname} 가 입장했습니다.`,
      timestamp: new Date(),
    };
    messages[room].push(welcomeMessage);
    io.to(room).emit("SEND_MESSAGE", welcomeMessage);
  });

  // "[object Object]" is not valid JSON 오류 메세지
  // json.parse()를 사용하여 데이터를 파싱하고 데이터를 문자열로 변환
  // 오류 해결
  socket.on("SEND_MESSAGE", (msgData) => {
    let parsedData;
    try {
      parsedData = typeof msgData === "string" ? JSON.parse(msgData) : msgData;
    } catch (error) {
      console.error("메시지 파싱 오류:", error);
      return;
    }

    const { room, message } = parsedData;
    const newMessage = {
      id: uniqueId,
      sender: nickname,
      content: message,
      timestamp: new Date(),
    };

    if (messages[room]) {
      messages[room].push(newMessage);
    }

    io.to(room).emit("SEND_MESSAGE", newMessage);
  });

  socket.on("LEAVE_ROOM", (room) => {
    console.log(`${nickname}가 방 ${room}을 떠났습니다.`);

    const leaveMessage = {
      id: uniqueId,
      sender: "bot",
      content: `${nickname} 가 방을 떠났습니다.`,
      timestamp: new Date(),
    };

    io.to(room).emit("SEND_MESSAGE", leaveMessage);

    socket.leave(room);
  });

  socket.on("disconnect", () => {
    console.log("사용자가 연결을 끊었습니다");
  });
});

app.get("/messages", (req, res) => {
  res.json(messages);
});

app.use(express.static(path.join(__dirname, "public")));
app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = 4000;
httpServer.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다`);
});
