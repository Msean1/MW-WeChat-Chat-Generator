export interface ChatUser {
  id: number;
  name: string;
  avatar: string | null;
}

export type MessageType = 'text' | 'time' | 'image' | 'voice' | 'redpacket' | 'transfer' | 'emoji' | 'call' | 'card' | 'pat' | 'recall' | 'system' | 'receipt';

export interface ChatMessage {
  id: number;
  type: MessageType;
  senderId: number;
  content: string;
  params: {
    duration?: number;
    transcript?: string;
    amount?: string;
    remark?: string;
    read?: boolean;
    callType?: 'audio' | 'video';
    callStatus?: 'completed' | 'cancelled' | 'busy' | 'rejected';
    cardName?: string;
    cardWechatId?: string;
    cardAvatar?: string;
    receiptType?: 'transfer' | 'redpacket';
    receiptStatus?: string;
    detailFields?: Record<string,string>;
    received?: boolean;
    sourceMessageId?: number;
    receiverId?: number;
    sourceSenderName?: string;
    transferTime?: string;
    receivedTime?: string;
  };
}

export interface PhoneSettings {
  platform: 'ios' | 'android';
  time: string;
  signal: number;
  secondarySignal: number;
  simMode: 'single' | 'dual';
  wifiEnabled: boolean;
  battery: number;
  contactName: string;
  unreadCount: number;
  selfBubbleColor: string;
  otherBubbleColor: string;
  backgroundColor: string;
  backgroundImage: string | null;
  theme?: 'light' | 'dark';
  networkType?: 'none' | '3G' | '4G' | '5G';
  charging?: boolean;
  dnd?: boolean;
  earpiece?: boolean;
  showGroupNames?: boolean;
  inputMode?: 'text' | 'voice';
  autoScroll?: boolean;
  previewScale?: number;
  canvasHeight?: number;
}
