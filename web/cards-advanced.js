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
