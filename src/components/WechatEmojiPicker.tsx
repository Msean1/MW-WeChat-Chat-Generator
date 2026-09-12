import {useState} from 'react'
import {defaultRecentEmoji,wechatEmojiNames,wechatEmojiSource} from '../lib/wechat-emoji'

export function WechatEmojiPicker({onSelect,selected}:{onSelect:(name:string)=>void;selected?:string}) {
  const [recent,setRecent]=useState<string[]>(()=>{try{const data=JSON.parse(localStorage.getItem('wechat-colleague-clean-v1:emoji-recent')||'null');return Array.isArray(data)&&data.length?data.filter(name=>typeof name==='string'&&wechatEmojiSource(name)).slice(0,10):defaultRecentEmoji}catch{return defaultRecentEmoji}})
  const choose=(name:string)=>{
    const next=[name,...recent.filter(item=>item!==name)].slice(0,10);setRecent(next)
    try{localStorage.setItem('wechat-colleague-clean-v1:emoji-recent',JSON.stringify(next))}catch{}
    onSelect(name)
  }
  const icon=(name:string,group:string)=><button type="button" key={group+name} title={name} aria-label={name} aria-pressed={selected==='['+name+']'} onMouseDown={event=>event.preventDefault()} onClick={()=>choose(name)}><img src={wechatEmojiSource(name)} alt={name} draggable={false}/></button>
  return <div className="wechat-emoji-picker"><div className="wechat-emoji-recent" aria-label="最近使用的表情">{recent.map(name=>icon(name,'recent-'))}</div><div className="wechat-emoji-label">所有表情 <small>{wechatEmojiNames.length}</small></div><div className="wechat-emoji-all" aria-label="所有微信表情">{wechatEmojiNames.map(name=>icon(name,'all-'))}</div></div>
}
