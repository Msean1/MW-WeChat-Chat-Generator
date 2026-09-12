import { ScenePages, readPictures } from './ScenePages'
import { useEffect, useRef, useState } from 'react'
import {captureScene,canvasBlob,downloadBlob} from '@/lib/export-media'
import {groupMembers,reorderMember} from '@/lib/group-project'
import {localImage} from '@/lib/offline-project'
import { Camera, Download, MessageSquareText, Plus, UserRound, Trash2, ArrowUp, ArrowDown, Save, FolderOpen } from 'lucide-react'
import { loadWechatScene, saveWechatScene, type WechatSceneKind, type WechatSceneProject, type GroupMember } from '@/lib/project-store'
import { WechatPhoneChrome } from '@/components/WechatPhoneChrome'

interface FieldDefinition {
  key: string
  label: string
  placeholder?: string
  multiline?: boolean
  image?: boolean
}

const sceneDefinitions: Record<WechatSceneKind, {
  title: string
  description: string
  fields: FieldDefinition[]
  defaults: Record<string, string>
}> = {
  payment: {
    title: '支付与转账页面',
    description: '制作转账结果、收款完成等创作素材。',
    fields: [
      { key: 'avatar', label: '账单对方头像', image: true },
      { key: 'payee', label: '收款方' },
      { key: 'amount', label: '金额' },
      { key: 'account', label: '对方账户' },
      { key: 'time', label: '转账时间' },
      { key: 'orderNo', label: '转账单号' },
      { key: 'note', label: '转账说明' },
      { key: 'receivedTime', label: '收款时间' },
      { key: 'status', label: '账单状态' },
    ],
    defaults: {mode:'result',direction:'in',receivedTime:'',status:'已存入零钱',avatar:'',payee:'收款人',amount:'0.00',account:'对方',time:'',orderNo:'',note:''},
  },
  redpacket: {
    title: '红包详情页面',
    description: '制作红包封面和领取结果画面。',
    fields: [
      { key: 'avatar', label: '发送人头像', image: true },
      { key: 'sender', label: '发送人' },
      { key: 'greeting', label: '红包祝福' },
      { key: 'amount', label: '领取金额' },
      { key: 'status', label: '领取状态' },
    ],
    defaults: {mode:'claimed',avatar:'',sender:'发送人',greeting:'恭喜发财，大吉大利',amount:'0.00',status:'已存入零钱，可直接提现'},
  },
  profile: {
    title: '个人资料页面',
    description: '制作个人名片和资料页创作素材。',
    fields: [
      { key: 'avatar', label: '头像', image: true },
      { key: 'nickname', label: '昵称' },
      { key: 'wechatId', label: '微信号' },
      { key: 'region', label: '地区' },
      { key: 'signature', label: '个性签名', multiline: true },
      { key:'remarkName',label:'备注名（大标题）' }, { key:'tags',label:'标签' }, { key:'channelName',label:'视频号名称' }, { key:'channelDescription',label:'视频号简介' },
    ],
    defaults: {mode:'friend',gender:'none',channelVerified:'false',channelImages:'[]',avatar:'',nickname:'联系人',wechatId:'',region:'',signature:'',remarkName:'',tags:'',channelName:'',channelDescription:''},
  },
  group: {
    title: '群信息页面',
    description: '制作群聊资料、公告和成员列表。',
    fields: [
      { key: 'name', label: '群聊名称' },
      { key: 'count', label: '群成员人数' },
      { key: 'remark', label: '备注' }, { key: 'myNickname', label: '我在群里的昵称' },
      { key: 'announcement', label: '群公告', multiline: true },
    ],
    defaults: {myNickname:'我',showNames:'true',name:'群聊',platform:'android',statusTime:'09:41',battery:'60',count:'0',members:'',announcement:'',remark:''},
  },
}

interface WechatSceneEditorProps {
  kind: WechatSceneKind
  initialFields?: Record<string,string>
  onChat?: () => void
  onReply?: () => void
  onFieldsChange?: (fields:Record<string,string>) => void
  onToast: (message: string) => void
  onBeforeExport?: () => Promise<boolean>
  onExportSuccess?: () => void
}

export function WechatSceneEditor({ kind, onToast, onBeforeExport, onExportSuccess, initialFields, onChat, onReply, onFieldsChange }: WechatSceneEditorProps) {
  const definition = sceneDefinitions[kind]
  const [project, setProject] = useState<WechatSceneProject>({ id: kind, fields: {...definition.defaults,...initialFields}, updatedAt: new Date(0).toISOString(), version: 1 })
  const [busy, setBusy] = useState(false)
  const [expanded,setExpanded] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)
  const [ready, setReady] = useState(false)
  const [saved, setSaved] = useState(false)
  const previewRef = useRef<HTMLDivElement | null>(null)
  useEffect(()=>{const content=previewRef.current?.querySelector('.wechat-chrome-content');if(content)content.scrollTop=0},[expanded,project.fields.mode])
  const fieldsCallback=useRef(onFieldsChange);fieldsCallback.current=onFieldsChange
  useEffect(()=>{if(ready)fieldsCallback.current?.(project.fields)},[ready,project.fields])
  const latestDraft = useRef({project,ready})
  latestDraft.current = {project,ready}
  useEffect(()=>()=>{if(latestDraft.current.ready)void saveWechatScene({...latestDraft.current.project,updatedAt:new Date().toISOString()}).catch(()=>onToast('本机草稿保存失败'))},[])

  useEffect(() => {
    let cancelled = false
    setReady(false)
    void loadWechatScene(kind).then(stored => {
      if(cancelled)return
      setProject(stored ? { ...stored, fields: { ...definition.defaults, ...stored.fields, ...initialFields } } : { id: kind, fields: {...definition.defaults,...initialFields}, updatedAt: new Date(0).toISOString(), version: 1 })
      setSaved(Boolean(stored))
    }).catch(() => onToast('本机草稿读取失败，仍可编辑并保存为项目文件')).finally(() => { if(!cancelled)setReady(true) })
    return () => { cancelled = true }
  }, [definition.defaults, kind])

  useEffect(() => {
    if (!ready) return
    const timer = window.setTimeout(() => {
      void saveWechatScene({ ...project, updatedAt: new Date().toISOString() })
        .then(() => setSaved(true))
        .catch(() => onToast('本地草稿保存失败'))
    }, 700)
    return () => window.clearTimeout(timer)
  }, [onToast, project, ready])

  const updateField = (key: string, value: string) => {
    setSaved(false)
    setProject(current => ({ ...current, fields: { ...current.fields, [key]: value } }))
  }

  const updateImage = (key: string, file?: File) => {
    if (!file) return
    if(file.size>20*1024*1024)return onToast('单张图片最大 20 MB')
    const reader = new FileReader()
    reader.onload = () => { const data=String(reader.result); if(!localImage(data))return onToast('请使用 PNG、JPG、WebP 或 GIF');updateField(key,data) }
    reader.onerror = () => onToast('头像读取失败')
    reader.readAsDataURL(file)
  }

  const members = groupMembers(project.fields, project.members)
  const updateMembers = (value: GroupMember[]) => {
    setSaved(false)
    setProject(current => ({...current,members:value,fields:{...current.fields,members:value.map(m=>m.name).join(','),count:String(Math.max(Number(current.fields.count)||0,value.length))}}))
  }
  const addMember = () => updateMembers([...members,{id:crypto.randomUUID(),name:'新成员',avatar:'',tag:''}])
  const updateMember = (id:string,value:Partial<GroupMember>) => updateMembers(members.map(member=>member.id===id?{...member,...value}:member))
  const uploadMember = (id:string,file?:File) => {
    if(!file)return
    if(file.size>20*1024*1024)return onToast('单张头像最大 20 MB')
    const reader=new FileReader()
    reader.onload=()=>{const data=String(reader.result);if(!localImage(data))return onToast('请使用 PNG、JPG、WebP 或 GIF');updateMember(id,{avatar:data})}
    reader.onerror=()=>onToast('头像读取失败')
    reader.readAsDataURL(file)
  }
  const exportImage = async (long=false) => {
    if (!previewRef.current || busy) return
    if(['payment','redpacket'].includes(kind)&&(!Number.isFinite(Number(project.fields.amount))||Number(project.fields.amount)<0))return onToast('请填写有效金额');
    setBusy(true);onToast('正在生成图片…')
    try {
      if (onBeforeExport && !(await onBeforeExport())) return
      const canvas = await captureScene(previewRef.current,3,long)
      downloadBlob(await canvasBlob(canvas), `微信${definition.title}-v1.5-${long?"完整":"当前"}-${Date.now()}.png`)
      onToast(`图片已下载（${canvas.width} × ${canvas.height}）`)
      onExportSuccess?.()
    } catch(error) { onToast('图片生成失败：'+(error as Error).message) }
    finally { setBusy(false) }
  }

  return (
    <main className="scene-workbench" id="scene-editor">
      <section className="scene-controls s-card">
        <div className="s-card-header scene-card-heading"><h2><MessageSquareText size={18} /> {definition.title}</h2><span className="s-card-badge">{saved ? '已自动保存' : '本地草稿'}</span></div>
        <div className="s-card-body scene-form">
          <p>{definition.description}所有字段和头像保存在本机，可保存项目文件备份。</p>
          {kind!=='group'&&<div className="scene-mode-tabs">{(kind==='payment'?[['result','收款结果'],['bill','账单详情']]:kind==='profile'?[['friend','好友资料'],['own','我的资料']]:[['claimed','领取结果'],['records','领取记录']]).map(([value,label])=><button type="button" className={(project.fields.mode||definition.defaults.mode)===value?'active':''} key={value} onClick={()=>updateField('mode',value)}>{label}</button>)}</div>}
          {kind==='payment'&&<label>账单收支方向<select className="me-select" value={project.fields.direction||'in'} onChange={e=>updateField('direction',e.target.value)}><option value="in">收入（来自对方）</option><option value="out">支出（转给对方）</option></select></label>}
          {definition.fields.filter(field=>kind!=='profile'||project.fields.mode!=='own'||!['remarkName','tags','channelName','channelDescription'].includes(field.key)).map(field => field.image ? (
            <label className="scene-avatar-field" key={field.key}>{field.label}<span className="scene-avatar-control">
              <span className="scene-avatar-thumb">{project.fields[field.key] ? <img src={project.fields[field.key]} alt="" /> : <UserRound size={25} />}</span>
              <span className="btn btn-outline"><Camera size={14} /> 上传头像</span>
              <input type="file" accept="image/*" onChange={event => updateImage(field.key, event.target.files?.[0])} />
            </span></label>
          ) : <label key={field.key}>{field.label}{field.multiline
            ? <textarea className="me-textarea" rows={4} value={project.fields[field.key] ?? ''} placeholder={field.placeholder} onChange={event => updateField(field.key, event.target.value)} />
            : <input className="me-input" value={project.fields[field.key] ?? ''} placeholder={field.placeholder} onChange={event => updateField(field.key, event.target.value)} />}</label>)}
          {kind==='profile'&&project.fields.mode!=='own'&&<><label>性别<select className="me-select" value={project.fields.gender||'male'} onChange={e=>updateField('gender',e.target.value)}><option value="male">男</option><option value="female">女</option><option value="none">不显示</option></select></label><label className="me-check"><input type="checkbox" checked={project.fields.channelVerified==='true'} onChange={e=>updateField('channelVerified',String(e.target.checked))}/>视频号认证标记</label><label>视频号缩略图（最多 4 张）<input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={async e=>{const files=Array.from(e.target.files||[]);e.target.value='';try{const pics=await Promise.all(files.slice(0,4).map(file=>new Promise<string>((resolve,reject)=>{if(file.size>20*1024*1024)return reject(Error('单张图片最大 20 MB'));const r=new FileReader();r.onload=()=>{const data=String(r.result);localImage(data)?resolve(data):reject(Error('图片格式不支持'))};r.onerror=()=>reject(Error('图片读取失败'));r.readAsDataURL(file)})));updateField('channelImages',JSON.stringify(pics))}catch(error){onToast((error as Error).message)}}}/></label><div className="channel-image-editor">{readPictures(project.fields.channelImages).map((src,i)=><button key={i} title="删除图片" onClick={()=>updateField('channelImages',JSON.stringify(readPictures(project.fields.channelImages).filter((_,j)=>i!==j)))}><img src={src} alt=""/>×</button>)}</div></>}
          {kind==='group'&&<>
            <div className="group-editor-heading"><strong>群成员头像与昵称（{members.length}）</strong><button type="button" className="btn btn-outline btn-sm" onClick={addMember}><Plus size={14}/>添加成员</button></div>
            <div className="group-member-editor">{members.map((member,index)=><div className="group-member-edit" key={member.id}>
              <label className="group-avatar-upload" title="更换头像">{member.avatar?<img src={member.avatar} alt={member.name}/>:<Camera size={22}/>}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>{uploadMember(member.id,e.target.files?.[0]);e.target.value=''}}/><small>上传头像</small></label>
              <div className="group-member-fields"><input className="me-input" aria-label={'成员 '+(index+1)+' 昵称'} value={member.name} placeholder="昵称" maxLength={60} onChange={e=>updateMember(member.id,{name:e.target.value})}/><input className="me-input" aria-label={'成员 '+(index+1)+' 标签'} value={member.tag} placeholder="@标签（可选）" maxLength={60} onChange={e=>updateMember(member.id,{tag:e.target.value})}/></div>
              <div className="group-member-actions"><button className="btn btn-ghost btn-sm" disabled={!index} title="上移" onClick={()=>updateMembers(reorderMember(members,index,-1))}><ArrowUp size={14}/></button><button className="btn btn-ghost btn-sm" disabled={index===members.length-1} title="下移" onClick={()=>updateMembers(reorderMember(members,index,1))}><ArrowDown size={14}/></button><button className="btn btn-ghost btn-sm" title="删除成员" onClick={()=>{updateMembers(members.filter(m=>m.id!==member.id));updateField('count',String(Math.max(0,Number(project.fields.count)-1)))}}><Trash2 size={14}/></button></div>
            </div>)}</div>
            <div className="group-switch-controls">{[['dnd','消息免打扰'],['pinned','置顶聊天'],['contacts','保存到通讯录'],['showNames','显示群成员昵称']].map(([key,label])=><label className="me-check" key={key}><input type="checkbox" checked={project.fields[key]==='true'} onChange={e=>updateField(key,String(e.target.checked))}/>{label}</label>)}</div>
          </>}
            <div className="me-row"><label className="export-field">外观<select className="me-select" value={project.fields.platform||'android'} onChange={e=>updateField('platform',e.target.value)}><option value="android">Android 通用</option><option value="ios">iOS</option></select></label><label className="export-field">状态栏时间<input className="me-input" value={project.fields.statusTime||'09:10'} onChange={e=>updateField('statusTime',e.target.value)}/></label><label className="export-field">电量<input className="me-input" type="number" min={0} max={100} value={project.fields.battery??'35'} onChange={e=>updateField('battery',e.target.value)}/></label></div>
          {kind==='group'&&<button className="btn btn-outline" onClick={()=>setExpanded(v=>!v)}>{expanded?'收起群成员':'展开群成员'}</button>}
          <div className="project-actions"><button className="btn btn-outline btn-sm" onClick={()=>downloadBlob(new Blob([JSON.stringify({...project,members:kind==='group'?members:undefined},null,2)],{type:'application/json'}),'微信'+definition.title+'项目-v1.5.json')}><Save size={14}/>保存项目</button><button className="btn btn-outline btn-sm" onClick={()=>importRef.current?.click()}><FolderOpen size={14}/>导入项目</button></div>
          <input ref={importRef} type="file" accept=".json" hidden onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>50*1024*1024)throw Error('项目最大 50 MB');const value=JSON.parse(await file.text()) as WechatSceneProject;if(value.id!==kind||value.version!==1||!value.fields)throw Error('项目类型不匹配');if(Object.values(value.fields).some(v=>typeof v!=='string'))throw Error('字段格式错误');if(value.fields.avatar&&!localImage(value.fields.avatar))throw Error('头像无效');if(value.fields.channelImages&&readPictures(value.fields.channelImages).some(v=>!localImage(v)))throw Error('缩略图无效');if(value.members&&(!Array.isArray(value.members)||value.members.some(m=>typeof m.id!=='string'||typeof m.name!=='string'||typeof m.tag!=='string'||!localImage(m.avatar))))throw Error('成员格式错误');setProject({...value,fields:{...definition.defaults,...value.fields}});setSaved(false);onToast('项目已导入')}catch(error){onToast((error as Error).message)}}}/>
          <button disabled={busy||!ready} className="btn btn-primary" type="button" onClick={() => { void exportImage() }}><Download size={16} /> 导出当前画面</button>{kind==='group'&&<button disabled={busy||!ready} className="btn btn-outline" onClick={()=>void exportImage(true)}>导出完整群信息</button>}
        </div>
      </section>
      <section className="scene-preview-column">
        <div className="moments-preview-label"><span>实时预览</span><small>内容修改后即时更新</small></div>
        <div ref={previewRef}>
          <WechatPhoneChrome settings={{platform:project.fields.platform==='ios'?'ios':'android',time:project.fields.statusTime||'09:10',battery:Math.max(0,Math.min(100,Number(project.fields.battery??35)||0))}} rightAction={kind==='group'?'search':kind==='payment'&&project.fields.mode==='bill'?'bills':'dots'} className={`scene-${kind} scene-v13 ${kind==='payment'&&project.fields.mode==='bill'?'is-bill':''}`} title={kind==='group'?`聊天信息(${project.fields.count||'0'})`:kind==='profile'&&project.fields.mode==='own'?'个人信息':''}
            onBack={()=>{if(kind==='payment'&&project.fields.mode==='bill')updateField('mode','result');else if(expanded)setExpanded(false);else onChat?.()}}
            >
          <ScenePages kind={kind} fields={project.fields} members={members} expanded={expanded} onExpanded={setExpanded} onAddMember={addMember} onMode={mode=>updateField('mode',mode)} onChat={onChat} onField={updateField} onReply={onReply}/>
          </WechatPhoneChrome>
        </div>
      </section>
    </main>
  )
}

export function ScenePreview(props: {kind:WechatSceneKind;fields:Record<string,string>;members?:GroupMember[];onAddMember?:()=>void}) { return <ScenePages {...props}/> }
