import { describe, expect, it } from 'vitest'
import { addStroke, createEmptySnapshot, type Stroke } from '../src/modules/drawing'
import { DrawingHistory, replacedContentEntry, strokeEntry } from '../src/modules/history'

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
  width: 6,
  segments: [
    [
      { x: 20, y: 20 },
      { x: 30, y: 30 },
    ],
  ],
}

describe('操作历史', () => {
  it('撤销移除最近一笔并保留其余内容', () => {
    const history = new DrawingHistory()
    let snapshot = createEmptySnapshot(200, 200)
    snapshot = addStroke(snapshot, strokeA)
    history.record(strokeEntry(strokeA))
    snapshot = addStroke(snapshot, strokeB)
    history.record(strokeEntry(strokeB))

    expect(history.canUndo).toBe(true)
    snapshot = history.undo(snapshot)
    expect(snapshot.strokes.map((stroke) => stroke.id)).toEqual(['stroke-a'])
    snapshot = history.undo(snapshot)
    expect(snapshot.strokes).toEqual([])
    expect(history.canUndo).toBe(false)
  })

  it('没有可撤销内容时撤销保持画布不变且不抛错', () => {
    const history = new DrawingHistory()
    const snapshot = createEmptySnapshot(200, 200)

    expect(() => history.undo(snapshot)).not.toThrow()
    expect(history.undo(snapshot)).toBe(snapshot)
    expect(history.canUndo).toBe(false)
  })

  it('撤销生成笑脸可恢复替换前的内容', () => {
    const history = new DrawingHistory()
    let snapshot = addStroke(createEmptySnapshot(200, 200), strokeA)

    const smileyStrokes: Stroke[] = [
      {
        id: 'smiley-1',
        color: '#111827',
        width: 6,
        segments: [
          [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
          ],
        ],
      },
      {
        id: 'smiley-2',
        color: '#111827',
        width: 6,
        segments: [
          [
            { x: 3, y: 3 },
            { x: 4, y: 4 },
          ],
        ],
      },
    ]

    history.record(replacedContentEntry(snapshot.strokes, '生成笑脸'))
    snapshot = { ...snapshot, strokes: smileyStrokes }
    expect(snapshot.strokes).toHaveLength(2)

    snapshot = history.undo(snapshot)
    expect(snapshot.strokes.map((stroke) => stroke.id)).toEqual(['stroke-a'])
  })

  it('替换记录保留历史内容副本，不受后续外部修改影响', () => {
    const original = addStroke(createEmptySnapshot(200, 200), strokeA)
    const entry = replacedContentEntry(original.strokes)

    const mutated = original.strokes.map((stroke) => ({ ...stroke, id: 'renamed' }))
    const reverted = entry.revert({ ...original, strokes: mutated })
    expect(reverted.strokes.map((stroke) => stroke.id)).toEqual(['stroke-a'])
  })
})