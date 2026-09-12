import type { ChatMessage, ChatUser, PhoneSettings } from '../types'
export type Project = { version: number; users: ChatUser[]; messages: ChatMessage[]; settings: PhoneSettings; selfId: number | null; text: string }
export const defaults:PhoneSettings={platform:'ios',time:'09:41',signal:4,secondarySignal:3,simMode:'single',wifiEnabled:true,battery:60,contactName:'对方',unreadCount:0,selfBubbleColor:'#95ec69',otherBubbleColor:'#ffffff',backgroundColor:'#ededed',backgroundImage:null,theme:'light',networkType:'5G',charging:false,dnd:false,earpiece:false,showGroupNames:true,inputMode:'text',autoScroll:true,previewScale:1,canvasHeight:2436};
const MAX_IMAGE_CHARS = 28 * 1024 * 1024
export function localImage(value: unknown): boolean {
  if (value === null || value === '') return true
  if (typeof value !== 'string' || value.length > MAX_IMAGE_CHARS) return false
  const comma = value.indexOf(',')
  return /^data:image\/(png|jpeg|webp|gif);base64$/.test(value.slice(0, comma)) &&
    comma >= 0 && value.length > comma + 1 && !/[^A-Za-z0-9+/=]/.test(value.slice(comma + 1))
}
export function validate(v: Project): Project {
  if (!v || v.version !== 2 || !Array.isArray(v.users) || v.users.length < 1 || v.users.length > 100 || !Array.isArray(v.messages) || v.messages.length > 1000) throw Error('项目格式不正确（最多 100 位参与者、1000 条消息）')
  const ids = new Set(v.users.map(u => u.id))
  if (ids.size !== v.users.length || !ids.has(v.selfId as number)) throw Error('参与者数据不正确')
  v.users.forEach(u => {
    if (!Number.isFinite(u.id) || typeof u.name !== 'string' || u.name.length > 60 || !localImage(u.avatar)) throw Error('头像或昵称无效，头像请使用 20 MB 以内的本地图片')
  })
  const mids = new Set<number>()
  const types = ['text','time','voice','transfer','redpacket','image','emoji','call','card','pat','recall','system','receipt']
  v.messages.forEach(m => {
    if (!m || !Number.isFinite(m.id) || mids.has(m.id) || !ids.has(m.senderId) || !types.includes(m.type) || typeof m.content !== 'string' || !m.params) throw Error('消息格式错误')
    mids.add(m.id)
    // Embedded media is measured as media, never as message text.
    const imageContent = m.type === 'image' || (m.type === 'emoji' && m.content.startsWith('data:'))
    if (imageContent) {
      if (!localImage(m.content)) throw Error('图片无效，请上传 20 MB 以内的 PNG、JPG、WebP 或 GIF')
    } else if (m.content.length > 10000) throw Error('单条文字超过 10000 字，请分段添加')
    if (m.params.cardAvatar && !localImage(m.params.cardAvatar)) throw Error('名片头像格式错误')
    for (const key of ['remark','transcript','cardName','cardWechatId','receiptStatus','transferTime','receivedTime','sourceSenderName'] as const) {
      if (m.params[key] !== undefined && (typeof m.params[key] !== 'string' || m.params[key]!.length > 10000)) throw Error('消息附加文字过长')
    }
    if(m.params.detailFields){
      if(typeof m.params.detailFields!=='object'||Array.isArray(m.params.detailFields)||Object.values(m.params.detailFields).some(v=>typeof v!=='string'))throw Error('详情页数据格式错误')
      if(m.params.detailFields.avatar&&!localImage(m.params.detailFields.avatar))throw Error('详情头像无效')
      if(m.params.detailFields.channelImages){try{const images=JSON.parse(m.params.detailFields.channelImages);if(!Array.isArray(images)||images.length>4||images.some((i:unknown)=>!localImage(i)))throw Error()}catch{throw Error('视频号缩略图无效')}}
    }
    if (m.params.received !== undefined && typeof m.params.received !== 'boolean') throw Error('领取状态格式错误')
    if (m.params.receiverId !== undefined && !ids.has(m.params.receiverId)) throw Error('领取人不在参与者列表中')
    if (m.type === 'voice' && (!Number.isFinite(m.params.duration) || Number(m.params.duration) < 1 || Number(m.params.duration) > 60)) throw Error('语音为 1—60 秒')
    if ((m.type === 'transfer' || (m.type === 'redpacket' && m.params.amount !== undefined)) && (!Number.isFinite(Number(m.params.amount)) || Number(m.params.amount) < 0)) throw Error('金额无效')
  })
  const s = { ...defaults, ...v.settings }
  if (!v.settings || !['ios','android'].includes(s.platform) || !localImage(s.backgroundImage)) throw Error('外观设置错误')
  for (const key of ['backgroundColor','selfBubbleColor','otherBubbleColor'] as const) if (!/^#[\da-f]{6}$/i.test(s[key])) throw Error('颜色格式错误')
  if (typeof s.contactName !== 'string' || typeof s.time !== 'string' || !Number.isFinite(s.battery) || s.battery < 0 || s.battery > 100) throw Error('手机设置错误')
  s.canvasHeight = Math.max(1500, Math.min(10000, Number(s.canvasHeight) || 2436))
  s.previewScale = Math.max(.4, Math.min(1.5, Number(s.previewScale) || 1))
  return { ...v, text: typeof v.text === 'string' ? v.text : '', settings: s }
}
