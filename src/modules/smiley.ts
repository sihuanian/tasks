import { nextStrokeId, type Point, type Stroke } from './drawing'

/**
 * 笑脸生成模块：依据画布尺寸计算标准笑脸几何（脸部轮廓圆、两只眼睛、
 * 向上弯曲的嘴部弧线），并产出可直接写入画布的一笔或多笔图形描述。
 * 本模块不持有状态，只按目标尺寸计算几何。
 */

export interface Circle {
  cx: number
  cy: number
  r: number
}

export interface Arc extends Circle {
  startAngle: number
  endAngle: number
}

export interface SmileyGeometry {
  face: Circle
  eyes: [Circle, Circle]
  mouth: Arc
}

export interface SmileyOptions {
  /** 线条颜色 */
  lineWidth: number
  color: string
  /** 笔迹标识生成器，默认为进程内唯一标识 */
  idFactory?: () => string
}

const FACE_RADIUS_RATIO = 0.34
const EYE_RADIUS_RATIO = 0.11
const EYE_MIN_RADIUS = 6
const EYE_OFFSET_X_RATIO = 0.38
const EYE_OFFSET_Y_RATIO = 0.3
const MOUTH_RADIUS_RATIO = 0.58
const MOUTH_CENTER_Y_RATIO = 0.02
/** 嘴部弧线角度范围（画布坐标系中 y 轴向下，该区间覆盖下半圆，形成向上的微笑弧） */
const MOUTH_START_ANGLE = Math.PI * 0.18
const MOUTH_END_ANGLE = Math.PI * 0.82

export function computeSmileyGeometry(width: number, height: number): SmileyGeometry {
  const size = Math.min(width, height)
  const cx = width / 2
  const cy = height / 2
  const faceRadius = size * FACE_RADIUS_RATIO
  const eyeRadius = Math.max(faceRadius * EYE_RADIUS_RATIO, EYE_MIN_RADIUS)
  const eyeOffsetX = faceRadius * EYE_OFFSET_X_RATIO
  const eyeOffsetY = faceRadius * EYE_OFFSET_Y_RATIO

  return {
    face: { cx, cy, r: faceRadius },
    eyes: [
      { cx: cx - eyeOffsetX, cy: cy - eyeOffsetY, r: eyeRadius },
      { cx: cx + eyeOffsetX, cy: cy - eyeOffsetY, r: eyeRadius },
    ],
    mouth: {
      cx,
      cy: cy + faceRadius * MOUTH_CENTER_Y_RATIO,
      r: faceRadius * MOUTH_RADIUS_RATIO,
      startAngle: MOUTH_START_ANGLE,
      endAngle: MOUTH_END_ANGLE,
    },
  }
}

/** 采样整圆为闭合点序列（首尾点重合，保证轮廓闭合） */
export function sampleCircle(circle: Circle, steps = 72): Point[] {
  const points: Point[] = []
  for (let index = 0; index <= steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2
    points.push({
      x: circle.cx + circle.r * Math.cos(angle),
      y: circle.cy + circle.r * Math.sin(angle),
    })
  }
  return points
}

/** 采样圆弧为点序列 */
export function sampleArc(arc: Arc, steps = 48): Point[] {
  const points: Point[] = []
  for (let index = 0; index <= steps; index += 1) {
    const angle = arc.startAngle + ((arc.endAngle - arc.startAngle) * index) / steps
    points.push({
      x: arc.cx + arc.r * Math.cos(angle),
      y: arc.cy + arc.r * Math.sin(angle),
    })
  }
  return points
}

/**
 * 生成标准笑脸的三笔笔迹：脸部轮廓、两只眼睛、向上弯曲的嘴部。
 * 三段内容写入同一画布，由调用方作为一次可撤销操作登记。
 */
export function createSmileyStrokes(width: number, height: number, options: SmileyOptions): Stroke[] {
  const geometry = computeSmileyGeometry(width, height)
  const idFactory = options.idFactory ?? (() => nextStrokeId('smiley'))
  const { color, lineWidth } = options

  return [
    {
      id: idFactory(),
      color,
      width: lineWidth,
      segments: [sampleCircle(geometry.face)],
    },
    {
      id: idFactory(),
      color,
      width: lineWidth,
      segments: geometry.eyes.map((eye) => sampleCircle(eye, 32)),
    },
    {
      id: idFactory(),
      color,
      width: lineWidth,
      segments: [sampleArc(geometry.mouth)],
    },
  ]
}