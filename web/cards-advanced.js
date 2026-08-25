import { el } from './dom.js';

export function kvCacheCard(body) {
  body.replaceChildren(
    el('div', { class: 'demo-banner' }, [
      el('strong', {}, 'Visualizer'),
      ' — Observe how memory usage changes as concurrent requests hit the model.'
    ]),
    el('div', { class: 'mech-scroll' }, [
      el('div', { style: 'display: flex; gap: 1rem; margin-top: 1rem; flex-wrap: wrap;' }, [
        el('div', { style: 'flex: 1; min-width: 300px; padding: 1rem; border: 1px solid var(--line); border-radius: 8px;' }, [
          el('h4', { style: 'margin-top: 0;' }, 'Without KV Caching'),
          el('div', { class: 'flow-bar', style: 'margin-bottom: 0.5rem;' }, [
            el('div', { class: 'flow-seg seg-input', style: 'width: 40%;' }),
            el('div', { class: 'flow-seg seg-output', style: 'width: 60%;' })
          ]),
          el('div', { class: 'flow-bar', style: 'margin-bottom: 0.5rem;' }, [
            el('div', { class: 'flow-seg seg-input', style: 'width: 40%;' }),
            el('div', { class: 'flow-seg seg-output', style: 'width: 40%;' })
          ]),
          el('p', { class: 'muted small' }, 'Memory scales O(N) with each concurrent request.')
        ]),
        el('div', { style: 'flex: 1; min-width: 300px; padding: 1rem; border: 1px solid var(--accent); border-radius: 8px; background: color-mix(in srgb, var(--accent) 5%, transparent);' }, [
          el('h4', { style: 'margin-top: 0; color: var(--accent);' }, 'With KV Caching (Prefix Sharing)'),
          el('div', { class: 'flow-bar', style: 'margin-bottom: 0.5rem;' }, [
            el('div', { class: 'flow-seg seg-cache', style: 'width: 40%;' }),
            el('div', { class: 'flow-seg seg-output', style: 'width: 60%;' })
          ]),
          el('div', { class: 'flow-bar', style: 'margin-bottom: 0.5rem;' }, [
            el('div', { class: 'flow-seg seg-cache', style: 'width: 40%;' }),
            el('div', { class: 'flow-seg seg-output', style: 'width: 40%;' })
          ]),
          el('p', { class: 'muted small' }, 'Prefix memory is O(1). Only the new output tokens consume extra KV cache.')
        ])
      ])
    ])
  );
}

export function promptCompressionCard(body) {
  body.replaceChildren(
    el('div', { class: 'demo-banner' }, [
      el('strong', {}, 'Compression Visualizer'),
      ' — Stripping redundant tokens before generating.'
    ]),
    el('div', { class: 'pair-grid' }, [
      el('div', { class: 'pair-side' }, [
        el('h4', {}, 'Original Prompt'),
        el('pre', { class: 'prompt' }, 'Here is a very long and detailed instruction manual that contains many words that are not strictly necessary for the language model to understand the core intent of the user. It is very verbose and highly repetitive.'),
        el('div', { class: 'readout' }, [
          el('div', { class: 'big' }, '42'),
          el('div', { class: 'muted small' }, 'Tokens')
        ])
      ]),
      el('div', { class: 'pair-side' }, [
        el('h4', {}, 'Compressed Prompt (LLMLingua)'),
        el('pre', { class: 'prompt' }, 'long detailed instruction manual contains words not strictly necessary language model understand core intent user verbose highly repetitive.'),
        el('div', { class: 'readout' }, [
          el('div', { class: 'big' }, '19'),
          el('div', { class: 'muted small' }, 'Tokens (55% reduction)')
        ])
      ])
    ])
  );
}

export function agenticMultiplierCard(body) {
  const tokenCounts = [150, 450, 950, 1650, 2550];
  let step = 0;
  
  const stepLabel = el('span', {}, 'Step 0: Initial Prompt');
  const tokenDisplay = el('div', { class: 'big' }, '150');
  
  const nextBtn = el('button', { type: 'button' }, 'Agent Action');
  
  nextBtn.addEventListener('click', () => {
    step = (step + 1) % tokenCounts.length;
    tokenDisplay.textContent = tokenCounts[step].toString();
    stepLabel.textContent = 'Step ' + step + ': ' + (step === 0 ? 'Initial Prompt' : 'Thought + Action + Observation appended');
  });

  body.replaceChildren(
    el('p', { class: 'muted small' }, 'Simulate an agent looping through thought, action, and observation without external state management. Watch the context window balloon.'),
    el('div', { style: 'padding: 1.5rem; border: 1px solid var(--line); border-radius: 8px; text-align: center; margin-bottom: 1rem; background: var(--bg);' }, [
      el('h3', {}, stepLabel),
      el('div', { class: 'readout', style: 'margin-top: 1rem;' }, [
        tokenDisplay,
        el('div', { class: 'muted small' }, 'Input Tokens Sent')
      ]),
    ]),
    el('div', { class: 'controls', style: 'justify-content: center;' }, [nextBtn])
  );
}

export function roiCalculatorCard(body) {
  const FT_UPFRONT = 500.00;
  const FT_INPUT_COST = 0.30;
  
  const RAG_INPUT_COST = 0.15;
  const RAG_ADDED_TOKENS = 2000;
  
  const BASE_PROMPT_TOKENS = 500;
  
  const volumeSlider = el('input', { type: 'range', min: '10000', max: '2000000', step: '10000', value: '100000', style: 'width: 100%; cursor: pointer;' });
  const volumeLabel = el('div', { class: 'big' }, '100,000');
  
  const ragCostDisplay = el('div', { class: 'big' }, '$0.00');
  const ftCostDisplay = el('div', { class: 'big' }, '$0.00');
  const verdictDisplay = el('p', { class: 'savings' }, '');
  
  function update() {
    const volume = parseInt(volumeSlider.value, 10);
    volumeLabel.textContent = volume.toLocaleString() + ' reqs/mo';
    
    const ragCost = (volume * (BASE_PROMPT_TOKENS + RAG_ADDED_TOKENS) * RAG_INPUT_COST) / 1000000;
    const ftCost = FT_UPFRONT + ((volume * BASE_PROMPT_TOKENS * FT_INPUT_COST) / 1000000);
    
    ragCostDisplay.textContent = '$' + ragCost.toFixed(2);
    ftCostDisplay.textContent = '$' + ftCost.toFixed(2);
    
    if (ragCost > ftCost) {
      verdictDisplay.textContent = 'At this volume, Fine-tuning is cheaper despite the $500 upfront cost because RAG\'s heavy input tokens add up quickly.';
      verdictDisplay.style.borderLeftColor = 'var(--flow-output)';
    } else {
      verdictDisplay.textContent = 'At this volume, RAG is cheaper. The recurring cost of retrieved tokens has not yet exceeded the $500 upfront cost to fine-tune.';
      verdictDisplay.style.borderLeftColor = 'var(--accent)';
    }
  }
  
  volumeSlider.addEventListener('input', update);
  
  body.replaceChildren(
    el('div', { style: 'margin-bottom: 1.5rem;' }, [
      el('h4', { style: 'margin-bottom: 0.5rem;' }, 'Monthly Request Volume'),
      volumeSlider,
      volumeLabel
    ]),
    el('div', { class: 'pair-grid' }, [
      el('div', { class: 'pair-side' }, [
        el('h4', {}, 'RAG Strategy'),
        el('p', { class: 'muted small', style: 'margin-top: 0;' }, 'Base model + ' + RAG_ADDED_TOKENS + ' retrieved tokens per request'),
        el('div', { class: 'readout' }, [
          ragCostDisplay,
          el('div', { class: 'muted small' }, 'Total Monthly Cost')
        ])
      ]),
      el('div', { class: 'pair-side' }, [
        el('h4', {}, 'Fine-Tuning Strategy'),
        el('p', { class: 'muted small', style: 'margin-top: 0;' }, '$' + FT_UPFRONT + ' upfront + base prompt only'),
        el('div', { class: 'readout' }, [
          ftCostDisplay,
          el('div', { class: 'muted small' }, 'Total Monthly Cost (Amortized 1st month)')
        ])
      ])
    ]),
    verdictDisplay
  );
  
  update();
}

export function multimodalCard(body) {
  const resolutionSlider = el('input', { type: 'range', min: '256', max: '4096', step: '256', value: '512', style: 'width: 100%; cursor: pointer;' });
  const resLabel = el('div', { class: 'big' }, '512x512');
  const tokenDisplay = el('div', { class: 'big' }, '258'); // (512/512 = 1 tile * 170) + 85 base
  
  resolutionSlider.addEventListener('input', () => {
    const val = parseInt(resolutionSlider.value, 10);
    resLabel.textContent = `${val}x${val}`;
    
    // Simplistic mock token logic: Base 85 tokens + 170 per 512x512 tile
    const tiles = Math.ceil(val / 512) * Math.ceil(val / 512);
    const tokens = 85 + (tiles * 170);
    tokenDisplay.textContent = tokens.toString();
  });
  
  body.replaceChildren(
    el('p', { class: 'muted small' }, 'Simulate how an image resolution increases token counts by slicing into 512x512 tiles.'),
    el('div', { style: 'margin-bottom: 1.5rem;' }, [
      el('h4', { style: 'margin-bottom: 0.5rem;' }, 'Image Resolution (Square)'),
      resolutionSlider,
      resLabel
    ]),
    el('div', { class: 'readout', style: 'margin-top: 1rem;' }, [
      tokenDisplay,
      el('div', { class: 'muted small' }, 'Input Tokens (Mock Example)')
    ])
  );
}

export function quadraticAttentionCard(body) {
  body.replaceChildren(
    el('div', { class: 'demo-banner' }, [
      el('strong', {}, 'O(N²) Scaling Visualizer'),
      ' — See how compute cost explodes as context size doubles.'
    ]),
    el('div', { class: 'pair-grid' }, [
      el('div', { class: 'pair-side' }, [
        el('h4', {}, '10k Context'),
        el('div', { class: 'flow-bar', style: 'margin-bottom: 0.5rem; width: 10%; background: var(--flow-input);' }),
        el('p', { class: 'muted small' }, 'Base unit of compute (N).')
      ]),
      el('div', { class: 'pair-side' }, [
        el('h4', {}, '100k Context (10x larger)'),
        el('div', { class: 'flow-bar', style: 'margin-bottom: 0.5rem; width: 100%; background: var(--error);' }),
        el('p', { class: 'muted small' }, 'Compute required scales to N² (100x more compute, not 10x).')
      ])
    ])
  );
}

export function speculativeDecodingCard(body) {
  body.replaceChildren(
    el('div', { class: 'demo-banner' }, [
      el('strong', {}, 'Latency Economics'),
      ' — A 1B draft model proposes, a 70B target model verifies.'
    ]),
    el('div', { class: 'mech-scroll' }, [
      el('div', { style: 'padding: 1rem; border: 1px solid var(--line); border-radius: 8px; margin-bottom: 1rem;' }, [
        el('h4', { style: 'margin-top: 0;' }, 'Standard Generation'),
        el('div', { class: 'flow-pipeline' }, [
          el('div', { class: 'flow-chip flow-model' }, '70B Target'),
          el('div', { class: 'flow-arrow' }, '→'),
          el('div', { class: 'flow-chip' }, 'T1'),
          el('div', { class: 'flow-chip flow-model' }, '70B Target'),
          el('div', { class: 'flow-arrow' }, '→'),
          el('div', { class: 'flow-chip' }, 'T2')
        ]),
        el('p', { class: 'muted small' }, '2 sequential passes. 2 tokens generated.')
      ]),
      el('div', { style: 'padding: 1rem; border: 1px solid var(--accent); border-radius: 8px;' }, [
        el('h4', { style: 'margin-top: 0; color: var(--accent);' }, 'Speculative Decoding'),
        el('div', { class: 'flow-pipeline' }, [
          el('div', { class: 'flow-chip flow-model', style: 'background: transparent;' }, '1B Draft proposes [T1, T2]'),
          el('div', { class: 'flow-arrow' }, '→'),
          el('div', { class: 'flow-chip flow-model' }, '70B Target verifies in parallel'),
          el('div', { class: 'flow-arrow' }, '→'),
          el('div', { class: 'flow-chip' }, 'T1, T2')
        ]),
        el('p', { class: 'muted small' }, '1 sequential pass of the heavy model. 2 tokens generated simultaneously.')
      ])
    ])
  );
}

export function tokenRuleOfThreeCard(body) {
  const RATE_IN = 3; // $ / 1M input tokens
  const RATE_OUT = 15; // $ / 1M output tokens
  const RATE_THINK = 15; // thinking is billed as output

  const wordsSlider = el('input', { type: 'range', min: '50', max: '5000', step: '50', value: '1000', style: 'width: 100%; cursor: pointer;' });
  const wordsLabel = el('div', { class: 'big' }, '1,000 words');

  const tokenDisplay = el('div', { class: 'big' }, '1,300');
  const inputBar = el('div', { class: 'flow-seg seg-input' });
  const outputBar = el('div', { class: 'flow-seg seg-output' });
  const thinkBar = el('div', { class: 'flow-seg seg-think' });
  const costDisplay = el('div', { class: 'big' }, '$0.00');
  const breakdown = el('p', { class: 'muted small' }, '');

  function update() {
    const words = parseInt(wordsSlider.value, 10);
    wordsLabel.textContent = words.toLocaleString() + ' words';

    // Rule of three: ~1.3x word->token inflation, output priced ~5x input,
    // thinking (when present) adds a further multiple on top of the answer.
    const inputTokens = Math.round(words * 1.3);
    const outputTokens = Math.round(inputTokens * 0.3); // a reply shorter than the prompt
    const thinkingTokens = Math.round(outputTokens * 2); // reasoning trace, never shown

    const inputCost = (inputTokens / 1e6) * RATE_IN;
    const outputCost = (outputTokens / 1e6) * RATE_OUT;
    const thinkCost = (thinkingTokens / 1e6) * RATE_THINK;
    const total = inputCost + outputCost + thinkCost;

    tokenDisplay.textContent = inputTokens.toLocaleString();
    costDisplay.textContent = '$' + total.toFixed(4);

    const inputPct = (inputCost / total) * 100;
    const outputPct = (outputCost / total) * 100;
    const thinkPct = (thinkCost / total) * 100;
    inputBar.style.width = inputPct + '%';
    outputBar.style.width = outputPct + '%';
    thinkBar.style.width = thinkPct + '%';

    breakdown.textContent = `Input ${inputPct.toFixed(0)}% · Output ${outputPct.toFixed(0)}% · Thinking ${thinkPct.toFixed(0)}% of the bill — from ${inputTokens.toLocaleString()} input, ${outputTokens.toLocaleString()} output and ${thinkingTokens.toLocaleString()} thinking tokens.`;
  }

  wordsSlider.addEventListener('input', update);

  body.replaceChildren(
    el('p', { class: 'muted small' }, 'A prompt inflates by ~30% going from words to tokens. What you pay for it is decided almost entirely by the smaller, pricier half: output and thinking.'),
    el('div', { style: 'margin-bottom: 1rem;' }, [
      el('h4', { style: 'margin-bottom: 0.5rem;' }, 'Prompt Length'),
      wordsSlider,
      wordsLabel,
    ]),
    el('div', { class: 'pair-grid' }, [
      el('div', { class: 'pair-side' }, [
        el('h4', {}, 'Tokens (from words)'),
        el('div', { class: 'readout' }, [tokenDisplay, el('div', { class: 'muted small' }, 'Input tokens, at 1.3x words')]),
      ]),
      el('div', { class: 'pair-side' }, [
        el('h4', {}, 'Total Cost'),
        el('div', { class: 'readout' }, [costDisplay, el('div', { class: 'muted small' }, 'Input + output + thinking')]),
      ]),
    ]),
    el('div', { class: 'flow-bar', style: 'margin-top: 1rem;' }, [inputBar, outputBar, thinkBar]),
    breakdown,
  );

  update();
}

export function budgetControllerCard(body) {
  const STEP_TOKENS = [150, 450, 950, 1650, 2550, 3800, 5400, 7300];
  const RATE_BLENDED = 6; // $ / 1M tokens, blended in/out for this simulation
  const capInput = el('input', { type: 'number', min: '0.01', max: '1', step: '0.01', value: '0.15', style: 'width: 6rem;' });

  let step = 0;
  let cumulativeCost = 0;
  let tripped = false;

  const stepLabel = el('span', {}, 'Step 0 — idle');
  const costDisplay = el('div', { class: 'big' }, '$0.0000');
  const statusDisplay = el('p', { class: 'savings' }, 'Press "Agent retries" to start the loop.');
  const runBtn = el('button', { type: 'button' }, 'Agent retries');
  const resetBtn = el('button', { type: 'button', class: 'muted' }, 'Reset');

  function attempt() {
    if (tripped) return;
    const tokens = STEP_TOKENS[Math.min(step, STEP_TOKENS.length - 1)];
    const stepCost = (tokens / 1e6) * RATE_BLENDED;
    cumulativeCost += stepCost;
    step += 1;
    stepLabel.textContent = `Step ${step} — retry spent ${tokens.toLocaleString()} tokens`;
    costDisplay.textContent = '$' + cumulativeCost.toFixed(4);

    const cap = parseFloat(capInput.value) || 0.15;
    if (cumulativeCost >= cap) {
      tripped = true;
      statusDisplay.textContent = `Circuit breaker tripped at $${cumulativeCost.toFixed(4)} — budget ceiling was $${cap.toFixed(2)}. Halted after ${step} retries, escalating instead of continuing.`;
      statusDisplay.style.borderLeftColor = 'var(--error)';
      runBtn.setAttribute('disabled', 'true');
    } else {
      statusDisplay.textContent = `$${(cap - cumulativeCost).toFixed(4)} left in this task's budget.`;
      statusDisplay.style.borderLeftColor = 'var(--accent)';
    }
  }

  function reset() {
    step = 0;
    cumulativeCost = 0;
    tripped = false;
    stepLabel.textContent = 'Step 0 — idle';
    costDisplay.textContent = '$0.0000';
    statusDisplay.textContent = 'Press "Agent retries" to start the loop.';
    statusDisplay.style.borderLeftColor = '';
    runBtn.removeAttribute('disabled');
  }

  runBtn.addEventListener('click', attempt);
  resetBtn.addEventListener('click', reset);

  body.replaceChildren(
    el('p', { class: 'muted small' }, 'A validation loop that fails keeps retrying, and each retry carries more history than the last. Without a ceiling, nothing stops it.'),
    el('div', { style: 'margin-bottom: 1rem; display: flex; align-items: center; gap: 0.6rem;' }, [
      el('label', { class: 'muted small' }, 'Budget ceiling per task ($)'),
      capInput,
    ]),
    el('div', { style: 'padding: 1.5rem; border: 1px solid var(--line); border-radius: 8px; text-align: center; margin-bottom: 1rem; background: var(--bg);' }, [
      el('h3', {}, stepLabel),
      el('div', { class: 'readout', style: 'margin-top: 1rem;' }, [costDisplay, el('div', { class: 'muted small' }, 'Cumulative session cost')]),
    ]),
    statusDisplay,
    el('div', { class: 'controls', style: 'justify-content: center;' }, [runBtn, resetBtn]),
  );
}

export function costPerOutcomeCard(body) {
  const RATE_A = { in: 3, out: 15 };
  const volumeSlider = el('input', { type: 'range', min: '1000', max: '5000000', step: '1000', value: '100000', style: 'width: 100%; cursor: pointer;' });
  const volumeLabel = el('div', { class: 'big' }, '100,000');
  const successSlider = el('input', { type: 'range', min: '50', max: '99', step: '1', value: '85', style: 'width: 100%; cursor: pointer;' });
  const successLabel = el('div', { class: 'big' }, '85%');

  const perCallDisplay = el('div', { class: 'big' }, '$0.00');
  const perOutcomeDisplay = el('div', { class: 'big' }, '$0.00');
  const verdictDisplay = el('p', { class: 'savings' }, '');

  const IN_TOK = 500;
  const OUT_TOK = 300;

  function update() {
    const volume = parseInt(volumeSlider.value, 10);
    const successRate = parseInt(successSlider.value, 10) / 100;
    volumeLabel.textContent = volume.toLocaleString() + ' tasks/mo';
    successLabel.textContent = (successRate * 100).toFixed(0) + '%';

    const perCallCost = (IN_TOK / 1e6) * RATE_A.in + (OUT_TOK / 1e6) * RATE_A.out;

    const failRate = 1 - successRate;
    // Failures retry once; three quarters of retries succeed, the remainder escalates
    // to a flagship fallback costing 4x a normal call.
    const retried = failRate;
    const retrySucceeds = retried * 0.75;
    const escalated = retried * 0.25;

    const totalCost = volume * perCallCost * (1 + retried + escalated * 3);
    const successfulOutcomes = volume * (successRate + retrySucceeds + escalated);
    const costPerOutcome = totalCost / successfulOutcomes;

    perCallDisplay.textContent = '$' + perCallCost.toFixed(6);
    perOutcomeDisplay.textContent = '$' + costPerOutcome.toFixed(6);

    const markup = ((costPerOutcome / perCallCost) - 1) * 100;
    verdictDisplay.textContent = `The naive per-call price undercounts the real cost by ${markup.toFixed(0)}% once retries and escalations are folded in — total spend $${totalCost.toFixed(2)}/mo for ${Math.round(successfulOutcomes).toLocaleString()} completed outcomes.`;
    verdictDisplay.style.borderLeftColor = markup > 10 ? 'var(--error)' : 'var(--accent)';
  }

  volumeSlider.addEventListener('input', update);
  successSlider.addEventListener('input', update);

  body.replaceChildren(
    el('div', { style: 'margin-bottom: 1rem;' }, [
      el('h4', { style: 'margin-bottom: 0.5rem;' }, 'Monthly Task Volume'),
      volumeSlider,
      volumeLabel,
    ]),
    el('div', { style: 'margin-bottom: 1.5rem;' }, [
      el('h4', { style: 'margin-bottom: 0.5rem;' }, 'First-Attempt Success Rate'),
      successSlider,
      successLabel,
    ]),
    el('div', { class: 'pair-grid' }, [
      el('div', { class: 'pair-side' }, [
        el('h4', {}, 'Cost per Call'),
        el('p', { class: 'muted small', style: 'margin-top: 0;' }, 'What the invoice line item implies'),
        el('div', { class: 'readout' }, [perCallDisplay, el('div', { class: 'muted small' }, 'Naive unit cost')]),
      ]),
      el('div', { class: 'pair-side' }, [
        el('h4', {}, 'Cost per Completed Task'),
        el('p', { class: 'muted small', style: 'margin-top: 0;' }, 'Spend across every attempt, including failures'),
        el('div', { class: 'readout' }, [perOutcomeDisplay, el('div', { class: 'muted small' }, 'True unit cost')]),
      ]),
    ]),
    verdictDisplay,
  );

  update();
}

export function finopsGovernanceCard(body) {
  const rows = [
    { feature: 'Support triage', team: 'CX', spend: 6100, resolutions: 41000 },
    { feature: 'Document summarizer', team: 'Ops', spend: 4900, resolutions: 3200 },
    { feature: 'Internal search', team: 'Platform', spend: 3200, resolutions: 28500 },
    { feature: 'Sales email drafts', team: 'Sales', spend: 2450, resolutions: 9100 },
  ];

  const thresholdInput = el('input', { type: 'number', min: '0.05', max: '2', step: '0.05', value: '0.30', style: 'width: 6rem;' });
  const tbody = el('tbody');

  function render() {
    const threshold = parseFloat(thresholdInput.value) || 0.3;
    tbody.replaceChildren(
      ...rows.map((row) => {
        const perOutcome = row.spend / row.resolutions;
        const alert = perOutcome > threshold;
        return el('tr', { style: alert ? 'background: color-mix(in srgb, var(--error) 10%, transparent);' : '' }, [
          el('td', { style: 'padding: 0.5rem; border-bottom: 1px solid var(--line);' }, row.feature),
          el('td', { style: 'padding: 0.5rem; border-bottom: 1px solid var(--line);' }, row.team),
          el('td', { style: 'padding: 0.5rem; border-bottom: 1px solid var(--line); text-align: right;' }, '$' + row.spend.toLocaleString()),
          el('td', { style: 'padding: 0.5rem; border-bottom: 1px solid var(--line); text-align: right;' }, row.resolutions.toLocaleString()),
          el('td', {
            style: `padding: 0.5rem; border-bottom: 1px solid var(--line); text-align: right; font-weight: 600; color: ${alert ? 'var(--error)' : 'var(--accent)'};`,
          }, '$' + perOutcome.toFixed(3)),
          el('td', { style: 'padding: 0.5rem; border-bottom: 1px solid var(--line);' }, alert ? '⚠ over threshold' : 'ok'),
        ]);
      }),
    );
  }

  thresholdInput.addEventListener('input', render);

  body.replaceChildren(
    el('p', { class: 'muted small' }, 'The same monthly spend, broken out by feature. The aggregate total never shows which line is actually expensive per unit of work delivered.'),
    el('div', { style: 'margin-bottom: 1rem; display: flex; align-items: center; gap: 0.6rem;' }, [
      el('label', { class: 'muted small' }, 'Alert threshold ($ / resolution)'),
      thresholdInput,
    ]),
    el('div', { class: 'mech-scroll' }, [
      el('table', { style: 'width: 100%; border-collapse: collapse; font-size: 0.85rem; min-width: 32rem;' }, [
        el('thead', {}, [
          el('tr', {}, [
            el('th', { style: 'text-align: left; padding: 0.5rem; border-bottom: 2px solid var(--line);' }, 'Feature'),
            el('th', { style: 'text-align: left; padding: 0.5rem; border-bottom: 2px solid var(--line);' }, 'Team'),
            el('th', { style: 'text-align: right; padding: 0.5rem; border-bottom: 2px solid var(--line);' }, 'Spend'),
            el('th', { style: 'text-align: right; padding: 0.5rem; border-bottom: 2px solid var(--line);' }, 'Resolutions'),
            el('th', { style: 'text-align: right; padding: 0.5rem; border-bottom: 2px solid var(--line);' }, '$/Resolution'),
            el('th', { style: 'text-align: left; padding: 0.5rem; border-bottom: 2px solid var(--line);' }, 'Status'),
          ]),
        ]),
        tbody,
      ]),
    ]),
  );

  render();
}

export function schemaMinificationCard(body) {
  body.replaceChildren(
    el('div', { class: 'demo-banner' }, [
      el('strong', {}, 'Schema Token Optimization'),
      ' — Bloated JSON schemas cost tokens on every conversation turn.'
    ]),
    el('div', { class: 'pair-grid' }, [
      el('div', { class: 'pair-side' }, [
        el('h4', {}, 'Bloated OpenAPI Schema'),
        el('pre', { class: 'prompt small' }, '{\n  "name": "get_user_account_status_and_billing_history",\n  "description": "This tool fetches the complete account status and billing history. Do not use this tool for anything else.",\n  "parameters": {\n    "user_email_address_for_lookup": { "type": "string" }\n  }\n}'),
        el('div', { class: 'readout' }, [
          el('div', { class: 'big' }, '64'),
          el('div', { class: 'muted small' }, 'Tokens per turn')
        ])
      ]),
      el('div', { class: 'pair-side' }, [
        el('h4', {}, 'Minified Schema'),
        el('pre', { class: 'prompt small' }, '{\n  "name": "get_billing",\n  "description": "Fetch billing & status",\n  "parameters": {\n    "email": { "type": "string" }\n  }\n}'),
        el('div', { class: 'readout' }, [
          el('div', { class: 'big' }, '28'),
          el('div', { class: 'muted small' }, 'Tokens per turn (56% reduction)')
        ])
      ])
    ])
  );
}
