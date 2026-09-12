import { useRef, useState } from 'react';
import { Banknote, Clock, Contact, Gift, Image, Info, Mic, Phone, PlusCircle, RotateCcw, Smile, Sparkles, Type } from 'lucide-react';
import {WechatEmojiPicker} from './WechatEmojiPicker';
import {SenderPicker} from './SenderPicker';
import {insertWechatEmoji,wechatEmojiSource} from '../lib/wechat-emoji';
import type { ChatMessage, ChatUser, MessageType } from '@/types';

interface MessageEditorProps {
  initialType?: MessageType;
  users: ChatUser[];
  selfId: number | null;
  chatTitle?: string;
  onChatTitleChange?: (title:string)=>void;
  onAddMessage: (msg: Omit<ChatMessage, 'id'>) => boolean | void;
}

const MSG_TYPES: { type: MessageType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: '文字', icon: <Type size={14} /> },
  { type: 'image', label: '图片', icon: <Image size={14} /> },
  { type: 'emoji', label: '表情', icon: <Smile size={14} /> },
  { type: 'redpacket', label: '红包', icon: <Gift size={14} /> },
  { type: 'transfer', label: '转账', icon: <Banknote size={14} /> },
  { type: 'voice', label: '语音', icon: <Mic size={14} /> },
  { type: 'call', label: '音视频', icon: <Phone size={14} /> },
  { type: 'card', label: '名片', icon: <Contact size={14} /> },
  { type: 'pat', label: '拍一拍', icon: <Sparkles size={14} /> },
  { type: 'recall', label: '撤回', icon: <RotateCcw size={14} /> },
  { type: 'system', label: '系统', icon: <Info size={14} /> },
  { type: 'time', label: '时间', icon: <Clock size={14} /> },
];



function readImage(file: File, done: (data: string) => void) {
  const reader = new FileReader();
  reader.onload = () => done(String(reader.result));
  reader.readAsDataURL(file);
}

export function MessageEditor({ users, selfId, chatTitle='', onChatTitleChange, onAddMessage, initialType='text' }: MessageEditorProps) {
  const [msgType, setMsgType] = useState<MessageType>(initialType);
  const [senderId, setSenderId] = useState<number | null>(selfId ?? users[0]?.id ?? null);
  const selectedSenderId = users.find(user => user.id === senderId)?.id
    ?? users.find(user => user.id === selfId)?.id ?? users[0]?.id ?? null;
  const [content, setContent] = useState('');
  const [remark, setRemark] = useState('');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('3');
  const [transcript, setTranscript] = useState('');
  const [voiceRead, setVoiceRead] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [emojiValue, setEmojiValue] = useState('[微笑]');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [callStatus, setCallStatus] = useState<'completed' | 'cancelled' | 'busy' | 'rejected'>('completed');
  const [cardName, setCardName] = useState('联系人');
  const [cardWechatId, setCardWechatId] = useState('');
  const [cardAvatar, setCardAvatar] = useState<string | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [emojiTarget,setEmojiTarget]=useState<'message'|'title'>('message');
  const insertEmoji = (name:string) => {
    if(emojiTarget==='title'&&onChatTitleChange){
      const result=insertWechatEmoji(chatTitle,name,titleRef.current?.selectionStart??chatTitle.length,titleRef.current?.selectionEnd??chatTitle.length);onChatTitleChange(result.text);requestAnimationFrame(()=>{titleRef.current?.focus();titleRef.current?.setSelectionRange(result.caret,result.caret)});return;
    }
    const result=insertWechatEmoji(content,name,textRef.current?.selectionStart??content.length,textRef.current?.selectionEnd??content.length);setContent(result.text);requestAnimationFrame(()=>{textRef.current?.focus();textRef.current?.setSelectionRange(result.caret,result.caret)});
  };

  const add = () => {
    const sender = selectedSenderId ?? 1;
    if (msgType === 'time' || msgType === 'pat' || msgType === 'recall' || msgType === 'system') {
      if (!content.trim()) return;
      if (onAddMessage({ type: msgType, senderId: sender, content: content.trim(), params: {} }) === false) return;
      setContent(''); return;
    }
    if (selectedSenderId === null) return;
    if (msgType === 'text') {
      if (!content.trim()) return;
      if (onAddMessage({ type: 'text', senderId: sender, content: content.trim(), params: {} }) === false) return; setContent('');
    } else if (msgType === 'image') {
      if (onAddMessage({ type: 'image', senderId: sender, content: imagePreview || '', params: {} }) === false) return; setImagePreview(null);
    } else if (msgType === 'emoji') {
      if (!emojiValue) return;
      if (onAddMessage({ type: 'emoji', senderId: sender, content: emojiValue, params: {} }) === false) return;
    } else if (msgType === 'redpacket') {
      if (onAddMessage({ type: 'redpacket', senderId: sender, content: '', params: { amount:amount||'0.00',remark: remark || '恭喜发财，大吉大利' } }) === false) return; setRemark('');
    } else if (msgType === 'transfer') {
      if (onAddMessage({ type: 'transfer', senderId: sender, content: '', params: { amount: amount || '0', remark: remark || '转账' } }) === false) return; setAmount(''); setRemark('');
    } else if (msgType === 'voice') {
      if (onAddMessage({ type: 'voice', senderId: sender, content: '', params: { duration: Math.max(1, Math.min(60, Number(duration) || 3)), transcript: transcript.trim() || undefined, read: voiceRead } }) === false) return; setDuration('3'); setTranscript('');
    } else if (msgType === 'call') {
      if (onAddMessage({ type: 'call', senderId: sender, content: '', params: { callType, callStatus, duration: Number(duration) || 0 } }) === false) return;
    } else if (msgType === 'card') {
      if (onAddMessage({ type: 'card', senderId: sender, content: '', params: { cardName: cardName || '联系人', cardWechatId, cardAvatar: cardAvatar || undefined } }) === false) return;
    }
  };

  const showSender = !['time','pat','recall','system'].includes(msgType);
  return <div className="s-card"><div className="s-card-header"><h2><PlusCircle size={20}/> 添加消息</h2>{onChatTitleChange&&<label className="me-chat-title"><span>聊天顶部名称</span><input ref={titleRef} className="me-input" aria-label="聊天顶部名称" maxLength={60} value={chatTitle} onFocus={()=>setEmojiTarget('title')} onChange={event=>onChatTitleChange(event.target.value)} placeholder="可输入文字并插入下方表情" /></label>}</div>
    <div className="s-card-body me-editor-body">
      <div className="me-type-tabs" role="group" aria-label="消息类型">{MSG_TYPES.map(item => <button type="button" key={item.type} className={`me-type-tab ${msgType===item.type?'active':''}`} aria-pressed={msgType===item.type} onClick={()=>setMsgType(item.type)}>{item.icon} {item.label}</button>)}</div>
      {showSender && <SenderPicker users={users} selfId={selfId} selectedId={selectedSenderId} onSelect={setSenderId}/>}
      {(['text','time','pat','recall','system'] as MessageType[]).includes(msgType) && <><textarea ref={textRef} className="me-textarea" rows={2} value={content} placeholder={msgType==='text'?'输入消息内容，可点下方表情插入文字中':msgType==='time'?'如：3月15日 下午14:00':msgType==='pat'?'如：我拍了拍对方':msgType==='recall'?'如：对方撤回了一条消息':'输入系统提示内容'} onFocus={()=>setEmojiTarget('message')} onChange={e=>setContent(e.target.value)}/>{msgType==='text'&&<WechatEmojiPicker onSelect={insertEmoji}/>}</>}
      {msgType==='image' && <div className="me-img-area">{imagePreview?<div className="me-img-preview"><img src={imagePreview} alt=""/><button type="button" className="me-img-remove" onClick={()=>setImagePreview(null)}>✕</button></div>:<button type="button" className="me-img-upload" onClick={()=>imgRef.current?.click()}><Image size={20}/><span>选择本地图片</span></button>}<input ref={imgRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={e=>{const f=e.target.files?.[0];if(f)readImage(f,setImagePreview);e.target.value=''}}/></div>}
      {msgType==='emoji' && <><WechatEmojiPicker selected={emojiValue} onSelect={name=>setEmojiValue('['+name+']')}/><div className="me-row"><div className="me-emoji-current">{emojiValue.startsWith('data:')?<img src={emojiValue} alt="自定义表情"/>:wechatEmojiSource(emojiValue)?<img src={wechatEmojiSource(emojiValue)} alt={emojiValue}/>:emojiValue}</div><button type="button" className="btn btn-outline" onClick={()=>emojiRef.current?.click()}>上传自定义表情</button><input ref={emojiRef} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>{const f=e.target.files?.[0];if(f)readImage(f,setEmojiValue);e.target.value=''}}/></div></>}
      {msgType==='redpacket'&&<div className="me-row"><input className="me-input" value={amount} placeholder="红包金额（详情页显示）" onChange={e=>setAmount(e.target.value)}/><input className="me-input" value={remark} placeholder="红包备注（默认：恭喜发财，大吉大利）" onChange={e=>setRemark(e.target.value)}/></div>} 
      {msgType==='transfer'&&<div className="me-row"><input className="me-input" value={amount} placeholder="金额" onChange={e=>setAmount(e.target.value)}/><input className="me-input" value={remark} placeholder="备注（默认：转账）" onChange={e=>setRemark(e.target.value)}/></div>}
      {msgType==='voice'&&<><div className="me-row"><input className="me-input" type="number" min={1} max={60} value={duration} onChange={e=>setDuration(e.target.value)}/><span className="me-hint">秒</span><textarea className="me-textarea" rows={2} value={transcript} placeholder="转文字内容（可选）" onChange={e=>setTranscript(e.target.value)}/></div><label className="me-check"><input type="checkbox" checked={voiceRead} onChange={e=>setVoiceRead(e.target.checked)}/> 已读（关闭时显示未读红点，与转文字独立）</label></>}
      {msgType==='call'&&<div className="me-row"><select className="me-select" value={callType} onChange={e=>setCallType(e.target.value as 'audio'|'video')}><option value="audio">语音通话</option><option value="video">视频通话</option></select><select className="me-select" value={callStatus} onChange={e=>setCallStatus(e.target.value as typeof callStatus)}><option value="completed">已完成</option><option value="cancelled">已取消</option><option value="busy">忙线未接听</option><option value="rejected">已拒绝</option></select><input className="me-input" type="number" min={0} value={duration} onChange={e=>setDuration(e.target.value)} placeholder="通话秒数"/></div>}
      {msgType==='card'&&<><div className="me-row"><input className="me-input" value={cardName} onChange={e=>setCardName(e.target.value)} placeholder="名片昵称"/><input className="me-input" value={cardWechatId} onChange={e=>setCardWechatId(e.target.value)} placeholder="微信号（可选）"/></div><div className="me-row"><div className="me-card-avatar">{cardAvatar?<img src={cardAvatar} alt=""/>:<Contact size={24}/>}</div><button type="button" className="btn btn-outline" onClick={()=>cardRef.current?.click()}>上传名片头像</button><input ref={cardRef} hidden type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f)readImage(f,setCardAvatar);e.target.value=''}}/></div></>}
      <button type="button" className="btn btn-primary btn-sm" onClick={add}><PlusCircle size={15}/> 添加</button>
    </div></div>;
}
