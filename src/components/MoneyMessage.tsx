import type { ChatMessage } from '../types'
import { asset } from '../lib/offline-assets'
import { money } from '../lib/receipt'
import { WechatText } from './WechatText'

export function MoneyMessage({msg,onOpen}:{msg:ChatMessage;onOpen?:()=>void}) {
  const packet=msg.type==='redpacket',received=msg.params.received||msg.type==='receipt'
  return <div className={`wc-bubble wc-bubble-${packet?'redpacket':'transfer'} wc-openable${received?' wc-money-received':''}`} onClick={onOpen}>
    <span className="wc-arrow" style={{background:received?'#f8d1a3':'#f79c46'}}/>
    <div className="wc-rp-content"><div className={`wc-rp-icon${packet?' wc-rp-icon-redpacket':''}`}>
      {packet?(received?<svg viewBox="0 0 102 120" aria-label="已打开的红包"><path d="M9 20Q51 8 93 20V115Q93 120 88 120H14Q9 120 9 115Z" fill="#ff9484"/><circle cx="51" cy="65" r="15" fill="#f6cd8a"/><text x="51" y="73" textAnchor="middle" fontSize="23" fill="#dca969">¥</text><path d="M9 20V8Q51-8 93 8V20Q51 35 9 20Z" fill="#fff1d9"/></svg>:<img src={asset('wechat-trans-icon3.png')} alt=""/>):received?<svg viewBox="0 0 120 120" fill="none" stroke="white" strokeWidth="6"><circle cx="60" cy="60" r="54"/><path d="m32 62 18 18 39-40"/></svg>:<img src={asset('wechat-trans-icon1.png')} alt=""/>}
    </div><div className="wc-rp-info"><span>{packet?<WechatText text={msg.params.remark||'恭喜发财，大吉大利'}/>:('¥'+money(msg.params.amount))}</span>{(received||!packet)&&<small>{received?(packet?'已领取':msg.type==='receipt'?'已收款':'已被接收'):(msg.params.remark||'转账')}</small>}</div></div>
    <div className="wc-rp-bottom"><span>{packet?'微信红包':'转账'}</span></div>
  </div>
}
