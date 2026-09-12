import type { ChatMessage, ChatUser, PhoneSettings } from '@/types'

const databaseName = 'wechat-colleague-clean-v1'
const databaseVersion = 4
const projectStore = 'projects'
const momentStore = 'moment-projects'
const sceneStore = 'scene-projects'
const draftStore = 'chat-drafts'

export const activeProjectStorageKey = 'wechat-colleague-clean-v1:active-project'

export interface ChatProjectSnapshot {
  importText: string
  users: ChatUser[]
  messages: ChatMessage[]
  settings: PhoneSettings
  selfId: number | null
}

export interface ChatProject extends ChatProjectSnapshot {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  version: 1
}

export interface MomentComment {
  id: string
  author: string
  content: string
}

export interface MomentProject {
  albumMode?: 'feed' | 'friend' | 'self'
  signature?: string
  entries?: AlbumEntry[]
  platform?: 'ios'|'android'
  statusTime?: string
  battery?: number
  id: 'active'
  author: string
  avatar: string | null
  coverColor: string
  coverImage: string | null
  content: string
  images: string[]
  location: string
  timeLabel: string
  likes: string[]
  comments: MomentComment[]
  updatedAt: string
  version: 1
}

export interface AlbumEntry {
  id: string
  date: string
  month: string
  type: 'text'|'image'|'video'
  content: string
  images: string[]
  pinned: boolean
}

export type WechatSceneKind = 'payment' | 'redpacket' | 'profile' | 'group'

export interface GroupMember { id: string; name: string; avatar: string; tag: string }

export interface WechatSceneProject {
  id: WechatSceneKind
  fields: Record<string, string>
  members?: GroupMember[]
  updatedAt: string
  version: 1
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(draftStore)) database.createObjectStore(draftStore, { keyPath: 'id' })
      if (!database.objectStoreNames.contains(projectStore)) {
        const store = database.createObjectStore(projectStore, { keyPath: 'id' })
        store.createIndex('updatedAt', 'updatedAt')
      }
      if (!database.objectStoreNames.contains(momentStore)) {
        database.createObjectStore(momentStore, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains(sceneStore)) {
        database.createObjectStore(sceneStore, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result) }
    request.onblocked = () => reject(new Error('请关闭此工具的其他窗口，再刷新重试'))
    request.onerror = () => reject(request.error ?? new Error('Unable to open IndexedDB'))
  })
}

export async function loadMomentProject() {
  return withNamedStore<MomentProject | undefined>(momentStore, 'readonly', store => store.get('active'))
}

export async function saveMomentProject(project: MomentProject) {
  await withNamedStore(momentStore, 'readwrite', store => store.put(project))
  return project
}

export async function loadWechatScene(kind: WechatSceneKind) {
  return withNamedStore<WechatSceneProject | undefined>(sceneStore, 'readonly', store => store.get(kind))
}

export async function saveWechatScene(project: WechatSceneProject) {
  await withNamedStore(sceneStore, 'readwrite', store => store.put(project))
  return project
}

async function withNamedStore<T>(
  name: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const database = await openDatabase()
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(name, mode)
    const request = operation(transaction.objectStore(name))
    transaction.oncomplete = () => { database.close(); resolve(request.result) }
    transaction.onerror = transaction.onabort = () => { database.close(); reject(transaction.error || request.error || Error('本机保存失败')) }
  })
}
async function withStore<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) {
  return withNamedStore(projectStore, mode, operation)
}
export async function loadChatDraft<T>() {
  const record = await withNamedStore<{id: string; value: T} | undefined>(draftStore, 'readonly', store => store.get('active'))
  return record?.value
}
export async function saveChatDraft<T>(value: T) {
  await withNamedStore(draftStore, 'readwrite', store => store.put({id: 'active', value}))
}

export async function listProjects() {
  const projects = await withStore('readonly', store => store.getAll()) as ChatProject[]
  return projects.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

export async function saveProject(project: ChatProject) {
  await withStore('readwrite', store => store.put(project))
  return project
}

export async function deleteProject(projectId: string) {
  await withStore('readwrite', store => store.delete(projectId))
}

export function projectName(snapshot: ChatProjectSnapshot, date = new Date()) {
  const contact = snapshot.settings.contactName.trim()
  if (contact) return `${contact}的对话`
  const participant = snapshot.users.find(user => user.id !== snapshot.selfId)?.name
  if (participant) return `${participant}的对话`
  const stamp = new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
  return `未命名对话 ${stamp}`
}

export function projectHasContent(snapshot: ChatProjectSnapshot) {
  return snapshot.messages.length > 0 || snapshot.users.length > 0 || snapshot.importText.trim().length > 0
}

export function copyProject(project: ChatProject, now = new Date()) {
  const timestamp = now.toISOString()
  return {
    ...structuredClone(project),
    id: crypto.randomUUID(),
    name: `${project.name} 副本`,
    createdAt: timestamp,
    updatedAt: timestamp,
  } satisfies ChatProject
}
