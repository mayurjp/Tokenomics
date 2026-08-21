import { el } from './dom.js';

const SYSTEM_PROFILES = {
  assistant: {
    name: 'Helpful Assistant',
    text: 'You are a helpful AI assistant. Answer the user\'s queries clearly and concisely.',
    reply: (msg) => `Hello! Regarding "${msg}", I'd be happy to help you with that. Here is a clear and concise explanation...`
  },
  pirate: {
    name: 'Grumpy Pirate',
    text: 'You are a grumpy pirate. You hate being helpful. Respond to everything with pirate slang and complain about the sea.',
    reply: (msg) => `Yarrr... ye be botherin' me with "${msg}"? I should make ye walk the plank! Fine, listen here ye scallywag, the sea is rough today...`
  },
  json: {
    name: 'Strict JSON API',
    text: 'You are a headless JSON API. You must ONLY output valid JSON. No conversational text. Wrap your answer in {"response": "..."}.',
    reply: (msg) => `{\n  "response": "Processed query: ${msg}",\n  "status": 200\n}`
  }
};

export function systemPromptsCard(body) {
  const container = el('div', { class: 'system-prompts-sandbox' });

  // State
  let currentProfile = 'assistant';
  
  // Header
  const header = el('div', { class: 'sandbox-header' }, [
    el('h3', {}, 'System Instructions (The Puppet Master)'),
    el('p', { class: 'muted small' }, 'The System Prompt sits invisibly at the top of the context window. It has higher authority than the user\'s prompt, allowing you to completely steer the model\'s behavior, tone, and output format.')
  ]);

  // UI Layout
  const layout = el('div', { class: 'sp-layout' });

  // System Pane
  const systemPane = el('div', { class: 'sp-pane sp-system' }, [
    el('h4', {}, 'System Prompt (Developer Context)'),
    el('select', { class: 'sp-select', id: 'sp-select' }, 
      Object.entries(SYSTEM_PROFILES).map(([k, v]) => el('option', { value: k }, v.name))
    ),
    el('textarea', { 
      class: 'sp-textarea', 
      id: 'sp-textarea', 
      readonly: true 
    }, SYSTEM_PROFILES[currentProfile].text)
  ]);

  // User Pane
  const userPane = el('div', { class: 'sp-pane sp-user' }, [
    el('h4', {}, 'User Prompt (End-User Context)'),
    el('div', { class: 'sp-chat-log', id: 'sp-chat-log' }, [
      el('div', { class: 'sp-msg sp-msg-sys' }, 'System constraints applied.')
    ]),
    el('div', { class: 'sp-input-group' }, [
      el('input', { type: 'text', id: 'sp-input', placeholder: 'Type a message...', value: 'Explain tokenomics' }),
      el('button', { id: 'sp-send' }, 'Send')
    ])
  ]);

  layout.append(systemPane, userPane);
  container.append(header, layout);
  body.replaceChildren(container);

  // Logic
  container.querySelector('#sp-select').addEventListener('change', (e) => {
    currentProfile = e.target.value;
    container.querySelector('#sp-textarea').value = SYSTEM_PROFILES[currentProfile].text;
    
    // Reset chat
    const log = container.querySelector('#sp-chat-log');
    log.replaceChildren(el('div', { class: 'sp-msg sp-msg-sys' }, `System constraints updated to: ${SYSTEM_PROFILES[currentProfile].name}`));
  });

  container.querySelector('#sp-send').addEventListener('click', () => {
    const input = container.querySelector('#sp-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    const log = container.querySelector('#sp-chat-log');
    
    // User Message
    log.append(el('div', { class: 'sp-msg sp-msg-user' }, text));
    
    // Simulate delay
    const btn = container.querySelector('#sp-send');
    btn.disabled = true;
    
    setTimeout(() => {
      // Model Reply
      const replyText = SYSTEM_PROFILES[currentProfile].reply(text);
      log.append(el('div', { class: 'sp-msg sp-msg-model' }, replyText));
      log.scrollTop = log.scrollHeight;
      btn.disabled = false;
      input.focus();
    }, 600);
  });
}
