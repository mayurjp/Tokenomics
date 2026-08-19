// The Batch API card: submit a real job, then wait.
//
// This is the one card whose lesson is the latency. Batch is the same model and the same
// tokens at half price, and what you pay instead is that nothing comes back for minutes or
// hours. A table saying so is easy to nod at; a button that submits and then makes you
// leave the page is the actual experience.
//
// The job name is persisted, so closing the tab and coming back later works — which is how
// you would really use this, and is itself part of the point.

import { el } from './dom.js';
import { createBatch, getBatch } from './gemini.js';
import { isDemo } from './api.js';
import { demoBatchCreate, demoBatchPoll } from './fixtures.js';
import { priceFor, usd, PRICING_DATE, BATCH_DISCOUNT, RUNS_PER_MONTH } from './pricing.js';

const STORE_KEY = 'tokenomics.batch_job';
const MODEL = 'gemini-3.5-flash';
// Real batch jobs run for minutes to hours, so polling hard would be rude and pointless.
// The demo compresses the same state machine into seconds, and a 10s poll would step
// straight over the running state — so the cadence follows the mode.
const POLL_LIVE_MS = 10000;
const POLL_DEMO_MS = 1500;

const PROMPT =
  'Explain in three short paragraphs why a large language model bills for input tokens and ' +
  'output tokens separately, and what that means for someone designing a prompt they intend ' +
  'to send thousands of times.';

const STATE_LABEL = {
  JOB_STATE_PENDING: 'queued',
  JOB_STATE_RUNNING: 'running',
  JOB_STATE_SUCCEEDED: 'finished',
  JOB_STATE_FAILED: 'failed',
  JOB_STATE_CANCELLED: 'cancelled',
  JOB_STATE_EXPIRED: 'expired',
  JOB_STATE_UNSPECIFIED: 'unknown',
};

function loadJob() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
  } catch {
    return null;
  }
}

function saveJob(job) {
  try {
    if (job) localStorage.setItem(STORE_KEY, JSON.stringify(job));
    else localStorage.removeItem(STORE_KEY);
  } catch {
    // A job that cannot be persisted still polls for this page load.
  }
}

function elapsed(since) {
  const secs = Math.max(0, Math.round((Date.now() - since) / 1000));
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function batchCard(body) {
  const status = el('div', { class: 'batch-status' });
  const result = el('div', {});
  const submit = el('button', { type: 'button' }, 'Submit batch job');
  const forget = el('button', { type: 'button', class: 'ghost' }, 'Forget job');

  let timer = null;
  let ticker = null;

  const stop = () => {
    clearInterval(timer);
    clearInterval(ticker);
    timer = null;
    ticker = null;
  };

  const setControls = (job) => {
    submit.disabled = Boolean(job);
    submit.textContent = job ? 'Job in flight' : 'Submit batch job';
    forget.hidden = !job;
  };

  const showWaiting = (job, state) => {
    status.replaceChildren(
      el('p', {}, [
        el('strong', {}, STATE_LABEL[state] ?? state),
        el('span', { class: 'muted' }, ` · waiting ${elapsed(job.startedAt)}`),
      ]),
      el('p', { class: 'muted small' }, [
        el('code', {}, job.name),
        ' — Google targets 24 hours and is usually much faster. You can close this page; ' +
          'the job is remembered and picked up when you come back.',
      ])
    );
  };

  const showDone = (job, batch) => {
    stop();

    if (batch.failed) {
      status.replaceChildren(
        el('p', { class: 'error' }, `Job ${STATE_LABEL[batch.state] ?? batch.state}${batch.error ? `: ${batch.error}` : '.'}`)
      );
      saveJob(null);
      setControls(null);
      return;
    }

    const p = priceFor(MODEL);
    const s = batch.stats;

    status.replaceChildren(
      el('p', {}, [
        el('strong', {}, 'finished'),
        el('span', { class: 'muted' }, ` · took ${elapsed(job.startedAt)} from submission`),
      ])
    );

    const rows = [];
    if (s) {
      const interactive = ((s.input_tokens ?? 0) * p.in + ((s.output_tokens ?? 0) + (s.reasoning_tokens ?? 0)) * p.out) / 1e6;
      const batched = interactive * (1 - BATCH_DISCOUNT);

      rows.push(
        el('table', { class: 'stats' }, [
          el('tbody', {}, [
            statRow('Input', s.input_tokens),
            statRow('Output', s.output_tokens),
            statRow('Thinking', s.reasoning_tokens),
            statRow('Total', s.total_tokens, 'total'),
          ]),
        ]),
        el('p', { class: 'money' }, [
          el('span', {}, `At ${RUNS_PER_MONTH.toLocaleString()} runs a month, interactive costs `),
          el('strong', {}, usd(interactive * RUNS_PER_MONTH)),
          el('span', {}, ' and batch costs '),
          el('strong', {}, usd(batched * RUNS_PER_MONTH)),
          el('span', {}, ' — the same tokens for half the money.'),
          el('span', { class: 'muted small block' },
            `Hypothetical: paid-tier list prices as of ${PRICING_DATE}.`),
        ])
      );
    } else {
      rows.push(
        el('p', { class: 'muted small' },
          'The batch result carried no usage metadata, so there are no token counts to show — ' +
          'reported as absent rather than guessed at.')
      );
    }

    result.replaceChildren(
      ...rows,
      el('h4', {}, 'Response'),
      el('pre', { class: 'response small' }, batch.response_text || '(empty)')
    );

    saveJob(null);
    setControls(null);
  };

  const poll = async (job) => {
    try {
      const batch = isDemo() ? await demoBatchPoll(job) : await getBatch(job.name);
      if (batch.done) showDone(job, batch);
      else showWaiting(job, batch.state);
    } catch (err) {
      stop();
      status.replaceChildren(el('p', { class: 'error' }, err.message));
      setControls(null);
      saveJob(null);
    }
  };

  const watch = (job) => {
    setControls(job);
    showWaiting(job, 'JOB_STATE_PENDING');
    poll(job);
    timer = setInterval(() => poll(job), isDemo() ? POLL_DEMO_MS : POLL_LIVE_MS);
    // A separate, faster tick just for the elapsed-time text — the wait is the lesson, so
    // it should visibly accumulate rather than jump every ten seconds.
    ticker = setInterval(() => {
      const strong = status.querySelector('span.muted');
      if (strong) strong.textContent = ` · waiting ${elapsed(job.startedAt)}`;
    }, 1000);
  };

  submit.addEventListener('click', async () => {
    submit.disabled = true;
    submit.textContent = 'Submitting…';
    result.replaceChildren();
    status.replaceChildren(el('p', { class: 'muted' }, 'Submitting…'));

    try {
      const created = isDemo()
        ? await demoBatchCreate()
        : await createBatch(PROMPT, MODEL, 'token-economics-explorer');
      const job = { name: created.name, startedAt: Date.now(), demo: isDemo() };
      saveJob(job);
      watch(job);
    } catch (err) {
      status.replaceChildren(el('p', { class: 'error' }, err.message));
      setControls(null);
    }
  });

  forget.addEventListener('click', () => {
    stop();
    saveJob(null);
    setControls(null);
    status.replaceChildren();
    result.replaceChildren();
  });

  body.replaceChildren(
    el('p', { class: 'muted small' },
      'Submits one real batch job. The tokens and the model are identical to an interactive ' +
      'call; only the price and the waiting differ.'),
    el('details', { class: 'prompts' }, [
      el('summary', {}, 'Show what gets sent'),
      el('pre', { class: 'prompt small' }, PROMPT),
      el('div', { class: 'flags muted small' }, `model ${MODEL} · batchGenerateContent`),
    ]),
    el('div', { class: 'controls' }, [submit, forget]),
    status,
    result
  );

  // Picking up a job left from an earlier visit is the normal case for batch, not an edge.
  const existing = loadJob();
  if (existing && existing.demo === isDemo()) watch(existing);
  else setControls(null);
}

function statRow(label, value, cls) {
  const reported = value !== null && value !== undefined;
  return el('tr', cls ? { class: cls } : {}, [
    el('th', { scope: 'row' }, label),
    el('td', reported ? {} : { class: 'muted' }, reported ? value.toLocaleString() : 'not reported'),
  ]);
}
