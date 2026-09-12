import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = fileURLToPath(new URL('../dist/', import.meta.url))
const assets = join(dist, 'assets')
const files = await readdir(assets)
const jsName = files.find(name => name.endsWith('.js'))
const cssName = files.find(name => name.endsWith('.css'))
if (!jsName || !cssName) throw new Error('请先执行 npm run build')

const [js, css] = await Promise.all([
  readFile(join(assets, jsName), 'utf8'),
  readFile(join(assets, cssName), 'utf8'),
])

const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="theme-color" content="#07c160">
<title>MW微信聊天器V1.7</title>
<style>${css}</style></head><body><div id="root"></div>
<script>${js.replace(/<\/script/gi, '<\\/script')}</script></body></html>`

await writeFile(join(dist, '微信素材生成工具.html'), html, 'utf8')
console.log('已生成 dist/微信素材生成工具.html')
