/**
 * 笔触配置模块：维护当前笔触颜色与粗细档位，供新笔迹消费。
 * 该模块是工具配置的唯一持有者；已画出的笔迹不受后续配置修改影响。
 */

export interface BrushConfig {
  /** CSS 颜色值，例如 `#111827` */
  color: string
  /** 线宽，单位为画布内部像素 */
  width: number
}

export interface ColorPreset {
  label: string
  value: string
}

export interface WidthPreset {
  label: string
  value: number
}

export const COLOR_PRESETS: readonly ColorPreset[] = [
  { label: '黑色', value: '#111827' },
  { label: '红色', value: '#ef4444' },
  { label: '蓝色', value: '#2563eb' },
  { label: '绿色', value: '#16a34a' },
  { label: '橙色', value: '#f59e0b' },
]

export const WIDTH_PRESETS: readonly WidthPreset[] = [
  { label: '细', value: 3 },
  { label: '中', value: 6 },
  { label: '粗', value: 12 },
]

/** 默认笔触：黑色 + 中档粗细 */
export const DEFAULT_BRUSH: BrushConfig = {
  color: COLOR_PRESETS[0].value,
  width: WIDTH_PRESETS[1].value,
}

/** 生成笑脸使用的深色线条，对应需求中“线条为深色”的保守基线 */
export const SMILEY_LINE_COLOR = COLOR_PRESETS[0].value