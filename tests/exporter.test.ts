import { describe, expect, it } from 'vitest'
import { buildExportFileName } from '../src/modules/exporter'

describe('导出文件名', () => {
  it('包含 smiley 前缀、时间戳与 png 后缀', () => {
    const date = new Date(2026, 9, 15, 9, 8, 7)
    expect(buildExportFileName(date)).toBe('smiley-20261015-090807.png')
    expect(buildExportFileName(date)).toMatch(/^smiley-\d{8}-\d{6}\.png$/)
  })

  it('不同时刻生成不同文件名', () => {
    const first = buildExportFileName(new Date(2026, 9, 15, 9, 8, 7))
    const second = buildExportFileName(new Date(2026, 9, 15, 9, 8, 8))
    expect(first).not.toBe(second)
  })

  it('月份与日期补齐两位', () => {
    expect(buildExportFileName(new Date(2026, 0, 2, 3, 4, 5))).toBe('smiley-20260102-030405.png')
  })
})