/**
 * 绘图表面数据模型与渲染出口。
 * 画布内容的唯一持有者是工作区装配组件（页面内存），本模块提供
 * 内容变换（追加 / 移除 / 替换）与渲染的纯函数，避免多模块各自解释画布事实。
 */

export interface Point {
  x: number
  y: number
}

/** 一笔笔迹；`segments` 中每一段是一次连续落笔轨迹，段之间不连线 */
export interface Stroke {
  id: string
  color: string
  width: number
  segments: Point[][]
}

/** 画布内容快照：当前画布上的全部笔迹 */
export interface DrawingSnapshot {
  width: number
  height: number
  background: string
  strokes: Stroke[]
}

export const DEFAULT_BACKGROUND = '#ffffff'

let strokeCounter = 0

/** 生成进程内唯一的笔迹标识 */
export function nextStrokeId(prefix = 'stroke'): string {
  strokeCounter += 1
  return `${prefix}-${strokeCounter}`
}

export function createEmptySnapshot(
  width: number,
  height: number,
  background: string = DEFAULT_BACKGROUND,
): DrawingSnapshot {
  return { width, height, background, strokes: [] }
}

export function cloneStroke(stroke: Stroke): Stroke {
  return {
    id: stroke.id,
    color: stroke.color,
    width: stroke.width,
    segments: stroke.segments.map((segment) => segment.map((point) => ({ ...point }))),
  }
}

/** 追加一笔；返回新的快照，不修改入参 */
export function addStroke(snapshot: DrawingSnapshot, stroke: Stroke): DrawingSnapshot {
  return { ...snapshot, strokes: [...snapshot.strokes, cloneStroke(stroke)] }
}

/** 移除指定笔迹；不存在时原样返回 */
export function removeStroke(snapshot: DrawingSnapshot, strokeId: string): DrawingSnapshot {
  const strokes = snapshot.strokes.filter((stroke) => stroke.id !== strokeId)
  if (strokes.length === snapshot.strokes.length) {
    return snapshot
  }
  return { ...snapshot, strokes }
}

/** 整体替换画布内容（清空、生成笑脸或撤销时恢复） */
export function replaceStrokes(snapshot: DrawingSnapshot, strokes: Stroke[]): DrawingSnapshot {
  return { ...snapshot, strokes: strokes.map(cloneStroke) }
}

export function isEmpty(snapshot: DrawingSnapshot): boolean {
  return snapshot.strokes.length === 0
}

/** 渲染所需的最小 2D 上下文接口，便于在无浏览器环境下测试渲染逻辑 */
export interface RenderContext {
  save(): void
  restore(): void
  fillRect(x: number, y: number, width: number, height: number): void
  beginPath(): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void
  closePath(): void
  stroke(): void
  fill(): void
  fillStyle: string | CanvasGradient | CanvasPattern
  strokeStyle: string | CanvasGradient | CanvasPattern
  lineWidth: number
  lineCap: CanvasLineCap
  lineJoin: CanvasLineJoin
}

/** 绘制一笔笔迹；单点轨迹渲染为圆点，多段轨迹分别描边且段间不连线 */
export function paintStroke(ctx: RenderContext, stroke: Stroke): void {
  ctx.strokeStyle = stroke.color
  ctx.fillStyle = stroke.color
  ctx.lineWidth = stroke.width

  for (const segment of stroke.segments) {
    if (segment.length === 0) {
      continue
    }
    if (segment.length === 1) {
      ctx.beginPath()
      ctx.arc(segment[0].x, segment[0].y, stroke.width / 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.fill()
      continue
    }
    ctx.beginPath()
    ctx.moveTo(segment[0].x, segment[0].y)
    for (let index = 1; index < segment.length; index += 1) {
      ctx.lineTo(segment[index].x, segment[index].y)
    }
    ctx.stroke()
  }
}

/** 以浅色背景铺底后重绘全部笔迹，保证画面与快照事实一致 */
export function renderSnapshot(ctx: RenderContext, snapshot: DrawingSnapshot): void {
  ctx.save()
  ctx.fillStyle = snapshot.background
  ctx.fillRect(0, 0, snapshot.width, snapshot.height)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const stroke of snapshot.strokes) {
    paintStroke(ctx, stroke)
  }
  ctx.restore()
}