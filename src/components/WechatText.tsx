import {parseWechatText} from '../lib/wechat-emoji'
export function WechatText({text}:{text:string}) {
  return <span className="wc-wechat-text">{parseWechatText(text).map((part,index)=>part.type==='emoji'?<img className="wc-inline-emoji" key={index} src={part.source} alt={'['+part.value+']'} draggable={false}/>:<span key={index}>{part.value}</span>)}</span>
}
