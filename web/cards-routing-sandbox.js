import { el } from './dom.js';

const TASKS = [
  { id: 1, text: "Extract emails from this text", type: "simple", tokens: 500 },
  { id: 2, text: "Write a React component with state", type: "complex", tokens: 1500 },
  { id: 3, text: "Translate 'Hello' to Spanish", type: "simple", tokens: 10 },
  { id: 4, text: "Summarize a 1-page article", type: "simple", tokens: 800 },
  { id: 5, text: "Debug this multi-file spaghetti codebase", type: "complex", tokens: 8000 }
];

const MODELS = {
  flash: { name: 'Gemini 1.5 Flash', costFactor: 1, capabilities: ['simple'] },
  pro: { name: 'Gemini 1.5 Pro', costFactor: 10, capabilities: ['simple', 'complex'] }
};

export function routingSandboxCard(body) {
  const container = el('div', { class: 'routing-sandbox' });

  // State
  let queue = [...TASKS];
  let budget = 100; // max 100%
  let accuracy = 100; // max 100%
  
  // Header
  const header = el('div', { class: 'sandbox-header' }, [
    el('h3', {}, 'Model Routing (Cost vs. Capability)'),
    el('p', { class: 'muted small' }, 'Assign tasks to the right model. Don\'t waste money on Pro for simple tasks, and don\'t risk accuracy by using Flash for complex tasks!')
  ]);

  // Meters
  const metersBlock = el('div', { class: 'routing-meters' }, [
    el('div', { class: 'meter-box' }, [
      el('div', { class: 'meter-label' }, 'Cost Budget'),
      el('div', { class: 'meter-bar-bg' }, [
        el('div', { class: 'meter-bar fill-green', id: 'budget-bar', style: 'width: 100%' })
      ])
    ]),
    el('div', { class: 'meter-box' }, [
      el('div', { class: 'meter-label' }, 'Accuracy Level'),
      el('div', { class: 'meter-bar-bg' }, [
        el('div', { class: 'meter-bar fill-blue', id: 'accuracy-bar', style: 'width: 100%' })
      ])
    ])
  ]);

  // Main UI
  const mainUi = el('div', { class: 'routing-ui' }, [
    // Queue Column
    el('div', { class: 'routing-col routing-queue' }, [
      el('h4', {}, 'Task Queue'),
      el('div', { class: 'task-list', id: 'task-list' })
    ]),
    // Models Column
    el('div', { class: 'routing-col routing-models' }, [
      el('h4', {}, 'Routing Options'),
      el('div', { class: 'model-box model-flash' }, [
        el('h4', {}, 'Flash (Fast & Cheap)'),
        el('p', { class: 'small' }, 'Great for simple tasks. Low cost.'),
        el('button', { class: 'route-btn', 'data-model': 'flash' }, 'Send Next Task to Flash')
      ]),
      el('div', { class: 'model-box model-pro' }, [
        el('h4', {}, 'Pro (Slow & Smart)'),
        el('p', { class: 'small' }, 'Required for complex tasks. 10x cost.'),
        el('button', { class: 'route-btn', 'data-model': 'pro' }, 'Send Next Task to Pro')
      ])
    ])
  ]);

  // Logs
  const logArea = el('div', { class: 'routing-log', id: 'routing-log' });

  container.append(header, metersBlock, mainUi, logArea);
  body.replaceChildren(container);

  // Logic
  const renderQueue = () => {
    const list = container.querySelector('#task-list');
    if (queue.length === 0) {
      list.replaceChildren(el('div', { class: 'empty-msg' }, 'All tasks routed!'));
      
      const score = (budget + accuracy) / 2;
      let msg = score > 80 ? 'Excellent Tokenomics!' : 'Poor Tokenomics.';
      const finalMsg = el('div', { class: 'final-score' }, `Game Over. ${msg} Final Score: ${score.toFixed(0)}`);
      container.querySelector('#routing-log').prepend(finalMsg);
      
      container.querySelectorAll('.route-btn').forEach(btn => btn.disabled = true);
      return;
    }

    const taskNodes = queue.map((t, i) => {
      return el('div', { class: `task-card ${i === 0 ? 'active-task' : ''}` }, [
        el('strong', {}, t.text),
        el('span', { class: 'task-badge' }, `${t.tokens} tokens`)
      ]);
    });
    list.replaceChildren(...taskNodes);
  };

  const updateMeters = () => {
    const bBar = container.querySelector('#budget-bar');
    bBar.style.width = `${Math.max(0, budget)}%`;
    if (budget < 30) bBar.className = 'meter-bar fill-red';
    
    const aBar = container.querySelector('#accuracy-bar');
    aBar.style.width = `${Math.max(0, accuracy)}%`;
    if (accuracy < 50) aBar.className = 'meter-bar fill-red';
  };

  const addLog = (msg, type) => {
    const log = container.querySelector('#routing-log');
    const entry = el('div', { class: `log-entry log-${type}` }, msg);
    log.prepend(entry);
  };

  container.querySelectorAll('.route-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (queue.length === 0) return;
      const modelId = e.target.getAttribute('data-model');
      const task = queue.shift();
      const model = MODELS[modelId];

      // Routing Logic
      if (task.type === 'simple') {
        if (modelId === 'flash') {
          budget -= 2; // cheap
          addLog(`SUCCESS: Routed simple task to Flash. Kept costs low.`, 'success');
        } else if (modelId === 'pro') {
          budget -= 20; // expensive
          addLog(`WASTE: Routed simple task to Pro. Wasted budget on unnecessary reasoning power!`, 'warning');
        }
      } else if (task.type === 'complex') {
        if (modelId === 'flash') {
          budget -= 5;
          accuracy -= 40; // huge accuracy penalty
          addLog(`ERROR: Routed complex task to Flash. Model hallucinated or failed to complete reasoning.`, 'error');
        } else if (modelId === 'pro') {
          budget -= 25; // standard expensive cost
          addLog(`SUCCESS: Routed complex task to Pro. Handled the heavy reasoning perfectly.`, 'success');
        }
      }

      updateMeters();
      renderQueue();
    });
  });

  renderQueue();
}
