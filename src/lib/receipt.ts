import type { ChatMessage, ChatUser } from '../types'

// A receipt keeps the source amount and participant link, including in saved projects.
export function receiveMessage(messages: ChatMessage[], id: number, receiverId: number, users: ChatUser[]): ChatMessage[] {
  const source = messages.find(m => m.id === id)
  if (!source || !['transfer', 'redpacket'].includes(source.type)) return messages
  if (source.senderId === receiverId || !users.some(u => u.id === receiverId)) throw Error('请选择另一位参与者领取')
  if (messages.some(m => m.type === 'receipt' && m.params.sourceMessageId === id)) return messages
  const receipt: ChatMessage = {
    id: Math.max(0, ...messages.map(m => m.id)) + 1, type: 'receipt', senderId: receiverId, content: '',
    params: { sourceMessageId: id, receiptType: source.type as 'transfer'|'redpacket', amount: source.params.amount || '0.00', remark: source.params.remark,
      sourceSenderName: users.find(u => u.id === source.senderId)?.name || '', receiptStatus: source.type === 'transfer' ? '已收款' : '已领取',
      transferTime: source.params.transferTime, receivedTime: source.params.receivedTime },
  }
  return messages.flatMap(m => m.id === id ? [{ ...m, params: { ...m.params, received: true, receiverId } }, receipt] : [m])
}

export function undoReceipt(messages: ChatMessage[], id: number): ChatMessage[] {
  return messages.filter(m => !(m.type === 'receipt' && m.params.sourceMessageId === id)).map(m => m.id === id ? {...m,params:{...m.params,received:false,receiverId:undefined}} : m)
}

export function visibleGroupMembers<T>(members: T[], expanded: boolean): T[] { return expanded ? members : members.slice(0, 19) }

export function money(value?: string) { const n = Number(value); return Number.isFinite(n) && n >= 0 ? n.toFixed(2) : '0.00' }
