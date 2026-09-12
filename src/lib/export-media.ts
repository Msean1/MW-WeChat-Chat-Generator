import { toCanvas } from 'html-to-image'

export function downloadBlob(blob: Blob, name: string) {
  if (!blob.size) throw Error('生成的文件为空，请重试')
  const link = document.createElement('a'), url = URL.createObjectURL(blob)
  link.href = url; link.download = name
  document.body.append(link); link.click(); link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)
}
export function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error('图片生成失败，画布可能超出浏览器限制')), 'image/png'))
}
export function exportGeometry(input: { width: number; height: number; contentHeight: number; top: number; bottom: number; scale: number; long?: boolean; scroll?: number }) {
  const height = input.long ? Math.max(input.height, Math.ceil(input.top + input.contentHeight + input.bottom)) : input.height
  const width = Math.round(input.width * input.scale), outputHeight = Math.round(height * input.scale)
  if (outputHeight > 30000 || width * outputHeight > 48000000) throw Error('长图尺寸过大，请降低清晰度或分段导出')
  return { height, width, outputHeight, scroll: input.long ? 0 : Math.max(0, Math.min(input.scroll || 0, input.contentHeight - (height - input.top - input.bottom))) }
}
async function prepare(clone: HTMLElement) {
  clone.querySelectorAll('.wc-context-menu,input,[data-export-ignore]').forEach(el => el.remove())
  clone.querySelectorAll('.wc-message-selected').forEach(el => el.classList.remove('wc-message-selected'))
  await document.fonts.ready
  await Promise.all(Array.from(clone.querySelectorAll('img')).map(async img => {
    if (!img.getAttribute('src')) return
    try { await img.decode() } catch { throw Error('有图片无法读取，请重新上传对应图片后导出') }
  }))
  await new Promise(resolve => setTimeout(resolve, 30))
}
function mount(source: HTMLElement, width: number) {
  const clone = source.cloneNode(true) as HTMLElement, host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-20000px;top:0;pointer-events:none;z-index:-1'
  // Keep scene-specific selectors when capturing the screen without its frame.
  host.className = source.closest('.wechat-phone-chrome')?.className.replace('wechat-phone-chrome','') || ''
  host.style.width = width + 'px'
  Object.assign(clone.style, { width: width + 'px', transform: 'none', margin: '0', borderRadius: '0', boxShadow: 'none' })
  host.append(clone); document.body.append(host)
  return { host, clone }
}
export async function captureChat(source: HTMLElement, options: { scale: number; long?: boolean; visibleCount?: number; position?: 'start' | 'current' | 'end' }) {
  const width = source.offsetWidth || 1125, { host, clone } = mount(source, width)
  try {
    const body = clone.querySelector<HTMLElement>('.wc-chat-body')!, content = clone.querySelector<HTMLElement>('.wc-chat-content')!
    const top = clone.querySelector<HTMLElement>('.wc-phone-top')!, bottom = clone.querySelector<HTMLElement>('.wc-bottom')!
    const rows = Array.from(content.querySelectorAll<HTMLElement>('[data-message-id]'))
    rows.forEach((row, index) => { if (index >= (options.visibleCount ?? rows.length)) row.remove() })
    body.style.overflow = 'hidden'; content.style.margin = '0'; content.style.transform = 'none'
    await prepare(clone)
    const sourceBody = source.querySelector<HTMLElement>('.wc-chat-body')!
    const geometry = exportGeometry({
      width, height: source.offsetHeight, contentHeight: content.scrollHeight,
      top: top.offsetHeight, bottom: bottom.offsetHeight, scale: options.scale, long: options.long,
      scroll: options.position === 'end' ? content.scrollHeight : options.position === 'current' ? sourceBody.scrollTop : 0,
    })
    clone.style.height = geometry.height + 'px'
    body.style.top = top.offsetHeight + 'px'; body.style.bottom = bottom.offsetHeight + 'px'
    // scrollTop is not serialized into SVG: position the content instead.
    content.style.transform = 'translateY(-' + geometry.scroll + 'px)'
    return await toCanvas(clone, { width, height: geometry.height, pixelRatio: options.scale, backgroundColor: getComputedStyle(sourceBody).backgroundColor, skipFonts: true, skipAutoScale: true })
  } finally { host.remove() }
}
export function chatSnapshot(source: HTMLElement) {
  const {host,clone}=mount(source,source.offsetWidth||1125)
  const body=clone.querySelector<HTMLElement>('.wc-chat-body')
  if(body)body.scrollTop=source.querySelector<HTMLElement>('.wc-chat-body')?.scrollTop||0
  return {source:clone,dispose:()=>host.remove()}
}
export async function captureScene(source: HTMLElement, scale = 3, long = false) {
  const screen = source.matches('.wechat-chrome-screen') ? source : source.querySelector<HTMLElement>('.wechat-chrome-screen') || source
  const { host, clone } = mount(screen, screen.offsetWidth)
  if(long)host.classList.remove('is-album-scrolled')
  try {
    const content=clone.querySelector<HTMLElement>('.wechat-chrome-content')
    const originalContent=screen.querySelector<HTMLElement>('.wechat-chrome-content')
    const collapse=clone.querySelector<HTMLElement>('.group-collapse-button')
    const originalCollapse=screen.querySelector<HTMLElement>('.group-collapse-button')
    // A long image puts the control after the members. A viewport image freezes
    // the live sticky position, since scrollTop does not survive SVG serialization.
    if(collapse)collapse.style.position='static'
    if(content&&originalContent){
      const wrapper=document.createElement('div')
      while(content.firstChild)wrapper.append(content.firstChild)
      content.append(wrapper)
      if(long){clone.style.height='auto';content.style.overflow='visible';content.style.flex='0 0 auto'}
      else{content.style.overflow='hidden';wrapper.style.transform='translateY(-'+originalContent.scrollTop+'px)'}
    }
    await prepare(clone)
    if(!long&&collapse&&originalCollapse&&content&&originalContent){
      const live=originalContent.getBoundingClientRect(),copy=content.getBoundingClientRect()
      const ratio=live.width?copy.width/live.width:1
      const targetTop=copy.top+(originalCollapse.getBoundingClientRect().top-live.top)*ratio
      collapse.style.transform=`translateY(${targetTop-collapse.getBoundingClientRect().top}px)`
    }
    const height = Math.max(clone.scrollHeight, clone.offsetHeight)
    exportGeometry({ width: screen.offsetWidth, height, contentHeight: 0, top: 0, bottom: 0, scale })
    return await toCanvas(clone, { width: screen.offsetWidth, height, pixelRatio: scale, skipFonts: true, skipAutoScale: true, backgroundColor: getComputedStyle(screen).backgroundColor })
  } finally { host.remove() }
}
