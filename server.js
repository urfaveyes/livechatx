const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(".")); // for root files
app.use(express.static("omegle-clone")); // frontend files

let users = []; // All connected sockets

// ✅ Helper: Get user location via IP
async function getLocation(ip) {
  try {
    const res = await axios.get(`https://ipapi.co/${ip}/json/`);
    return res.data.city || res.data.country || "unknown";
  } catch (e) {
    return "unknown";
  }
}

io.on("connection", async (socket) => {
  const ip = socket.handshake.headers["x-forwarded-for"]?.split(',')[0] || socket.conn.remoteAddress;
  const location = await getLocation(ip);
  socket.location = location;
  socket.isMatched = false;
  users.push(socket);

  // ✅ Send current online count to all
  io.emit("updateOnline", users.length);

  socket.on("start", () => {
    if (socket.isMatched) return;
    // Try to find a partner in same location
    const potential = users.find(
      (s) => s !== socket && !s.isMatched && s.location === socket.location
    ) || users.find((s) => s !== socket && !s.isMatched);

    if (potential) {
      socket.isMatched = true;
      potential.isMatched = true;

      socket.partner = potential;
      potential.partner = socket;

      socket.emit("ready");
      potential.emit("ready");
    }
  });

  socket.on("offer", (offer) => {
    if (socket.partner) socket.partner.emit("offer", offer);
  });

  socket.on("answer", (answer) => {
    if (socket.partner) socket.partner.emit("answer", answer);
  });

  socket.on("candidate", (candidate) => {
    if (socket.partner) socket.partner.emit("candidate", candidate);
  });

  socket.on("chat", (msg) => {
    if (socket.partner) socket.partner.emit("chat", msg);
  });

  socket.on("switch", () => {
    if (socket.partner) {
      socket.partner.emit("partner-left");
      socket.partner.partner = null;
      socket.partner.isMatched = false;
    }

    socket.partner = null;
    socket.isMatched = false;
    socket.emit("switched");

    setTimeout(() => {
      socket.emit("start"); // Auto restart
    }, 1000);
  });

  socket.on("disconnect", () => {
    users = users.filter((s) => s !== socket);
    if (socket.partner) {
      socket.partner.emit("partner-left");
      socket.partner.partner = null;
      socket.partner.isMatched = false;
    }
    io.emit("updateOnline", users.length);
  });
});

server.listen(3000, () => {
  console.log("✅ Server running on port 3000");
});
