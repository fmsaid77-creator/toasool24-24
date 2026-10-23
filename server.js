// server.ts
import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var server = http.createServer(app);
var wss = new WebSocketServer({ server, path: "/ws" });
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.removeHeader("X-Frame-Options");
  res.setHeader("Content-Security-Policy", "frame-ancestors *");
  if (_req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
var users = /* @__PURE__ */ new Map();
var messages = [];
var callLogs = [];
var blockedRelations = /* @__PURE__ */ new Map();
var clientSockets = /* @__PURE__ */ new Map();
var permanentBlacklist = /* @__PURE__ */ new Map();
function isValidTawasolNumber(numStr) {
  const clean = numStr.trim();
  if (!/^\d+$/.test(clean)) {
    return { valid: false, reason: "\u064A\u062C\u0628 \u0623\u0646 \u064A\u062D\u062A\u0648\u064A \u0627\u0644\u0631\u0642\u0645 \u0639\u0644\u0649 \u0623\u0631\u0642\u0627\u0645 \u0641\u0642\u0637 \u0628\u062F\u0648\u0646 \u062D\u0631\u0648\u0641 \u0623\u0648 \u0631\u0645\u0648\u0632." };
  }
  if (!clean.startsWith("8")) {
    return { valid: false, reason: "\u062A\u0646\u0628\u064A\u0647: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0628\u062F\u0623 \u0627\u0644\u0631\u0642\u0645 \u0628\u0627\u0644\u0631\u0642\u0645 8 \u0625\u062C\u0628\u0627\u0631\u064A." };
  }
  if (clean.length < 6 || clean.length > 9) {
    return { valid: false, reason: "\u064A\u062C\u0628 \u0623\u0646 \u064A\u062A\u0643\u0648\u0646 \u0627\u0644\u0631\u0642\u0645 \u0645\u0646 6 \u0623\u0631\u0642\u0627\u0645 \u0643\u062D\u062F \u0623\u062F\u0646\u0649 \u0648 9 \u0623\u0631\u0642\u0627\u0645 \u0643\u062D\u062F \u0623\u0642\u0635\u0649." };
  }
  const lastDigit = parseInt(clean.charAt(clean.length - 1), 10);
  if (lastDigit % 2 === 0) {
    return { valid: false, reason: "\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0627\u0644\u0631\u0642\u0645 \u0641\u0631\u062F\u064A\u0627\u064B (\u064A\u0646\u062A\u0647\u064A \u0628\u0640 1\u060C 3\u060C 5\u060C 7\u060C \u0623\u0648 9)." };
  }
  return { valid: true };
}
function generateRandomValidNumber() {
  const length = Math.floor(Math.random() * 4) + 6;
  let result = "8";
  for (let i = 1; i < length - 1; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  const oddDigits = ["1", "3", "5", "7", "9"];
  result += oddDigits[Math.floor(Math.random() * oddDigits.length)];
  return result;
}
function generateFiveSuggestions(excludeNumber) {
  const set = /* @__PURE__ */ new Set();
  let attempts = 0;
  while (set.size < 5 && attempts < 200) {
    attempts++;
    const cand = generateRandomValidNumber();
    if (cand !== excludeNumber && (!users.has(cand) || !users.get(cand)?.isOnline)) {
      set.add(cand);
    }
  }
  while (set.size < 5) {
    set.add(generateRandomValidNumber());
  }
  return Array.from(set);
}
function seedInitialData() {
  if (users.size === 0) {
    const demo1 = {
      number: "813579",
      name: "\u0641\u0631\u064A\u0642 \u062F\u0639\u0645 \u062A\u0648\u0627\u0635\u0644 24",
      avatar: "/src/assets/images/tawasol24_logo_badge_1791830208691.jpg",
      statusMessage: "\u0623\u0647\u0644\u0627\u064B \u0628\u0643 \u0641\u064A \u0645\u0646\u0635\u0629 \u062A\u0648\u0627\u0635\u0644 24! \u0646\u062D\u0646 \u0641\u064A \u062E\u062F\u0645\u062A\u0643\u0645 \u0639\u0644\u0649 \u0645\u062F\u0627\u0631 \u0627\u0644\u0633\u0627\u0639\u0629.",
      isOnline: true,
      lastSeen: Date.now(),
      registeredAt: Date.now() - 864e5
    };
    users.set(demo1.number, demo1);
    messages.push({
      id: "welcome-msg-1",
      from: "813579",
      to: "global",
      content: "\u0645\u0631\u062D\u0628\u0627\u064B \u0628\u0643 \u0641\u064A \u0645\u0646\u0635\u0629 \u062A\u0648\u0627\u0635\u0644 24! \u064A\u0645\u0643\u0646\u0643 \u0625\u062C\u0631\u0627\u0621 \u0627\u0644\u0645\u0643\u0627\u0644\u0645\u0627\u062A \u0627\u0644\u0635\u0648\u062A\u064A\u0629\u060C \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0635\u0648\u062A\u064A\u0629\u060C \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0641\u064A\u062F\u064A\u0648\u0647\u0627\u062A \u0648\u0627\u0644\u0646\u0635\u0648\u0635 \u0628\u0643\u0644 \u0633\u0647\u0648\u0644\u0629.",
      contentType: "text",
      timestamp: Date.now() - 1e4,
      status: "delivered"
    });
  }
}
seedInitialData();
process.on("uncaughtException", (err) => {
  console.warn("Recovered from uncaught exception:", err.message);
});
process.on("unhandledRejection", (reason) => {
  console.warn("Recovered from unhandled rejection:", reason);
});
function safeSend(ws, payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(typeof payload === "string" ? payload : JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn("ws send error handled:", e);
    }
  }
  return false;
}
function broadcast(payload, excludeWs) {
  const data = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      try {
        client.send(data);
      } catch (err) {
        console.warn("Broadcast send error handled:", err);
      }
    }
  });
}
function sendToNumber(targetNumber, payload) {
  const targetWs = clientSockets.get(targetNumber);
  return safeSend(targetWs, payload);
}
wss.on("error", (err) => {
  console.warn("WebSocket Server error handled:", err.message);
});
wss.on("connection", (ws) => {
  let boundNumber = null;
  let isAlive = true;
  ws.on("error", (err) => {
    console.warn("Client socket error handled:", err.message);
  });
  ws.on("pong", () => {
    isAlive = true;
  });
  ws.on("message", (rawData) => {
    try {
      const data = JSON.parse(rawData.toString());
      switch (data.type) {
        case "REGISTER_CLIENT": {
          const { number, name, avatar, statusMessage } = data;
          if (!number) return;
          if (permanentBlacklist.has(number)) {
            safeSend(ws, {
              type: "PERMANENTLY_BANNED",
              number,
              reason: "\u26A0\uFE0F \u062A\u0645 \u0645\u0633\u062D \u0648\u062D\u0638\u0631 \u0647\u0630\u0627 \u0627\u0644\u062D\u0633\u0627\u0628 \u0646\u0647\u0627\u0626\u064A\u0627\u064B \u0645\u0646 \u0642\u0628\u0644 \u0645\u0627\u0644\u0643 \u062A\u0637\u0628\u064A\u0642 \u062A\u0648\u0627\u0635\u0644 24. \u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0639\u0648\u062F\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u0646\u0635\u0629 \u0625\u0644\u0627 \u0628\u0639\u062F \u0627\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0625\u0630\u0646 \u0645\u0628\u0627\u0634\u0631 \u0645\u0646 \u0645\u0627\u0644\u0643 \u0627\u0644\u062A\u0637\u0628\u064A\u0642."
            });
            ws.close();
            return;
          }
          boundNumber = number;
          clientSockets.set(number, ws);
          let user = users.get(number);
          if (user) {
            user.isOnline = true;
            user.lastSeen = Date.now();
            if (name) user.name = name;
            if (avatar) user.avatar = avatar;
            if (statusMessage) user.statusMessage = statusMessage;
          } else {
            user = {
              number,
              name: name || `\u0645\u0633\u062A\u062E\u062F\u0645 ${number}`,
              avatar: avatar || "/src/assets/images/tawasol24_logo_badge_1791830208691.jpg",
              statusMessage: statusMessage || "\u0645\u0631\u062D\u0628\u0627\u064B! \u0623\u0646\u0627 \u0623\u0633\u062A\u062E\u062F\u0645 \u062A\u0648\u0627\u0635\u0644 24",
              isOnline: true,
              lastSeen: Date.now(),
              registeredAt: Date.now()
            };
            users.set(number, user);
          }
          broadcast({
            type: "USER_STATUS_CHANGE",
            number,
            isOnline: true,
            lastSeen: user.lastSeen,
            user
          });
          ws.send(JSON.stringify({
            type: "INITIAL_SYNC",
            users: Array.from(users.values()).filter((u) => u.number !== "875319" && u.number !== "891357"),
            recentMessages: messages.filter((m) => (m.from === number || m.to === number || m.to === "global" || m.from === "813579") && m.from !== "875319" && m.to !== "875319" && m.from !== "891357" && m.to !== "891357").slice(-100)
          }));
          break;
        }
        case "SEND_MESSAGE": {
          const { id, from, to, content, contentType, mediaUrl, duration, fileName, fileSize } = data;
          const receiverBlocks = blockedRelations.get(to);
          if (receiverBlocks && receiverBlocks.has(from)) {
            ws.send(JSON.stringify({
              type: "MESSAGE_BLOCKED",
              id,
              to,
              reason: "\u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0626\u0644 \u0644\u0647\u0630\u0627 \u0627\u0644\u0631\u0642\u0645 \u0644\u0623\u0646\u0647 \u062A\u0645 \u062D\u0638\u0631\u0643."
            }));
            return;
          }
          const newMsg = {
            id: id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            from,
            to,
            content: content || "",
            contentType: contentType || "text",
            mediaUrl,
            duration,
            fileName,
            fileSize,
            timestamp: Date.now(),
            status: clientSockets.has(to) ? "delivered" : "sent"
          };
          messages.push(newMsg);
          const delivered = sendToNumber(to, {
            type: "NEW_MESSAGE",
            message: newMsg
          });
          ws.send(JSON.stringify({
            type: "MESSAGE_ACK",
            message: newMsg,
            delivered
          }));
          if (to === "813579") {
            setTimeout(() => {
              newMsg.status = "delivered";
              safeSend(ws, {
                type: "MESSAGE_STATUS_UPDATE",
                messageId: newMsg.id,
                status: "delivered"
              });
            }, 400);
            setTimeout(() => {
              newMsg.status = "read";
              safeSend(ws, {
                type: "MESSAGE_STATUS_UPDATE",
                messageId: newMsg.id,
                status: "read"
              });
            }, 1200);
            setTimeout(() => {
              const replies = [
                "\u0645\u0631\u062D\u0628\u0627\u064B \u0628\u0643! \u0631\u0633\u0627\u0644\u062A\u0643 \u0648\u0635\u0644\u062A \u0628\u0646\u062C\u0627\u062D \u0625\u0644\u0649 \u0646\u0638\u0627\u0645 \u062A\u0648\u0627\u0635\u0644 24 \u{1F680}",
                "\u0634\u0643\u0631\u0627\u064B \u0644\u062A\u0648\u0627\u0635\u0644\u0643 \u0645\u0639\u0646\u0627 \u0639\u0628\u0631 \u062A\u0648\u0627\u0635\u0644 24. \u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0643\u0627\u0644\u0645\u0627\u062A \u0648\u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0635\u0648\u062A\u064A\u0629 \u062A\u0639\u0645\u0644 \u0628\u0643\u0641\u0627\u0621\u0629 \u0639\u0627\u0644\u064A\u0629.",
                "\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0637\u0644\u0628\u0643\u060C \u064A\u0645\u0643\u0646\u0643 \u062A\u062C\u0631\u0628\u0629 \u0625\u062C\u0631\u0627\u0621 \u0627\u062A\u0635\u0627\u0644 \u0635\u0648\u062A\u064A \u0623\u0648 \u062A\u0633\u062C\u064A\u0644 \u0631\u0633\u0627\u0644\u0629 \u0635\u0648\u062A\u064A\u0629 \u0627\u0644\u0622\u0646!"
              ];
              const autoReply = {
                id: `auto_${Date.now()}`,
                from: "813579",
                to: from,
                content: replies[Math.floor(Math.random() * replies.length)],
                contentType: "text",
                timestamp: Date.now(),
                status: "delivered"
              };
              messages.push(autoReply);
              sendToNumber(from, {
                type: "NEW_MESSAGE",
                message: autoReply
              });
            }, 1800);
          }
          break;
        }
        case "MARK_MESSAGES_READ": {
          const { from, to, messageIds } = data;
          messages.forEach((m) => {
            if (messageIds && messageIds.includes(m.id) || m.from === to && m.to === from) {
              m.status = "read";
            }
          });
          sendToNumber(to, {
            type: "MESSAGE_STATUS_UPDATE",
            status: "read",
            from,
            messageIds
          });
          break;
        }
        case "TYPING_INDICATOR": {
          const { from, to, isTyping } = data;
          sendToNumber(to, {
            type: "USER_TYPING",
            from,
            isTyping
          });
          break;
        }
        case "CALL_INITIATE": {
          const { callId, from, to, callerName, callerAvatar } = data;
          const receiverBlocks = blockedRelations.get(to);
          if (receiverBlocks && receiverBlocks.has(from)) {
            ws.send(JSON.stringify({
              type: "CALL_REJECTED",
              callId,
              from: to,
              reason: "blocked",
              message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D \u062D\u0627\u0644\u064A\u0627\u064B."
            }));
            return;
          }
          const targetAvailable = clientSockets.has(to);
          if (!targetAvailable) {
            ws.send(JSON.stringify({
              type: "CALL_FAILED",
              callId,
              reason: "offline",
              message: "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u063A\u064A\u0631 \u0645\u062A\u0635\u0644 \u062D\u0627\u0644\u064A\u0627\u064B."
            }));
            callLogs.push({
              id: callId,
              caller: from,
              receiver: to,
              callerName: callerName || from,
              receiverName: users.get(to)?.name || to,
              status: "missed",
              duration: 0,
              timestamp: Date.now()
            });
            return;
          }
          sendToNumber(to, {
            type: "INCOMING_CALL",
            callId,
            from,
            callerName: callerName || users.get(from)?.name || from,
            callerAvatar: callerAvatar || users.get(from)?.avatar
          });
          break;
        }
        case "CALL_ACCEPT": {
          const { callId, from, to } = data;
          sendToNumber(to, {
            type: "CALL_ACCEPTED",
            callId,
            from
          });
          break;
        }
        case "CALL_REJECT": {
          const { callId, from, to, reason } = data;
          sendToNumber(to, {
            type: "CALL_REJECTED",
            callId,
            from,
            reason: reason || "declined"
          });
          callLogs.push({
            id: callId,
            caller: to,
            receiver: from,
            callerName: users.get(to)?.name || to,
            receiverName: users.get(from)?.name || from,
            status: "declined",
            duration: 0,
            timestamp: Date.now()
          });
          break;
        }
        case "CALL_END": {
          const { callId, from, to, duration } = data;
          sendToNumber(to, {
            type: "CALL_ENDED",
            callId,
            from,
            duration: duration || 0
          });
          callLogs.push({
            id: callId,
            caller: from,
            receiver: to,
            callerName: users.get(from)?.name || from,
            receiverName: users.get(to)?.name || to,
            status: "completed",
            duration: duration || 0,
            timestamp: Date.now()
          });
          break;
        }
        case "SIGNALING_DATA": {
          const { to, signalData, from } = data;
          sendToNumber(to, {
            type: "SIGNALING_DATA",
            from,
            signalData
          });
          break;
        }
        case "BLOCK_USER": {
          const { from, targetNumber, block } = data;
          if (!blockedRelations.has(from)) {
            blockedRelations.set(from, /* @__PURE__ */ new Set());
          }
          const userSet = blockedRelations.get(from);
          if (block) {
            userSet.add(targetNumber);
          } else {
            userSet.delete(targetNumber);
          }
          ws.send(JSON.stringify({
            type: "BLOCK_UPDATED",
            targetNumber,
            isBlocked: block
          }));
          break;
        }
        case "DELETE_MESSAGES": {
          const { messageIds } = data;
          if (Array.isArray(messageIds) && messageIds.length > 0) {
            const setIds = new Set(messageIds);
            const remaining = messages.filter((m) => !setIds.has(m.id));
            messages.length = 0;
            messages.push(...remaining);
            broadcast({
              type: "MESSAGES_DELETED",
              messageIds
            });
          }
          break;
        }
        case "CLEAR_USER_CHAT": {
          const { targetNumber } = data;
          if (targetNumber) {
            const remaining = messages.filter((m) => m.from !== targetNumber && m.to !== targetNumber);
            messages.length = 0;
            messages.push(...remaining);
            broadcast({
              type: "USER_CHAT_CLEARED",
              targetNumber
            });
          }
          break;
        }
      }
    } catch (err) {
      console.error("WS Error:", err);
    }
  });
  ws.on("close", () => {
    if (boundNumber) {
      clientSockets.delete(boundNumber);
      const user = users.get(boundNumber);
      if (user) {
        user.isOnline = false;
        user.lastSeen = Date.now();
        broadcast({
          type: "USER_STATUS_CHANGE",
          number: boundNumber,
          isOnline: false,
          lastSeen: user.lastSeen
        });
      }
    }
  });
});
setInterval(() => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.ping();
      } catch {
      }
    }
  });
}, 2e4);
app.get("/api/users/generate-suggestions", (req, res) => {
  const currentNum = req.query.current;
  const suggestions = generateFiveSuggestions(currentNum);
  res.json({ success: true, suggestions });
});
app.get("/api/users/check/:number", (req, res) => {
  const number = req.params.number;
  const validation = isValidTawasolNumber(number);
  if (!validation.valid) {
    return res.json({ available: false, reason: validation.reason });
  }
  if (permanentBlacklist.has(number)) {
    return res.json({
      available: false,
      isBlacklisted: true,
      reason: "\u26A0\uFE0F \u0647\u0630\u0627 \u0627\u0644\u0631\u0642\u0645 \u0645\u062D\u0638\u0648\u0631 \u0648\u0645\u0645\u0633\u0648\u062D \u0646\u0647\u0627\u0626\u064A\u0627\u064B \u0645\u0646 \u0642\u0628\u0644 \u0645\u0627\u0644\u0643 \u062A\u0637\u0628\u064A\u0642 \u062A\u0648\u0627\u0635\u0644 24. \u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0639\u0648\u062F\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u0646\u0635\u0629 \u0625\u0644\u0627 \u0628\u0639\u062F \u0627\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0625\u0630\u0646 \u0645\u0628\u0627\u0634\u0631 \u0645\u0646 \u0645\u0627\u0644\u0643 \u0627\u0644\u062A\u0637\u0628\u064A\u0642."
    });
  }
  const existing = users.get(number);
  if (existing && existing.isOnline) {
    return res.json({
      available: false,
      reason: "\u0647\u0630\u0627 \u0627\u0644\u0631\u0642\u0645 \u0645\u0641\u0639\u0644 \u0648\u0645\u0633\u062A\u062E\u062F\u0645 \u062D\u0627\u0644\u064A\u0627\u064B \u0645\u0646 \u0642\u0628\u0644 \u0634\u062E\u0635 \u0622\u062E\u0631. \u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0631\u0642\u0645 \u0641\u0631\u062F\u064A \u0622\u062E\u0631."
    });
  }
  res.json({ available: true, formatted: number });
});
app.post("/api/users/register", (req, res) => {
  const { number, name, avatar, statusMessage } = req.body;
  if (!number) {
    return res.status(400).json({ error: "\u0627\u0644\u0631\u0642\u0645 \u0645\u0637\u0644\u0648\u0628" });
  }
  const validation = isValidTawasolNumber(number);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.reason });
  }
  if (permanentBlacklist.has(number)) {
    return res.status(403).json({
      error: "\u26A0\uFE0F \u0647\u0630\u0627 \u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u062D\u0638\u0648\u0631 \u0648\u0645\u0645\u0633\u0648\u062D \u0646\u0647\u0627\u0626\u064A\u0627\u064B \u0645\u0646 \u0642\u0628\u0644 \u0645\u0627\u0644\u0643 \u062A\u0637\u0628\u064A\u0642 \u062A\u0648\u0627\u0635\u0644 24. \u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0639\u0648\u062F\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u0646\u0635\u0629 \u062F\u0648\u0646 \u0625\u0630\u0646 \u0645\u0628\u0627\u0634\u0631 \u0645\u0646 \u0627\u0644\u0645\u0627\u0644\u0643."
    });
  }
  const existing = users.get(number);
  if (existing && existing.isOnline && existing.isBanned) {
    return res.status(403).json({ error: "\u0647\u0630\u0627 \u0627\u0644\u0631\u0642\u0645 \u0645\u062D\u0638\u0648\u0631 \u0645\u0646 \u0642\u0628\u0644 \u0625\u062F\u0627\u0631\u0629 \u062A\u0648\u0627\u0635\u0644 24" });
  }
  const profile = {
    number,
    name: name?.trim() || `\u0645\u0633\u062A\u062E\u062F\u0645 ${number}`,
    avatar: avatar || "/src/assets/images/tawasol24_logo_badge_1791830208691.jpg",
    statusMessage: statusMessage || "\u0645\u0631\u062D\u0628\u0627\u064B! \u0623\u0646\u0627 \u0623\u0633\u062A\u062E\u062F\u0645 \u062A\u0648\u0627\u0635\u0644 24",
    isOnline: true,
    lastSeen: Date.now(),
    registeredAt: existing ? existing.registeredAt : Date.now()
  };
  users.set(number, profile);
  broadcast({
    type: "USER_REGISTERED",
    user: profile
  });
  res.json({ success: true, user: profile });
});
app.get("/api/users/directory", (req, res) => {
  users.delete("875319");
  users.delete("891357");
  const list = Array.from(users.values()).filter(
    (u) => u.number !== "875319" && u.number !== "891357"
  );
  res.json({ users: list });
});
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (password === "fa&roog#77") {
    return res.json({
      success: true,
      token: "admin_auth_faroog77_token",
      message: "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u062F\u062E\u0648\u0644 \u0645\u0627\u0644\u0643 \u0627\u0644\u062A\u0637\u0628\u064A\u0642 \u0628\u0646\u062C\u0627\u062D."
    });
  }
  return res.status(401).json({
    success: false,
    message: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629. \u0647\u0630\u0627 \u0627\u0644\u0642\u0633\u0645 \u0645\u062E\u0635\u0635 \u0644\u0645\u0627\u0644\u0643 \u0627\u0644\u062A\u0637\u0628\u064A\u0642 \u0641\u0642\u0637."
  });
});
app.get("/api/admin/stats", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== "Bearer admin_auth_faroog77_token") {
    return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0628\u0627\u0644\u062F\u062E\u0648\u0644" });
  }
  const userList = Array.from(users.values());
  const onlineCount = userList.filter((u) => u.isOnline).length;
  const bannedCount = userList.filter((u) => u.isBanned).length;
  const audioCount = messages.filter((m) => m.contentType === "audio").length;
  const videoCount = messages.filter((m) => m.contentType === "video").length;
  const imageCount = messages.filter((m) => m.contentType === "image").length;
  const textCount = messages.filter((m) => m.contentType === "text").length;
  res.json({
    success: true,
    stats: {
      totalUsers: userList.length,
      onlineUsers: onlineCount,
      bannedUsers: bannedCount,
      totalMessages: messages.length,
      audioMessages: audioCount,
      videoMessages: videoCount,
      imageMessages: imageCount,
      textMessages: textCount,
      totalCalls: callLogs.length,
      activeConnections: clientSockets.size
    },
    users: userList,
    blacklist: Array.from(permanentBlacklist.values()),
    callLogs: callLogs.slice(-50),
    recentMessages: messages.slice(-50)
  });
});
app.post("/api/admin/broadcast", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== "Bearer admin_auth_faroog77_token") {
    return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
  }
  const { title, message } = req.body;
  if (!message) return res.status(400).json({ error: "\u0646\u0635 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0645\u0637\u0644\u0648\u0628" });
  const broadcastMsg = {
    id: `broadcast_${Date.now()}`,
    from: "813579",
    // Official system number
    to: "global",
    content: `\u{1F4E2} [\u0625\u0634\u0639\u0627\u0631 \u0631\u0633\u0645\u064A \u0645\u0646 \u0625\u062F\u0627\u0631\u0629 \u062A\u0648\u0627\u0635\u0644 24]
${title ? `*${title}*
` : ""}${message}`,
    contentType: "text",
    timestamp: Date.now(),
    status: "delivered"
  };
  messages.push(broadcastMsg);
  broadcast({
    type: "ADMIN_BROADCAST",
    message: broadcastMsg
  });
  res.json({ success: true, broadcastMsg });
});
app.post("/api/admin/toggle-ban", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== "Bearer admin_auth_faroog77_token") {
    return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
  }
  const { number, ban } = req.body;
  const user = users.get(number);
  if (!user) return res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  user.isBanned = !!ban;
  if (ban) {
    user.isOnline = false;
    const ws = clientSockets.get(number);
    if (ws) {
      ws.send(JSON.stringify({ type: "FORCE_DISCONNECT", reason: "\u062A\u0645 \u062D\u0638\u0631 \u062D\u0633\u0627\u0628\u0643 \u0645\u0646 \u0642\u0628\u0644 \u0625\u062F\u0627\u0631\u0629 \u062A\u0648\u0627\u0635\u0644 24" }));
      ws.close();
      clientSockets.delete(number);
    }
  }
  broadcast({
    type: "USER_STATUS_CHANGE",
    number,
    isOnline: user.isOnline,
    user
  });
  res.json({ success: true, user });
});
app.post("/api/admin/permanent-delete", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== "Bearer admin_auth_faroog77_token") {
    return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
  }
  const { number, reason } = req.body;
  if (!number) return res.status(400).json({ error: "\u0627\u0644\u0631\u0642\u0645 \u0645\u0637\u0644\u0648\u0628" });
  const existing = users.get(number);
  const userName = existing?.name || `\u0645\u0633\u062A\u062E\u062F\u0645 ${number}`;
  permanentBlacklist.set(number, {
    number,
    name: userName,
    bannedAt: Date.now(),
    reason: reason || "\u062A\u0645 \u0645\u0633\u062D\u0647 \u0648\u062D\u0638\u0631\u0647 \u0646\u0647\u0627\u0626\u064A\u0627\u064B \u0645\u0646 \u0642\u0628\u0644 \u0645\u0627\u0644\u0643 \u0627\u0644\u062A\u0637\u0628\u064A\u0642 \u0644\u0645\u0646\u0639\u0647 \u0645\u0646 \u0627\u0644\u0639\u0648\u062F\u0629"
  });
  users.delete(number);
  const ws = clientSockets.get(number);
  if (ws) {
    safeSend(ws, {
      type: "PERMANENTLY_BANNED",
      number,
      reason: "\u26A0\uFE0F \u062A\u0645 \u0645\u0633\u062D \u0648\u062D\u0638\u0631 \u062D\u0633\u0627\u0628\u0643 \u0646\u0647\u0627\u0626\u064A\u0627\u064B \u0645\u0646 \u0642\u0628\u0644 \u0645\u0627\u0644\u0643 \u062A\u0637\u0628\u064A\u0642 \u062A\u0648\u0627\u0635\u0644 24. \u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0639\u0648\u062F\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u0646\u0635\u0629 \u062F\u0648\u0646 \u0625\u0630\u0646 \u0645\u0628\u0627\u0634\u0631 \u0645\u0646 \u0645\u0627\u0644\u0643 \u0627\u0644\u062A\u0637\u0628\u064A\u0642."
    });
    ws.close();
    clientSockets.delete(number);
  }
  broadcast({
    type: "USER_DELETED_PERMANENTLY",
    number
  });
  res.json({
    success: true,
    message: `\u062A\u0645 \u0645\u0633\u062D \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 ${userName} (${number}) \u0646\u0647\u0627\u0626\u064A\u0627\u064B \u0648\u062D\u0638\u0631 \u0639\u0648\u062F\u062A\u0647 \u0644\u0644\u0645\u0646\u0635\u0629 \u0628\u0646\u062C\u0627\u062D.`,
    blacklist: Array.from(permanentBlacklist.values()),
    users: Array.from(users.values())
  });
});
app.post("/api/admin/restore-permission", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== "Bearer admin_auth_faroog77_token") {
    return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
  }
  const { number } = req.body;
  if (!number) return res.status(400).json({ error: "\u0627\u0644\u0631\u0642\u0645 \u0645\u0637\u0644\u0648\u0628" });
  permanentBlacklist.delete(number);
  res.json({
    success: true,
    message: `\u062A\u0645 \u0645\u0646\u062D \u0627\u0644\u0625\u0630\u0646 \u0644\u0644\u0631\u0642\u0645 ${number} \u0628\u0627\u0644\u0639\u0648\u062F\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u0646\u0635\u0629 \u0628\u0646\u062C\u0627\u062D.`,
    blacklist: Array.from(permanentBlacklist.values())
  });
});
app.post("/api/admin/clear-user-chat", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== "Bearer admin_auth_faroog77_token") {
    return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
  }
  const { targetNumber } = req.body;
  if (!targetNumber) {
    return res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u0645\u0634\u062A\u0631\u0643 \u0645\u0637\u0644\u0648\u0628" });
  }
  const initialCount = messages.length;
  const remaining = messages.filter((m) => m.from !== targetNumber && m.to !== targetNumber);
  messages.length = 0;
  messages.push(...remaining);
  broadcast({
    type: "USER_CHAT_CLEARED",
    targetNumber
  });
  res.json({
    success: true,
    message: `\u062A\u0645 \u062D\u0630\u0641 \u062C\u0645\u064A\u0639 \u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0627\u0644\u0645\u0634\u062A\u0631\u0643 (${targetNumber}) \u0628\u0646\u062C\u0627\u062D.`,
    deletedCount: initialCount - remaining.length
  });
});
app.post("/api/messages/delete", (req, res) => {
  const { messageIds } = req.body;
  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return res.status(400).json({ error: "\u0645\u0639\u0631\u0641\u0627\u062A \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0645\u0637\u0644\u0648\u0628\u0629" });
  }
  const setIds = new Set(messageIds);
  const remaining = messages.filter((m) => !setIds.has(m.id));
  messages.length = 0;
  messages.push(...remaining);
  broadcast({
    type: "MESSAGES_DELETED",
    messageIds
  });
  res.json({ success: true, deletedCount: messageIds.length });
});
app.get("/api/messages/:number", (req, res) => {
  const userNum = req.params.number;
  const userMsgs = messages.filter(
    (m) => (m.from === userNum || m.to === userNum || m.to === "global" || m.from === "813579") && m.from !== "875319" && m.to !== "875319" && m.from !== "891357" && m.to !== "891357"
  );
  res.json({ success: true, messages: userMsgs });
});
var stories = [];
function seedInitialStories() {
  if (stories.length === 0) {
    stories.push({
      id: "story_support_welcome",
      userNumber: "813579",
      userName: "\u0641\u0631\u064A\u0642 \u062F\u0639\u0645 \u062A\u0648\u0627\u0635\u0644 24",
      userAvatar: "/src/assets/images/tawasol24_logo_badge_1791830208691.jpg",
      text: "\u0623\u0647\u0644\u0627\u064B \u0628\u0643\u0645 \u0641\u064A \u0645\u0646\u0635\u0629 \u062A\u0648\u0627\u0635\u0644 24! \u0634\u0627\u0631\u0643\u0648\u0627 \u0644\u062D\u0638\u0627\u062A\u0643\u0645 \u0648\u062D\u0627\u0644\u0627\u062A\u0643\u0645 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0628\u0643\u0644 \u0633\u0647\u0648\u0644\u0629 \u2728",
      mediaType: "text",
      backgroundColor: "from-blue-600 to-indigo-900",
      timestamp: Date.now() - 36e5
    });
  }
}
seedInitialStories();
app.get("/api/stories", (_req, res) => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1e3;
  const activeStories = stories.filter((s) => s.timestamp >= cutoff);
  res.json({ success: true, stories: activeStories });
});
app.post("/api/stories", (req, res) => {
  const { userNumber, userName, userAvatar, text, mediaUrl, mediaType, backgroundColor } = req.body;
  if (!userNumber) return res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0637\u0644\u0648\u0628" });
  const newStory = {
    id: `story_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userNumber,
    userName: userName || `\u0645\u0633\u062A\u062E\u062F\u0645 ${userNumber}`,
    userAvatar: userAvatar || "/src/assets/images/tawasol24_logo_badge_1791830208691.jpg",
    text,
    mediaUrl,
    mediaType: mediaType || "text",
    timestamp: Date.now(),
    backgroundColor: backgroundColor || "from-blue-600 to-indigo-900"
  };
  stories.unshift(newStory);
  broadcast({
    type: "NEW_STORY",
    story: newStory
  });
  res.json({ success: true, story: newStory });
});
app.delete("/api/stories/:id", (req, res) => {
  const { id } = req.params;
  const idx = stories.findIndex((s) => s.id === id);
  if (idx !== -1) {
    stories.splice(idx, 1);
    broadcast({
      type: "DELETE_STORY",
      id
    });
  }
  res.json({ success: true });
});
var cloudBackups = /* @__PURE__ */ new Map();
app.post("/api/cloud-backup/save", (req, res) => {
  const { userNumber, userName, messages: backupMsgs, contacts: backupContacts, settings } = req.body;
  if (!userNumber) {
    return res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0637\u0644\u0648\u0628 \u0644\u0625\u062A\u0645\u0627\u0645 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0633\u062D\u0627\u0628\u064A" });
  }
  const payloadStr = JSON.stringify(req.body);
  const sizeBytes = Buffer.byteLength(payloadStr, "utf8");
  const sizeFormatted = sizeBytes > 1024 * 1024 ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB` : `${(sizeBytes / 1024).toFixed(1)} KB`;
  const record = {
    userNumber,
    userName: userName || `\u0645\u0633\u062A\u062E\u062F\u0645 ${userNumber}`,
    messages: backupMsgs || [],
    contacts: backupContacts || [],
    settings: settings || {},
    timestamp: Date.now(),
    backupSize: sizeFormatted,
    messageCount: (backupMsgs || []).length
  };
  cloudBackups.set(userNumber, record);
  res.json({
    success: true,
    message: "\u062A\u0645 \u062D\u0641\u0638 \u0648\u062A\u0634\u0641\u064A\u0631 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0641\u064A \u0633\u062D\u0627\u0628\u0629 \u062A\u0648\u0627\u0635\u0644 24 \u0628\u0646\u062C\u0627\u062D \u2601\uFE0F",
    backup: {
      timestamp: record.timestamp,
      backupSize: record.backupSize,
      messageCount: record.messageCount
    }
  });
});
app.get("/api/cloud-backup/:number", (req, res) => {
  const userNumber = req.params.number;
  const backup = cloudBackups.get(userNumber);
  if (!backup) {
    return res.json({ success: false, hasBackup: false, message: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0646\u0633\u062E\u0629 \u0633\u062D\u0627\u0628\u064A\u0629 \u0645\u062D\u0641\u0648\u0638\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u0631\u0642\u0645 \u0628\u0639\u062F" });
  }
  res.json({ success: true, hasBackup: true, backup });
});
app.get("/api/cloud-backup/status/:number", (req, res) => {
  const userNumber = req.params.number;
  const backup = cloudBackups.get(userNumber);
  if (!backup) {
    return res.json({ hasBackup: false });
  }
  res.json({
    hasBackup: true,
    lastBackupAt: backup.timestamp,
    size: backup.backupSize,
    messageCount: backup.messageCount
  });
});
app.delete("/api/cloud-backup/:number", (req, res) => {
  const userNumber = req.params.number;
  cloudBackups.delete(userNumber);
  res.json({ success: true, message: "\u062A\u0645 \u0645\u0633\u062D \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0645\u0646 \u0627\u0644\u0633\u062D\u0627\u0628\u0629 \u0628\u0646\u062C\u0627\u062D" });
});
app.post("/api/messages/react", (req, res) => {
  const { messageId, emoji, userNumber } = req.body;
  if (!messageId || !emoji || !userNumber) {
    return res.status(400).json({ error: "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629" });
  }
  const msg = messages.find((m) => m.id === messageId);
  if (msg) {
    const reactions = msg.reactions || {};
    reactions[emoji] = (reactions[emoji] || 0) + 1;
    msg.reactions = reactions;
  }
  broadcast({
    type: "MESSAGE_REACTION",
    messageId,
    emoji,
    userNumber
  });
  res.json({ success: true });
});
app.post("/api/admin/clear-logs", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== "Bearer admin_auth_faroog77_token") {
    return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
  }
  messages.length = 0;
  callLogs.length = 0;
  stories.length = 0;
  seedInitialData();
  seedInitialStories();
  broadcast({ type: "DATA_CLEARED" });
  res.json({ success: true, message: "\u062A\u0645 \u062A\u0646\u0638\u064A\u0641 \u0627\u0644\u0633\u062C\u0644\u0627\u062A \u0648\u0625\u0639\u0627\u062F\u0629 \u0636\u0628\u0637 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D." });
});
app.get([
  "/api/download/modular",
  "/download/modular",
  "/download/Modular-standalone.zip",
  "/downloads/Modular-standalone.zip",
  "/download/modular-standalone.zip",
  "/downloads/modular-standalone.zip",
  "/api/download/kodular",
  "/download/kodular",
  "/download/kodular-standalone.zip",
  "/downloads/kodular-standalone.zip"
], (_req, res) => {
  const fileCandidates = [
    path.resolve(__dirname, "public/downloads/Modular-standalone.zip"),
    path.resolve(__dirname, "dist/downloads/Modular-standalone.zip"),
    path.resolve(__dirname, "public/downloads/kodular-standalone.zip"),
    path.resolve(__dirname, "dist/downloads/kodular-standalone.zip")
  ];
  const target = fileCandidates.find((f) => fs.existsSync(f));
  if (target) {
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="Modular-standalone.zip"');
    res.download(target, "Modular-standalone.zip");
  } else {
    res.status(404).json({ error: "\u0627\u0644\u0645\u0644\u0641 \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631 \u062D\u0627\u0644\u064A\u0627\u064B" });
  }
});
app.get(["/kodular", "/download-kodular"], (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\u062A\u062D\u0645\u064A\u0644 \u0645\u0644\u0641 index.html \u0644\u0645\u0646\u0635\u0629 \u0643\u0648\u062F\u064A\u0644\u0627\u0631 - \u062A\u0648\u0627\u0635\u0644 24</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 24px; padding: 32px 24px; max-width: 440px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    h1 { font-size: 20px; margin-bottom: 8px; color: #38bdf8; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #2563eb; color: white; text-decoration: none; padding: 14px 28px; border-radius: 14px; font-weight: bold; font-size: 15px; transition: 0.2s; box-shadow: 0 10px 15px -3px rgba(37,99,235,0.4); width: 100%; box-sizing: border-box; }
    .btn:hover { background: #1d4ed8; }
    .btn-secondary { background: #334155; box-shadow: none; margin-top: 10px; }
    .btn-secondary:hover { background: #475569; }
    .note { margin-top: 20px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size: 40px; margin-bottom: 12px;">\u{1F4E6}</div>
    <h1>\u062A\u062D\u0645\u064A\u0644 \u0645\u0644\u0641 index.html \u0644\u0643\u0648\u062F\u064A\u0644\u0627\u0631</h1>
    <p>\u062A\u0645 \u062A\u062C\u0647\u064A\u0632 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0645\u0636\u063A\u0648\u0637 \u0643\u0627\u0645\u0644\u0627\u064B \u0644\u0645\u0646\u0635\u0629 Kodular. \u0633\u064A\u0628\u062F\u0623 \u0627\u0644\u062A\u062D\u0645\u064A\u0644 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0627\u0644\u0622\u0646\u060C \u0623\u0648 \u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u0632\u0631 \u0623\u062F\u0646\u0627\u0647:</p>
    <a href="/download/kodular" class="btn">\u2B07\uFE0F \u0627\u0636\u063A\u0637 \u0647\u0646\u0627 \u0644\u0628\u062F\u0621 \u0627\u0644\u062A\u062D\u0645\u064A\u0644 \u0641\u0648\u0631\u0627\u064B (ZIP)</a>
    <a href="/download/build" class="btn btn-secondary">\u{1F4E6} \u062A\u062D\u0645\u064A\u0644 \u062D\u0632\u0645\u0629 \u0627\u0644\u0628\u0646\u0627\u0621 \u0627\u0644\u0643\u0627\u0645\u0644\u0629 (dist)</a>
    <div class="note">\u0645\u0646\u0635\u0629 \u062A\u0648\u0627\u0635\u0644 24 - Tawasol 24</div>
  </div>
  <script>
    setTimeout(function() {
      window.location.href = '/download/kodular';
    }, 800);
  </script>
</body>
</html>`);
});
app.get(["/call", "/calling", "/webrtc"], (_req, res) => {
  const callFile = path.resolve(__dirname, "public/call.html");
  const distCallFile = path.resolve(__dirname, "dist/call.html");
  if (fs.existsSync(callFile)) {
    res.sendFile(callFile);
  } else if (fs.existsSync(distCallFile)) {
    res.sendFile(distCallFile);
  } else {
    res.status(404).send("\u0634\u0627\u0634\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631\u0629");
  }
});
app.get(["/download/cloud", "/download/cloud-html", "/api/download/cloud"], (_req, res) => {
  const target = path.resolve(__dirname, "public/index-cloud-netlify.html");
  if (fs.existsSync(target)) {
    res.setHeader("Content-Type", "text/html; charset=UTF-8");
    res.setHeader("Content-Disposition", 'attachment; filename="index.html"');
    res.download(target, "index.html");
  } else {
    res.status(404).json({ error: "\u0627\u0644\u0645\u0644\u0641 \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631" });
  }
});
app.get(["/download/call", "/download/call-html"], (_req, res) => {
  const target = path.resolve(__dirname, "public/call.html");
  if (fs.existsSync(target)) {
    res.setHeader("Content-Type", "text/html; charset=UTF-8");
    res.setHeader("Content-Disposition", 'attachment; filename="call.html"');
    res.download(target, "call.html");
  } else {
    res.status(404).json({ error: "\u0627\u0644\u0645\u0644\u0641 \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631" });
  }
});
app.get(["/downloads/:filename", "/api/downloads/:filename"], (req, res) => {
  const filename = req.params.filename;
  const fileCandidates = [
    path.resolve(__dirname, "public/downloads", filename),
    path.resolve(__dirname, "dist/downloads", filename)
  ];
  const target = fileCandidates.find((f) => fs.existsSync(f));
  if (target) {
    res.setHeader("Content-Type", "application/zip");
    res.download(target, filename);
  } else {
    res.status(404).send("\u0627\u0644\u0645\u0644\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
  }
});
app.get(["/download", "/download-build", "/build-download", "/build"], (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\u062A\u062D\u0645\u064A\u0644 \u0645\u0644\u0641 \u0628\u0646\u0627\u0621 \u0627\u0644\u062A\u0637\u0628\u064A\u0642 - \u062A\u0648\u0627\u0635\u0644 24</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 24px; padding: 36px 24px; max-width: 480px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    h1 { font-size: 22px; margin-bottom: 8px; color: #38bdf8; font-weight: 800; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #2563eb; color: white; text-decoration: none; padding: 16px 28px; border-radius: 16px; font-weight: bold; font-size: 16px; transition: 0.2s; box-shadow: 0 10px 20px -3px rgba(37,99,235,0.4); width: 100%; box-sizing: border-box; }
    .btn:hover { background: #1d4ed8; transform: translateY(-2px); }
    .btn-secondary { background: #334155; box-shadow: none; margin-top: 12px; font-size: 14px; }
    .btn-secondary:hover { background: #475569; transform: none; }
    .details { background: #0f172a; border-radius: 14px; padding: 14px; margin-bottom: 24px; text-align: right; font-size: 12px; color: #cbd5e1; }
    .details li { margin-bottom: 6px; }
    .note { margin-top: 20px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size: 48px; margin-bottom: 12px;">\u{1F4E6}</div>
    <h1>\u062A\u062D\u0645\u064A\u0644 \u0628\u0646\u0627\u0621 \u0627\u0644\u062A\u0637\u0628\u064A\u0642 \u0643\u0627\u0645\u0644\u0627\u064B</h1>
    <p>\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0645\u0636\u063A\u0648\u0637 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0643\u0627\u0641\u0629 \u0645\u0644\u0641\u0627\u062A \u0627\u0644\u0628\u0646\u0627\u0621 \u0627\u0644\u062C\u0627\u0647\u0632\u0629 \u0644\u0644\u062A\u0634\u063A\u064A\u0644 (index.html \u0645\u0639 \u0645\u062C\u0644\u062F \u0627\u0644\u0623\u0635\u0648\u0644 assets \u0648\u0627\u0644\u0640 JavaScript \u0648\u0627\u0644\u0640 CSS).</p>
    
    <div class="details">
      <div style="font-weight: bold; margin-bottom: 8px; color: #38bdf8;">\u0645\u062D\u062A\u0648\u064A\u0627\u062A \u0627\u0644\u062D\u0632\u0645\u0629:</div>
      <ul style="padding-right: 20px; margin: 0;">
        <li>\u0645\u0644\u0641 index.html \u062C\u0627\u0647\u0632 \u0644\u0644\u062A\u0634\u063A\u064A\u0644 \u0648 Kodular</li>
        <li>\u0645\u062C\u0644\u062F \u0643\u0627\u0645\u0644 \u0644\u0623\u0635\u0648\u0644 \u0627\u0644\u0640 JavaScript \u0648 CSS \u0627\u0644\u0645\u062A\u0631\u062C\u0645\u0629</li>
        <li>\u0623\u064A\u0642\u0648\u0646\u0627\u062A \u0648\u0635\u0648\u0631 \u0648\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u0646\u0635\u0629 \u0628\u062F\u0642\u0629 \u0639\u0627\u0644\u064A\u0629</li>
      </ul>
    </div>

    <a href="/download/build" class="btn">\u2B07\uFE0F \u0627\u0636\u063A\u0637 \u0647\u0646\u0627 \u0644\u0628\u062F\u0621 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0645\u0636\u063A\u0648\u0637 (ZIP)</a>
    <a href="/download/kodular" class="btn btn-secondary">\u{1F4C4} \u062A\u062D\u0645\u064A\u0644 \u0646\u0633\u062E\u0629 \u0643\u0648\u062F\u064A\u0644\u0627\u0631 \u0627\u0644\u062E\u0641\u064A\u0641\u0629 (index.html \u0641\u0642\u0637)</a>
    
    <div class="note">\u0645\u0646\u0635\u0629 \u062A\u0648\u0627\u0635\u0644 24 - Tawasol 24 Messenger</div>
  </div>
  <script>
    setTimeout(function() {
      window.location.href = '/download/build';
    }, 600);
  </script>
</body>
</html>`);
});
app.get(["/api/download/build", "/download/build"], (_req, res) => {
  const fileCandidates = [
    path.resolve(__dirname, "public/downloads/tawasol24-build.zip"),
    path.resolve(__dirname, "dist/downloads/tawasol24-build.zip")
  ];
  const target = fileCandidates.find((f) => fs.existsSync(f));
  if (target) {
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="tawasol24-build.zip"');
    res.download(target, "tawasol24-build.zip");
  } else {
    res.status(404).json({ error: "\u0627\u0644\u0645\u0644\u0641 \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631 \u062D\u0627\u0644\u064A\u0627\u064B" });
  }
});
app.get(["/api/download/source", "/download/source"], (_req, res) => {
  const fileCandidates = [
    path.resolve(__dirname, "public/downloads/tawasol24-project-source.zip"),
    path.resolve(__dirname, "dist/downloads/tawasol24-project-source.zip")
  ];
  const target = fileCandidates.find((f) => fs.existsSync(f));
  if (target) {
    res.download(target, "tawasol24-project-source.zip");
  } else {
    res.status(404).json({ error: "\u0627\u0644\u0645\u0644\u0641 \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631 \u062D\u0627\u0644\u064A\u0627\u064B" });
  }
});
app.get(["/api/download/complete", "/api/download/all", "/api/download/zip", "/download/complete"], (_req, res) => {
  const fileCandidates = [
    path.resolve(__dirname, "public/downloads/tawasol24-complete-package.zip"),
    path.resolve(__dirname, "dist/downloads/tawasol24-complete-package.zip")
  ];
  const target = fileCandidates.find((f) => fs.existsSync(f));
  if (target) {
    res.download(target, "tawasol24-complete-package.zip");
  } else {
    res.status(404).json({ error: "\u0627\u0644\u0645\u0644\u0641 \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631 \u062D\u0627\u0644\u064A\u0627\u064B" });
  }
});
app.use("/src/assets", express.static(path.resolve(__dirname, "src/assets")));
app.use("/assets", express.static(path.resolve(__dirname, "public/assets")));
if (fs.existsSync(path.resolve(__dirname, "public"))) {
  app.use(express.static(path.resolve(__dirname, "public")));
}
async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
  const isProduction = process.env.NODE_ENV === "production";
  const distExists = fs.existsSync(path.resolve(__dirname, "dist"));
  if (isProduction || distExists && !process.env.VITE_DEV_SERVER) {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api") || req.originalUrl.startsWith("/ws")) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  }
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F680} \u062A\u0648\u0627\u0635\u0644 24 \u064A\u0639\u0645\u0644 \u0628\u0646\u062C\u0627\u062D \u0639\u0644\u0649 \u0627\u0644\u0645\u0646\u0641\u0630 ${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Server startup failed:", err);
});
export {
  generateFiveSuggestions,
  generateRandomValidNumber,
  isValidTawasolNumber
};
