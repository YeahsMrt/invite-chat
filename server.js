const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const bcrypt = require("bcrypt");
const session = require("express-session");
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type"]
  },
  transports: ['websocket', 'polling'],
  serveClient: true
});

const sessionMiddleware = session({
  secret: "supersecret2026",
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
});

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(sessionMiddleware);

// Proper Socket.io session integration
io.use((socket, next) => {
  const req = socket.request;
  const res = {};
  
  sessionMiddleware(req, res, (err) => {
    if (err) {
      console.error('Session middleware error:', err);
      return next(err);
    }
    next();
  });
});

// Data storage
const users = {};
const rooms = {};
const messages = {};
let messageId = 0;

const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      Object.assign(users, data.users || {});
      Object.assign(rooms, data.rooms || {});
      Object.assign(messages, data.messages || {});
      messageId = data.messageId || 0;
      console.log('✅ Data loaded');
    } catch (e) {
      console.error('❌ Data load error:', e.message);
    }
  }
}

function saveData() {
  const data = { users, rooms, messages, messageId };
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

loadData();

// Authentication routes
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('Missing info');
  if (users[username]) return res.status(400).send('User exists');
  const hash = await bcrypt.hash(password, 10);
  users[username] = { passwordHash: hash };
  saveData();
  req.session.username = username;
  res.send({ success: true });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (!user) return res.status(400).send('Invalid');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(400).send('Invalid');
  req.session.username = username;
  res.send({ success: true });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.send({ success: true }));
});

app.get('/session', (req, res) => {
  res.send({ username: req.session.username || null });
});

// Generate room code
function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function createUniqueCode() {
  let code = generateCode();
  while (rooms[code]) code = generateCode();
  return code;
}

// Socket.io handlers
io.on("connection", (socket) => {
  const username = socket.request.session?.username;
  console.log("✓ Connected:", socket.id, "-", username || 'Anon');

  socket.on("create_room", ({ roomName = null, isGroup = false }) => {
    const currentUsername = socket.request.session?.username;
    console.log(`📥 create_room from ${socket.id}, user=${currentUsername}`);
    if (!currentUsername) {
      socket.emit("error_message", "Please login first");
      return;
    }

    const code = createUniqueCode();
    const creator = {
      id: socket.id,
      username: currentUsername,
      role: "admin",
      avatar: currentUsername.charAt(0).toUpperCase(),
      lastSeen: new Date().toISOString(),
      joined: new Date().toISOString()
    };

    rooms[code] = {
      users: [creator],
      pinnedMessage: null,
      isGroup: isGroup || false,
      name: roomName || `${currentUsername}'s chat`,
      createdAt: new Date().toISOString(),
      settings: {
        notifications: true,
        sound: true,
        archive: false
      },
      msgCount: 0
    };
    messages[code] = [];
    saveData();

    socket.join(code);
    socket.data.roomCode = code;
    socket.data.username = currentUsername;
    socket.data.userId = socket.id;

    console.log(`✨ Room created: ${code} by ${currentUsername}`);
    socket.emit("room_created", { code, roomName: rooms[code].name });
    io.to(code).emit("system_message", `${currentUsername} created the room`);
    io.to(code).emit("room_info", rooms[code]);
  });

  socket.on("join_room", ({ code }) => {
    code = String(code || "").trim().toUpperCase();
    const currentUsername = socket.request.session?.username;
    console.log(`📥 join_room from ${socket.id}, user=${currentUsername}, code=${code}`);

    if (!currentUsername) {
      socket.emit("error_message", "Please login first");
      return;
    }
    if (!code) {
      socket.emit("error_message", "Invite code is empty!");
      return;
    }
    if (!rooms[code]) {
      socket.emit("error_message", "Room not found!");
      return;
    }
    if (rooms[code].users.length >= 50 && !rooms[code].isGroup) {
      socket.emit("error_message", "Room is full! (Max 50 users)");
      return;
    }

    const newUser = {
      id: socket.id,
      username: currentUsername,
      role: "user",
      avatar: currentUsername.charAt(0).toUpperCase(),
      lastSeen: new Date().toISOString(),
      joined: new Date().toISOString()
    };

    rooms[code].users.push(newUser);
    saveData();
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.username = currentUsername;
    socket.data.userId = socket.id;

    console.log(`🎉 ${currentUsername} joined room: ${code}`);
    socket.emit("joined_room", { code, roomInfo: rooms[code] });
    socket.emit("room_history", messages[code] || []);
    io.to(code).emit("system_message", `${currentUsername} joined the room`);
    io.to(code).emit("room_info", rooms[code]);
    io.to(code).emit("member_joined", newUser);

    if (rooms[code].pinnedMessage) {
      socket.emit("message_pinned", rooms[code].pinnedMessage);
    }
  });

  socket.on("send_message", ({ message, code, image, file = null, replyTo = null, location = null, viewOnce = false }) => {
    const roomCode = socket.data.roomCode;
    const username = socket.data.username;
    const userId = socket.data.userId;

    if (!roomCode || !rooms[roomCode]) {
      socket.emit("error_message", "Not in room!");
      return;
    }

    let cleanMessage = String(message || "").trim();
    if (!cleanMessage && !image && !location) return;

    const msgObj = {
      id: ++messageId,
      userId,
      username,
      message: cleanMessage,
      timestamp: new Date().toISOString(),
      image: image || null,
      viewOnce: !!viewOnce,
      file: file || null,
      location: location || null,
      forwarded: false,
      edited: false,
      reactions: {},
      status: "read",
      readBy: [{ userId, timestamp: new Date().toISOString() }],
      replyTo: replyTo || null
    };

    messages[roomCode].push(msgObj);
    rooms[roomCode].msgCount++;
    saveData();
    io.to(roomCode).emit("receive_message", msgObj);
    console.log(`💬 ${roomCode}: ${username} - ${cleanMessage}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✓ Server running: http://localhost:${PORT}`);
}).on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} in use!`);
    process.exit(1);
  }
});