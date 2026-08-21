import { el } from './dom.js';

// Realistic Gemini 1.5 Flash Pricing (approx)
const TOKEN_COUNT = 50000;
const COST_PER_1M_PROMPT = 0.075; // Standard Input $0.075 per 1M tokens (Flash under 128k)
const COST_PER_1M_CACHED = 0.01875; // Cached Input (25% of standard price)

export function cachingPlaygroundCard(body) {
  const container = el('div', { class: 'caching-sandbox' });

  // 1. Context Block (The heavy document)
  const contextBox = el('div', { class: 'context-box' }, [
    el('div', { class: 'context-header' }, 'System Context (e.g. Codebase / Manual)'),
    el('div', { class: 'context-body' }, [
      el('div', { class: 'context-icon' }, '📚'),
      el('div', { class: 'context-details' }, [
        el('h4', {}, 'heavy_document_v2.pdf'),
        el('p', { class: 'muted small' }, `${TOKEN_COUNT.toLocaleString()} Tokens`)
      ])
    ]),
    el('div', { class: 'context-status', hidden: true }, 'Not Cached')
  ]);

  // 2. Chat Interface
  const chatArea = el('div', { class: 'chat-area' });
  const chatLog = el('div', { class: 'chat-log' });
  
  const chatInputContainer = el('div', { class: 'chat-input-container' });
  const chatInput = el('input', { 
    type: 'text', 
    class: 'chat-input',
    placeholder: 'Ask a question about the document...'
  });
  const sendBtn = el('button', { class: 'send-btn' }, 'Send');
  
  chatInputContainer.append(chatInput, sendBtn);
  chatArea.append(chatLog, chatInputContainer);

  // 3. Cost Ledger
  const ledgerBox = el('div', { class: 'ledger-box' });
  const ledgerHeader = el('h4', {}, 'Tokenomics Ledger');
  const ledgerEntries = el('div', { class: 'ledger-entries' });
  const ledgerTotal = el('div', { class: 'ledger-total' }, [
    el('span', {}, 'Total Cost:'),
    el('strong', { id: 'total-cost' }, '$0.0000')
  ]);
  ledgerBox.append(ledgerHeader, ledgerEntries, ledgerTotal);

  // Layout Grid
  const mainLayout = el('div', { class: 'caching-grid' }, [
    el('div', { class: 'caching-left' }, [contextBox, chatArea]),
    el('div', { class: 'caching-right' }, [ledgerBox])
  ]);
  container.append(mainLayout);
  body.replaceChildren(container);

  // State
  let isCached = false;
  let totalCost = 0;
  let isProcessing = false;

  const handleSend = async () => {
    const text = chatInput.value.trim();
    if (!text || isProcessing) return;
    
    chatInput.value = '';
    isProcessing = true;
    sendBtn.disabled = true;

    // Add user message
    chatLog.append(el('div', { class: 'msg msg-user' }, text));
    chatLog.scrollTop = chatLog.scrollHeight;

    // Determine Miss vs Hit
    const currentCachedState = isCached;
    
    // Animate the context box reading
    contextBox.classList.remove('pulse-hit', 'pulse-miss');
    // trigger reflow
    void contextBox.offsetWidth;

    if (!currentCachedState) {
      contextBox.classList.add('pulse-miss');
      const statusEl = contextBox.querySelector('.context-status');
      statusEl.hidden = false;
      statusEl.textContent = 'CACHE MISS - Reading 50,000 tokens...';
      statusEl.style.color = '#ff4444';
      
      // Simulate slow read
      await new Promise(r => setTimeout(r, 2000));
      
      isCached = true;
    } else {
      contextBox.classList.add('pulse-hit');
      const statusEl = contextBox.querySelector('.context-status');
      statusEl.textContent = 'CACHE HIT - Reading from memory';
      statusEl.style.color = '#00C851';
      
      // Simulate fast read
      await new Promise(r => setTimeout(r, 400));
    }

    // Add Model Response
    chatLog.append(el('div', { class: 'msg msg-model' }, `Here is the answer based on the 50,000 token document. (Simulated)`));
    chatLog.scrollTop = chatLog.scrollHeight;

    // Update Ledger
    const cost = currentCachedState 
      ? (TOKEN_COUNT / 1000000) * COST_PER_1M_CACHED 
      : (TOKEN_COUNT / 1000000) * COST_PER_1M_PROMPT;
      
    totalCost += cost;

    const entry = el('div', { class: 'ledger-entry' }, [
      el('span', { class: currentCachedState ? 'badge-hit' : 'badge-miss' }, currentCachedState ? 'HIT' : 'MISS'),
      el('span', { class: 'entry-cost' }, `$${cost.toFixed(4)}`)
    ]);
    ledgerEntries.append(entry);
    
    container.querySelector('#total-cost').textContent = `$${totalCost.toFixed(4)}`;

    isProcessing = false;
    sendBtn.disabled = false;
    chatInput.focus();
  };

  sendBtn.addEventListener('click', handleSend);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
  });
}
