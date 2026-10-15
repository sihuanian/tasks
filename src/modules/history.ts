import {
  cloneStroke,
  removeStroke,
  replaceStrokes,
  type DrawingSnapshot,
  type Stroke,
} from './drawing'

/**
 * 操作历史模块：记录可撤销的绘制操作（一笔笔迹或一次内容替换）并按序回退。
 * 本模块是撤销历史的唯一持有者，绘图表面只按历史给出的结果应用快照。
 */

export interface HistoryEntry {
  /** 操作标签，用于展示与排查 */
  label: string
  /** 回退语义：给定当前快照，返回回退后的快照 */
  revert(snapshot: DrawingSnapshot): DrawingSnapshot
}

/** 一笔自由绘制：撤销即移除该笔 */
export function strokeEntry(stroke: Stroke): HistoryEntry {
  return {
    label: 'stroke',
    revert: (snapshot) => removeStroke(snapshot, stroke.id),
  }
}

/**
 * 一次内容替换（生成笑脸、清空）：撤销即恢复替换前的全部内容。
 * 生成笑脸会替换当前画布内容，撤销后应回到替换前的样子。
 */
export function replacedContentEntry(previousStrokes: Stroke[], label = 'replace'): HistoryEntry {
  const restored = previousStrokes.map(cloneStroke)
  return {
    label,
    revert: (snapshot) => replaceStrokes(snapshot, restored),
  }
}

export class DrawingHistory {
  private entries: HistoryEntry[] = []

  record(entry: HistoryEntry): void {
    this.entries.push(entry)
  }

  get size(): number {
    return this.entries.length
  }

  get canUndo(): boolean {
    return this.entries.length > 0
  }

  /** 回退最近一次操作；没有可撤销内容时原样返回快照且不报错 */
  undo(snapshot: DrawingSnapshot): DrawingSnapshot {
    const entry = this.entries.pop()
    if (!entry) {
      return snapshot
    }
    return entry.revert(snapshot)
  }

  clear(): void {
    this.entries = []
  }
}