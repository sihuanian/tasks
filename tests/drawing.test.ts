import { describe, expect, it } from 'vitest'
import {
  addStroke,
  createEmptySnapshot,
  isEmpty,
  paintStroke,
  removeStroke,
  renderSnapshot,
  replaceStrokes,
  type RenderContext,
  type Stroke,
} from '../src/modules/drawing'

function createRecordingContext() {
  const calls: string[] = []
  const context = {
    fillStyle: '' as string | CanvasGradient | CanvasPattern,
    strokeStyle: '' as string | CanvasGradient | CanvasPattern,
    lineWidth: 0,
    lineCap: 'round' as CanvasLineCap,
    lineJoin: 'round' as CanvasLineJoin,
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    fillRect: (x: number, y: number, w: number, h: number) =>
      calls.push(`fillRect:${x},${y},${w},${h}|${String(context.fillStyle)}`),
    beginPath: () => calls.push('beginPath'),
    moveTo: (x: number, y: number) => calls.push(`moveTo:${x},${y}`),
    lineTo: (x: number, y: number) => calls.push(`lineTo:${x},${y}`),
    arc: (x: number, y: number, r: number) => calls.push(`arc:${x},${y},${r}`),
    closePath: () => calls.push('closePath'),
    stroke: () => calls.push('stroke'),
    fill: () => calls.push('fill'),
  }
  return { context: context as unknown as RenderContext, calls, raw: context }
}

const strokeA: Stroke = {
  id: 'stroke-a',
  color: '#111827',
  width: 6,
  segments: [
    [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ],
  ],
}

const strokeB: Stroke = {
  id: 'stroke-b',
  color: '#ef4444',
  width: 3,
  segments: [
    [
      { x: 20, y: 20 },
      { x: 30, y: 30 },
    ],
  ],
}

describe('绘图表面内容变换', () => {
  it('新建快照为空白且不包含笔迹', () => {
    const snapshot = createEmptySnapshot(200, 200)
    expect(snapshot.strokes).toEqual([])
    expect(isEmpty(snapshot)).toBe(true)
  })

  it('追加笔迹后包含该笔且不影响原快照', () => {
    const snapshot = createEmptySnapshot(200, 200)
    const next = addStroke(snapshot, strokeA)
    expect(next.strokes.map((stroke) => stroke.id)).toEqual(['stroke-a'])
    expect(snapshot.strokes).toHaveLength(0)
    expect(isEmpty(next)).toBe(false)
  })

  it('追加时复制笔迹，避免调用方后续修改影响快照', () => {
    const snapshot = addStroke(createEmptySnapshot(200, 200), strokeA)
    strokeA.segments[0].push({ x: 99, y: 99 })
    expect(snapshot.strokes[0].segments[0]).toHaveLength(2)
  })

  it('可按 id 移除指定笔迹', () => {
    const snapshot = addStroke(addStroke(createEmptySnapshot(200, 200), strokeA), strokeB)
    const next = removeStroke(snapshot, 'stroke-a')
    expect(next.strokes.map((stroke) => stroke.id)).toEqual(['stroke-b'])
  })

  it('移除不存在的笔迹时原样返回快照', () => {
    const snapshot = addStroke(createEmptySnapshot(200, 200), strokeA)
    expect(removeStroke(snapshot, 'missing')).toBe(snapshot)
  })

  it('整体替换内容可清空画布', () => {
    const snapshot = addStroke(createEmptySnapshot(200, 200), strokeA)
    const cleared = replaceStrokes(snapshot, [])
    expect(cleared.strokes).toEqual([])
    expect(isEmpty(cleared)).toBe(true)
  })
})

describe('画布渲染', () => {
  it('先以背景色铺底，再绘制每一笔', () => {
    const { context, calls } = createRecordingContext()
    const snapshot = addStroke(addStroke(createEmptySnapshot(120, 80, '#ffffff'), strokeA), strokeB)
    renderSnapshot(context, snapshot)

    // 背景铺底使用快照背景色，且必须先于任何笔迹描边
    expect(calls).toContain('fillRect:0,0,120,80|#ffffff')
    expect(calls.indexOf('fillRect:0,0,120,80|#ffffff')).toBeLessThan(calls.indexOf('stroke'))
    expect(calls.filter((call) => call === 'stroke')).toHaveLength(2)
    expect(calls).toContain('save')
    expect(calls).toContain('restore')
  })

  it('多段笔迹分段描边且段间不补线', () => {
    const { context, calls } = createRecordingContext()
    paintStroke(context, {
      id: 'multi',
      color: '#111827',
      width: 4,
      segments: [
        [
          { x: 1, y: 1 },
          { x: 2, y: 2 },
        ],
        [
          { x: 50, y: 50 },
          { x: 51, y: 51 },
        ],
      ],
    })

    expect(calls.filter((call) => call === 'beginPath')).toHaveLength(2)
    expect(calls).toContain('moveTo:50,50')
    expect(calls).not.toContain('lineTo:50,50')
  })

  it('单点轨迹渲染为圆点', () => {
    const { context, calls, raw } = createRecordingContext()
    paintStroke(context, {
      id: 'dot',
      color: '#ef4444',
      width: 10,
      segments: [[{ x: 5, y: 6 }]],
    })

    expect(calls).toContain('arc:5,6,5')
    expect(calls).toContain('fill')
    expect(calls).not.toContain('stroke')
    expect(raw.strokeStyle).toBe('#ef4444')
  })
})