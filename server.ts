import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Enable CORS and iframe embedding for webviews and external app wrappers/creators
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  // Allow external app platforms (like AppsGeyser) to load the page inside iframes and WebViews
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory data structures
export interface UserProfile {
  number: string;
  name: string;
  avatar: string;
  statusMessage?: string;
  isOnline: boolean;
  lastSeen: number;
  registeredAt: number;
  isBanned?: boolean;
}

export interface ChatMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  contentType: 'text' | 'audio' | 'video' | 'image' | 'file';
  mediaUrl?: string;
  duration?: number;
  fileName?: string;
  fileSize?: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
}

export interface CallLog {
  id: string;
  caller: string;
  receiver: string;
  callerName: string;
  receiverName: string;
  status: 'completed' | 'missed' | 'declined' | 'busy';
  duration: number; // in seconds
  timestamp: number;
}

// State storage
const users = new Map<string, UserProfile>();
const messages: ChatMessage[] = [];
const callLogs: CallLog[] = [];
const blockedRelations = new Map<string, Set<string>>(); // fromNumber -> Set<blockedNumber>
const clientSockets = new Map<string, WebSocket>(); // userNumber -> ws
const permanentBlacklist = new Map<string, { number: string; name: string; bannedAt: number; reason: string }>();

// Helper: validate number rules
export function isValidTawasolNumber(numStr: string): { valid: boolean; reason?: string } {
  const clean = numStr.trim();
  if (!/^\d+$/.test(clean)) {
    return { valid: false, reason: 'يجب أن يحتوي الرقم على أرقام فقط بدون حروف أو رموز.' };
  }
  if (!clean.startsWith('8')) {
    return { valid: false, reason: 'تنبيه: يجب أن يبدأ الرقم بالرقم 8 إجباري.' };
  }
  if (clean.length < 6 || clean.length > 9) {
    return { valid: false, reason: 'يجب أن يتكون الرقم من 6 أرقام كحد أدنى و 9 أرقام كحد أقصى.' };
  }
  const lastDigit = parseInt(clean.charAt(clean.length - 1), 10);
  if (lastDigit % 2 === 0) {
    return { valid: false, reason: 'يجب أن يكون الرقم فردياً (ينتهي بـ 1، 3، 5، 7، أو 9).' };
  }
  return { valid: true };
}

// Generate single valid random odd number
export function generateRandomValidNumber(): string {
  const length = Math.floor(Math.random() * 4) + 6; // 6, 7, 8, or 9 digits
  let result = '8';
  for (let i = 1; i < length - 1; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  // Last digit must be odd: 1, 3, 5, 7, 9
  const oddDigits = ['1', '3', '5', '7', '9'];
  result += oddDigits[Math.floor(Math.random() * oddDigits.length)];
  return result;
}

// Generate 5 distinct available numbers
export function generateFiveSuggestions(excludeNumber?: string): string[] {
  const set = new Set<string>();
  let attempts = 0;
  while (set.size < 5 && attempts < 200) {
    attempts++;
    const cand = generateRandomValidNumber();
    if (cand !== excludeNumber && (!users.has(cand) || !users.get(cand)?.isOnline)) {
      set.add(cand);
    }
  }
  // If still less than 5, generate any valid
  while (set.size < 5) {
    set.add(generateRandomValidNumber());
  }
  return Array.from(set);
}

// Seed initial demo contacts so new users immediately have someone to talk to or test
function seedInitialData() {
  if (users.size === 0) {
    const demo1: UserProfile = {
      number: '813579',
      name: 'فريق دعم تواصل 24',
      avatar: '/src/assets/images/tawasol24_logo_badge_1791830208691.jpg',
      statusMessage: 'أهلاً بك في منصة تواصل 24! نحن في خدمتكم على مدار الساعة.',
      isOnline: true,
      lastSeen: Date.now(),
      registeredAt: Date.now() - 86400000,
    };
    users.set(demo1.number, demo1);

    // Initial greeting message
    messages.push({
      id: 'welcome-msg-1',
      from: '813579',
      to: 'global',
      content: 'مرحباً بك في منصة تواصل 24! يمكنك إجراء المكالمات الصوتية، تسجيل الرسائل الصوتية، إرسال الفيديوهات والنصوص بكل سهولة.',
      contentType: 'text',
      timestamp: Date.now() - 10000,
      status: 'delivered',
    });
  }
}
seedInitialData();

// Global process error safety to prevent any unexpected server crashes
process.on('uncaughtException', (err) => {
  console.warn('Recovered from uncaught exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.warn('Recovered from unhandled rejection:', reason);
});

function safeSend(ws: WebSocket | undefined, payload: any) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn('ws send error handled:', e);
    }
  }
  return false;
}

function broadcast(payload: any, excludeWs?: WebSocket) {
  const data = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      try {
        client.send(data);
      } catch (err) {
        console.warn('Broadcast send error handled:', err);
      }
    }
  });
}

function sendToNumber(targetNumber: string, payload: any) {
  const targetWs = clientSockets.get(targetNumber);
  return safeSend(targetWs, payload);
}

// WebSocket connection handling with heartbeat
wss.on('error', (err) => {
  console.warn('WebSocket Server error handled:', err.message);
});

wss.on('connection', (ws) => {
  let boundNumber: string | null = null;
  let isAlive = true;

  ws.on('error', (err) => {
    console.warn('Client socket error handled:', err.message);
  });

  ws.on('pong', () => {
    isAlive = true;
  });

  ws.on('message', (rawData) => {
    try {
      const data = JSON.parse(rawData.toString());

      switch (data.type) {
        case 'REGISTER_CLIENT': {
          const { number, name, avatar, statusMessage } = data;
          if (!number) return;

          // Check if user is permanently blacklisted by owner
          if (permanentBlacklist.has(number)) {
            safeSend(ws, {
              type: 'PERMANENTLY_BANNED',
              number,
              reason: '⚠️ تم مسح وحظر هذا الحساب نهائياً من قبل مالك تطبيق تواصل 24. لا يمكنك العودة إلى المنصة إلا بعد الحصول على إذن مباشر من مالك التطبيق.',
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
              name: name || `مستخدم ${number}`,
              avatar: avatar || '/src/assets/images/tawasol24_logo_badge_1791830208691.jpg',
              statusMessage: statusMessage || 'مرحباً! أنا أستخدم تواصل 24',
              isOnline: true,
              lastSeen: Date.now(),
              registeredAt: Date.now(),
            };
            users.set(number, user);
          }

          // Notify all users about online status
          broadcast({
            type: 'USER_STATUS_CHANGE',
            number,
            isOnline: true,
            lastSeen: user.lastSeen,
            user,
          });

          // Send current directory and messages to the newly connected user
          ws.send(JSON.stringify({
            type: 'INITIAL_SYNC',
            users: Array.from(users.values()).filter(u => u.number !== '875319' && u.number !== '891357'),
            recentMessages: messages.filter(m => (m.from === number || m.to === number || m.to === 'global' || m.from === '813579') && m.from !== '875319' && m.to !== '875319' && m.from !== '891357' && m.to !== '891357').slice(-100),
          }));
          break;
        }

        case 'SEND_MESSAGE': {
          const { id, from, to, content, contentType, mediaUrl, duration, fileName, fileSize } = data;
          // Check if sender is blocked by receiver
          const receiverBlocks = blockedRelations.get(to);
          if (receiverBlocks && receiverBlocks.has(from)) {
            ws.send(JSON.stringify({
              type: 'MESSAGE_BLOCKED',
              id,
              to,
              reason: 'لا يمكنك إرسال رسائل لهذا الرقم لأنه تم حظرك.',
            }));
            return;
          }

          const newMsg: ChatMessage = {
            id: id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            from,
            to,
            content: content || '',
            contentType: contentType || 'text',
            mediaUrl,
            duration,
            fileName,
            fileSize,
            timestamp: Date.now(),
            status: clientSockets.has(to) ? 'delivered' : 'sent',
          };

          messages.push(newMsg);

          // Deliver to recipient
          const delivered = sendToNumber(to, {
            type: 'NEW_MESSAGE',
            message: newMsg,
          });

          // Send back delivery ack to sender
          ws.send(JSON.stringify({
            type: 'MESSAGE_ACK',
            message: newMsg,
            delivered,
          }));

          // If message is to demo bot '813579' (Support bot), simulate delivered -> read transition and auto-reply
          if (to === '813579') {
            // 1. Mark as delivered after 400ms
            setTimeout(() => {
              newMsg.status = 'delivered';
              safeSend(ws, {
                type: 'MESSAGE_STATUS_UPDATE',
                messageId: newMsg.id,
                status: 'delivered',
              });
            }, 400);

            // 2. Mark as read after 1200ms (blue double ticks)
            setTimeout(() => {
              newMsg.status = 'read';
              safeSend(ws, {
                type: 'MESSAGE_STATUS_UPDATE',
                messageId: newMsg.id,
                status: 'read',
              });
            }, 1200);

            // 3. Send reply after 1800ms
            setTimeout(() => {
              const replies = [
                'مرحباً بك! رسالتك وصلت بنجاح إلى نظام تواصل 24 🚀',
                'شكراً لتواصلك معنا عبر تواصل 24. خدمات المكالمات والرسائل الصوتية تعمل بكفاءة عالية.',
                'تم استلام طلبك، يمكنك تجربة إجراء اتصال صوتي أو تسجيل رسالة صوتية الآن!',
              ];
              const autoReply: ChatMessage = {
                id: `auto_${Date.now()}`,
                from: '813579',
                to: from,
                content: replies[Math.floor(Math.random() * replies.length)],
                contentType: 'text',
                timestamp: Date.now(),
                status: 'delivered',
              };
              messages.push(autoReply);
              sendToNumber(from, {
                type: 'NEW_MESSAGE',
                message: autoReply,
              });
            }, 1800);
          }
          break;
        }

        case 'MARK_MESSAGES_READ': {
          const { from, to, messageIds } = data;
          messages.forEach((m) => {
            if ((messageIds && messageIds.includes(m.id)) || (m.from === to && m.to === from)) {
              m.status = 'read';
            }
          });
          sendToNumber(to, {
            type: 'MESSAGE_STATUS_UPDATE',
            status: 'read',
            from,
            messageIds,
          });
          break;
        }

        case 'TYPING_INDICATOR': {
          const { from, to, isTyping } = data;
          sendToNumber(to, {
            type: 'USER_TYPING',
            from,
            isTyping,
          });
          break;
        }

        case 'CALL_INITIATE': {
          const { callId, from, to, callerName, callerAvatar } = data;
          // Check if blocked
          const receiverBlocks = blockedRelations.get(to);
          if (receiverBlocks && receiverBlocks.has(from)) {
            ws.send(JSON.stringify({
              type: 'CALL_REJECTED',
              callId,
              from: to,
              reason: 'blocked',
              message: 'المستخدم غير متاح حالياً.',
            }));
            return;
          }

          const targetAvailable = clientSockets.has(to);
          if (!targetAvailable) {
            ws.send(JSON.stringify({
              type: 'CALL_FAILED',
              callId,
              reason: 'offline',
              message: 'الرقم المطلوب غير متصل حالياً.',
            }));
            callLogs.push({
              id: callId,
              caller: from,
              receiver: to,
              callerName: callerName || from,
              receiverName: users.get(to)?.name || to,
              status: 'missed',
              duration: 0,
              timestamp: Date.now(),
            });
            return;
          }

          // Forward call offer to receiver
          sendToNumber(to, {
            type: 'INCOMING_CALL',
            callId,
            from,
            callerName: callerName || users.get(from)?.name || from,
            callerAvatar: callerAvatar || users.get(from)?.avatar,
          });
          break;
        }

        case 'CALL_ACCEPT': {
          const { callId, from, to } = data;
          sendToNumber(to, {
            type: 'CALL_ACCEPTED',
            callId,
            from,
          });
          break;
        }

        case 'CALL_REJECT': {
          const { callId, from, to, reason } = data;
          sendToNumber(to, {
            type: 'CALL_REJECTED',
            callId,
            from,
            reason: reason || 'declined',
          });
          callLogs.push({
            id: callId,
            caller: to,
            receiver: from,
            callerName: users.get(to)?.name || to,
            receiverName: users.get(from)?.name || from,
            status: 'declined',
            duration: 0,
            timestamp: Date.now(),
          });
          break;
        }

        case 'CALL_END': {
          const { callId, from, to, duration } = data;
          sendToNumber(to, {
            type: 'CALL_ENDED',
            callId,
            from,
            duration: duration || 0,
          });
          callLogs.push({
            id: callId,
            caller: from,
            receiver: to,
            callerName: users.get(from)?.name || from,
            receiverName: users.get(to)?.name || to,
            status: 'completed',
            duration: duration || 0,
            timestamp: Date.now(),
          });
          break;
        }

        case 'SIGNALING_DATA': {
          // Relays WebRTC signaling (SDP offer/answer / ICE candidate)
          const { to, signalData, from } = data;
          sendToNumber(to, {
            type: 'SIGNALING_DATA',
            from,
            signalData,
          });
          break;
        }

        case 'BLOCK_USER': {
          const { from, targetNumber, block } = data;
          if (!blockedRelations.has(from)) {
            blockedRelations.set(from, new Set());
          }
          const userSet = blockedRelations.get(from)!;
          if (block) {
            userSet.add(targetNumber);
          } else {
            userSet.delete(targetNumber);
          }
          ws.send(JSON.stringify({
            type: 'BLOCK_UPDATED',
            targetNumber,
            isBlocked: block,
          }));
          break;
        }

        case 'DELETE_MESSAGES': {
          const { messageIds } = data;
          if (Array.isArray(messageIds) && messageIds.length > 0) {
            const setIds = new Set(messageIds);
            const remaining = messages.filter((m) => !setIds.has(m.id));
            messages.length = 0;
            messages.push(...remaining);

            broadcast({
              type: 'MESSAGES_DELETED',
              messageIds,
            });
          }
          break;
        }

        case 'CLEAR_USER_CHAT': {
          const { targetNumber } = data;
          if (targetNumber) {
            const remaining = messages.filter((m) => m.from !== targetNumber && m.to !== targetNumber);
            messages.length = 0;
            messages.push(...remaining);

            broadcast({
              type: 'USER_CHAT_CLEARED',
              targetNumber,
            });
          }
          break;
        }
      }
    } catch (err) {
      console.error('WS Error:', err);
    }
  });

  ws.on('close', () => {
    if (boundNumber) {
      clientSockets.delete(boundNumber);
      const user = users.get(boundNumber);
      if (user) {
        user.isOnline = false;
        user.lastSeen = Date.now();
        broadcast({
          type: 'USER_STATUS_CHANGE',
          number: boundNumber,
          isOnline: false,
          lastSeen: user.lastSeen,
        });
      }
    }
  });
});

// Periodic heartbeat to prevent idle disconnects across firewalls and mobile devices
setInterval(() => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.ping();
      } catch {
        // Ignored
      }
    }
  });
}, 20000);

// REST API Endpoints

// 1. Suggest 5 valid random odd numbers
app.get('/api/users/generate-suggestions', (req: Request, res: Response) => {
  const currentNum = req.query.current as string | undefined;
  const suggestions = generateFiveSuggestions(currentNum);
  res.json({ success: true, suggestions });
});

// 2. Validate custom user number
app.get('/api/users/check/:number', (req: Request, res: Response) => {
  const number = req.params.number;
  const validation = isValidTawasolNumber(number);
  if (!validation.valid) {
    return res.json({ available: false, reason: validation.reason });
  }

  // Check if permanently blacklisted by owner
  if (permanentBlacklist.has(number)) {
    return res.json({
      available: false,
      isBlacklisted: true,
      reason: '⚠️ هذا الرقم محظور وممسوح نهائياً من قبل مالك تطبيق تواصل 24. لا يمكنك العودة إلى المنصة إلا بعد الحصول على إذن مباشر من مالك التطبيق.',
    });
  }

  // Check if active with someone else
  const existing = users.get(number);
  if (existing && existing.isOnline) {
    return res.json({
      available: false,
      reason: 'هذا الرقم مفعل ومستخدم حالياً من قبل شخص آخر. يرجى اختيار رقم فردي آخر.',
    });
  }

  res.json({ available: true, formatted: number });
});

// 3. Register / Activate user number
app.post('/api/users/register', (req: Request, res: Response) => {
  const { number, name, avatar, statusMessage } = req.body;
  if (!number) {
    return res.status(400).json({ error: 'الرقم مطلوب' });
  }

  const validation = isValidTawasolNumber(number);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.reason });
  }

  // Check if permanently blacklisted by owner
  if (permanentBlacklist.has(number)) {
    return res.status(403).json({
      error: '⚠️ هذا الحساب محظور وممسوح نهائياً من قبل مالك تطبيق تواصل 24. لا يمكنك العودة إلى المنصة دون إذن مباشر من المالك.',
    });
  }

  const existing = users.get(number);
  if (existing && existing.isOnline && existing.isBanned) {
    return res.status(403).json({ error: 'هذا الرقم محظور من قبل إدارة تواصل 24' });
  }

  const profile: UserProfile = {
    number,
    name: name?.trim() || `مستخدم ${number}`,
    avatar: avatar || '/src/assets/images/tawasol24_logo_badge_1791830208691.jpg',
    statusMessage: statusMessage || 'مرحباً! أنا أستخدم تواصل 24',
    isOnline: true,
    lastSeen: Date.now(),
    registeredAt: existing ? existing.registeredAt : Date.now(),
  };

  users.set(number, profile);

  // Broadcast directory change
  broadcast({
    type: 'USER_REGISTERED',
    user: profile,
  });

  res.json({ success: true, user: profile });
});

// 4. Get active users directory
app.get('/api/users/directory', (req: Request, res: Response) => {
  users.delete('875319');
  users.delete('891357');
  const list = Array.from(users.values()).filter(
    (u) => u.number !== '875319' && u.number !== '891357'
  );
  res.json({ users: list });
});

// 5. Admin authentication & control
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { password } = req.body;
  // Specific password demanded by user: fa&roog#77
  if (password === 'fa&roog#77') {
    return res.json({
      success: true,
      token: 'admin_auth_faroog77_token',
      message: 'تم تسجيل دخول مالك التطبيق بنجاح.',
    });
  }
  return res.status(401).json({
    success: false,
    message: 'كلمة المرور غير صحيحة. هذا القسم مخصص لمالك التطبيق فقط.',
  });
});

// 6. Admin stats & full management
app.get('/api/admin/stats', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== 'Bearer admin_auth_faroog77_token') {
    return res.status(403).json({ error: 'غير مصرح بالدخول' });
  }

  const userList = Array.from(users.values());
  const onlineCount = userList.filter((u) => u.isOnline).length;
  const bannedCount = userList.filter((u) => u.isBanned).length;

  const audioCount = messages.filter((m) => m.contentType === 'audio').length;
  const videoCount = messages.filter((m) => m.contentType === 'video').length;
  const imageCount = messages.filter((m) => m.contentType === 'image').length;
  const textCount = messages.filter((m) => m.contentType === 'text').length;

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
      activeConnections: clientSockets.size,
    },
    users: userList,
    blacklist: Array.from(permanentBlacklist.values()),
    callLogs: callLogs.slice(-50),
    recentMessages: messages.slice(-50),
  });
});

// 7. Admin Broadcast announcement
app.post('/api/admin/broadcast', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== 'Bearer admin_auth_faroog77_token') {
    return res.status(403).json({ error: 'غير مصرح' });
  }

  const { title, message } = req.body;
  if (!message) return res.status(400).json({ error: 'نص الإشعار مطلوب' });

  const broadcastMsg: ChatMessage = {
    id: `broadcast_${Date.now()}`,
    from: '813579', // Official system number
    to: 'global',
    content: `📢 [إشعار رسمي من إدارة تواصل 24]\n${title ? `*${title}*\n` : ''}${message}`,
    contentType: 'text',
    timestamp: Date.now(),
    status: 'delivered',
  };

  messages.push(broadcastMsg);
  broadcast({
    type: 'ADMIN_BROADCAST',
    message: broadcastMsg,
  });

  res.json({ success: true, broadcastMsg });
});

// 8. Admin toggle ban user
app.post('/api/admin/toggle-ban', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== 'Bearer admin_auth_faroog77_token') {
    return res.status(403).json({ error: 'غير مصرح' });
  }

  const { number, ban } = req.body;
  const user = users.get(number);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  user.isBanned = !!ban;
  if (ban) {
    user.isOnline = false;
    const ws = clientSockets.get(number);
    if (ws) {
      ws.send(JSON.stringify({ type: 'FORCE_DISCONNECT', reason: 'تم حظر حسابك من قبل إدارة تواصل 24' }));
      ws.close();
      clientSockets.delete(number);
    }
  }

  broadcast({
    type: 'USER_STATUS_CHANGE',
    number,
    isOnline: user.isOnline,
    user,
  });

  res.json({ success: true, user });
});

// 9. Admin permanently delete user and forbid return without owner permission
app.post('/api/admin/permanent-delete', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== 'Bearer admin_auth_faroog77_token') {
    return res.status(403).json({ error: 'غير مصرح' });
  }

  const { number, reason } = req.body;
  if (!number) return res.status(400).json({ error: 'الرقم مطلوب' });

  const existing = users.get(number);
  const userName = existing?.name || `مستخدم ${number}`;

  // 1. Add to permanent blacklist
  permanentBlacklist.set(number, {
    number,
    name: userName,
    bannedAt: Date.now(),
    reason: reason || 'تم مسحه وحظره نهائياً من قبل مالك التطبيق لمنعه من العودة',
  });

  // 2. Permanently delete from users list
  users.delete(number);

  // 3. Immediately disconnect socket if online
  const ws = clientSockets.get(number);
  if (ws) {
    safeSend(ws, {
      type: 'PERMANENTLY_BANNED',
      number,
      reason: '⚠️ تم مسح وحظر حسابك نهائياً من قبل مالك تطبيق تواصل 24. لا يمكنك العودة إلى المنصة دون إذن مباشر من مالك التطبيق.',
    });
    ws.close();
    clientSockets.delete(number);
  }

  // 4. Broadcast deletion to all users so they no longer see this contact
  broadcast({
    type: 'USER_DELETED_PERMANENTLY',
    number,
  });

  res.json({
    success: true,
    message: `تم مسح المستخدم ${userName} (${number}) نهائياً وحظر عودته للمنصة بنجاح.`,
    blacklist: Array.from(permanentBlacklist.values()),
    users: Array.from(users.values()),
  });
});

// 10. Admin restore permission for user to return
app.post('/api/admin/restore-permission', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== 'Bearer admin_auth_faroog77_token') {
    return res.status(403).json({ error: 'غير مصرح' });
  }

  const { number } = req.body;
  if (!number) return res.status(400).json({ error: 'الرقم مطلوب' });

  permanentBlacklist.delete(number);

  res.json({
    success: true,
    message: `تم منح الإذن للرقم ${number} بالعودة إلى المنصة بنجاح.`,
    blacklist: Array.from(permanentBlacklist.values()),
  });
});

// 11. Admin clear all chats of a specific subscriber
app.post('/api/admin/clear-user-chat', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== 'Bearer admin_auth_faroog77_token') {
    return res.status(403).json({ error: 'غير مصرح' });
  }

  const { targetNumber } = req.body;
  if (!targetNumber) {
    return res.status(400).json({ error: 'رقم المشترك مطلوب' });
  }

  const initialCount = messages.length;
  // Remove all messages sent by or sent to this subscriber
  const remaining = messages.filter((m) => m.from !== targetNumber && m.to !== targetNumber);
  messages.length = 0;
  messages.push(...remaining);

  // Broadcast to all clients to purge this user's conversation immediately
  broadcast({
    type: 'USER_CHAT_CLEARED',
    targetNumber,
  });

  res.json({
    success: true,
    message: `تم حذف جميع محادثات المشترك (${targetNumber}) بنجاح.`,
    deletedCount: initialCount - remaining.length,
  });
});

// 12. Delete single or multiple messages
app.post('/api/messages/delete', (req: Request, res: Response) => {
  const { messageIds } = req.body;
  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return res.status(400).json({ error: 'معرفات الرسائل مطلوبة' });
  }

  const setIds = new Set(messageIds);
  const remaining = messages.filter((m) => !setIds.has(m.id));
  messages.length = 0;
  messages.push(...remaining);

  broadcast({
    type: 'MESSAGES_DELETED',
    messageIds,
  });

  res.json({ success: true, deletedCount: messageIds.length });
});

// 13. Get all messages for a user (persisted chats)
app.get('/api/messages/:number', (req: Request, res: Response) => {
  const userNum = req.params.number;
  const userMsgs = messages.filter(
    (m) =>
      (m.from === userNum || m.to === userNum || m.to === 'global' || m.from === '813579') &&
      m.from !== '875319' &&
      m.to !== '875319' &&
      m.from !== '891357' &&
      m.to !== '891357'
  );
  res.json({ success: true, messages: userMsgs });
});

// 14. Stories / Statuses API
export interface StoryStatus {
  id: string;
  userNumber: string;
  userName: string;
  userAvatar: string;
  text?: string;
  mediaUrl?: string;
  mediaType: 'image' | 'video' | 'text';
  timestamp: number;
  backgroundColor?: string;
}

const stories: StoryStatus[] = [];

// Seed an initial welcoming status from Support
function seedInitialStories() {
  if (stories.length === 0) {
    stories.push({
      id: 'story_support_welcome',
      userNumber: '813579',
      userName: 'فريق دعم تواصل 24',
      userAvatar: '/src/assets/images/tawasol24_logo_badge_1791830208691.jpg',
      text: 'أهلاً بكم في منصة تواصل 24! شاركوا لحظاتكم وحالاتكم اليومية بكل سهولة ✨',
      mediaType: 'text',
      backgroundColor: 'from-blue-600 to-indigo-900',
      timestamp: Date.now() - 3600000,
    });
  }
}
seedInitialStories();

// Get active stories (past 24 hours)
app.get('/api/stories', (_req: Request, res: Response) => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const activeStories = stories.filter((s) => s.timestamp >= cutoff);
  res.json({ success: true, stories: activeStories });
});

// Create new story / status
app.post('/api/stories', (req: Request, res: Response) => {
  const { userNumber, userName, userAvatar, text, mediaUrl, mediaType, backgroundColor } = req.body;
  if (!userNumber) return res.status(400).json({ error: 'رقم المستخدم مطلوب' });

  const newStory: StoryStatus = {
    id: `story_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userNumber,
    userName: userName || `مستخدم ${userNumber}`,
    userAvatar: userAvatar || '/src/assets/images/tawasol24_logo_badge_1791830208691.jpg',
    text,
    mediaUrl,
    mediaType: mediaType || 'text',
    timestamp: Date.now(),
    backgroundColor: backgroundColor || 'from-blue-600 to-indigo-900',
  };

  stories.unshift(newStory);

  broadcast({
    type: 'NEW_STORY',
    story: newStory,
  });

  res.json({ success: true, story: newStory });
});

// Delete a story
app.delete('/api/stories/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = stories.findIndex((s) => s.id === id);
  if (idx !== -1) {
    stories.splice(idx, 1);
    broadcast({
      type: 'DELETE_STORY',
      id,
    });
  }
  res.json({ success: true });
});

// ==========================================
// 14. التخزين السحابي الاختياري (Optional Cloud Storage)
// ==========================================
interface CloudBackupRecord {
  userNumber: string;
  userName?: string;
  messages: any[];
  contacts?: any[];
  settings?: any;
  timestamp: number;
  backupSize: string;
  messageCount: number;
}

const cloudBackups = new Map<string, CloudBackupRecord>();

// Save cloud backup
app.post('/api/cloud-backup/save', (req: Request, res: Response) => {
  const { userNumber, userName, messages: backupMsgs, contacts: backupContacts, settings } = req.body;
  if (!userNumber) {
    return res.status(400).json({ error: 'رقم المستخدم مطلوب لإتمام النسخ السحابي' });
  }

  const payloadStr = JSON.stringify(req.body);
  const sizeBytes = Buffer.byteLength(payloadStr, 'utf8');
  const sizeFormatted = sizeBytes > 1024 * 1024
    ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`
    : `${(sizeBytes / 1024).toFixed(1)} KB`;

  const record: CloudBackupRecord = {
    userNumber,
    userName: userName || `مستخدم ${userNumber}`,
    messages: backupMsgs || [],
    contacts: backupContacts || [],
    settings: settings || {},
    timestamp: Date.now(),
    backupSize: sizeFormatted,
    messageCount: (backupMsgs || []).length,
  };

  cloudBackups.set(userNumber, record);

  res.json({
    success: true,
    message: 'تم حفظ وتشفير النسخة الاحتياطية في سحابة تواصل 24 بنجاح ☁️',
    backup: {
      timestamp: record.timestamp,
      backupSize: record.backupSize,
      messageCount: record.messageCount,
    },
  });
});

// Get cloud backup
app.get('/api/cloud-backup/:number', (req: Request, res: Response) => {
  const userNumber = req.params.number;
  const backup = cloudBackups.get(userNumber);
  if (!backup) {
    return res.json({ success: false, hasBackup: false, message: 'لا توجد نسخة سحابية محفوظة لهذا الرقم بعد' });
  }
  res.json({ success: true, hasBackup: true, backup });
});

// Check cloud backup status
app.get('/api/cloud-backup/status/:number', (req: Request, res: Response) => {
  const userNumber = req.params.number;
  const backup = cloudBackups.get(userNumber);
  if (!backup) {
    return res.json({ hasBackup: false });
  }
  res.json({
    hasBackup: true,
    lastBackupAt: backup.timestamp,
    size: backup.backupSize,
    messageCount: backup.messageCount,
  });
});

// Delete cloud backup
app.delete('/api/cloud-backup/:number', (req: Request, res: Response) => {
  const userNumber = req.params.number;
  cloudBackups.delete(userNumber);
  res.json({ success: true, message: 'تم مسح النسخة الاحتياطية من السحابة بنجاح' });
});

// Toggle popular interactive reaction on message
app.post('/api/messages/react', (req: Request, res: Response) => {
  const { messageId, emoji, userNumber } = req.body;
  if (!messageId || !emoji || !userNumber) {
    return res.status(400).json({ error: 'البيانات غير مكتملة' });
  }

  const msg = messages.find((m) => m.id === messageId);
  if (msg) {
    const reactions = (msg as any).reactions || {};
    reactions[emoji] = (reactions[emoji] || 0) + 1;
    (msg as any).reactions = reactions;
  }

  broadcast({
    type: 'MESSAGE_REACTION',
    messageId,
    emoji,
    userNumber,
  });

  res.json({ success: true });
});

// 15. Admin clear logs
app.post('/api/admin/clear-logs', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== 'Bearer admin_auth_faroog77_token') {
    return res.status(403).json({ error: 'غير مصرح' });
  }

  messages.length = 0;
  callLogs.length = 0;
  stories.length = 0;
  seedInitialData();
  seedInitialStories();

  broadcast({ type: 'DATA_CLEARED' });
  res.json({ success: true, message: 'تم تنظيف السجلات وإعادة ضبط البيانات بنجاح.' });
});

// 16. App Download Endpoints (Build, Modular and Source Packages in ZIP)
app.get([
  '/api/download/modular',
  '/download/modular',
  '/download/Modular-standalone.zip',
  '/downloads/Modular-standalone.zip',
  '/download/modular-standalone.zip',
  '/downloads/modular-standalone.zip',
  '/api/download/kodular',
  '/download/kodular',
  '/download/kodular-standalone.zip',
  '/downloads/kodular-standalone.zip',
], (_req: Request, res: Response) => {
  const fileCandidates = [
    path.resolve(__dirname, 'public/downloads/Modular-standalone.zip'),
    path.resolve(__dirname, 'dist/downloads/Modular-standalone.zip'),
    path.resolve(__dirname, 'public/downloads/kodular-standalone.zip'),
    path.resolve(__dirname, 'dist/downloads/kodular-standalone.zip'),
  ];
  const target = fileCandidates.find((f) => fs.existsSync(f));
  if (target) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="Modular-standalone.zip"');
    res.download(target, 'Modular-standalone.zip');
  } else {
    res.status(404).json({ error: 'الملف غير متوفر حالياً' });
  }
});

// Direct Web Download helper page for users opening in mobile or browser
app.get(['/kodular', '/download-kodular'], (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تحميل ملف index.html لمنصة كوديلار - تواصل 24</title>
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
    <div style="font-size: 40px; margin-bottom: 12px;">📦</div>
    <h1>تحميل ملف index.html لكوديلار</h1>
    <p>تم تجهيز الملف المضغوط كاملاً لمنصة Kodular. سيبدأ التحميل تلقائياً الآن، أو اضغط على الزر أدناه:</p>
    <a href="/download/kodular" class="btn">⬇️ اضغط هنا لبدء التحميل فوراً (ZIP)</a>
    <a href="/download/build" class="btn btn-secondary">📦 تحميل حزمة البناء الكاملة (dist)</a>
    <div class="note">منصة تواصل 24 - Tawasol 24</div>
  </div>
  <script>
    setTimeout(function() {
      window.location.href = '/download/kodular';
    }, 800);
  </script>
</body>
</html>`);
});

// 17. Live WebRTC Cloud Calling Engine Route
app.get(['/call', '/calling', '/webrtc'], (_req: Request, res: Response) => {
  const callFile = path.resolve(__dirname, 'public/call.html');
  const distCallFile = path.resolve(__dirname, 'dist/call.html');
  if (fs.existsSync(callFile)) {
    res.sendFile(callFile);
  } else if (fs.existsSync(distCallFile)) {
    res.sendFile(distCallFile);
  } else {
    res.status(404).send('شاشة الاتصال غير متوفرة');
  }
});

app.get(['/download/cloud', '/download/cloud-html', '/api/download/cloud'], (_req: Request, res: Response) => {
  const target = path.resolve(__dirname, 'public/index-cloud-netlify.html');
  if (fs.existsSync(target)) {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.setHeader('Content-Disposition', 'attachment; filename="index.html"');
    res.download(target, 'index.html');
  } else {
    res.status(404).json({ error: 'الملف غير متوفر' });
  }
});

app.get(['/download/call', '/download/call-html'], (_req: Request, res: Response) => {
  const target = path.resolve(__dirname, 'public/call.html');
  if (fs.existsSync(target)) {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.setHeader('Content-Disposition', 'attachment; filename="call.html"');
    res.download(target, 'call.html');
  } else {
    res.status(404).json({ error: 'الملف غير متوفر' });
  }
});

// Generic static downloads handler with explicit attachment header
app.get(['/downloads/:filename', '/api/downloads/:filename'], (req: Request, res: Response) => {
  const filename = req.params.filename;
  const fileCandidates = [
    path.resolve(__dirname, 'public/downloads', filename),
    path.resolve(__dirname, 'dist/downloads', filename),
  ];
  const target = fileCandidates.find((f) => fs.existsSync(f));
  if (target) {
    res.setHeader('Content-Type', 'application/zip');
    res.download(target, filename);
  } else {
    res.status(404).send('الملف غير موجود');
  }
});

// Direct Web Download helper page for complete build
app.get(['/download', '/download-build', '/build-download', '/build'], (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تحميل ملف بناء التطبيق - تواصل 24</title>
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
    <div style="font-size: 48px; margin-bottom: 12px;">📦</div>
    <h1>تحميل بناء التطبيق كاملاً</h1>
    <p>الملف المضغوط يحتوي على كافة ملفات البناء الجاهزة للتشغيل (index.html مع مجلد الأصول assets والـ JavaScript والـ CSS).</p>
    
    <div class="details">
      <div style="font-weight: bold; margin-bottom: 8px; color: #38bdf8;">محتويات الحزمة:</div>
      <ul style="padding-right: 20px; margin: 0;">
        <li>ملف index.html جاهز للتشغيل و Kodular</li>
        <li>مجلد كامل لأصول الـ JavaScript و CSS المترجمة</li>
        <li>أيقونات وصور وشعارات المنصة بدقة عالية</li>
      </ul>
    </div>

    <a href="/download/build" class="btn">⬇️ اضغط هنا لبدء تحميل الملف المضغوط (ZIP)</a>
    <a href="/download/kodular" class="btn btn-secondary">📄 تحميل نسخة كوديلار الخفيفة (index.html فقط)</a>
    
    <div class="note">منصة تواصل 24 - Tawasol 24 Messenger</div>
  </div>
  <script>
    setTimeout(function() {
      window.location.href = '/download/build';
    }, 600);
  </script>
</body>
</html>`);
});

app.get(['/api/download/build', '/download/build'], (_req: Request, res: Response) => {
  const fileCandidates = [
    path.resolve(__dirname, 'public/downloads/tawasol24-build.zip'),
    path.resolve(__dirname, 'dist/downloads/tawasol24-build.zip'),
  ];
  const target = fileCandidates.find((f) => fs.existsSync(f));
  if (target) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="tawasol24-build.zip"');
    res.download(target, 'tawasol24-build.zip');
  } else {
    res.status(404).json({ error: 'الملف غير متوفر حالياً' });
  }
});

app.get(['/api/download/source', '/download/source'], (_req: Request, res: Response) => {
  const fileCandidates = [
    path.resolve(__dirname, 'public/downloads/tawasol24-project-source.zip'),
    path.resolve(__dirname, 'dist/downloads/tawasol24-project-source.zip'),
  ];
  const target = fileCandidates.find((f) => fs.existsSync(f));
  if (target) {
    res.download(target, 'tawasol24-project-source.zip');
  } else {
    res.status(404).json({ error: 'الملف غير متوفر حالياً' });
  }
});

app.get(['/api/download/complete', '/api/download/all', '/api/download/zip', '/download/complete'], (_req: Request, res: Response) => {
  const fileCandidates = [
    path.resolve(__dirname, 'public/downloads/tawasol24-complete-package.zip'),
    path.resolve(__dirname, 'dist/downloads/tawasol24-complete-package.zip'),
  ];
  const target = fileCandidates.find((f) => fs.existsSync(f));
  if (target) {
    res.download(target, 'tawasol24-complete-package.zip');
  } else {
    res.status(404).json({ error: 'الملف غير متوفر حالياً' });
  }
});

// Serve asset directories directly so generated images never fail
app.use('/src/assets', express.static(path.resolve(__dirname, 'src/assets')));
app.use('/assets', express.static(path.resolve(__dirname, 'public/assets')));
if (fs.existsSync(path.resolve(__dirname, 'public'))) {
  app.use(express.static(path.resolve(__dirname, 'public')));
}

// Mount Vite or serve static
async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProduction = process.env.NODE_ENV === 'production';
  const distExists = fs.existsSync(path.resolve(__dirname, 'dist'));

  if (isProduction || (distExists && !process.env.VITE_DEV_SERVER)) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Development mode with Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Fallback for SPA routing in dev mode
    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/ws')) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 تواصل 24 يعمل بنجاح على المنفذ ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup failed:', err);
});
