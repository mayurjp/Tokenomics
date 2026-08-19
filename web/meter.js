// What one card spent. Each card owns its own meter and tallies only the results it got
// back, so there is no shared state to keep in sync — the same reason cards do not depend
// on each other's results.
//
// A meter never claims a call that did not happen: demo-mode results carry demo: true, and
// the line says so rather than reporting API calls that were never sent.

import { el } from './dom.js';

export function createMeter() {
  const node = el('p', { class: 'meter muted small', hidden: '' });

  let calls = 0;
  let billed = 0;
  let counted = 0;
  let simulated = false;

  const paint = () => {
    node.hidden = calls === 0;
    if (calls === 0) return;

    const call = `${calls} ${simulated ? 'simulated call' : 'call'}${calls === 1 ? '' : 's'}`;

    if (billed > 0) {
      node.replaceChildren(
        `This card: ${call} · `,
        el('strong', {}, `${billed.toLocaleString()} tokens`),
        simulated ? ' — not charged, demo mode' : ' billed'
      );
      return;
    }

    // countTokens does no inference, so a counting card has a call count but no bill —
    // and that gap is worth stating rather than showing a bare zero.
    node.replaceChildren(
      `This card: ${call} · ${counted.toLocaleString()} tokens counted, nothing billed` +
        (simulated ? ' (demo mode)' : ' — countTokens does no inference')
    );
  };

  return {
    node,
    add(result) {
      calls += 1;
      simulated = result.demo === true;
      if (result.stats) billed += result.stats.total_tokens ?? 0;
      else counted += result.tokens ?? 0;
      paint();
    },
    reset() {
      calls = 0;
      billed = 0;
      counted = 0;
      paint();
    },
  };
}
