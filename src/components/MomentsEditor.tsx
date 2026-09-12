import {AlbumComposer,AlbumPreview} from './MomentsAlbum'
import {newAlbumEntry,readLocalPicture,validateMoment} from '../lib/album-project'
import {WechatText} from './WechatText'
import { useCallback, useEffect, useRef, useState } from 'react'
import {captureScene,canvasBlob,downloadBlob} from '@/lib/export-media'
import { Camera, Download, Heart, ImagePlus, MapPin, MessageCircle, Plus, Trash2 } from 'lucide-react'
import { loadMomentProject, saveMomentProject, type MomentProject } from '@/lib/project-store'
import { WechatPhoneChrome } from '@/components/WechatPhoneChrome'

const emptyMoment: MomentProject = {
  id: 'active',
  albumMode:'feed', signature:'',entries:[], platform:'android',statusTime:'09:14',battery:35,
  author: '我',
  avatar: null,
  coverColor: '#75877f',
  coverImage: null,
  content: '',
  images: [],
  location: '',
  timeLabel: '刚刚',
  likes: [],
  comments: [],
  updatedAt: new Date(0).toISOString(),
  version: 1,
}

interface MomentsEditorProps {
  onToast: (message: string) => void
  onBeforeExport?: () => Promise<boolean>
  onExportSuccess?: () => void
}

export function MomentsEditor({ onToast, onBeforeExport, onExportSuccess }: MomentsEditorProps) {
  const [draft, setDraft] = useState<MomentProject>(emptyMoment)
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [saved, setSaved] = useState(false)
  const [likeInput, setLikeInput] = useState('')
  const [commentAuthor, setCommentAuthor] = useState('')
  const [commentContent, setCommentContent] = useState('')
  const [coverError, setCoverError] = useState('')
  const importRef=useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)
  useEffect(()=>{const content=previewRef.current?.querySelector('.wechat-chrome-content');if(content)content.scrollTop=0},[draft.albumMode])
  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const latestDraft = useRef({draft,ready})
  latestDraft.current = {draft,ready}
  useEffect(()=>()=>{if(latestDraft.current.ready)void saveMomentProject({...latestDraft.current.draft,updatedAt:new Date().toISOString()}).catch(()=>onToast('本机草稿保存失败'))},[])

  useEffect(() => {
    void loadMomentProject()
      .then(project => {
        if (project) {
          setDraft({ ...emptyMoment, ...validateMoment(project) })
          setSaved(true)
        }
      })
      .catch(()=>onToast('朋友圈草稿读取失败'))
      .finally(() => setReady(true))
  }, [])

  useEffect(() => {
    if (!ready) return
    const timer = window.setTimeout(() => {
      void saveMomentProject({ ...draft, updatedAt: new Date().toISOString() })
        .then(() => setSaved(true))
        .catch(() => onToast('朋友圈草稿保存失败'))
    }, 700)
    return () => window.clearTimeout(timer)
  }, [draft, onToast, ready])

  const update = useCallback(<K extends keyof MomentProject,>(key: K, value: MomentProject[K]) => {
    setSaved(false)
    setDraft(current => ({ ...current, [key]: value }))
  }, [])

  const handleImages = useCallback(async (files: FileList | null) => {
    if (!files?.length) return
    const remaining = Math.max(0, 9 - draft.images.length)
    const selected = Array.from(files).slice(0, remaining)
    try{const urls = await Promise.all(selected.map(readLocalPicture));update('images', [...draft.images, ...urls])}catch(error){onToast((error as Error).message)}
  }, [draft.images, update])

  const handleAvatar = useCallback(async (file?: File) => {
    if(file)try{update('avatar',await readLocalPicture(file))}catch(error){onToast((error as Error).message)}
  }, [update])

  const handleCover = useCallback(async (file?: File) => {
    setCoverError('')
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setCoverError('请选择图片文件')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setCoverError('背景图片不能超过 8 MB')
      return
    }
    try {
      update('coverImage', await readLocalPicture(file))
    } catch {
      setCoverError('背景图片读取失败，请重新选择')
    }
  }, [update])

  const addLikes = useCallback(() => {
    const names = likeInput.split(/[、,，\s]+/).map(item => item.trim()).filter(Boolean)
    if (!names.length) return
    update('likes', [...new Set([...draft.likes, ...names])])
    setLikeInput('')
  }, [draft.likes, likeInput, update])

  const addComment = useCallback(() => {
    if (!commentAuthor.trim() || !commentContent.trim()) return
    update('comments', [...draft.comments, {
      id: crypto.randomUUID(),
      author: commentAuthor.trim(),
      content: commentContent.trim(),
    }])
    setCommentContent('')
  }, [commentAuthor, commentContent, draft.comments, update])

  const exportImage = useCallback(async (long=false) => {
    if (!previewRef.current || busy) return
    setBusy(true)
    onToast('正在生成朋友圈图片…')
    try {
      const canvas = await captureScene(previewRef.current,3,long)
      if (onBeforeExport && !(await onBeforeExport())) return
      downloadBlob(await canvasBlob(canvas), `微信朋友圈-v1.5-${long?"完整":"当前"}-${Date.now()}.png`)
      onToast('朋友圈图片已下载')
      onExportSuccess?.()
    } catch(error) {
      onToast('朋友圈图片生成失败：'+(error as Error).message)
    } finally { setBusy(false) }
  }, [busy, onBeforeExport, onExportSuccess, onToast])

  return (
    <main className="moments-workbench" id="moments-editor">
      <section className="moments-controls s-card">
        <div className="s-card-header moments-card-heading">
          <h2><Camera size={18} /> 编辑朋友圈</h2>
          <span className="s-card-badge">{saved ? '已自动保存' : '本地草稿'}</span>
        </div>
        <div className="s-card-body moments-form">
          <div className="scene-mode-tabs">{([['feed','朋友圈动态'],['friend','好友相册首页'],['self','我的相册首页']] as const).map(([value,label])=><button key={value} className={(draft.albumMode||'feed')===value?'active':''} onClick={()=>update('albumMode',value)}>{label}</button>)}</div>
          <div className="moments-form-row moments-author-row">
            <label className="moments-avatar-upload">
              {draft.avatar ? <img src={draft.avatar} alt="头像" /> : <span>{draft.author.slice(0, 1) || '我'}</span>}
              <input type="file" accept="image/*" onChange={event => { void handleAvatar(event.target.files?.[0]) }} />
            </label>
            <label>昵称<input className="me-input" value={draft.author} maxLength={20} onChange={event => update('author', event.target.value)} /></label>
          </div>
          <div className="moments-cover-editor">
            <div className="moments-label-line"><span>朋友圈背景</span><small>封面图</small></div>
            <div className="chat-background-control">
              <div className="chat-background-color">
                <input
                  type="color"
                  aria-label="朋友圈背景颜色"
                  value={draft.coverColor || '#75877f'}
                  onChange={event => update('coverColor', event.target.value)}
                />
                <span>{draft.coverColor || '#75877f'}</span>
              </div>
              <button className="btn btn-outline btn-sm" type="button" onClick={() => coverInputRef.current?.click()}>
                <ImagePlus size={15} /> {draft.coverImage ? '更换背景图' : '上传背景图'}
              </button>
              {draft.coverImage && (
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => update('coverImage', null)}>
                  <Trash2 size={15} /> 移除图片
                </button>
              )}
              <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={event => { void handleCover(event.target.files?.[0]); event.currentTarget.value = '' }} />
              {draft.coverImage && <img className="chat-background-thumb" src={draft.coverImage} alt="当前朋友圈背景预览" />}
            </div>
            <small className="form-helper">背景仅保存在当前浏览器，导出的朋友圈图片会保留。</small>
            {coverError && <small className="form-error" role="alert">{coverError}</small>}
          </div>
          {(!draft.albumMode||draft.albumMode==='feed')?<><label>朋友圈内容<textarea className="me-textarea moments-content-input" value={draft.content} rows={5} maxLength={500} onChange={event => update('content', event.target.value)} /></label>
          <div>
            <div className="moments-label-line"><span>图片</span><small>{draft.images.length}/9</small></div>
            <div className="moments-image-editor">
              {draft.images.map((image, index) => (
                <div className="moments-edit-image" key={`${image.slice(-24)}-${index}`}>
                  <img src={image} alt={`朋友圈图片 ${index + 1}`} />
                  <button type="button" aria-label={`删除第 ${index + 1} 张图片`} onClick={() => update('images', draft.images.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={13} /></button>
                </div>
              ))}
              {draft.images.length < 9 && <label className="moments-add-image"><ImagePlus size={20} /><span>添加图片</span><input type="file" accept="image/*" multiple onChange={event => { void handleImages(event.target.files) }} /></label>}
            </div>
          </div>
          <div className="moments-form-grid">
            <label>发布时间<input className="me-input" value={draft.timeLabel} maxLength={20} onChange={event => update('timeLabel', event.target.value)} /></label>
            <label>所在位置<input className="me-input" value={draft.location} maxLength={30} placeholder="可选" onChange={event => update('location', event.target.value)} /></label>
          </div>
          <div className="moments-inline-editor">
            <label>点赞用户<input className="me-input" value={likeInput} placeholder="多个昵称用逗号分隔" onChange={event => setLikeInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') addLikes() }} /></label>
            <button className="btn btn-outline" type="button" onClick={addLikes}><Plus size={14} /> 添加</button>
          </div>
          {draft.likes.length > 0 && <div className="moments-chip-list">{draft.likes.map(name => <button key={name} type="button" onClick={() => update('likes', draft.likes.filter(item => item !== name))}>{name} ×</button>)}</div>}
          <div className="moments-comment-editor">
            <label>评论人<input className="me-input" value={commentAuthor} onChange={event => setCommentAuthor(event.target.value)} /></label>
            <label>评论内容<input className="me-input" value={commentContent} onChange={event => setCommentContent(event.target.value)} /></label>
            <button className="btn btn-outline" type="button" onClick={addComment}><Plus size={14} /> 添加评论</button>
          </div>
          </>:<><label>个性签名<input className="me-input" value={draft.signature||''} onChange={e=>update('signature',e.target.value)}/></label><AlbumComposer entries={draft.entries||[]} onChange={v=>update('entries',v)} onToast={onToast}/></>}
          <div className="me-row"><label>外观<select className="me-select" value={draft.platform||'android'} onChange={e=>update('platform',e.target.value as 'android'|'ios')}><option value="android">Android 通用</option><option value="ios">iOS</option></select></label><label>时间<input className="me-input" value={draft.statusTime||'09:14'} onChange={e=>update('statusTime',e.target.value)}/></label><label>电量<input className="me-input" type="number" min={0} max={100} value={draft.battery??35} onChange={e=>update('battery',Math.max(0,Math.min(100,Number(e.target.value))))}/></label></div>
          <div className="project-actions"><button className="btn btn-outline btn-sm" onClick={()=>downloadBlob(new Blob([JSON.stringify(draft,null,2)],{type:'application/json'}),'微信朋友圈项目-v1.5.json')}>保存项目</button><button className="btn btn-outline btn-sm" onClick={()=>importRef.current?.click()}>导入项目</button><input hidden ref={importRef} type="file" accept=".json" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>50*1024*1024)throw Error('项目最大 50 MB');setDraft({...emptyMoment,...validateMoment(JSON.parse(await file.text()))});setSaved(false);onToast('朋友圈项目已导入')}catch(error){onToast((error as Error).message)}}}/></div>
          <button disabled={busy||!ready} className="btn btn-outline" onClick={()=>void exportImage(true)}>导出完整长图</button>
          <button disabled={busy||!ready} className="btn btn-primary moments-export-button" type="button" onClick={() => { void exportImage() }}><Download size={16} /> 导出朋友圈图片</button>
        </div>
      </section>

      <section className="moments-preview-column">
        <div className="moments-preview-label"><span>实时预览</span><small>内容修改后即时更新</small></div>
        <div ref={previewRef}>
          <WechatPhoneChrome className={draft.albumMode&&draft.albumMode!=='feed'?'album-phone':'moments-phone-real'} title={draft.albumMode&&draft.albumMode!=='feed'?'':'朋友圈'} rightAction={draft.albumMode==='self'?'messages':draft.albumMode==='friend'?'none':'camera'} settings={{platform:draft.platform||'android',time:draft.statusTime||'09:14',battery:draft.battery??35}}>
          {draft.albumMode&&draft.albumMode!=='feed'?<AlbumPreview draft={draft} onAdd={()=>update('entries',[newAlbumEntry(),...(draft.entries||[])])} onSelect={id=>document.getElementById('album-entry-'+id)?.scrollIntoView({block:'center',behavior:'smooth'})}/>:<><div
            className={`moments-cover${draft.coverImage ? ' has-custom-background' : ''}`}
            style={{
              backgroundColor: draft.coverColor || '#75877f',
              backgroundImage: draft.coverImage ? `url(${draft.coverImage})` : undefined,
            }}
          ><div className="moments-cover-shade" /><div className="moments-profile"><strong>{draft.author || '未命名用户'}</strong><div>{draft.avatar ? <img src={draft.avatar} alt="" /> : draft.author.slice(0, 1) || '我'}</div></div></div>
          <article className="moment-post">
            <div className="moment-avatar">{draft.avatar ? <img src={draft.avatar} alt="" /> : draft.author.slice(0, 1) || '我'}</div>
            <div className="moment-main">
              <strong className="moment-author">{draft.author || '未命名用户'}</strong>
              <p className="moment-copy"><WechatText text={draft.content || '分享此刻的想法…'}/></p>
              {draft.images.length > 0 && <div className={`moment-image-grid count-${Math.min(draft.images.length, 9)}`}>{draft.images.map((image, index) => <img src={image} alt="" key={`${image.slice(-24)}-${index}`} />)}</div>}
              {draft.location && <div className="moment-location"><MapPin size={12} /> {draft.location}</div>}
              <div className="moment-meta"><span>{draft.timeLabel || '刚刚'}</span><button type="button">••</button></div>
              {(draft.likes.length > 0 || draft.comments.length > 0) && <div className="moment-social">
                {draft.likes.length > 0 && <div className="moment-likes"><Heart size={13} fill="currentColor" /> {draft.likes.join('，')}</div>}
                {draft.comments.map(comment => <div className="moment-comment" key={comment.id}><strong>{comment.author}：</strong>{comment.content}</div>)}
              </div>}
              {draft.likes.length === 0 && draft.comments.length === 0 && <div className="moment-empty-actions"><Heart size={14} /><MessageCircle size={14} /></div>}
            </div>
          </article></>}
          </WechatPhoneChrome>
        </div>
      </section>
    </main>
  )
}
