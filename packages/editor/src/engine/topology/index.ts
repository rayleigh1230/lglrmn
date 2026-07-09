/**
 * 战场拓扑关系判定
 *
 * 战斗中没有距离/移动概念，只有格位间的拓扑关系。
 * 这些纯函数驱动所有防空/拦截/舰载机锁定的判定。
 */
import type { Cell, InterceptScope } from '../types/index';

/** 同格（自身防空、舰载机贴身攻击） */
export function sameCell(a: Cell, b: Cell): boolean {
  return a.side === b.side && a.row === b.row && a.col === b.col;
}

/** 同 side 同 row（同排防空、同排拦截） */
export function sameRow(a: Cell, b: Cell): boolean {
  return a.side === b.side && a.row === b.row;
}

/** 同 side（我方半场，防空支援） */
export function sameSide(a: Cell, b: Cell): boolean {
  return a.side === b.side;
}

/** 任意格（恒真，全场防空、跨阵型投射） */
export function anywhere(_a: Cell, _b: Cell): boolean {
  return true;
}

/** 对立阵营（A 攻击 B 的前提） */
export function isOpposing(a: Cell, b: Cell): boolean {
  return a.side !== b.side;
}

/**
 * 判断 from 视角下，target 是否落在指定拦截范围内。
 * scope 描述"防御者能覆盖到哪些格位上的威胁"。
 */
export function inScope(defender: Cell, threat: Cell, scope: InterceptScope): boolean {
  switch (scope) {
    case 'sameCell':
      return sameCell(defender, threat);
    case 'sameRow':
      return sameRow(defender, threat);
    case 'sameSide':
      return sameSide(defender, threat);
    case 'anywhere':
      return anywhere(defender, threat);
  }
}

/** 用于排序/哈希的稳定字符串表示 */
export function cellKey(c: Cell): string {
  return `${c.side}:${c.row}:${c.col}`;
}
