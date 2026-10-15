import { nextStrokeId, type Point, type Stroke } from './drawing'
import type { BrushConfig } from './brushConfig'

/**
 * 一次落笔的轨迹收集器，落实指针输入语义：
 * 按下开始一笔，移动持续补充笔迹，抬起结束当前一笔；
 * 指针离开画布后不产生新笔迹，返回画布后从返回点继续，不在离开与返回位置之间补线。
 */
export class StrokeBuilder {
  private segments: Point[][] = []
  private drawing = false
  private detached = false
  private brush: BrushConfig | null = null

  get isDrawing(): boolean {
    return this.drawing
  }

  /** 开始一笔，并在起笔时固定当前笔触配置 */
  begin(point: Point, brush: BrushConfig): void {
    this.drawing = true
    this.detached = false
    this.brush = { color: brush.color, width: brush.width }
    this.segments = [[{ ...point }]]
  }

  /** 追加轨迹点；返回 true 表示该点开启了一个新线段（例如指针刚回到画布内） */
  move(point: Point): boolean {
    if (!this.drawing) {
      return false
    }
    const next = { ...point }
    if (this.detached || this.segments.length === 0) {
      this.segments.push([next])
      this.detached = false
      return true
    }
    this.segments[this.segments.length - 1].push(next)
    return false
  }

  /** 指针离开画布：标记断开，后续轨迹另起一段，避免跨区域补线 */
  leaveCanvas(): void {
    if (!this.drawing) {
      return
    }
    this.detached = true
  }

  /** 结束当前一笔；无可绘制内容时返回 null */
  end(): Stroke | null {
    if (!this.drawing) {
      return null
    }
    const brush = this.brush
    const segments = this.segments
      .filter((segment) => segment.length > 0)
      .map((segment) => segment.map((point) => ({ ...point })))

    this.drawing = false
    this.detached = false
    this.brush = null
    this.segments = []

    if (!brush || segments.length === 0) {
      return null
    }

    return {
      id: nextStrokeId(),
      color: brush.color,
      width: brush.width,
      segments,
    }
  }
}