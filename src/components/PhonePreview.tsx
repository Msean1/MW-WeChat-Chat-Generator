import {MoneyMessage} from './MoneyMessage';
import {receiptAssets} from '../lib/receipt-assets';
import {WechatText} from './WechatText';
import {wechatEmojiSource} from '../lib/wechat-emoji';
import {asset} from '../lib/offline-assets';
import { useRef, useEffect, useState } from 'react';
import {createPortal} from 'react-dom';
import type { ChatUser, ChatMessage, PhoneSettings } from '@/types';
import { getDefaultAvatar } from '@/lib/parser';
import { WechatPhoneHeader } from '@/components/WechatPhoneHeader';
import './PhonePreview.css';

interface PhonePreviewProps {
  users: ChatUser[];
  messages: ChatMessage[];
  settings: PhoneSettings;
  selfId: number | null;
  phoneRef?: React.RefObject<HTMLDivElement | null>;
  onUpdateMessage?: (msgId: number, content: string) => void;
  onOpenDetail?: (msgId:number) => void;
  selectedMessageId?: number | null;
  onSelectMessage?: (msgId: number) => void;
  onEditMessage?: (msgId: number) => void;
  onMessageAction?: (msgId: number, action: 'copy' | 'up' | 'down' | 'receive' | 'delete') => void;
}

function TimeNotice({ content, kind = 'time' }: { content: string; kind?: 'time' | 'system' }) {
  return (
    <div className={`wc-notice wc-notice-${kind}`}>
      <span className="wc-notice-bg">{content}</span>
    </div>
  );
}

function ChatBubble({ msg, user, userIndex, isSelf, isGroup, selfColor, otherColor, onUpdateMessage, onOpenDetail }: {
  msg: ChatMessage;
  user: ChatUser;
  userIndex: number;
  isSelf: boolean;
  isGroup: boolean;
  selfColor: string;
  otherColor: string;
  onUpdateMessage?: (msgId: number, content: string) => void;
  onOpenDetail?: (msgId:number) => void;
}) {
  const avatarSrc = user.avatar || getDefaultAvatar(userIndex);
  const bubbleColor = isSelf ? selfColor : otherColor;
  const imgInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateMessage) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onUpdateMessage(msg.id, ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const renderContent = () => {
    switch (msg.type) {
      case 'text':
        return (
          <div className="wc-bubble" style={{ background: bubbleColor }}>
            <span className="wc-arrow" style={{ background: bubbleColor }} />
            <WechatText text={msg.content}/>
          </div>
        );
      case 'image': {
        const hasImage = msg.content && !msg.content.includes('placeholder');
        return (
          <div className="wc-bubble wc-bubble-image" onClick={() => imgInputRef.current?.click()} style={{ cursor: 'pointer' }}>
            {hasImage ? (
              <img src={msg.content} alt="" />
            ) : (
              <div className="wc-img-placeholder">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" fill="#999" stroke="none" /><path d="M21 15l-5-5L5 21" /></svg>
                <span>点击上传图片</span>
              </div>
            )}
            <input ref={imgInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
          </div>
        );
      }
      case 'voice': {
        const dur = msg.params.duration || 2;
        const w = 180 + Math.min(dur * 30, 400);
        return (
          <div className="wc-voice-stack">
            <div className="wc-bubble wc-bubble-voice" style={{ background: bubbleColor, width: `${w}px` }}>
              <span className="wc-arrow" style={{ background: bubbleColor }} />
              {isSelf ? (
                <><span className="wc-voice-dur">{dur}&quot;</span><img className="wc-voice-wave" src={`${asset('wechat-voice-icon2.png')}`} alt="" /></>
              ) : (
                <><img className="wc-voice-wave" src={`${asset('wechat-voice-icon1.png')}`} alt="" /><span className="wc-voice-dur">{dur}&quot;</span>{msg.params.read !== true && <i className="wc-voice-unread" />}</>
              )}
            </div>
            {msg.params.transcript && (
              <div className="wc-voice-transcript">{msg.params.transcript}</div>
            )}
          </div>
        );
      }
      case 'redpacket':
      case 'transfer':
        return <MoneyMessage msg={msg} onOpen={()=>onOpenDetail?.(msg.id)}/>;
      case 'emoji':
        if(wechatEmojiSource(msg.content))return <div className="wc-bubble" style={{background:bubbleColor}}><span className="wc-arrow" style={{background:bubbleColor}}/><WechatText text={msg.content.startsWith('[')?msg.content:'['+msg.content+']'}/></div>;
        return <div className="wc-standalone-emoji">{msg.content.startsWith('data:image/') ? <img src={msg.content} alt="表情" /> : msg.content}</div>;
      case 'call': {
        const status = { completed: '通话时长', cancelled: '已取消', busy: '对方忙线', rejected: '已拒绝' }[msg.params.callStatus || 'completed'];
        const seconds = Number(msg.params.duration || 0);
        const durationText = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
        return <div className="wc-bubble wc-bubble-call" style={{ background: bubbleColor }}><span className="wc-arrow" style={{ background: bubbleColor }}/><span className="wc-call-icon">{msg.params.callType === 'video' ? '▣' : '☎'}</span><span>{msg.params.callType === 'video' ? '视频通话' : '语音通话'}<small>{status}{msg.params.callStatus === 'completed' ? ` ${durationText}` : ''}</small></span></div>;
      }
      case 'card':
        return <div className="wc-bubble wc-bubble-card wc-openable" onClick={()=>onOpenDetail?.(msg.id)}><span className="wc-arrow"/><div className="wc-card-main">{msg.params.cardAvatar ? <img src={msg.params.cardAvatar} alt=""/> : <span>{(msg.params.cardName || '联').slice(0,1)}</span>}<div><strong>{msg.params.cardName || '联系人'}</strong></div></div><div className="wc-card-foot">个人名片</div></div>;
      case 'receipt':
        return <MoneyMessage msg={msg} onOpen={()=>onOpenDetail?.(msg.id)}/>;
      default:
        return null;
    }
  };

  if(msg.type==='receipt'&&msg.params.receiptType==='redpacket')return <div className="wc-receive-notice wc-openable" onClick={()=>onOpenDetail?.(msg.id)}><img src={receiptAssets['wechat-redp-icon1.png']} alt=""/><span>{isSelf?'你':user.name}领取了{msg.params.sourceSenderName||'对方'}的<em>红包</em></span></div>;

  return (
    <div className={`wc-dialog ${isSelf ? 'wc-dialog-right' : ''}`}>
      <div className="wc-face">
        <img src={avatarSrc} alt={user.name} />
      </div>
      <div className="wc-body">
        {!isSelf && isGroup && <div className="wc-nick">{user.name}</div>}
        {renderContent()}
      </div>
    </div>
  );
}

export function PhonePreview({ users, messages, settings, selfId, phoneRef, onUpdateMessage, selectedMessageId, onSelectMessage, onEditMessage, onMessageAction, onOpenDetail }: PhonePreviewProps) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [menu, setMenu] = useState<{id:number;x:number;y:number}|null>(null);

  useEffect(() => {
    if (settings.autoScroll === false) return;
    const timer = setTimeout(() => {
      if (bodyRef.current) {
        bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [messages, settings.autoScroll]);

  useEffect(()=>{const close=(event:PointerEvent)=>{if(!(event.target as Element).closest('.wc-context-menu'))setMenu(null)};window.addEventListener('pointerdown',close);return()=>window.removeEventListener('pointerdown',close)},[]);
  const isGroup = users.length > 2;

  return (
    <>{menu&&createPortal(<div className="wc-context-menu wc-context-viewport" style={{left:Math.min(menu.x,window.innerWidth-300),top:Math.min(menu.y,window.innerHeight-55)}} onClick={e=>e.stopPropagation()}>
      <button type="button" onClick={()=>{onEditMessage?.(menu.id);setMenu(null)}}>编辑</button>
      {(['copy','up','down',...(messages.find(m=>m.id===menu.id)&&['transfer','redpacket'].includes(messages.find(m=>m.id===menu.id)!.type)?['receive']:[]),'delete']).map(action=><button key={action} type="button" onClick={()=>{onMessageAction?.(menu.id,action as 'copy'|'up'|'down'|'receive'|'delete');setMenu(null)}}>{{copy:'复制',up:'上移',down:'下移',receive:'领取/收款',delete:'删除'}[action as 'copy'|'up'|'down'|'receive'|'delete']}</button>)}
    </div>,document.body)}
    <div className="wc-phone-scale-wrap" style={{ transform: `scale(${settings.previewScale || 1})`, transformOrigin: 'top center' }}>
      <div className="wc-phone-wrap" style={{ height: `${(settings.canvasHeight || 2436) / 3}px` }}>
        <div className="wc-phone-content">
          <div className={`wc-phone wc-phone-${settings.platform} wc-theme-${settings.theme || 'light'}`} style={{ height: `${settings.canvasHeight || 2436}px` }} ref={phoneRef} onClick={()=>setMenu(null)}>
            <div className="wc-phone-top">
              <WechatPhoneHeader settings={settings} />
            </div>

            {/* Chat body */}
            <div
              className={`wc-chat-body${settings.backgroundImage ? ' wc-chat-body-image' : ''}`}
              ref={bodyRef}
              style={{
                backgroundColor: settings.backgroundColor || '#ededed',
                backgroundImage: settings.backgroundImage ? `url(${settings.backgroundImage})` : undefined,
              }}
            >
              <div className="wc-chat-content">
                {messages.map((item) => {
                  const linked=item.type==='receipt'?messages.find(m=>m.id===item.params.sourceMessageId):undefined;
                  const msg=linked?{...item,params:{...item.params,amount:linked.params.amount,sourceSenderName:users.find(u=>u.id===linked.senderId)?.name}}:item;
                  if (msg.type === 'time' || msg.type === 'pat' || msg.type === 'recall' || msg.type === 'system') {
                    return <div key={msg.id} data-message-id={msg.id} className={selectedMessageId===msg.id?'wc-message-selected':''} onClick={e=>{e.stopPropagation();onSelectMessage?.(msg.id)}} onDoubleClick={()=>onEditMessage?.(msg.id)} onContextMenu={e=>{e.preventDefault();e.stopPropagation();setMenu({id:msg.id,x:e.clientX,y:e.clientY})}}><TimeNotice content={msg.content} kind={msg.type==='time'?'time':'system'} /></div>;
                  }
                  const userIndex = users.findIndex(u => u.id === msg.senderId);
                  const user = users[userIndex] || users[0];
                  const isSelf = msg.senderId === selfId;
                  return (
                    <div key={msg.id} data-message-id={msg.id} className={selectedMessageId===msg.id?'wc-message-selected':''} onClick={e=>{e.stopPropagation();onSelectMessage?.(msg.id)}} onDoubleClick={()=>onEditMessage?.(msg.id)} onContextMenu={e=>{e.preventDefault();e.stopPropagation();setMenu({id:msg.id,x:e.clientX,y:e.clientY})}}><ChatBubble
                      msg={msg}
                      user={user}
                      userIndex={userIndex >= 0 ? userIndex : 0}
                      isSelf={isSelf}
                      isGroup={isGroup && settings.showGroupNames !== false}
                      selfColor={settings.selfBubbleColor}
                      otherColor={settings.otherBubbleColor}
                      onUpdateMessage={onUpdateMessage}
                      onOpenDetail={onOpenDetail}
                    /></div>
                  );
                })}
              </div>

            </div>

            {/* Bottom bar */}
            <div className="wc-bottom">
              <div className="wc-bottom-chat">
                <div className="wc-bottom-inner">
                  {/* 语音按钮 */}
                  <div className="wc-bottom-icon">
                    <img src={`${asset('wechat-bottom-icon1.png')}`} alt="语音" />
                  </div>
                  {/* 输入框 */}
                  <div className={`wc-input-box${settings.inputMode==='voice'?' is-voice':''}`}>
                    {settings.inputMode==='voice'&&<strong>按住 说话</strong>}
                    <svg className="wc-input-mic" viewBox="0 0 48 48" fill="none" stroke="#999" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 20v9a5 5 0 0 0 10 0v-9a5 5 0 0 0-10 0z" />
                      <path d="M14 28c0 5.5 4.5 10 10 10s10-4.5 10-10" />
                      <line x1="24" y1="38" x2="24" y2="42" />
                    </svg>
                  </div>
                  {/* 表情按钮 */}
                  <div className="wc-bottom-icon">
                    <img src={`${asset('wechat-bottom-icon2.png')}`} alt="表情" />
                  </div>
                  {/* 加号按钮 */}
                  <div className="wc-bottom-icon">
                    <img src={`${asset('wechat-bottom-icon3.png')}`} alt="加号" />
                  </div>
                </div>
              </div>
              <div className="wc-home-indicator"><i /></div>
            </div>
          </div>
        </div>
      </div>
    </div></>
  );
}
