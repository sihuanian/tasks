import { describe, expect, it } from 'vitest'
import { StrokeBuilder } from '../src/modules/strokeBuilder'
import { DEFAULT_BRUSH } from '../src/modules/brushConfig'

describe('落笔轨迹收集', () => {
  it('按下开始一笔并在抬起时结束', () => {
    const builder = new StrokeBuilder()
    builder.begin({ x: 1, y: 1 }, DEFAULT_BRUSH)
    expect(builder.isDrawing).toBe(true)
    builder.move({ x: 2, y: 2 })
    builder.move({ x: 3, y: 3 })

    const stroke = builder.end()
    expect(stroke).not.toBeNull()
    expect(stroke?.segments).toHaveLength(1)
    expect(stroke?.segments[0]).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ])
    expect(builder.isDrawing).toBe(false)
  })

  it('起笔时固定笔触配置，绘制过程中改配置不影响当前笔', () => {
    const builder = new StrokeBuilder()
    const brush = { color: '#111827', width: 6 }
    builder.begin({ x: 0, y: 0 }, brush)
    brush.color = '#ef4444'
    brush.width = 12
    builder.move({ x: 1, y: 1 })

    const stroke = builder.end()
    expect(stroke?.color).toBe('#111827')
    expect(stroke?.width).toBe(6)
  })

  it('指针离开画布后返回时另起一段，不补线', () => {
    const builder = new StrokeBuilder()
    builder.begin({ x: 0, y: 0 }, DEFAULT_BRUSH)
    builder.move({ x: 10, y: 0 })
    builder.leaveCanvas()
    const startedNewSegment = builder.move({ x: 500, y: 500 })
    builder.move({ x: 510, y: 500 })

    expect(startedNewSegment).toBe(true)
    const stroke = builder.end()
    expect(stroke?.segments).toHaveLength(2)
    expect(stroke?.segments[0]).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ])
    expect(stroke?.segments[1]).toEqual([
      { x: 500, y: 500 },
      { x: 510, y: 500 },
    ])
  })

  it('未按下时移动不产生笔迹', () => {
    const builder = new StrokeBuilder()
    expect(builder.move({ x: 5, y: 5 })).toBe(false)
    expect(builder.end()).toBeNull()
  })

  it('抬起后可开始新的一笔且上一笔不受影响', () => {
    const builder = new StrokeBuilder()
    builder.begin({ x: 1, y: 1 }, DEFAULT_BRUSH)
    const first = builder.end()
    builder.begin({ x: 9, y: 9 }, DEFAULT_BRUSH)
    const second = builder.end()

    expect(first?.id).not.toBe(second?.id)
    expect(first?.segments).toHaveLength(1)
    expect(second?.segments).toHaveLength(1)
  })
})