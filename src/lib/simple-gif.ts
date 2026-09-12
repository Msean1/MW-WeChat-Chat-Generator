import GIFEncoder from '../vendor/gif/GIFEncoder'
export function createGifEncoder(width: number, height: number, delayMs: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 65535 || height > 65535) throw Error('GIF 尺寸无效')
  const encoder = new (GIFEncoder as any)(width, height)
  encoder.setRepeat(0); encoder.setDelay(Math.max(20, delayMs)); encoder.setDispose(1); encoder.setQuality(5); encoder.writeHeader()
  let count = 0
  return {
    add(frame: ImageData) {
      if (frame.width !== width || frame.height !== height || frame.data.length !== width * height * 4) throw Error('GIF 每一帧的尺寸必须一致')
      encoder.addFrame(frame.data); count++
    },
    finish(): Blob {
      if (!count) throw Error('没有可导出的画面')
      encoder.finish()
      const stream = encoder.stream()
      const parts = stream.pages.map((page: Uint8Array, index: number) => index === stream.pages.length - 1 ? page.slice(0, stream.cursor) : page)
      return new Blob(parts, { type: 'image/gif' })
    },
  }
}
export function encodeGif(frames: ImageData[], delayMs: number): Blob {
  if (!frames.length) throw Error('没有可导出的画面')
  const encoder = createGifEncoder(frames[0].width, frames[0].height, delayMs)
  frames.forEach(frame => encoder.add(frame))
  return encoder.finish()
}
