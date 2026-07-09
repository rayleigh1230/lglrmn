/**
 * 可注入的随机数源。
 *
 * 默认提供种子化的 Mulberry32（快速、确定性），便于复现战报。
 * 测试时可注入 MockRNG 固定序列，精确断言概率分支。
 */
import type { RNG } from '../types/index';

/**
 * Mulberry32 —— 轻量确定性 PRNG。
 * 同一种子产生同一序列，保证战报可复现。
 */
export class SeededRNG implements RNG {
  private state: number;

  constructor(seed: number) {
    // 强制为无符号 32 位
    this.state = seed >>> 0;
  }

  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

/**
 * MockRNG —— 返回预设序列，用于精确测试概率分支（命中/暴击）。
 * 序列耗尽后抛错，避免测试 silently 走默认路径。
 */
export class MockRNG implements RNG {
  private queue: number[];
  private idx = 0;

  constructor(sequence: number[]) {
    this.queue = [...sequence];
  }

  next(): number {
    if (this.idx >= this.queue.length) {
      throw new Error(`MockRNG: 序列已耗尽（已取 ${this.idx} 次）`);
    }
    return this.queue[this.idx++];
  }
}

/** 默认工厂：从任意种子构造 */
export function createRNG(seed: number): RNG {
  return new SeededRNG(seed);
}
