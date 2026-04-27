import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import {Redis} from "ioredis";
import { ENV } from "../../lib/env.js"; // Assuming your env file is here

export const initializeSockets = (server: HttpServer) => {
  // 1. Attach Socket.io to the HTTP Server
  const io = new SocketIOServer(server, {
    cors: {
      origin: ["http://localhost:5173"], // Must match your React Vite frontend exactly
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Create a DEDICATED Redis Subscriber connection.
  // We cannot import the default 'redis' from lib/redis.ts because once a connection enters 'subscriber' mode, it cannot be used for standard get/set caching commands.

  const subscriber = new Redis({
    host: "127.0.0.1",
    port: 6379,
    maxRetriesPerRequest: null,
  });

  subscriber.on("connect", () => {
    console.log("[Sockets] Dedicated Redis Subscriber Connected");
  });

  subscriber.on("error", (err: Error) => {
    console.error("[Sockets] Redis Subscriber Error:", err.message);
  });

  //Tell Redis to listen to ALL deployment log channels (The Mail Sorter)
  subscriber.psubscribe("logs:*", (err, count) => {
    if (err) {
      console.error("[Sockets] Failed to subscribe to logs:", err);
    } else {
      console.log(`[Sockets] Listening to ${count} Redis log channel patterns.`);
    }
  });

  // 4. Broadcast incoming Redis messages to the correct Socket room
  subscriber.on("pmessage", (pattern, channel, message) => {
    // channel = "logs:15"
    // message = '{"log": "Installing dependencies..."}'
    
    // Send it ONLY to the React clients sitting in the "logs:15" room
    io.to(channel).emit("build-log", message);
  });

  // 5. Handle Frontend Connections
  io.on("connection", (socket) => {
    console.log(`[Sockets] Client Connected: ${socket.id}`);

    // React sends: socket.emit('subscribe-to-logs', '15')
    socket.on("subscribe-to-logs", (deploymentId: string) => {
      if (!deploymentId) return;
      
      const room = `logs:${deploymentId}`;
      socket.join(room);
      console.log(`[Sockets] Client ${socket.id} joined room: ${room}`);
    });

    // React sends: socket.emit('unsubscribe-from-logs', '15')
    // Good practice so the browser doesn't get flooded if the user navigates away
    socket.on("unsubscribe-from-logs", (deploymentId: string) => {
      const room = `logs:${deploymentId}`;
      socket.leave(room);
      console.log(`[Sockets] Client ${socket.id} left room: ${room}`);
    });

    socket.on("disconnect", () => {
      console.log(`[Sockets] Client Disconnected: ${socket.id}`);
    });
  });

  return io;
};