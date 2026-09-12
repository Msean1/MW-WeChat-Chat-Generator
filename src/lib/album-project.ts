import type { MomentProject, AlbumEntry } from './project-store'
import { localImage } from './offline-project'

export function newAlbumEntry(): AlbumEntry { return {id:crypto.randomUUID(),date:'今天',month:'',type:'text',content:'',images:[],pinned:false} }
export function validateMoment(value: unknown): MomentProject {
  const p=value as MomentProject
  if(!p||p.version!==1||p.id!=='active'||!Array.isArray(p.images)||p.images.length>9||!Array.isArray(p.likes)||!Array.isArray(p.comments))throw Error('朋友圈项目格式错误')
  if(!localImage(p.avatar)||!localImage(p.coverImage)||p.images.some(i=>!localImage(i)))throw Error('请使用本地图片')
  for(const k of ['author','coverColor','content','location','timeLabel'] as const)if(typeof p[k]!=='string'||p[k].length>10000)throw Error('朋友圈文字格式错误')
  if(p.signature!==undefined&&typeof p.signature!=='string')throw Error('签名格式错误')
  if(!/^#[\da-f]{6}$/i.test(p.coverColor))throw Error('封面颜色格式错误')
  if(p.albumMode&&!['feed','friend','self'].includes(p.albumMode))throw Error('相册模式错误')
  if(p.entries&&(!Array.isArray(p.entries)||p.entries.length>200))throw Error('相册最多 200 条')
  const ids=new Set<string>()
  for(const e of p.entries||[]){
    if(!e||typeof e.id!=='string'||ids.has(e.id)||typeof e.date!=='string'||typeof e.month!=='string'||typeof e.content!=='string'||e.content.length>10000||!['text','image','video'].includes(e.type)||typeof e.pinned!=='boolean'||!Array.isArray(e.images)||e.images.length>9||e.images.some(i=>!localImage(i)))throw Error('相册条目格式错误')
    ids.add(e.id)
  }
  if(p.likes.some(i=>typeof i!=='string')||p.comments.some(i=>!i||typeof i.id!=='string'||typeof i.author!=='string'||typeof i.content!=='string'))throw Error('点赞或评论格式错误')
  return p
}

export function readLocalPicture(file: File): Promise<string> {
  if(file.size>20*1024*1024)return Promise.reject(Error('单张图片最大 20 MB'))
  return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>{const s=String(r.result);localImage(s)?resolve(s):reject(Error('请上传 PNG、JPG、WebP 或 GIF 图片'))};r.onerror=()=>reject(Error('图片读取失败'));r.readAsDataURL(file)})
}
