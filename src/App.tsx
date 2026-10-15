import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addStroke,
  createEmptySnapshot,
  renderSnapshot,
  replaceStrokes,
  type DrawingSnapshot,
} from './modules/drawing'
import {
  COLOR_PRESETS,
  DEFAULT_BRUSH,
  SMILEY_LINE_COLOR,
  WIDTH_PRESETS,
  type BrushConfig,
} from './modules/brushConfig'
import { DrawingHistory, replacedContentEntry, strokeEntry } from './modules/history'
import { StrokeBuilder } from './modules/strokeBuilder'
import { createSmileyStrokes } from './modules/smiley'
import { exportCanvasAsPng } from './modules/exporter'

/** 画布内部像素尺寸；页面按 1:1 比例自适应显示，坐标换算按比例进行 */
const CANVAS_WIDTH = 1024
const CANVAS_HEIGHT = 1024

interface UiStatus {
  canUndo: boolean
  hasContent: boolean
}

function toCanvasPoint(event: React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  const scaleX = rect.width === 0 ? 1 : CANVAS_WIDTH / rect.width
  const scaleY = rect.height === 0 ? 1 : CANVAS_HEIGHT / rect.height
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  }
}

function isInsideCanvas(point: { x: number; y: number }): boolean {
  return point.x >= 0 && point.x <= CANVAS_WIDTH && point.y >= 0 && point.y <= CANVAS_HEIGHT
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const snapshotRef = useRef<DrawingSnapshot>(createEmptySnapshot(CANVAS_WIDTH, CANVAS_HEIGHT))
  const historyRef = useRef<DrawingHistory>(new DrawingHistory())
  const builderRef = useRef<StrokeBuilder>(new StrokeBuilder())
  const brushRef = useRef<BrushConfig>(DEFAULT_BRUSH)

  const [brush, setBrush] = useState<BrushConfig>(DEFAULT_BRUSH)
  const [status, setStatus] = useState<UiStatus>({ canUndo: false, hasContent: false })
  const [message, setMessage] = useState('')

  const repaint = useCallback(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!context) {
      return
    }
    renderSnapshot(context, snapshotRef.current)
  }, [])

  const syncStatus = useCallback(() => {
    setStatus({
      canUndo: historyRef.current.canUndo,
      hasContent: !(snapshotRef.current.strokes.length === 0),
    })
  }, [])

  const commit = useCallback(
    (next: DrawingSnapshot) => {
      snapshotRef.current = next
      repaint()
      syncStatus()
    },
    [repaint, syncStatus],
  )

  useEffect(() => {
    repaint()
    syncStatus()
  }, [repaint, syncStatus])

  const handleGenerate = useCallback(() => {
    const previousStrokes = snapshotRef.current.strokes
    const strokes = createSmileyStrokes(CANVAS_WIDTH, CANVAS_HEIGHT, {
      color: SMILEY_LINE_COLOR,
      lineWidth: brushRef.current.width,
    })
    historyRef.current.record(replacedContentEntry(previousStrokes, '生成笑脸'))
    commit(replaceStrokes(snapshotRef.current, strokes))
    setMessage('已生成笑脸，可继续绘制或导出图片')
  }, [commit])

  const handleUndo = useCallback(() => {
    const before = snapshotRef.current
    const next = historyRef.current.undo(before)
    if (next === before) {
      // 没有可撤销内容时保持画布不变，且不产生错误提示
      syncStatus()
      return
    }
    commit(next)
    setMessage('已撤销最近一次操作')
  }, [commit, syncStatus])

  const handleClear = useCallback(() => {
    if (snapshotRef.current.strokes.length === 0) {
      return
    }
    historyRef.current.record(replacedContentEntry(snapshotRef.current.strokes, '清空'))
    commit(replaceStrokes(snapshotRef.current, []))
    setMessage('已清空画布')
  }, [commit])

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    void exportCanvasAsPng(canvas)
      .then(() => setMessage('已导出 PNG 图片'))
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? `导出失败：${error.message}` : '导出失败')
      })
  }, [])

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || event.button !== 0) {
      return
    }
    const point = toCanvasPoint(event, canvas)
    const current = brushRef.current

    builderRef.current.begin(point, current)

    context.strokeStyle = current.color
    context.lineWidth = current.width
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.beginPath()
    context.moveTo(point.x, point.y)

    canvas.setPointerCapture(event.pointerId)
  }, [])

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const builder = builderRef.current
    if (!canvas || !builder.isDrawing) {
      return
    }
    const point = toCanvasPoint(event, canvas)
    if (!isInsideCanvas(point)) {
      // 指针已离开画布区域：不再产生新笔迹，返回后另起一段
      builder.leaveCanvas()
      return
    }
    const context = canvas.getContext('2d')
    if (!context) {
      return
    }
    const startedSegment = builder.move(point)
    if (startedSegment) {
      context.beginPath()
      context.moveTo(point.x, point.y)
    } else {
      context.lineTo(point.x, point.y)
    }
    context.stroke()
  }, [])

  const finishStroke = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      const builder = builderRef.current
      if (!builder.isDrawing) {
        return
      }
      const stroke = builder.end()
      if (canvas && canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }
      if (!stroke) {
        return
      }
      historyRef.current.record(strokeEntry(stroke))
      commit(addStroke(snapshotRef.current, stroke))
    },
    [commit],
  )

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">画一个笑脸</h1>
        <p className="app__hint">
          点击「生成笑脸」一键得到标准笑脸，或在画布上按住指针自己画；画好后可导出为 PNG 图片。
        </p>
      </header>

      <section className="toolbar" aria-label="绘图工具栏">
        <div className="toolbar__group">
          <button type="button" className="button button--primary" onClick={handleGenerate}>
            生成笑脸
          </button>
        </div>

        <div className="toolbar__group" role="group" aria-label="笔触颜色">
          <span className="toolbar__label">颜色</span>
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className="swatch"
              style={{ backgroundColor: preset.value }}
              title={preset.label}
              aria-label={`笔触颜色：${preset.label}`}
              aria-pressed={brush.color === preset.value}
              onClick={() => {
                const next = { ...brushRef.current, color: preset.value }
                brushRef.current = next
                setBrush(next)
              }}
            />
          ))}
        </div>

        <div className="toolbar__group" role="group" aria-label="笔触粗细">
          <span className="toolbar__label">粗细</span>
          {WIDTH_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className="button button--chip"
              aria-pressed={brush.width === preset.value}
              onClick={() => {
                const next = { ...brushRef.current, width: preset.value }
                brushRef.current = next
                setBrush(next)
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="toolbar__group">
          <button type="button" className="button" onClick={handleUndo}>
            撤销
          </button>
          <button type="button" className="button" onClick={handleClear}>
            清空
          </button>
          <button type="button" className="button" onClick={handleExport}>
            导出图片
          </button>
        </div>
      </section>

      <section className="stage">
        <canvas
          ref={canvasRef}
          className="stage__canvas"
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          aria-label="绘图画布"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
        />
      </section>

      <p className="status" role="status">
        {message || (status.hasContent ? '画布上已有内容' : '画布为空白')}
      </p>
    </main>
  )
}