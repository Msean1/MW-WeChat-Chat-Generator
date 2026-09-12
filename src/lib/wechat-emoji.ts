import emojiData from '../vendor/wechat-emoji'
const aliases: Record<string,string> = {旺柴:'旺财'}
export const wechatEmojiNames = Object.keys(emojiData).map(name=>name==='旺财'?'旺柴':name)
export const defaultRecentEmoji = ['捂脸','愉快','强','胜利','微笑','流泪','玫瑰','呲牙','旺柴','合十'].filter(name => wechatEmojiSource(name))
export function wechatEmojiSource(nameOrToken: string) {
  const tokenName = nameOrToken.startsWith('[') && nameOrToken.endsWith(']') ? nameOrToken.slice(1,-1) : nameOrToken
  const name = Object.hasOwn(aliases,tokenName) ? aliases[tokenName] : tokenName
  return Object.hasOwn(emojiData,name) ? 'data:image/png;base64,'+emojiData[name] : undefined
}
export type WechatTextPart = {type:'text';value:string} | {type:'emoji';value:string;source:string}
export function parseWechatText(text:string):WechatTextPart[] {
  const parts:WechatTextPart[]=[];let cursor=0
  for(const match of text.matchAll(/\[([^\[\]\r\n]+)\]/g)){
    const source=wechatEmojiSource(match[1]);if(!source)continue
    if(match.index!>cursor)parts.push({type:'text',value:text.slice(cursor,match.index)})
    parts.push({type:'emoji',value:match[1],source});cursor=match.index!+match[0].length
  }
  if(cursor<text.length)parts.push({type:'text',value:text.slice(cursor)})
  return parts
}
export function insertWechatEmoji(text:string,name:string,start=text.length,end=start){
  const token='['+name+']';const left=Math.max(0,Math.min(text.length,start)),right=Math.max(left,Math.min(text.length,end))
  return {text:text.slice(0,left)+token+text.slice(right),caret:left+token.length}
}
