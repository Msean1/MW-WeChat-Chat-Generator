import React from 'react'
import assert from 'node:assert/strict'
import {renderToStaticMarkup as render} from 'react-dom/server'
import {readFileSync} from 'node:fs'
import OfflineApp,{fresh} from '../src/OfflineApp'
import {validate} from '../src/lib/offline-project'
import {parseChatRecord,getDefaultAvatar} from '../src/lib/parser'
import {WechatSceneEditor} from '../src/components/WechatSceneEditor'
import {MomentsEditor} from '../src/components/MomentsEditor'
import {loadChatDraft,loadMomentProject,loadWechatScene,listProjects} from '../src/lib/project-store'
import {wechatEmojiNames} from '../src/lib/wechat-emoji'
import {WechatEmojiPicker} from '../src/components/WechatEmojiPicker'
import {MessageEditor} from '../src/components/MessageEditor'
import {SenderPicker} from '../src/components/SenderPicker'
import {WechatPhoneHeader} from '../src/components/WechatPhoneHeader'
import postcss from 'postcss'

const clean=validate(fresh())
assert.equal(clean.messages.length,0);assert.equal(clean.text,'')
assert.deepEqual(clean.users.map(u=>u.name),['我','对方'])
assert.ok(clean.users.every(u=>u.avatar===null));assert.equal(clean.settings.backgroundImage,null)
assert.equal(parseChatRecord('**我**：你好\n**对方**：收到').messages.length,2)
assert.ok(getDefaultAvatar(0).startsWith('data:image/png;base64,'));assert.equal(getDefaultAvatar(0),getDefaultAvatar(99))
assert.equal(wechatEmojiNames.length,108)

const reads:string[]=[],dbNames:string[]=[]
Object.assign(globalThis,{
  localStorage:{getItem:(key:string)=>{reads.push(key);return key.startsWith('wechat-colleague-clean-v1:')?null:'OLD_PRIVATE_DATA'},setItem:()=>{}},
  indexedDB:{open:(name:string)=>{dbNames.push(name);const request:{onerror?:()=>void;error:Error}={error:Error('Test stops before accessing browser data')};queueMicrotask(()=>request.onerror?.());return request}},
})
const chat=render(<OfflineApp/>)
assert.ok(chat.includes('MW微信聊天器V1.7'));assert.ok(!chat.includes('data-message-id='));assert.ok(!chat.includes('OLD_PRIVATE_DATA'))
assert.ok(chat.includes('aria-label="聊天顶部名称"'));assert.equal((chat.match(/聊天顶部名称/g)||[]).length,2)
assert.ok(chat.indexOf('添加消息')<chat.indexOf('聊天顶部名称'));assert.ok(!chat.includes('聊天标题'))
assert.ok(render(<WechatPhoneHeader settings={{...clean.settings,contactName:'联系人[微笑]'}}/>).includes('wc-inline-emoji'))
assert.ok(chat.includes('动图与逐帧间隔'));assert.ok(chat.includes('class="export-unit">毫秒</span>'))
assert.ok(!chat.includes('<small>毫秒</small>'))
assert.equal((chat.match(/class="export-actions"/g)||[]).length,1)
assert.ok(!chat.includes('可播放视频（WebM）'))
assert.ok(reads.length>0);assert.ok(reads.every(key=>key.startsWith('wechat-colleague-clean-v1:')))
await Promise.allSettled([loadChatDraft(),loadMomentProject(),loadWechatScene('group'),listProjects()])
assert.equal(dbNames.length,4);assert.ok(dbNames.every(name=>name==='wechat-colleague-clean-v1'))
for(const kind of ['payment','redpacket','profile','group'] as const){
  const html=render(<WechatSceneEditor kind={kind} onToast={()=>{}}/>)
  assert.ok(html.includes('导出当前画面'))
  if(kind==='group'){assert.ok(html.includes('聊天信息(0)'));assert.ok(!html.includes('class="group-member-edit"'))}
}
assert.ok(render(<MomentsEditor onToast={()=>{}}/>).includes('朋友圈'))
for(const file of ['src/OfflineApp.tsx','src/components/WechatSceneEditor.tsx','src/components/MomentsEditor.tsx','src/lib/parser.ts','src/components/ImportPanel.tsx']){
  const source=readFileSync(file,'utf8')
  assert.ok(!source.includes('加载示例'));assert.ok(!source.includes('EXAMPLE_TEXT'))
}
console.log('PASS: blank projects; isolated chat/moments/scenes/library storage; no legacy draft reads; 6 tool entries; 108 emoji; neutral avatar')

// Keep storage isolation from accidentally renaming a styled DOM class again.
const emoji=render(<WechatEmojiPicker onSelect={()=>{}}/>)
const recent=emoji.match(/<div class="([^"]+)" aria-label="最近使用的表情">(.*?)<\/div>/)!
assert.ok(recent);assert.equal(recent[1], 'wechat-emoji-'+'recent')
assert.equal((recent[2].match(/<button /g)||[]).length,10)
const styles=postcss.parse(['src/index.css','src/offline.css','src/repairs.css'].map(file=>readFileSync(file,'utf8')).join('\n'))
function declaration(selector:string,property:string){
  let value:string|undefined
  styles.walkRules(rule=>{if(rule.parent?.type==='root'&&rule.selector.split(',').map(s=>s.trim()).includes(selector))rule.walkDecls(property,decl=>{value=decl.value})})
  return value
}
assert.equal(declaration('.'+recent[1],'display'),'grid')
assert.match(declaration('.'+recent[1],'grid-template-columns')!,/repeat\(10,/)
assert.equal(declaration('.me-type-tabs','flex-wrap'),'nowrap')
assert.equal(declaration('.me-type-tabs','overflow-x'),'auto')
assert.equal(declaration('.me-type-tab','white-space'),'nowrap')
assert.equal(declaration('.app-main','max-width'),'1720px')
assert.match(declaration('.export-settings','grid-template-columns')!,/repeat\(3,/)
assert.match(declaration('.export-actions','grid-template-columns')!,/repeat\(3,/)
assert.equal(declaration('.export-control>.export-unit','position'),'absolute')
assert.equal(declaration('.export-control>.export-unit','right'),'14px')
assert.equal(declaration('.export-control>.export-unit','text-align'),'right')

// Avatar selection must pass the chosen user's ID, including with many users.
const users=Array.from({length:30},(_,i)=>({id:i+1,name:'参与者'+(i+1),avatar:null}))
let selectedId=1
const picker:any=SenderPicker({users,selfId:1,selectedId,onSelect:id=>{selectedId=id}})
const choices=picker.props.children[1].props.children
assert.equal(choices.length,30)
choices[29].props.onClick();assert.equal(selectedId,30)
const selectedHtml=render(<SenderPicker users={users} selfId={1} selectedId={selectedId} onSelect={()=>{}}/>)
assert.equal((selectedHtml.match(/aria-pressed="true"/g)||[]).length,1)
assert.match(selectedHtml,/aria-label="选择参与者30发言" aria-pressed="true"/)
for(const type of ['text','image','emoji','redpacket','transfer','voice','call','card','pat','recall','system','time'] as const){
  const html=render(<MessageEditor users={users} selfId={1} initialType={type} onAddMessage={()=>{}}/>)
  assert.equal((html.match(/class="me-type-tab /g)||[]).length,12)
  assert.equal(html.includes('class="me-sender-picker"'),!['pat','recall','system','time'].includes(type))
  assert.ok(!html.includes('选择发送人'))
  if(type==='text'||type==='emoji')assert.ok(html.includes('class="'+recent[1]+'"'))
}
// Missing/removed senders fall back to an existing participant.
const fallback=render(<MessageEditor users={users.slice(1)} selfId={1} onAddMessage={()=>{}}/>)
assert.match(fallback,/aria-label="选择参与者2发言" aria-pressed="true"/)
console.log('PASS: recent emoji DOM class matches grid CSS; one-line message types; 30 avatar choices and selected-ID callback; 12 editor types; sender fallback')
