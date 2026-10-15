/**
 * 导出模块：将当前画布快照编码为 PNG 并触发浏览器本地下载。
 * 本模块不做缓存，一次性读取当前画布内容生成文件。
 */

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0')
}

/** 生成带时间戳的文件名，便于区分多次导出 */
export function buildExportFileName(date: Date = new Date(), prefix = 'smiley'): string {
  const stamp = [
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`,
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`,
  ].join('-')
  return `${prefix}-${stamp}.png`
}

/** 将画布内容编码为 PNG Blob；编码失败时抛出可展示的错误 */
export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('浏览器未能生成 PNG 数据'))
      }
    }, 'image/png')
  })
}

/**
 * 导出当前画布为 PNG 并触发下载。
 * 导出内容为调用时刻画布上的可见内容。
 */
export async function exportCanvasAsPng(
  canvas: HTMLCanvasElement,
  fileName: string = buildExportFileName(),
): Promise<void> {
  const blob = await canvasToPngBlob(canvas)
  const url = URL.createObjectURL(blob)

  try {
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    // 延迟释放，避免部分浏览器在下载开始前失效
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}