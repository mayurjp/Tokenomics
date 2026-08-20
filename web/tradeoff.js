// What you gain and what you lose, side by side.
//
// Every card here shows a saving, and a saving shown on its own is an advert. This puts the
// other column next to it: each option gets its gains and its losses, so the choice reads
// as a choice rather than as an obviously-correct answer.
//
// The two kinds of claim are kept visibly apart, because they are not equally trustworthy:
//
//   measured — derived from the run that just happened. Tokens, money, wall-clock time.
//   judgement — what this technique is known to cost or buy in quality. This page does not
//               measure answer quality, so these are labelled as not measured here rather
//               than dressed up as findings.

import { el } from './dom.js';
import { costOf, atVolume, usd, RUNS_PER_MONTH } from './pricing.js';

const secs = (ms) => (ms >= 10000 ? `${(ms / 1000).toFixed(0)}s` : `${(ms / 1000).toFixed(1)}s`);

function ratio(a, b) {
  if (!b) return null;
  const r = a / b;
  return r >= 1.05 ? r : null;
}

// Facts about this variant relative to the other one, computed from what actually ran.
function measured(self, other) {
  const out = { gain: [], lose: [] };
  if (!other) return out;

  const selfCost = atVolume(costOf(self.stats, self.model));
  const otherCost = atVolume(costOf(other.stats, other.model));
  const selfTokens = self.stats.total_tokens ?? 0;
  const otherTokens = other.stats.total_tokens ?? 0;

  const cheaper = ratio(otherCost, selfCost);
  const dearer = ratio(selfCost, otherCost);
  if (cheaper) {
    out.gain.push(`${cheaper.toFixed(1)}x cheaper — ${usd(selfCost)} vs ${usd(otherCost)} per ${RUNS_PER_MONTH.toLocaleString()} runs`);
  }
  if (dearer) {
    out.lose.push(`${dearer.toFixed(1)}x the cost — ${usd(selfCost)} vs ${usd(otherCost)} per ${RUNS_PER_MONTH.toLocaleString()} runs`);
  }

  const fewer = ratio(otherTokens, selfTokens);
  const more = ratio(selfTokens, otherTokens);
  if (fewer) out.gain.push(`${fewer.toFixed(1)}x fewer billed tokens — ${selfTokens.toLocaleString()} vs ${otherTokens.toLocaleString()}`);
  if (more) out.lose.push(`${more.toFixed(1)}x the billed tokens — ${selfTokens.toLocaleString()} vs ${otherTokens.toLocaleString()}`);

  if (self.durationMs && other.durationMs) {
    const faster = ratio(other.durationMs, self.durationMs);
    const slower = ratio(self.durationMs, other.durationMs);
    if (faster) out.gain.push(`${faster.toFixed(1)}x faster — ${secs(self.durationMs)} vs ${secs(other.durationMs)}`);
    if (slower) out.lose.push(`${slower.toFixed(1)}x slower — ${secs(self.durationMs)} vs ${secs(other.durationMs)}`);
  }

  const hidden = self.stats.reasoning_tokens ?? 0;
  if (hidden > 0) {
    const share = selfTokens ? Math.round((hidden / selfTokens) * 100) : 0;
    out.lose.push(`${share}% of the bill is reasoning you are never shown`);
  }

  return out;
}

function list(items, kind) {
  if (items.length === 0) return null;
  return el('ul', { class: `trade-list trade-${kind}` }, items.map((item) =>
    el('li', {}, [
      el('span', { class: 'trade-mark', 'aria-hidden': 'true' }, kind === 'gain' ? '+' : '−'),
      el('span', {}, typeof item === 'string' ? item : item.text),
      typeof item === 'object' && item.judgement
        ? el('span', { class: 'trade-tag' }, 'not measured here')
        : null,
    ])
  ));
}

function column(label, m, judged, tag = true) {
  // The "not measured here" tag distinguishes judgement from measurement. Where every
  // bullet is judgement, the tag marks nothing and is just noise on each line.
  const mark = (text) => (tag ? { text, judgement: true } : text);
  const gains = [...m.gain, ...(judged?.gain ?? []).map(mark)];
  const loses = [...m.lose, ...(judged?.lose ?? []).map(mark)];

  return el('div', { class: 'trade-col' }, [
    el('div', { class: 'pair-title muted' }, label),
    list(gains, 'gain'),
    list(loses, 'lose'),
  ]);
}

// judgementOnly: for cards whose diagram already carries tokens, time and money. Repeating
// those as bullets here is the duplication this panel was meant to end, not add to.
export function createTradeoff(config, judgementOnly = false) {
  const node = el('section', { class: 'tradeoff-panel', hidden: '' });

  return {
    node,

    update(runs) {
      const ok = runs.filter((r) => r.stats);
      if (ok.length < 2) {
        node.hidden = true;
        return;
      }

      node.hidden = false;
      node.replaceChildren(
        el('h4', {}, 'What you gain, what you lose'),
        el('div', { class: 'trade-grid' },
          ok.map((r, i) => column(
            r.variant,
            judgementOnly ? { gain: [], lose: [] } : measured(r, ok[i === 0 ? 1 : 0]),
            config[r.variant],
            !judgementOnly
          ))),
        el('p', { class: 'muted small' },
          judgementOnly
            ? 'The numbers are in the diagram above. These are the parts a token count cannot ' +
              'settle — this page measures cost, not answer quality.'
            : 'Tokens, money and time are measured from the run above. Anything tagged ' +
              '“not measured here” is guidance — this page measures cost, not answer quality.')
      );
    },
  };
}
