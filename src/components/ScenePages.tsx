import { ArrowLeftRight, BadgeCheck, Check, ChevronDown, ChevronRight, ChevronUp, MessageCircle, Phone, Plus, QrCode, Smile, Star, Video } from 'lucide-react'
import type { GroupMember, WechatSceneKind } from '../lib/project-store'
import { money, visibleGroupMembers } from '../lib/receipt'
import { WechatText } from './WechatText'

export const readPictures = (value?: string): string[] => { try { const v=JSON.parse(value||'[]');return Array.isArray(v)?v.filter(i=>typeof i==='string'):[] } catch { return [] } }

export function ScenePages({kind,fields:f,members=[],expanded=false,onExpanded,onAddMember,onMode,onChat,onField,onReply}: {
  kind:WechatSceneKind; fields:Record<string,string>; members?:GroupMember[]; expanded?:boolean; onExpanded?:(v:boolean)=>void;
  onAddMember?:()=>void; onMode?:(mode:string)=>void; onChat?:()=>void; onField?:(key:string,value:string)=>void; onReply?:()=>void;
}) {
  const avatar=(name:string,round=false)=><span className={'scene-person-avatar'+(round?' round':'')}>{f.avatar?<img src={f.avatar} alt=""/>:name?.slice(0,1)}</span>
  const row=(label:string,value='',key?:string)=><div className="scene-menu-row"><b>{label}</b><span>{value}</span>{key?<button type="button" aria-label={label} aria-pressed={f[key]==='true'} className={'scene-toggle'+(f[key]==='true'?' on':'')} onClick={()=>onField?.(key,String(f[key]!=='true'))}/>:<ChevronRight size={19}/>}</div>
  if(kind==='payment') {
    if(f.mode==='bill')return <div className="transfer-bill-page">
      <div className="bill-hero">{avatar(f.account,true)}<p>转账-{f.direction==='out'?'转给':'来自'}{f.account}</p><strong>{f.direction==='out'?'-':'+'}{money(f.amount)}</strong></div>
      <dl className="bill-fields">{[['当前状态',f.status||'已存入零钱'],['转账说明',f.note],['转账时间',f.time],['收款时间',f.receivedTime],['转账单号',f.orderNo]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <div className="bill-services"><p>账单服务</p><div><button onClick={onChat}><MessageCircle/>定位到聊天位置</button><span><Star/>申请转账电子凭证</span><span><ArrowLeftRight/>查看往来转账</span></div></div>
      <footer>本服务由财付通提供</footer>
    </div>
    return <div className="transfer-result-page"><div className="transfer-success"><Check/></div><p>{f.payee}已收款</p><strong>¥{money(f.amount)}</strong><dl><div><dt>转账时间</dt><dd>{f.time}</dd></div><div><dt>收款时间</dt><dd>{f.receivedTime}</dd></div></dl><button onClick={()=>onMode?.('bill')}>账单详情</button></div>
  }
  if(kind==='redpacket')return <div className="claimed-packet-page"><div className="packet-arc"/><div className="packet-result"><div className="packet-author">{avatar(f.sender)}<b>{f.sender}的红包</b></div><p className="packet-greeting"><WechatText text={f.greeting}/></p><strong className="packet-amount">{money(f.amount)}<small>元</small></strong><p className="packet-deposit">{f.status||'已存入零钱，可直接提现'}<ChevronRight size={17}/></p><button className="packet-reply" onClick={onReply}><Smile/>回复表情到聊天</button></div>{f.mode==='records'&&<div className="packet-records"><p>1个红包共{money(f.amount)}元，已被领取</p><div><span>{f.recipient||'我'}</span><b>{money(f.amount)}元</b></div></div>}</div>
  if(kind==='profile') {
    if(f.mode==='own')return <div className="own-profile-page"><section><div className="scene-menu-row"><b>头像</b>{avatar(f.nickname)}<ChevronRight size={19}/></div>{row('名字',f.nickname)}{row('拍一拍','设置拍一拍')}{row('微信号',f.wechatId)}{row('我的二维码')}{row('更多')}</section><section>{row('来电铃声')}{row('个性签名',f.signature)}{row('地区',f.region)}</section></div>
    return <div className="friend-profile-page"><div className="friend-profile-hero">{avatar(f.nickname)}<div><h3>{f.remarkName||f.nickname}{f.gender!=='none'&&<span className={'profile-gender '+(f.gender==='female'?'female':'')}>{f.gender==='female'?'♀':'♂'}</span>}</h3><p>昵称：{f.nickname}</p><p>微信号：{f.wechatId}</p><p>地区：{f.region}</p></div></div><section><div className="scene-menu-row"><b>朋友资料</b><span/><ChevronRight size={19}/></div>{f.tags&&<div className="friend-tags"><span>标签</span><p>{f.tags}</p></div>}</section>{f.channelName&&<section className="friend-channel"><b>视频号</b><div><p>{f.channelName} <span>{f.channelDescription}</span>{f.channelVerified==='true'&&<BadgeCheck size={15} fill="#aaa" color="white"/>}</p><div className="channel-pictures">{readPictures(f.channelImages).map((src,i)=><span key={i}><img src={src} alt=""/><Video size={12}/></span>)}</div></div><ChevronRight size={19}/></section>}<section className="friend-profile-actions"><button onClick={onChat}><MessageCircle/>发消息</button><div><Phone/>音视频通话</div></section></div>
  }
  return <div className={'group-preview group-v13'+(expanded?' expanded':'')}>
    <div className="group-member-area">
      <div className="group-members">{visibleGroupMembers(members,expanded).map(member=><div key={member.id}><span>{member.avatar?<img src={member.avatar} alt=""/>:member.name.slice(0,1)}</span><small>{member.name}</small>{member.tag&&<em>{member.tag}</em>}</div>)}<div><button type="button" className="group-add-preview" title="添加群成员" onClick={onAddMember}><Plus size={34}/></button></div></div>
      {expanded
        ? <button type="button" className="group-collapse-button" onClick={()=>onExpanded?.(false)}>收起<ChevronUp size={18}/></button>
        : (members.length>19||Number(f.count)>19)&&<button type="button" className="group-expand-button" onClick={()=>onExpanded?.(true)}>更多群成员<ChevronDown size={18}/></button>}
    </div>
    <><section className="group-menu-section"><div className="scene-menu-row group-name-row"><b>群聊名称</b><span>{f.name}</span><ChevronRight size={19}/></div><div className="scene-menu-row"><b>群二维码</b><span><QrCode size={22}/></span><ChevronRight size={19}/></div>{f.announcement?<div className="group-announcement"><b>群公告</b><div><span>{f.announcement}</span><ChevronRight size={19}/></div></div>:row('群公告')}{row('备注',f.remark)}</section><section className="group-menu-section">{row('查找聊天记录')}</section><section className="group-menu-section">{row('消息免打扰','','dnd')}{row('置顶聊天','','pinned')}{row('保存到通讯录','','contacts')}</section><section className="group-menu-section">{row('我在群里的昵称',f.myNickname)}{row('显示群成员昵称','','showNames')}</section><section className="group-menu-section">{row('设置当前聊天背景')}{row('清空聊天记录')}{row('投诉')}</section><div className="group-exit">退出群聊</div></>
  </div>
}
