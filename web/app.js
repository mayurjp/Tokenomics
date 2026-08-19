// Plain fetch + DOM, no framework and no build step. This file is served as-is.

const API_BASE = (window.API_BASE || '').replace(/\/$/, '');

document.addEventListener('DOMContentLoaded', loadWorkflows);

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

  button.addEventListener('click', () => runWorkflow(workflow, button, output));

  return el('article', { class: 'card' }, [
    el('h2', {}, workflow.label),
    el('p', { class: 'muted' }, workflow.description),
    el('p', { class: 'model' }, [el('span', { class: 'muted' }, 'Model: '), workflow.model]),
    el('h3', {}, 'Prompt'),
    el('pre', { class: 'prompt' }, workflow.prompt),
    button,
    output,
  ]);
}

async function runWorkflow(workflow, button, output) {
  button.disabled = true;
  button.textContent = 'Running…';
  output.replaceChildren(el('p', { class: 'muted' }, 'Calling Gemini…'));

  try {
    const response = await fetch(`${API_BASE}/api/measure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowId: workflow.id }),
    });

    if (!response.ok) throw new Error(await errorMessage(response));

    output.replaceChildren(renderResult(await response.json()));
  } catch (err) {
    output.replaceChildren(el('p', { class: 'error' }, err.message));
  } finally {
    button.disabled = false;
    button.textContent = 'Run workflow';
  }
}

function renderResult(result) {
  const s = result.stats;

  return el('div', { class: 'result' }, [
    el('h3', {}, 'Tokens'),
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
    el('h3', {}, 'Response'),
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

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs || {})) node.setAttribute(name, value);

  for (const child of [].concat(children ?? [])) {
    node.append(typeof child === 'string' ? child : child);
  }
  return node;
}
