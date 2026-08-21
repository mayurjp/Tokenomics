import { el } from './dom.js';

export function agenticSandboxCard(body) {
  const container = el('div', { class: 'agentic-sandbox' });

  const header = el('div', { class: 'sandbox-header' }, [
    el('h3', {}, 'Zero-Shot vs Agentic Workflows'),
    el('p', { class: 'muted small' }, 'Task: "Write a production-ready Snake game with a PostgreSQL high-score database and user authentication."')
  ]);

  // Zero Shot Column
  const zeroShotBox = el('div', { class: 'workflow-box zero-shot-box' }, [
    el('h4', {}, 'Zero-Shot (Single Prompt)'),
    el('p', { class: 'muted small' }, 'Asking the model to do everything in one single inference pass.'),
    el('button', { class: 'run-btn btn-zero-shot' }, 'Run Zero-Shot'),
    el('div', { class: 'workflow-timeline' }, [
      el('div', { class: 'timeline-step step-zero' }, [
        el('div', { class: 'step-icon' }, '1'),
        el('div', { class: 'step-details' }, [
          el('strong', {}, 'Generate Code'),
          el('span', { class: 'step-cost' }, 'Cost: 2,000 tokens')
        ])
      ])
    ]),
    el('div', { class: 'workflow-result result-zero' }, [
      el('div', { class: 'result-metric cost' }, 'Total Cost: $0.00'),
      el('div', { class: 'result-metric accuracy' }, 'Accuracy: 0%')
    ])
  ]);

  // Agentic Column
  const agenticBox = el('div', { class: 'workflow-box agentic-box' }, [
    el('h4', {}, 'Agentic Loop (Multi-Step)'),
    el('p', { class: 'muted small' }, 'Chaining multiple specific prompts to plan, draft, review, and refine.'),
    el('button', { class: 'run-btn btn-agentic' }, 'Run Agentic Loop'),
    el('div', { class: 'workflow-timeline' }, [
      el('div', { class: 'timeline-step step-plan' }, [
        el('div', { class: 'step-icon' }, '1'),
        el('div', { class: 'step-details' }, [
          el('strong', {}, 'Architect/Planner'),
          el('span', { class: 'step-cost' }, 'Cost: 1,500 tokens')
        ])
      ]),
      el('div', { class: 'timeline-step step-code' }, [
        el('div', { class: 'step-icon' }, '2'),
        el('div', { class: 'step-details' }, [
          el('strong', {}, 'Junior Coder'),
          el('span', { class: 'step-cost' }, 'Cost: 3,000 tokens')
        ])
      ]),
      el('div', { class: 'timeline-step step-review' }, [
        el('div', { class: 'step-icon' }, '3'),
        el('div', { class: 'step-details' }, [
          el('strong', {}, 'Senior Reviewer (QA)'),
          el('span', { class: 'step-cost' }, 'Cost: 2,500 tokens')
        ])
      ]),
      el('div', { class: 'timeline-step step-refine' }, [
        el('div', { class: 'step-icon' }, '4'),
        el('div', { class: 'step-details' }, [
          el('strong', {}, 'Final Refiner'),
          el('span', { class: 'step-cost' }, 'Cost: 2,000 tokens')
        ])
      ])
    ]),
    el('div', { class: 'workflow-result result-agentic' }, [
      el('div', { class: 'result-metric cost' }, 'Total Cost: $0.00'),
      el('div', { class: 'result-metric accuracy' }, 'Accuracy: 0%')
    ])
  ]);

  const grid = el('div', { class: 'agentic-grid' }, [zeroShotBox, agenticBox]);
  container.append(header, grid);
  body.replaceChildren(container);

  // Logic
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const flashRate = 0.075 / 1000; // per 1k tokens

  // Run Zero Shot
  container.querySelector('.btn-zero-shot').addEventListener('click', async (e) => {
    const btn = e.target;
    btn.disabled = true;
    
    const step = container.querySelector('.step-zero');
    step.classList.add('processing');
    
    await sleep(1500);
    
    step.classList.remove('processing');
    step.classList.add('completed');

    const resultBox = container.querySelector('.result-zero');
    resultBox.classList.add('show-result');
    resultBox.querySelector('.cost').textContent = `Total Cost: $${(2 * flashRate).toFixed(4)}`;
    resultBox.querySelector('.accuracy').innerHTML = `Accuracy: <span class="text-error">20% (Buggy, Missing Auth)</span>`;
  });

  // Run Agentic
  container.querySelector('.btn-agentic').addEventListener('click', async (e) => {
    const btn = e.target;
    btn.disabled = true;
    
    const steps = [
      { sel: '.step-plan', cost: 1.5, delay: 1000 },
      { sel: '.step-code', cost: 3.0, delay: 1500 },
      { sel: '.step-review', cost: 2.5, delay: 1200 },
      { sel: '.step-refine', cost: 2.0, delay: 1000 }
    ];
    
    let totalCostK = 0;

    for (const s of steps) {
      const stepEl = container.querySelector(s.sel);
      stepEl.classList.add('processing');
      await sleep(s.delay);
      stepEl.classList.remove('processing');
      stepEl.classList.add('completed');
      totalCostK += s.cost;
    }

    const resultBox = container.querySelector('.result-agentic');
    resultBox.classList.add('show-result');
    resultBox.querySelector('.cost').textContent = `Total Cost: $${(totalCostK * flashRate).toFixed(4)}`;
    resultBox.querySelector('.accuracy').innerHTML = `Accuracy: <span class="text-success">98% (Production Ready)</span>`;
  });
}
