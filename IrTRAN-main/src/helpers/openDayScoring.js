export const DIRS = ['pi', 'is', 'bas', 'bi'];

export function makeRng(seed) {
  if (seed == null || seed === '') return Math.random;
  let a = Number(seed) >>> 0;
  if (Number.isNaN(a)) return Math.random;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** @returns {string[]} topic keys in stable order */
export function topicKeys(topics) {
  if (Array.isArray(topics)) return topics;
  if (topics && typeof topics === 'object') return Object.keys(topics);
  return [];
}

export function pickQuestions(pool, topics, seed) {
  const rng = makeRng(seed);
  return topicKeys(topics)
    .map((t) => pool.filter((q) => q.topic === t))
    .filter((variants) => variants.length > 0)
    .map((variants) => variants[Math.floor(rng() * variants.length)]);
}

export function prepareAnswers(q, rng = Math.random) {
  return shuffle(
    q.answers.map((a, idx) => ({ ...a, idx })),
    rng,
  );
}

export function maxPerDirection(questions) {
  const max = Object.fromEntries(DIRS.map((d) => [d, 0]));
  for (const q of questions) {
    for (const d of DIRS) {
      max[d] += Math.max(...q.answers.map((a) => a[d] ?? 0));
    }
  }
  return max;
}

/**
 * @param {Array} questions selected set (usually 9)
 * @param {Record<string, number>} picks questionId -> original answer index
 * @param {number} closeThreshold
 */
export function calcResult(questions, picks, closeThreshold = 10) {
  const total = Object.fromEntries(DIRS.map((d) => [d, 0]));
  for (const q of questions) {
    const a = q.answers[picks[q.id]];
    if (!a) continue;
    for (const d of DIRS) total[d] += a[d] ?? 0;
  }
  const max = maxPerDirection(questions);
  const percent = Object.fromEntries(
    DIRS.map((d) => [d, max[d] ? Math.round((total[d] / max[d]) * 100) : 0]),
  );
  const order = [...DIRS].sort(
    (a, b) => percent[b] - percent[a] || DIRS.indexOf(a) - DIRS.indexOf(b),
  );
  const top = order[0];
  const second = order[1];
  const low = order[order.length - 1];
  const isClose = percent[top] - percent[second] < closeThreshold;
  return { total, percent, max, order, top, second, low, isClose };
}

/** Pool invariant checks used by tests and optional runtime assert */
export function validatePool(testData) {
  const issues = [];
  const qs = testData.questions || [];
  const ids = new Set();
  const bonusTotal = Object.fromEntries(DIRS.map((d) => [d, 0]));

  for (const q of qs) {
    if (ids.has(q.id)) issues.push(`duplicate id ${q.id}`);
    ids.add(q.id);
    if (!q.topic) issues.push(`${q.id}: missing topic`);
    if (!Array.isArray(q.answers) || q.answers.length !== 4) {
      issues.push(`${q.id}: expected 4 answers`);
      continue;
    }
    const mains = Object.fromEntries(DIRS.map((d) => [d, 0]));
    for (const a of q.answers) {
      const scores = Object.fromEntries(DIRS.map((d) => [d, a[d] ?? 0]));
      const threes = DIRS.filter((d) => scores[d] === 3);
      const ones = DIRS.filter((d) => scores[d] === 1);
      if (threes.length !== 1) {
        issues.push(`${q.id}: answer must have exactly one main score of 3`);
      } else {
        mains[threes[0]] += 1;
        if (ones.includes(threes[0])) {
          issues.push(`${q.id}: bonus on main direction`);
        }
        if (ones.length > 1) {
          issues.push(`${q.id}: more than one bonus on an answer`);
        }
        for (const d of ones) bonusTotal[d] += 1;
      }
      for (const d of DIRS) {
        const v = scores[d];
        if (v !== 0 && v !== 1 && v !== 3) {
          issues.push(`${q.id}: unexpected score ${v} for ${d}`);
        }
      }
    }
    for (const d of DIRS) {
      if (mains[d] !== 1) issues.push(`${q.id}: main count for ${d}=${mains[d]}`);
    }
  }

  const bonusValues = Object.values(bonusTotal);
  const bonusSpread = Math.max(...bonusValues) - Math.min(...bonusValues);
  if (bonusSpread > 1) {
    issues.push(`bonus imbalance: ${JSON.stringify(bonusTotal)}`);
  }

  return { ok: issues.length === 0, issues, bonusTotal };
}
