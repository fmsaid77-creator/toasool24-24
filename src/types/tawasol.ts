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

export interface ChatMessageReply {
  id: string;
  from: string;
  senderName?: string;
  content: string;
  contentType: 'text' | 'audio' | 'video' | 'image' | 'file';
  mediaUrl?: string;
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
  replyTo?: ChatMessageReply;
  reactions?: { [emoji: string]: number };
  userReactions?: { [emoji: string]: string[] };
}

export interface CallLog {
  id: string;
  caller: string;
  receiver: string;
  callerName: string;
  receiverName: string;
  callType?: 'voice' | 'video';
  status: 'completed' | 'missed' | 'declined' | 'busy';
  duration: number; // seconds
  timestamp: number;
}

export interface ActiveCall {
  active: boolean;
  callId: string;
  callType: 'voice' | 'video';
  isIncoming: boolean;
  peerNumber: string;
  peerName: string;
  peerAvatar: string;
  status: 'calling' | 'ringing' | 'connected' | 'ended';
  duration: number;
  isMuted: boolean;
  isSpeakerOn: boolean;
  isVideoMuted?: boolean;
  isMinimized?: boolean;
}

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

export interface BlacklistedUser {
  number: string;
  name: string;
  bannedAt: number;
  reason?: string;
}

export interface ChatFolder {
  id: string;
  name: string;
  icon: 'all' | 'folder' | 'briefcase' | 'heart' | 'users' | 'star' | 'bookmark' | 'flame' | 'coffee';
  color?: string;
  contactNumbers: string[];
  isDefault?: boolean;
}
