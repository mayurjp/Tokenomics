// What this browser session has actually spent, accumulated as you click.
//
// The distinction the panel has to keep straight: tokens *counted* by countTokens were never
// billed — it does no inference. Tokens from generateContent were. Merging the two
// into one "total tokens" number would be the single most misleading thing this page could
// do, so they are tracked and shown separately.

const state = {
  calls: { count: 0, measure: 0 },
  counted: 0,
  billed: { input: 0, output: 0, thinking: 0, total: 0 },
};

const listeners = [];
const notify = () => listeners.forEach((fn) => fn(state));

export function recordCount(result) {
  state.calls.count += 1;
  state.counted += result.tokens ?? 0;
  notify();
}

export function recordMeasure(result) {
  const s = result.stats;
  state.calls.measure += 1;
  state.billed.input += s.input_tokens ?? 0;
  state.billed.output += s.output_tokens ?? 0;
  // Absent reasoning means the model reported none — adding 0 to a running sum is correct
  // here, unlike displaying 0 for a single call where "not reported" is the honest label.
  state.billed.thinking += s.reasoning_tokens ?? 0;
  state.billed.total += s.total_tokens ?? 0;
  notify();
}

export function renderSession(el) {
  const body = el('div', { class: 'session-body' });

  const paint = (s) => {
    const totalCalls = s.calls.count + s.calls.measure;

    if (totalCalls === 0) {
      body.replaceChildren(
        el('p', { class: 'muted' },
          'Nothing yet. Every number below is what this page really spent — it fills in as you use it.')
      );
      return;
    }

    const billedShare = s.billed.total
      ? Math.round((s.billed.thinking / s.billed.total) * 100)
      : 0;

    body.replaceChildren(
      el('div', { class: 'tally' }, [
        tile(el, totalCalls, 'API calls', `${s.calls.count} counting · ${s.calls.measure} generating`),
        tile(el, s.billed.total, 'tokens billed', 'from generation calls only'),
        tile(el, s.counted, 'tokens counted', 'never billed — countTokens does no inference'),
      ]),
      s.calls.measure > 0
        ? el('div', { class: 'breakdown' }, [
            el('span', {}, `input ${s.billed.input.toLocaleString()}`),
            el('span', {}, `output ${s.billed.output.toLocaleString()}`),
            el('span', {}, `thinking ${s.billed.thinking.toLocaleString()}`),
            el('span', { class: 'muted' }, `— thinking is ${billedShare}% of everything you were billed for`),
          ])
        : el('p', { class: 'muted small' },
            'No generation calls yet. Counting is free; generating is not.'),
    );
  };

  listeners.push(paint);
  paint(state);

  return el('section', { class: 'session' }, [
    el('h3', {}, 'This session'),
    body,
  ]);
}

function tile(el, value, label, note) {
  return el('div', { class: 'tile' }, [
    el('div', { class: 'tile-value' }, value.toLocaleString()),
    el('div', { class: 'tile-label' }, label),
    el('div', { class: 'tile-note muted' }, note),
  ]);
}
