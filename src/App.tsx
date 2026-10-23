/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, ChatMessage, CallLog, ActiveCall, StoryStatus } from './types/tawasol';
import { syncClient } from './services/clientSync';
import { SoundEffects } from './utils/soundEffects';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { OnboardingModal } from './components/OnboardingModal';
import { VoiceCallModal } from './components/VoiceCallModal';
import { CameraModal } from './components/CameraModal';
import { AdminModal } from './components/AdminModal';
import { SettingsModal } from './components/SettingsModal';
import { InviteModal } from './components/InviteModal';
import { BannedScreen } from './components/BannedScreen';
import { CreateStatusModal } from './components/CreateStatusModal';
import { StatusViewerModal } from './components/StatusViewerModal';
import { LogoBadge } from './components/LogoBadge';
import { Shield, Sparkles } from 'lucide-react';

export default function App() {
  // Current active user
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem('tawasol24_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Permanently Banned & Expelled state (by Owner)
  const [bannedInfo, setBannedInfo] = useState<{ number: string; reason?: string } | null>(null);

  // Modals & Navigation
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isChangingNumber, setIsChangingNumber] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraInitialMode, setCameraInitialMode] = useState<'photo' | 'video'>('photo');
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateStatus, setShowCreateStatus] = useState(false);
  const [viewStoryIndex, setViewStoryIndex] = useState<number | null>(null);

  // Contacts & Chats
  const [contacts, setContacts] = useState<UserProfile[]>([]);
  const [activeContact, setActiveContact] = useState<UserProfile | null>(null);

  // Chat messages with full persistence across reload/quit (excluding fake contacts)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem('tawasol24_messages');
      if (stored) {
        const parsed: ChatMessage[] = JSON.parse(stored);
        return parsed.filter(
          (m) =>
            m.from !== '875319' &&
            m.to !== '875319' &&
            m.from !== '891357' &&
            m.to !== '891357'
        );
      }
      return [];
    } catch {
      return [];
    }
  });

  // Stories / Status updates
  const [stories, setStories] = useState<StoryStatus[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);

  // Real-time states
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [blockedNumbers, setBlockedNumbers] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('tawasol24_blocked');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem('tawasol24_sound_enabled');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  // Effective Ad Blocker state (حجب وإيقاف الإعلانات والترويجات)
  const [adBlockerEnabled, setAdBlockerEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('tawasol24_adblocker');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const [blockedAdsCount, setBlockedAdsCount] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('tawasol24_blocked_ads_count');
      return stored ? parseInt(stored, 10) : 24;
    } catch {
      return 24;
    }
  });

  const [adBlockToast, setAdBlockToast] = useState<string | null>(null);

  const handleToggleAdBlocker = () => {
    setAdBlockerEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('tawasol24_adblocker', String(next));
      } catch {}
      if (next) {
        setBlockedAdsCount((c) => {
          const updated = c + 6;
          try {
            localStorage.setItem('tawasol24_blocked_ads_count', String(updated));
          } catch {}
          return updated;
        });
        setAdBlockToast('🛡️ تم تفعيل مانع الإعلانات الفعّال وحجب كافة الترويجات بنجاح');
      } else {
        setAdBlockToast('⚠️ تم إيقاف مانع الإعلانات مؤقتاً');
      }
      setTimeout(() => setAdBlockToast(null), 3500);
      return next;
    });
  };

  // Compact mobile display mode (وضع شاشة الهاتف المدمج)
  const [isCompactPhoneMode, setIsCompactPhoneMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('tawasol24_phone_view');
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleCompactPhoneMode = () => {
    setIsCompactPhoneMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('tawasol24_phone_view', String(next));
      } catch {}
      return next;
    });
  };

  // Sync sound mute state with SoundEffects and localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tawasol24_sound_enabled', String(soundEnabled));
    } catch {}
    SoundEffects.setMuted(!soundEnabled);
  }, [soundEnabled]);

  // Active Voice Call state
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  // Prompt onboarding on initial launch if no user is configured, or check blacklist
  useEffect(() => {
    if (!currentUser) {
      setShowOnboarding(true);
    } else {
      // Check if current user was permanently blacklisted by owner
      fetch(`/api/users/check/${currentUser.number}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.isBlacklisted) {
            setBannedInfo({
              number: currentUser.number,
              reason: data.reason || 'تم مسح وحظر هذا الحساب نهائياً من قبل مالك التطبيق',
            });
            localStorage.removeItem('tawasol24_user');
            setCurrentUser(null);
            return;
          }
          syncClient.register(currentUser);
          fetchInitialData();
        })
        .catch(() => {
          syncClient.register(currentUser);
          fetchInitialData();
        });
    }
  }, [currentUser?.number]);

  // Persist messages across page exit or navigation
  useEffect(() => {
    try {
      localStorage.setItem('tawasol24_messages', JSON.stringify(messages));
    } catch (err) {
      console.warn('Failed saving messages to localStorage:', err);
    }
  }, [messages]);

  // One-time cleanup: remove any obsolete mock chats (Sara and Tamimi) from localStorage
  useEffect(() => {
    try {
      const active = localStorage.getItem('tawasol24_active_contact');
      if (active === '875319' || active === '891357') {
        localStorage.removeItem('tawasol24_active_contact');
        setActiveContact(null);
      }
      const rawMsgs = localStorage.getItem('tawasol24_messages');
      if (rawMsgs) {
        const parsed: ChatMessage[] = JSON.parse(rawMsgs);
        const filtered = parsed.filter(
          (m) =>
            m.from !== '875319' &&
            m.to !== '875319' &&
            m.from !== '891357' &&
            m.to !== '891357'
        );
        if (filtered.length !== parsed.length) {
          localStorage.setItem('tawasol24_messages', JSON.stringify(filtered));
          setMessages(filtered);
        }
      }
    } catch {}
  }, []);

  // Persist active chat selection
  useEffect(() => {
    if (activeContact?.number) {
      if (activeContact.number === '875319' || activeContact.number === '891357') {
        localStorage.removeItem('tawasol24_active_contact');
        setActiveContact(null);
      } else {
        localStorage.setItem('tawasol24_active_contact', activeContact.number);
      }
    }
  }, [activeContact?.number]);

  // Save blocked list to localStorage
  useEffect(() => {
    localStorage.setItem('tawasol24_blocked', JSON.stringify(blockedNumbers));
  }, [blockedNumbers]);

  // Fetch registered users, saved messages & stories
  const fetchInitialData = async () => {
    try {
      const res = await fetch('/api/users/directory');
      const data = await res.json();
      if (data.users) {
        // Exclude fake contacts (875319 - سارة المهندس, 891357 - أحمد التميمي)
        const realUsers = data.users.filter(
          (u: UserProfile) => u.number !== '875319' && u.number !== '891357'
        );
        setContacts(realUsers);
        // Restore last active contact from localStorage if exists
        const storedActiveNum = localStorage.getItem('tawasol24_active_contact');
        if (storedActiveNum === '875319' || storedActiveNum === '891357') {
          localStorage.removeItem('tawasol24_active_contact');
          setActiveContact(null);
        } else if (storedActiveNum) {
          const match = realUsers.find((u: UserProfile) => u.number === storedActiveNum);
          if (match) setActiveContact(match);
        } else if (realUsers.length > 0) {
          const firstOther = realUsers.find(
            (u: UserProfile) => u.number !== (currentUser?.number || '')
          ) || realUsers[0];
          if (firstOther) {
            setActiveContact(firstOther);
            localStorage.setItem('tawasol24_active_contact', firstOther.number);
          }
        }
      }

      // Fetch persisted server messages for current user
      if (currentUser?.number) {
        const msgRes = await fetch(`/api/messages/${currentUser.number}`);
        const msgData = await msgRes.json();
        if (msgData.messages && Array.isArray(msgData.messages)) {
          setMessages((prev) => {
            const cleanMsgs = msgData.messages.filter(
              (m: ChatMessage) =>
                m.from !== '875319' &&
                m.to !== '875319' &&
                m.from !== '891357' &&
                m.to !== '891357'
            );
            const map = new Map(prev.map((m) => [m.id, m]));
            for (const m of cleanMsgs) {
              if (!map.has(m.id)) map.set(m.id, m);
            }
            return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
          });
        }
      }

      // Fetch stories / statuses
      const storiesRes = await fetch('/api/stories');
      const storiesData = await storiesRes.json();
      if (storiesData.stories) {
        setStories(storiesData.stories);
      }
    } catch (err) {
      console.warn('Initial data fetch fallback:', err);
    }
  };

  // Setup WebSocket / Real-time Listeners
  useEffect(() => {
    if (!currentUser) return;

    // 1. New message received
    const unsubMsg = syncClient.on('NEW_MESSAGE', ({ message }: { message: ChatMessage }) => {
      // Check if sender is blocked
      if (blockedNumbers.includes(message.from)) return;

      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });

      if (soundEnabled && message.from !== currentUser.number) {
        SoundEffects.playMessageReceived();
      }
    });

    // 2. Incoming voice call
    const unsubIncomingCall = syncClient.on('INCOMING_CALL', (data: any) => {
      // Check if caller is blocked
      if (blockedNumbers.includes(data.from)) {
        syncClient.send({
          type: 'CALL_REJECT',
          callId: data.callId,
          from: currentUser.number,
          to: data.from,
          reason: 'blocked',
        });
        return;
      }

      setActiveCall({
        active: true,
        callId: data.callId,
        callType: data.callType || 'voice',
        isIncoming: true,
        peerNumber: data.from,
        peerName: data.callerName || `مستخدم ${data.from}`,
        peerAvatar: data.callerAvatar || '/src/assets/images/tawasol24_logo_badge_1791830208691.jpg',
        status: 'calling',
        duration: 0,
        isMuted: false,
        isSpeakerOn: true,
        isVideoMuted: false,
      });
    });

    // 3. Call Accepted
    const unsubCallAccepted = syncClient.on('CALL_ACCEPTED', () => {
      setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
    });

    // 4. Call Rejected
    const unsubCallRejected = syncClient.on('CALL_REJECTED', (data: any) => {
      setActiveCall((prev) => (prev ? { ...prev, status: 'ended' } : null));
      setTimeout(() => setActiveCall(null), 1800);
    });

    // 5. Call Ended
    const unsubCallEnded = syncClient.on('CALL_ENDED', (data: any) => {
      if (activeCall) {
        setCallLogs((prev) => [
          ...prev,
          {
            id: activeCall.callId,
            caller: activeCall.isIncoming ? activeCall.peerNumber : currentUser.number,
            receiver: activeCall.isIncoming ? currentUser.number : activeCall.peerNumber,
            callerName: activeCall.isIncoming ? activeCall.peerName : currentUser.name,
            receiverName: activeCall.isIncoming ? currentUser.name : activeCall.peerName,
            status: 'completed',
            duration: data.duration || activeCall.duration || 10,
            timestamp: Date.now(),
          },
        ]);
      }
      setActiveCall((prev) => (prev ? { ...prev, status: 'ended' } : null));
      setTimeout(() => setActiveCall(null), 1500);
    });

    // 6. User typing indicator
    const unsubTyping = syncClient.on('USER_TYPING', ({ from, isTyping }: { from: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (isTyping) next.add(from);
        else next.delete(from);
        return next;
      });
    });

    // 7. Directory & User Status updates
    const unsubStatus = syncClient.on('USER_STATUS_CHANGE', ({ number, isOnline, lastSeen, user }: any) => {
      if (number === '875319' || number === '891357') return;
      setContacts((prev) => {
        const exists = prev.some((c) => c.number === number);
        if (exists) {
          return prev.map((c) => (c.number === number ? { ...c, isOnline, lastSeen: lastSeen || Date.now() } : c));
        } else if (user) {
          return [...prev, user];
        }
        return prev;
      });
    });

    // 8. Admin Global Broadcast Announcement
    const unsubBroadcast = syncClient.on('ADMIN_BROADCAST', ({ message }: { message: ChatMessage }) => {
      setMessages((prev) => [...prev, message]);
      if (soundEnabled) SoundEffects.playMessageReceived();
    });

    // 9. Message delivery and read status updates
    const unsubStatusUpdate = syncClient.on('MESSAGE_STATUS_UPDATE', (data: any) => {
      const { messageId, messageIds, status, from } = data;
      setMessages((prev) =>
        prev.map((m) => {
          if (
            (messageId && m.id === messageId) ||
            (messageIds && messageIds.includes(m.id)) ||
            (from && m.to === from)
          ) {
            return { ...m, status: status || 'read' };
          }
          return m;
        })
      );
    });

    // 10. Permanently Banned Notification (Owner expelled/deleted user)
    const unsubBanned = syncClient.on('PERMANENTLY_BANNED', (data: any) => {
      setBannedInfo({
        number: data.number || currentUser.number,
        reason: data.reason || '⚠️ تم مسح وحظر حسابك نهائياً من قبل مالك تطبيق تواصل 24.',
      });
      localStorage.removeItem('tawasol24_user');
      setCurrentUser(null);
    });

    // 11. User Deleted Permanently broadcast
    const unsubDeletedUser = syncClient.on('USER_DELETED_PERMANENTLY', (data: any) => {
      if (data.number === currentUser.number) {
        setBannedInfo({
          number: currentUser.number,
          reason: '⚠️ تم مسح وحظر حسابك نهائياً من قبل مالك تطبيق تواصل 24.',
        });
        localStorage.removeItem('tawasol24_user');
        setCurrentUser(null);
      } else {
        setContacts((prev) => prev.filter((c) => c.number !== data.number));
        setActiveContact((prev) => (prev?.number === data.number ? null : prev));
      }
    });

    // 12. Messages Deleted real-time sync
    const unsubDelMsgs = syncClient.on('MESSAGES_DELETED', ({ messageIds }: { messageIds: string[] }) => {
      if (Array.isArray(messageIds)) {
        const setIds = new Set(messageIds);
        setMessages((prev) => prev.filter((m) => !setIds.has(m.id)));
      }
    });

    // 13. Subscriber Chat Cleared by Admin / Owner
    const unsubClearUserChat = syncClient.on('USER_CHAT_CLEARED', ({ targetNumber }: { targetNumber: string }) => {
      setMessages((prev) => prev.filter((m) => m.from !== targetNumber && m.to !== targetNumber));
    });

    // 14. New Story Status published
    const unsubNewStory = syncClient.on('NEW_STORY', ({ story }: { story: StoryStatus }) => {
      setStories((prev) => {
        if (prev.some((s) => s.id === story.id)) return prev;
        return [story, ...prev];
      });
    });

    // 15. Story Deleted
    const unsubDelStory = syncClient.on('DELETE_STORY', ({ id }: { id: string }) => {
      setStories((prev) => prev.filter((s) => s.id !== id));
    });

    // 16. Initial Sync messages
    const unsubSync = syncClient.on('INITIAL_SYNC', (data: any) => {
      if (data.recentMessages && Array.isArray(data.recentMessages)) {
        setMessages((prev) => {
          const map = new Map(prev.map((m) => [m.id, m]));
          for (const m of data.recentMessages) {
            if (!map.has(m.id)) map.set(m.id, m);
          }
          return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
        });
      }
    });

    return () => {
      unsubMsg();
      unsubIncomingCall();
      unsubCallAccepted();
      unsubCallRejected();
      unsubCallEnded();
      unsubTyping();
      unsubStatus();
      unsubBroadcast();
      unsubStatusUpdate();
      unsubBanned();
      unsubDeletedUser();
      unsubDelMsgs();
      unsubClearUserChat();
      unsubNewStory();
      unsubDelStory();
      unsubSync();
    };
  }, [currentUser, soundEnabled, blockedNumbers, activeCall]);

  // Handler: Delete single or multiple messages
  const handleDeleteMessages = async (messageIds: string[]) => {
    const setIds = new Set(messageIds);
    setMessages((prev) => prev.filter((m) => !setIds.has(m.id)));

    syncClient.send({
      type: 'DELETE_MESSAGES',
      messageIds,
    });

    try {
      await fetch('/api/messages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds }),
      });
    } catch {
      // Local state already updated
    }
  };

  // Handler: Forward messages to target contacts
  const handleForwardMessage = (messagesToForward: ChatMessage[], targetContacts: UserProfile[]) => {
    if (!currentUser || targetContacts.length === 0 || messagesToForward.length === 0) return;

    messagesToForward.forEach((msg) => {
      targetContacts.forEach((target) => {
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const forwardedMsg: ChatMessage = {
          id: messageId,
          from: currentUser.number,
          to: target.number,
          content: msg.content,
          contentType: msg.contentType,
          mediaUrl: msg.mediaUrl,
          duration: msg.duration,
          fileName: msg.fileName,
          fileSize: msg.fileSize,
          timestamp: Date.now(),
          status: 'sent',
        };

        setMessages((prev) => [...prev, forwardedMsg]);

        syncClient.send({
          type: 'SEND_MESSAGE',
          ...forwardedMsg,
        });

        setTimeout(() => {
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId && m.status === 'sent' ? { ...m, status: 'delivered' } : m))
          );
        }, 450);

        if (target.isOnline) {
          setTimeout(() => {
            setMessages((prev) =>
              prev.map((m) => (m.id === messageId ? { ...m, status: 'read' } : m))
            );
          }, 1500);
        }
      });
    });

    if (soundEnabled) {
      SoundEffects.playMessageSent();
    }
  };

  // Handler: Admin deletes conversation of any subscriber
  const handleAdminClearUserChat = (targetNumber: string) => {
    setMessages((prev) => prev.filter((m) => m.from !== targetNumber && m.to !== targetNumber));
  };

  // Handler: Status Story Created
  const handleStatusCreated = (newStory: StoryStatus) => {
    setStories((prev) => {
      if (prev.some((s) => s.id === newStory.id)) return prev;
      return [newStory, ...prev];
    });
  };

  // Handler: Delete Status Story
  const handleDeleteStory = async (storyId: string) => {
    setStories((prev) => prev.filter((s) => s.id !== storyId));
    try {
      await fetch(`/api/stories/${storyId}`, { method: 'DELETE' });
    } catch {
      // Handled
    }
  };

  // Handler: Complete Onboarding / Registration (الدخول المباشر للدردشات بعد تفعيل الرقم)
  const handleOnboardingComplete = (user: UserProfile) => {
    setCurrentUser(user);
    setShowOnboarding(false);
    setIsChangingNumber(false);
    syncClient.register(user);
    fetchInitialData();

    // الدخول المباشر فوراً إلى الدردشة
    setTimeout(() => {
      setContacts((latestContacts) => {
        const target = latestContacts.find((c) => c.number !== user.number) || latestContacts[0];
        if (target) {
          setActiveContact(target);
          localStorage.setItem('tawasol24_active_contact', target.number);
        }
        return latestContacts;
      });
    }, 150);
  };

  // Mark messages from active contact as read whenever activeContact changes
  useEffect(() => {
    if (currentUser && activeContact) {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.from === activeContact.number && m.to === currentUser.number && m.status !== 'read') {
            return { ...m, status: 'read' };
          }
          return m;
        })
      );

      syncClient.send({
        type: 'MARK_MESSAGES_READ',
        from: currentUser.number,
        to: activeContact.number,
      });
    }
  }, [activeContact?.number]);

  // Handler: Send Message (Text, Voice Note, Video, Image, File)
  const handleSendMessage = (
    content: string,
    type: 'text' | 'audio' | 'video' | 'image' | 'file' = 'text',
    extra: any = {}
  ) => {
    if (!currentUser || !activeContact) return;

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    // Starts as 'sent' (صح واحدة رمادية)
    const newMsg: ChatMessage = {
      id: messageId,
      from: currentUser.number,
      to: activeContact.number,
      content,
      contentType: type,
      mediaUrl: extra.mediaUrl,
      duration: extra.duration,
      fileName: extra.fileName,
      fileSize: extra.fileSize,
      timestamp: Date.now(),
      status: 'sent',
    };

    setMessages((prev) => [...prev, newMsg]);

    syncClient.send({
      type: 'SEND_MESSAGE',
      ...newMsg,
    });

    if (soundEnabled) {
      SoundEffects.playMessageSent();
    }

    // Step 1: Transition to 'delivered' (صحان رماديان) after 450ms
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId && m.status === 'sent' ? { ...m, status: 'delivered' } : m))
      );
    }, 450);

    // Step 2: Transition to 'read' (صحان زرقاوان) if contact is online or after 1500ms
    if (activeContact.isOnline) {
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, status: 'read' } : m))
        );
      }, 1500);
    }
  };

  // Handler: Initiate Voice or Direct Video Call
  const handleInitiateCall = (target: UserProfile, type: 'voice' | 'video' = 'voice') => {
    if (!currentUser) return;
    if (blockedNumbers.includes(target.number)) {
      alert('لا يمكنك الاتصال بهذا الرقم لأنك قمت بحظره.');
      return;
    }

    const callId = `call_${Date.now()}`;
    setActiveCall({
      active: true,
      callId,
      callType: type,
      isIncoming: false,
      peerNumber: target.number,
      peerName: target.name,
      peerAvatar: target.avatar,
      status: 'ringing',
      duration: 0,
      isMuted: false,
      isSpeakerOn: true,
      isVideoMuted: false,
    });

    syncClient.setupLocalAudio(type === 'video');

    syncClient.send({
      type: 'CALL_INITIATE',
      callId,
      callType: type,
      from: currentUser.number,
      to: target.number,
      callerName: currentUser.name,
      callerAvatar: currentUser.avatar,
    });
  };

  // Handler: Accept Call
  const handleAcceptCall = () => {
    if (!activeCall || !currentUser) return;
    syncClient.setupLocalAudio(activeCall.callType === 'video');

    setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));

    syncClient.send({
      type: 'CALL_ACCEPT',
      callId: activeCall.callId,
      from: currentUser.number,
      to: activeCall.peerNumber,
    });
  };

  // Handler: Decline Call
  const handleDeclineCall = () => {
    if (!activeCall || !currentUser) return;
    syncClient.send({
      type: 'CALL_REJECT',
      callId: activeCall.callId,
      from: currentUser.number,
      to: activeCall.peerNumber,
      reason: 'declined',
    });
    setActiveCall(null);
  };

  // Handler: End Active Call
  const handleEndCall = () => {
    if (!activeCall || !currentUser) return;
    syncClient.stopLocalAudio();

    syncClient.send({
      type: 'CALL_END',
      callId: activeCall.callId,
      from: currentUser.number,
      to: activeCall.peerNumber,
      duration: activeCall.duration || 5,
    });

    setCallLogs((prev) => [
      ...prev,
      {
        id: activeCall.callId,
        caller: activeCall.isIncoming ? activeCall.peerNumber : currentUser.number,
        receiver: activeCall.isIncoming ? currentUser.number : activeCall.peerNumber,
        callerName: activeCall.isIncoming ? activeCall.peerName : currentUser.name,
        receiverName: activeCall.isIncoming ? currentUser.name : activeCall.peerName,
        status: 'completed',
        duration: activeCall.duration || 5,
        timestamp: Date.now(),
      },
    ]);

    setActiveCall((prev) => (prev ? { ...prev, status: 'ended' } : null));
    setTimeout(() => setActiveCall(null), 1200);
  };

  // Handler: Toggle Mic Mute
  const handleToggleMute = () => {
    if (!activeCall) return;
    const nextMuted = !activeCall.isMuted;
    setActiveCall({ ...activeCall, isMuted: nextMuted });
    syncClient.toggleMute(nextMuted);
  };

  // Handler: Toggle Video Mute for Direct Call
  const handleToggleVideo = () => {
    if (!activeCall) return;
    const nextVideoMuted = !activeCall.isVideoMuted;
    setActiveCall({ ...activeCall, isVideoMuted: nextVideoMuted });
    syncClient.toggleVideoMute(nextVideoMuted);
  };

  // Handler: Toggle Block Number
  const handleToggleBlock = (targetNumber: string) => {
    if (!currentUser) return;
    const isCurrentlyBlocked = blockedNumbers.includes(targetNumber);
    const updated = isCurrentlyBlocked
      ? blockedNumbers.filter((n) => n !== targetNumber)
      : [...blockedNumbers, targetNumber];

    setBlockedNumbers(updated);

    syncClient.send({
      type: 'BLOCK_USER',
      from: currentUser.number,
      targetNumber,
      block: !isCurrentlyBlocked,
    });
  };

  // Handler: New chat by custom entered number
  const handleNewChatByNumber = (targetNumber: string) => {
    let existing = contacts.find((c) => c.number === targetNumber);
    if (!existing) {
      existing = {
        number: targetNumber,
        name: `مستخدم ${targetNumber}`,
        avatar: '/src/assets/images/tawasol24_logo_badge_1791830208691.jpg',
        isOnline: true,
        lastSeen: Date.now(),
        registeredAt: Date.now(),
      };
      setContacts((prev) => [...prev, existing!]);
    }
    setActiveContact(existing);
  };

  // Active messages between current user and active contact
  const currentChatMessages = messages.filter((m) => {
    if (!currentUser || !activeContact) return false;
    if (m.to === 'global') return true;
    return (
      (m.from === currentUser.number && m.to === activeContact.number) ||
      (m.from === activeContact.number && m.to === currentUser.number)
    );
  });

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none items-center justify-center p-0 md:p-3 lg:p-4 relative">
      {/* Floating notification for Ad Blocker actions */}
      {adBlockToast && (
        <div className="fixed top-4 inset-x-4 mx-auto z-50 max-w-sm px-4 py-2.5 bg-emerald-600/95 border border-emerald-400 text-white text-xs font-bold rounded-2xl shadow-2xl flex items-center justify-center gap-2 backdrop-blur animate-in slide-in-from-top-3 text-center">
          <Shield className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>{adBlockToast}</span>
        </div>
      )}

      {currentUser ? (
        <>
          {/* Main Layout - Refined Compact Scale & Mobile Phone Mode Support */}
          <div className={`flex w-full h-full transition-all duration-300 overflow-hidden bg-slate-900 ${
            isCompactPhoneMode
              ? 'max-w-[430px] max-h-[92vh] rounded-[36px] border-4 border-slate-800 shadow-2xl shadow-blue-950/40 relative'
              : 'max-w-[1080px] max-h-[94vh] md:rounded-2xl md:border md:border-slate-800/80 shadow-2xl'
          }`}>
            {/* Sidebar (Chats, Calls, Status) */}
            <div className={`w-full ${isCompactPhoneMode ? 'w-full' : 'md:w-72 lg:w-80'} h-full ${activeContact ? 'hidden md:flex' : 'flex'}`}>
              <Sidebar
                currentUser={currentUser}
                contacts={contacts}
                activeContact={activeContact}
                onSelectContact={(c) => setActiveContact(c)}
                messages={messages}
                callLogs={callLogs}
                typingUsers={typingUsers}
                onOpenSettings={() => setShowSettings(true)}
                onOpenAdmin={() => setShowAdmin(true)}
                onChangeNumber={() => {
                  setIsChangingNumber(true);
                  setShowOnboarding(true);
                }}
                onNewChatByNumber={handleNewChatByNumber}
                onOpenInvite={() => setShowInvite(true)}
                stories={stories}
                onOpenCreateStatus={() => setShowCreateStatus(true)}
                onViewStory={(idx) => setViewStoryIndex(idx)}
                soundEnabled={soundEnabled}
                onToggleSound={() => setSoundEnabled((prev) => !prev)}
                adBlockerEnabled={adBlockerEnabled}
                onToggleAdBlocker={handleToggleAdBlocker}
                isCompactPhoneMode={isCompactPhoneMode}
                onToggleCompactPhoneMode={handleToggleCompactPhoneMode}
              />
            </div>

            {/* Chat Window */}
            {activeContact ? (
              <div className={`flex-1 h-full ${activeContact ? 'flex' : 'hidden md:flex'}`}>
                <ChatWindow
                  currentUser={currentUser}
                  contact={activeContact}
                  messages={currentChatMessages}
                  onSendMessage={handleSendMessage}
                  onInitiateCall={(c) => handleInitiateCall(c, 'voice')}
                  onInitiateVideoCall={(c) => handleInitiateCall(c, 'video')}
                  onOpenCamera={(mode) => {
                    setCameraInitialMode(mode || 'photo');
                    setShowCamera(true);
                  }}
                  isTyping={typingUsers.has(activeContact.number)}
                  onSendTyping={(isTyping) => {
                    syncClient.send({
                      type: 'TYPING_INDICATOR',
                      from: currentUser.number,
                      to: activeContact.number,
                      isTyping,
                    });
                  }}
                  isBlockedByMe={blockedNumbers.includes(activeContact.number)}
                  onToggleBlock={handleToggleBlock}
                  onClearChat={() => {
                    setMessages((prev) =>
                      prev.filter(
                        (m) =>
                          !(
                            (m.from === currentUser.number && m.to === activeContact.number) ||
                            (m.from === activeContact.number && m.to === currentUser.number)
                          )
                      )
                    );
                  }}
                  onDeleteConversation={() => {
                    setMessages((prev) =>
                      prev.filter(
                        (m) =>
                          !(
                            (m.from === currentUser.number && m.to === activeContact.number) ||
                            (m.from === activeContact.number && m.to === currentUser.number)
                          )
                      )
                    );
                    localStorage.removeItem('tawasol24_active_contact');
                    setActiveContact(null);
                  }}
                  onDeleteMessages={handleDeleteMessages}
                  onBackToSidebar={() => setActiveContact(null)}
                  onOpenInvite={() => setShowInvite(true)}
                  contacts={contacts}
                  onForwardMessage={handleForwardMessage}
                  adBlockerEnabled={adBlockerEnabled}
                  onToggleAdBlocker={handleToggleAdBlocker}
                  isCompactPhoneMode={isCompactPhoneMode}
                  onToggleCompactPhoneMode={handleToggleCompactPhoneMode}
                />
              </div>
            ) : (
              /* Empty Placeholder */
              <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-slate-950 p-8 text-center text-slate-400 border-r border-slate-800/80">
                <LogoBadge size="lg" className="mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">تواصل 24 للمراسلة والاتصال المباشر</h3>
                <p className="text-sm text-slate-400 max-w-md leading-relaxed mb-6">
                  أرسل الرسائل النصية، مقاطع الصوت والفيديو، وسجل الملاحظات الصوتية وأجرِ مكالمات صوتية مشفرة برقم تواصل الفردي المعتمد.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-mono text-blue-400">
                  <Sparkles className="w-4 h-4" />
                  <span>رقمك المفعل: {currentUser.number}</span>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Splash waiting for onboarding */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <LogoBadge size="xl" className="mb-6 animate-pulse" />
          <h2 className="text-2xl font-bold text-white mb-2">مرحباً بك في تواصل 24</h2>
          <p className="text-sm text-slate-400 mb-6">جاري تحميل إعدادات تفعيل الرقم...</p>
        </div>
      )}

      {/* MODALS */}

      {/* 1. Onboarding & Number Picker Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        existingUser={currentUser}
        isChangingNumber={isChangingNumber}
        onComplete={handleOnboardingComplete}
        onClose={() => {
          setShowOnboarding(false);
          setIsChangingNumber(false);
        }}
      />

      {/* 2. Voice & Direct Video Calling Modal */}
      {activeCall && (
        <VoiceCallModal
          call={activeCall}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
          onEnd={handleEndCall}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onBlockCaller={(num) => {
            handleToggleBlock(num);
            handleDeclineCall();
          }}
        />
      )}

      {/* 3. Camera Photo Capture & Video Recording Modal */}
      <CameraModal
        isOpen={showCamera}
        initialMode={cameraInitialMode}
        onClose={() => setShowCamera(false)}
        onSendMedia={(dataUrl, type, duration, caption) => {
          handleSendMessage(caption || '', type, { mediaUrl: dataUrl, duration });
        }}
      />

      {/* 4. Owner Admin Discrete Modal (fa&roog#77) */}
      <AdminModal
        isOpen={showAdmin}
        onClose={() => setShowAdmin(false)}
        allUsers={contacts}
        allMessages={messages}
        allCalls={callLogs}
        onUserDeletedPermanently={(deletedNum) => {
          setContacts((prev) => prev.filter((c) => c.number !== deletedNum));
          if (activeContact?.number === deletedNum) {
            setActiveContact(null);
          }
        }}
        onClearUserChat={handleAdminClearUserChat}
        onBroadcastMessage={(title, msg) => {
          const sysMsg: ChatMessage = {
            id: `broadcast_${Date.now()}`,
            from: '813579',
            to: 'global',
            content: `📢 [إشعار رسمي من إدارة تواصل 24]\n*${title}*\n${msg}`,
            contentType: 'text',
            timestamp: Date.now(),
            status: 'delivered',
          };
          setMessages((prev) => [...prev, sysMsg]);
        }}
      />

      {/* 5. Settings Modal */}
      {currentUser && (
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          currentUser={currentUser}
          onUpdateUser={(updated) => {
            const next = { ...currentUser, ...updated };
            setCurrentUser(next);
            localStorage.setItem('tawasol24_user', JSON.stringify(next));
            syncClient.updateProfile(next);
          }}
          onChangeNumber={() => {
            setIsChangingNumber(true);
            setShowOnboarding(true);
          }}
          blockedNumbers={blockedNumbers}
          onUnblockNumber={handleToggleBlock}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          adBlockerEnabled={adBlockerEnabled}
          onToggleAdBlocker={handleToggleAdBlocker}
          blockedAdsCount={blockedAdsCount}
          onResetAccount={() => {
            localStorage.removeItem('tawasol24_user');
            setCurrentUser(null);
            setShowSettings(false);
            setShowOnboarding(true);
          }}
        />
      )}

      {/* 6. Invite & Official Clean Link Modal (https://tawasol24.com) */}
      <InviteModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
      />

      {/* 7. Create Status Modal */}
      {currentUser && (
        <CreateStatusModal
          isOpen={showCreateStatus}
          onClose={() => setShowCreateStatus(false)}
          currentUser={currentUser}
          onStatusCreated={handleStatusCreated}
        />
      )}

      {/* 8. Status Story Viewer Modal */}
      {currentUser && viewStoryIndex !== null && (
        <StatusViewerModal
          isOpen={viewStoryIndex !== null}
          onClose={() => setViewStoryIndex(null)}
          stories={stories}
          initialIndex={viewStoryIndex}
          currentUserNumber={currentUser.number}
          onDeleteStory={handleDeleteStory}
        />
      )}

      {/* 9. Screen for Permanently Expelled Users (Owner Ban Lockout) */}
      {bannedInfo && (
        <BannedScreen
          bannedNumber={bannedInfo.number}
          reason={bannedInfo.reason}
          onCheckPermission={async () => {
            try {
              const res = await fetch(`/api/users/check/${bannedInfo.number}`);
              const data = await res.json();
              if (!data.isBlacklisted) {
                setBannedInfo(null);
                setShowOnboarding(true);
                return true;
              }
              return false;
            } catch {
              return false;
            }
          }}
        />
      )}
    </div>
  );
}
