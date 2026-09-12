const table = (() => {
  const result = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    result[n] = c >>> 0
  }
  return result
})()

function crc32(data: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of data) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((sum, item) => sum + item.length, 0))
  let offset = 0
  for (const part of parts) { out.set(part, offset); offset += part.length }
  return out
}

function header(size: number) { return new Uint8Array(size) }
function view(bytes: Uint8Array) { return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength) }

export async function createStoreZip(files: { name: string; blob: Blob }[]) {
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const file of files) {
    const name = new TextEncoder().encode(file.name)
    const data = new Uint8Array(await file.blob.arrayBuffer())
    const crc = crc32(data)
    const local = header(30); const lv = view(local)
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true)
    lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true); lv.setUint16(26, name.length, true)
    const localPart = concat([local, name, data]); locals.push(localPart)
    const central = header(46); const cv = view(central)
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true)
    cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true)
    centrals.push(concat([central, name])); offset += localPart.length
  }
  const centralData = concat(centrals)
  const end = header(22); const ev = view(end)
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, centralData.length, true); ev.setUint32(16, offset, true)
  return new Blob([concat([...locals, centralData, end])], { type: 'application/zip' })
}
