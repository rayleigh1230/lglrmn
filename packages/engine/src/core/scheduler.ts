/**
 * 事件调度器 —— DES 的核心。
 *
 * 维护一个按 time 排序的优先队列。仿真主循环每秒 tick 一次，
 * 取出所有"已到点"事件执行。同 time 的事件按入队顺序处理（FIFO），
 * 保证确定性。
 */
import type { SimEvent } from '../types/events.js';

export class Scheduler {
  private events: SimEvent[] = [];
  /** 用于稳定排序的递增序号，保证同 time 事件 FIFO */
  private seq = 0;

  /** 入队一个事件 */
  schedule(evt: SimEvent): void {
    this.events.push({ ...evt, time: evt.time });
    // 插入后保持按 (time, seq) 排序：这里用稳定排序即可
    // 为简单与确定性，每次 schedule 后整体排序（事件量级为百级，可接受）
    this.sortStable();
  }

  /**
   * 取出所有 time <= now 的事件（按 time, seq 升序）。
   * 返回的事件从队列中移除。
   */
  popDue(now: number): SimEvent[] {
    const due: SimEvent[] = [];
    while (this.events.length > 0 && this.events[0].time <= now) {
      due.push(this.events.shift()!);
    }
    return due;
  }

  /** 生成下一个稳定序号 */
  nextSeq(): number {
    return this.seq++;
  }

  /** 队列是否还有事件 */
  isEmpty(): boolean {
    return this.events.length === 0;
  }

  /** 队列中最早事件的时刻（无事件返回 Infinity） */
  peekNextTime(): number {
    return this.events.length > 0 ? this.events[0].time : Infinity;
  }

  private sortStable(): void {
    // 利用 sort 的稳定性（V8 稳定排序），再以 seq 作为次序兜底
    this.events.sort((a, b) => a.time - b.time);
  }
}
