// Plain fetch + DOM, no framework and no build step. This file is served as-is.

import { renderCounter } from './counter.js';
import { renderSession, recordMeasure } from './session.js';

const API_BASE = (window.API_BASE || '').replace(/\/$/, '');

document.addEventListener('DOMContentLoaded', () => {
  loadWorkflows();
  document.getElementById('session').replaceChildren(renderSession(el));
  document.getElementById('counter').replaceChildren(renderCounter(API_BASE, el));
});

async function loadWorkflows() {
  const container = document.getElementById('workflows');

  try {
    const response = await fetch(`${API_BASE}/api/workflows`);
    if (!response.ok) throw new Error(await errorMessage(response));

    const { workflows } = await response.json();
    container.replaceChildren(...workflows.map(renderWorkflow));
  } catch (err) {
    container.replaceChildren(
      el('p', { class: 'error' }, `Could not reach the API at ${API_BASE || '(unset)'}: ${err.message}`)
    );
  }
}

function renderWorkflow(workflow) {
  const output = el('div', { class: 'output' });
  const button = el('button', { type: 'button' }, 'Run workflow');

  // Both runs of the same workflow are kept so the two modes sit side by side. That
  // comparison is the point — the numbers only mean something next to each other.
  const runs = { on: null, off: null };

  const controls = [button];
  let thinkingBox = null;

  if (workflow.supportsThinkingToggle) {
    thinkingBox = el('input', { type: 'checkbox', id: `thinking-${workflow.id}`, checked: '' });
    controls.push(
      el('label', { class: 'toggle', for: `thinking-${workflow.id}` }, [
        thinkingBox,
        el('span', {}, 'Thinking'),
      ])
    );
  }

  button.addEventListener('click', () =>
    runWorkflow(workflow, button, output, runs, thinkingBox ? thinkingBox.checked : true)
  );

  return el('article', { class: 'card' }, [
    el('h2', {}, workflow.label),
    el('p', { class: 'muted' }, workflow.description),
    el('p', { class: 'model' }, [el('span', { class: 'muted' }, 'Model: '), workflow.model]),
    el('h3', {}, 'Prompt'),
    el('pre', { class: 'prompt' }, workflow.prompt),
    el('div', { class: 'controls' }, controls),
    output,
  ]);
}

async function runWorkflow(workflow, button, output, runs, thinking) {
  button.disabled = true;
  button.textContent = 'Running…';
  const status = el('p', { class: 'muted' }, `Calling Gemini with thinking ${thinking ? 'on' : 'off'}…`);
  output.replaceChildren(...(runs.on || runs.off ? [renderComparison(runs), status] : [status]));

  try {
    const response = await fetch(`${API_BASE}/api/measure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowId: workflow.id, thinking }),
    });

    if (!response.ok) throw new Error(await errorMessage(response));

    const result = await response.json();
    recordMeasure(result);
    runs[thinking ? 'on' : 'off'] = result;
    output.replaceChildren(renderComparison(runs));
  } catch (err) {
    const parts = [el('p', { class: 'error' }, err.message)];
    if (runs.on || runs.off) parts.unshift(renderComparison(runs));
    output.replaceChildren(...parts);
  } finally {
    button.disabled = false;
    button.textContent = 'Run workflow';
  }
}

// Two columns, each filled in once that mode has been run. Until both exist there is
// nothing to compare, so the savings line stays absent rather than showing a fake zero.
function renderComparison(runs) {
  const columns = [
    runs.on && renderResult(runs.on, 'Thinking on'),
    runs.off && renderResult(runs.off, 'Thinking off'),
  ].filter(Boolean);

  const children = [el('div', { class: 'columns' }, columns)];

  if (runs.on && runs.off) {
    const before = runs.on.stats.total_tokens;
    const after = runs.off.stats.total_tokens;
    const pct = Math.round(((before - after) / before) * 100);
    children.push(
      el('p', { class: 'savings' },
        `Turning thinking off took total tokens from ${before.toLocaleString()} to ` +
        `${after.toLocaleString()} — ${pct}% fewer, for an answer of comparable length.`)
    );
  } else {
    children.push(
      el('p', { class: 'muted hint' }, 'Run it again with the toggle flipped to compare.')
    );
  }

  return el('div', { class: 'comparison' }, children);
}

function renderResult(result, heading) {
  const s = result.stats;

  return el('div', { class: 'result' }, [
    el('h3', {}, heading),
    el('table', { class: 'stats' }, [
      el('tbody', {}, [
        statRow('Input tokens', s.input_tokens),
        statRow('Output tokens', s.output_tokens),
        statRow('Total tokens', s.total_tokens, 'total'),
        statRow('Cache read tokens', s.cache_read_tokens),
        statRow('Cache write tokens', s.cache_write_tokens),
        statRow('Reasoning tokens', s.reasoning_tokens),
      ]),
    ]),
    el('h4', {}, 'Response'),
    el('pre', { class: 'response' }, result.response_text || '(empty response)'),
  ]);
}

// A value the API did not report renders as "not reported", never as 0 — absent and zero
// are different facts.
function statRow(label, value, className) {
  const reported = value !== null && value !== undefined;

  return el('tr', className ? { class: className } : {}, [
    el('th', { scope: 'row' }, label),
    el('td', reported ? {} : { class: 'muted' }, reported ? value.toLocaleString() : 'not reported'),
  ]);
}

async function errorMessage(response) {
  try {
    const body = await response.json();
    if (body?.error) return body.error;
  } catch {
    // fall through — the error body wasn't JSON
  }
  return `Request failed with status ${response.status}`;
}

export function el(tag, attrs, children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs || {})) node.setAttribute(name, value);
  if (tag === 'input' && attrs && 'checked' in attrs) node.checked = true;

  for (const child of [].concat(children ?? [])) {
    node.append(typeof child === 'string' ? child : child);
  }
  return node;
}
