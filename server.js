const express = require("express"); 
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ✅ Serve Google verification file from root folder
app.use(express.static(".")); // root folder (for .html file like google verification)
app.use(express.static("omegle-clone")); // frontend files (index.html etc.)

let waiting = null;

io.on("connection", (socket) => {
  socket.on("join", () => {
    if (waiting) {
      const partner = waiting;
      waiting = null;
      socket.partner = partner;
      partner.partner = socket;
      partner.emit("ready");
      socket.emit("ready");
    } else {
      waiting = socket;
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

  socket.on("message", (msg) => {
    if (socket.partner) socket.partner.emit("message", msg);
  });

  socket.on("disconnect", () => {
    if (socket.partner) {
      socket.partner.partner = null;
      socket.partner = null;
    }
    if (waiting === socket) waiting = null;
  });
});

server.listen(3000, () => {
  console.log("✅ Server running on port 3000");
});
