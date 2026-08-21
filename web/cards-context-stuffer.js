import { el } from './dom.js';

export function contextStufferCard(body) {
  const container = el('div', { class: 'stuffer-sandbox' });

  // State
  let haystackSize = 32000; // default 32k tokens
  let needlePosition = 'middle'; // 'start', 'middle', 'end'
  let isTesting = false;

  // Header & Gemini 1.5 Callout
  const header = el('div', { class: 'sandbox-header' }, [
    el('h3', {}, 'The "Lost in the Middle" Phenomenon'),
    el('p', { class: 'muted small' }, 'Build a massive prompt and hide a fact (the "needle") inside it. See how standard LLMs struggle to recall facts placed in the middle of a large context window.')
  ]);

  const geminiCallout = el('div', { class: 'gemini-callout' }, [
    el('strong', {}, '✨ Gemini 1.5 Exception:'),
    ' While standard models suffer from this U-shaped degradation curve, Gemini 1.5 Pro features a massive 2-million token context window with near-perfect retrieval across the entire span.'
  ]);

  // Visualizer Bar
  const visualizerBox = el('div', { class: 'stuffer-visualizer' }, [
    el('div', { class: 'stuffer-bar-wrapper' }, [
      el('div', { class: 'stuffer-bar haystack-bg' }, [
        el('div', { class: 'stuffer-needle', id: 'needle-element' }, '📍 Needle')
      ])
    ]),
    el('div', { class: 'stuffer-labels' }, [
      el('span', {}, '0 Tokens'),
      el('span', { id: 'max-tokens-label' }, '32,000 Tokens')
    ])
  ]);

  // Controls
  const controlsBox = el('div', { class: 'stuffer-controls' }, [
    // Haystack Size Controls
    el('div', { class: 'control-group' }, [
      el('label', {}, 'Haystack Size (Tokens):'),
      el('div', { class: 'button-group', id: 'size-buttons' }, [
        el('button', { class: 'size-btn', 'data-size': '10000' }, '10k'),
        el('button', { class: 'size-btn active', 'data-size': '32000' }, '32k'),
        el('button', { class: 'size-btn', 'data-size': '64000' }, '64k'),
        el('button', { class: 'size-btn', 'data-size': '128000' }, '128k (Max)')
      ])
    ]),
    // Needle Position Controls
    el('div', { class: 'control-group' }, [
      el('label', {}, 'Needle Placement:'),
      el('div', { class: 'button-group', id: 'pos-buttons' }, [
        el('button', { class: 'pos-btn', 'data-pos': 'start' }, 'Beginning'),
        el('button', { class: 'pos-btn active', 'data-pos': 'middle' }, 'Middle'),
        el('button', { class: 'pos-btn', 'data-pos': 'end' }, 'End')
      ])
    ])
  ]);

  // Action & Result
  const actionBox = el('div', { class: 'stuffer-action' }, [
    el('button', { class: 'test-retrieval-btn', id: 'test-btn' }, 'Query Standard Model (Test Retrieval)'),
    el('div', { class: 'retrieval-result', id: 'retrieval-result' }, '')
  ]);

  container.append(header, geminiCallout, visualizerBox, controlsBox, actionBox);
  body.replaceChildren(container);

  // Logic & Render
  const updateVisuals = () => {
    // Update Size Labels
    container.querySelector('#max-tokens-label').textContent = `${(haystackSize).toLocaleString()} Tokens`;
    
    // Update Buttons UI
    container.querySelectorAll('.size-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.getAttribute('data-size')) === haystackSize);
    });
    container.querySelectorAll('.pos-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-pos') === needlePosition);
    });

    // Update Needle Position visually
    const needle = container.querySelector('#needle-element');
    needle.className = `stuffer-needle pos-${needlePosition}`;
    
    // Clear result if settings changed
    container.querySelector('#retrieval-result').className = 'retrieval-result';
    container.querySelector('#retrieval-result').textContent = '';
  };

  // Event Listeners
  container.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      haystackSize = parseInt(e.target.getAttribute('data-size'));
      updateVisuals();
    });
  });

  container.querySelectorAll('.pos-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      needlePosition = e.target.getAttribute('data-pos');
      updateVisuals();
    });
  });

  container.querySelector('#test-btn').addEventListener('click', async () => {
    if (isTesting) return;
    isTesting = true;
    
    const btn = container.querySelector('#test-btn');
    const resultBox = container.querySelector('#retrieval-result');
    
    btn.textContent = 'Querying standard model...';
    btn.disabled = true;
    resultBox.className = 'retrieval-result processing';
    resultBox.textContent = 'Searching through context window...';

    // Simulate network delay
    await new Promise(r => setTimeout(r, 1200));

    // Simulation logic (Standard Model U-Curve)
    // - Always finds it at start or end.
    // - Misses it in the middle if > 64k tokens.
    let success = true;
    let reason = '';

    if (needlePosition === 'middle' && haystackSize >= 64000) {
      success = false;
      reason = `The model lost focus on the middle section due to the massive ${haystackSize / 1000}k token size.`;
    } else if (needlePosition === 'middle') {
      reason = 'The context was small enough (<= 32k) that the model could still attend to the middle.';
    } else {
      reason = 'Models naturally pay high attention to the beginning (priming) and end (recency bias) of a prompt.';
    }

    if (success) {
      resultBox.className = 'retrieval-result success';
      resultBox.innerHTML = `<strong>✅ Retrieval Successful!</strong><br><span class="small">${reason}</span>`;
    } else {
      resultBox.className = 'retrieval-result error';
      resultBox.innerHTML = `<strong>❌ Retrieval Failed (Hallucination)</strong><br><span class="small">${reason}</span>`;
    }

    btn.textContent = 'Query Standard Model (Test Retrieval)';
    btn.disabled = false;
    isTesting = false;
  });

  // Initial render
  updateVisuals();
}
