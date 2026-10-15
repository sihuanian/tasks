import { describe, expect, it } from 'vitest'
import {
  computeSmileyGeometry,
  createSmileyStrokes,
  sampleArc,
  sampleCircle,
  type SmileyGeometry,
} from '../src/modules/smiley'

const WIDTH = 1024
const HEIGHT = 1024

function describeGeometry(geometry: SmileyGeometry) {
  return geometry
}

describe('笑脸几何', () => {
  it('脸部轮廓位于画布中央且完整落在画布内', () => {
    const { face } = describeGeometry(computeSmileyGeometry(WIDTH, HEIGHT))
    expect(face.cx).toBe(WIDTH / 2)
    expect(face.cy).toBe(HEIGHT / 2)
    expect(face.cx - face.r).toBeGreaterThan(0)
    expect(face.cx + face.r).toBeLessThan(WIDTH)
    expect(face.cy - face.r).toBeGreaterThan(0)
    expect(face.cy + face.r).toBeLessThan(HEIGHT)
  })

  it('包含两只位于脸部上半部分的对称眼睛', () => {
    const { eyes, face } = describeGeometry(computeSmileyGeometry(WIDTH, HEIGHT))
    const [left, right] = eyes

    expect(left.cx).toBeLessThan(face.cx)
    expect(right.cx).toBeGreaterThan(face.cx)
    expect(Math.abs(left.cx - face.cx)).toBeCloseTo(Math.abs(right.cx - face.cx))
    expect(left.cy).toBeCloseTo(right.cy)
    expect(left.cy).toBeLessThan(face.cy)
    expect(left.r).toBeGreaterThan(0)
    expect(right.r).toBeCloseTo(left.r)
  })

  it('嘴部弧线位于脸部下半部分且向上弯曲（两端高于中间）', () => {
    const { mouth, face } = describeGeometry(computeSmileyGeometry(WIDTH, HEIGHT))
    expect(mouth.cy).toBeGreaterThan(face.cy - face.r * 0.5)

    const points = sampleArc(mouth, 48)
    const leftCorner = points[0]
    const rightCorner = points[points.length - 1]
    const middle = points[Math.floor(points.length / 2)]

    expect(middle.y).toBeGreaterThan(leftCorner.y)
    expect(middle.y).toBeGreaterThan(rightCorner.y)
    expect(leftCorner.y).toBeCloseTo(rightCorner.y, 1)
    expect(middle.x).toBeCloseTo(mouth.cx, 1)
  })

  it('不同尺寸的画布按比例缩放笑脸几何', () => {
    const small = computeSmileyGeometry(400, 400)
    const large = computeSmileyGeometry(800, 800)
    expect(large.face.r / small.face.r).toBeCloseTo(2)
    expect(large.eyes[0].cx - large.face.cx).toBeCloseTo((small.eyes[0].cx - small.face.cx) * 2)
  })
})

describe('笑脸笔迹生成', () => {
  it('生成脸部轮廓、两只眼睛与嘴部三笔内容', () => {
    const strokes = createSmileyStrokes(WIDTH, HEIGHT, { color: '#111827', lineWidth: 6 })
    expect(strokes).toHaveLength(3)
    expect(strokes.every((stroke) => stroke.color === '#111827')).toBe(true)
    expect(strokes.every((stroke) => stroke.width === 6)).toBe(true)
    expect(strokes[1].segments).toHaveLength(2)
    expect(strokes.map((stroke) => stroke.id)).toEqual([...new Set(strokes.map((stroke) => stroke.id))])
  })

  it('轮廓与眼睛采样为闭合点序列', () => {
    const strokes = createSmileyStrokes(WIDTH, HEIGHT, { color: '#111827', lineWidth: 6 })
    const outline = strokes[0].segments[0]
    const firstEye = strokes[1].segments[0]
    const outlineEnd = outline[outline.length - 1]
    const eyeEnd = firstEye[firstEye.length - 1]

    expect(outline[0].x).toBeCloseTo(outlineEnd.x, 6)
    expect(outline[0].y).toBeCloseTo(outlineEnd.y, 6)
    expect(firstEye[0].x).toBeCloseTo(eyeEnd.x, 6)
    expect(firstEye[0].y).toBeCloseTo(eyeEnd.y, 6)
    expect(outline.length).toBeGreaterThan(8)
  })

  it('所有笔迹点落在画布范围内', () => {
    const strokes = createSmileyStrokes(WIDTH, HEIGHT, { color: '#111827', lineWidth: 6 })
    for (const stroke of strokes) {
      for (const segment of stroke.segments) {
        for (const point of segment) {
          expect(point.x).toBeGreaterThanOrEqual(0)
          expect(point.x).toBeLessThanOrEqual(WIDTH)
          expect(point.y).toBeGreaterThanOrEqual(0)
          expect(point.y).toBeLessThanOrEqual(HEIGHT)
        }
      }
    }
  })

  it('可注入笔迹标识生成器', () => {
    let seed = 0
    const strokes = createSmileyStrokes(WIDTH, HEIGHT, {
      color: '#111827',
      lineWidth: 6,
      idFactory: () => `fixed-${(seed += 1)}`,
    })
    expect(strokes.map((stroke) => stroke.id)).toEqual(['fixed-1', 'fixed-2', 'fixed-3'])
  })
})

describe('几何采样', () => {
  it('整圆采样首尾闭合且半径一致', () => {
    const points = sampleCircle({ cx: 10, cy: 20, r: 5 }, 36)
    expect(points).toHaveLength(37)
    expect(points[0].x).toBeCloseTo(points[36].x, 6)
    expect(points[0].y).toBeCloseTo(points[36].y, 6)
    for (const point of points) {
      expect(Math.hypot(point.x - 10, point.y - 20)).toBeCloseTo(5, 6)
    }
  })
})