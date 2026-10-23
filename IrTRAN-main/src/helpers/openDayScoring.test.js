import { describe, expect, it } from 'vitest';
import testData from '@/data/openDay/test.json';
import {
  DIRS,
  calcResult,
  maxPerDirection,
  pickQuestions,
  validatePool,
} from './openDayScoring.js';

describe('openDay pool', () => {
  it('passes invariants', () => {
    const { ok, issues } = validatePool(testData);
    expect(issues).toEqual([]);
    expect(ok).toBe(true);
    expect(testData.questions).toHaveLength(27);
  });

  it('picks one question per topic and is seed-stable', () => {
    const a = pickQuestions(testData.questions, testData.topics, 42);
    const b = pickQuestions(testData.questions, testData.topics, 42);
    expect(a).toHaveLength(9);
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
    expect(new Set(a.map((q) => q.topic)).size).toBe(9);
  });

  it('always yields max 27 per direction on random sets', () => {
    for (let i = 0; i < 1000; i += 1) {
      const set = pickQuestions(testData.questions, testData.topics, i);
      const max = maxPerDirection(set);
      for (const d of DIRS) expect(max[d]).toBe(27);
    }
  });

  it('gives 100% for a direction when always picking its main answer', () => {
    const set = pickQuestions(testData.questions, testData.topics, 7);
    const picks = {};
    for (const q of set) {
      picks[q.id] = q.answers.findIndex((a) => (a.pi ?? 0) === 3);
    }
    const result = calcResult(set, picks, testData.scoring.close_threshold_percent);
    expect(result.percent.pi).toBe(100);
    expect(result.top).toBe('pi');
    for (const d of DIRS) {
      if (d !== 'pi') expect(result.percent[d]).toBeLessThanOrEqual(35);
    }
  });

  it('marks close directions under threshold', () => {
    const farSet = [
      {
        id: 'z',
        answers: [
          { pi: 74, is: 60, bas: 10, bi: 10 },
          { pi: 10, is: 74, bas: 74, bi: 60 },
        ],
      },
    ];
    const far = calcResult(farSet, { z: 0 }, 10);
    expect(far.percent.pi).toBe(100);
    expect(far.percent.is).toBe(81);
    expect(far.isClose).toBe(false);

    const closeSet = [
      {
        id: 'z3',
        answers: [
          { pi: 74, is: 68, bas: 10, bi: 10 },
          { pi: 10, is: 74, bas: 74, bi: 68 },
        ],
      },
    ];
    const close = calcResult(closeSet, { z3: 0 }, 10);
    expect(close.percent.pi).toBe(100);
    expect(close.percent.is).toBe(92);
    expect(close.isClose).toBe(true);
  });

  it('skips missing picks safely', () => {
    const set = pickQuestions(testData.questions, testData.topics, 1);
    const result = calcResult(set, {}, 10);
    expect(result.total).toEqual({ pi: 0, is: 0, bas: 0, bi: 0 });
  });

  it('uses stable tie-break order', () => {
    const questions = [
      {
        id: 't',
        answers: [{ pi: 10, is: 10, bas: 10, bi: 10 }],
      },
    ];
    const result = calcResult(questions, { t: 0 }, 10);
    expect(result.order).toEqual(['pi', 'is', 'bas', 'bi']);
    expect(result.top).toBe('pi');
  });
});
