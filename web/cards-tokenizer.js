import { el } from './dom.js';

const PRESETS = {
  english: "The quick brown fox jumps over the lazy dog. Tokenization in English is relatively predictable.",
  hindi: "नमस्ते दुनिया। हिंदी का टोकनीकरण अक्सर कम अक्षरों के बावजूद अधिक टोकन पैदा करता है।",
  json: '{\n  "status": 200,\n  "message": "OK",\n  "data": [1, 2, 3]\n}'
};

// A simulated visual tokenizer to demonstrate BPE concepts without loading a heavy library
function mockTokenize(text) {
  const tokens = [];
  let currentToken = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    // Always break on whitespace (and usually keep it at the start of the next token for modern BPE)
    if (/\s/.test(char)) {
      if (currentToken) tokens.push(currentToken);
      currentToken = char;
      continue;
    }
    
    // Break on punctuation for code/json
    if (/[{},":.\[\]]/.test(char)) {
      if (currentToken) tokens.push(currentToken);
      tokens.push(char);
      currentToken = '';
      continue;
    }

    // Hindi/Chinese/Japanese characters often tokenize into 1-2 chars per token or even multiple tokens per char.
    // We simulate this by aggressively breaking non-ASCII characters.
    if (char.charCodeAt(0) > 255) {
      if (currentToken) tokens.push(currentToken);
      // Simulate that Hindi often takes 1-2 chars per token
      if (Math.random() > 0.5 && i < text.length - 1 && text[i+1].charCodeAt(0) > 255 && !/\s/.test(text[i+1])) {
        tokens.push(char + text[i+1]);
        i++;
      } else {
        tokens.push(char);
      }
      currentToken = '';
      continue;
    }

    currentToken += char;

    // Randomly break long English words to simulate subwords (e.g. "Token" + "ization")
    if (currentToken.length > 4 && Math.random() > 0.7) {
      tokens.push(currentToken);
      currentToken = '';
    }
  }
  
  if (currentToken) tokens.push(currentToken);
  return tokens;
}

export function tokenizerCard(body) {
  const container = el('div', { class: 'tokenizer-sandbox' });
  
  const header = el('div', { class: 'sandbox-header' }, [
    el('h3', {}, 'Text to Tokens'),
    el('p', { class: 'muted small' }, 'Type below or click a preset to see how different languages and formats are chunked.')
  ]);

  const presetButtons = el('div', { class: 'preset-buttons' }, [
    el('button', { type: 'button', 'data-preset': 'english' }, 'English'),
    el('button', { type: 'button', 'data-preset': 'hindi' }, 'Hindi'),
    el('button', { type: 'button', 'data-preset': 'json' }, 'JSON / Code')
  ]);

  const textarea = el('textarea', {
    class: 'tokenizer-input',
    placeholder: 'Type something...',
    rows: '4'
  });

  const outputArea = el('div', { class: 'tokenizer-output' });
  const statsArea = el('div', { class: 'tokenizer-stats' });

  function renderTokens() {
    const text = textarea.value;
    if (!text) {
      outputArea.replaceChildren();
      statsArea.replaceChildren();
      return;
    }

    const tokens = mockTokenize(text);
    
    // Render colored chunks
    const tokenNodes = tokens.map((t, i) => {
      // 5 alternating colors
      const colorIndex = i % 5;
      
      // We must render whitespace visibly if it's spaces, but standard spaces collapse in HTML.
      // So we use white-space: pre-wrap on the container, which handles it nicely.
      return el('span', { class: `token-chunk color-${colorIndex}` }, t);
    });

    outputArea.replaceChildren(...tokenNodes);

    // Render Stats
    const charCount = text.length;
    const tokenCount = tokens.length;
    const ratio = (tokenCount / charCount).toFixed(2);

    statsArea.replaceChildren(
      el('div', { class: 'stat-box' }, [
        el('div', { class: 'stat-value' }, charCount.toString()),
        el('div', { class: 'stat-label' }, 'Characters')
      ]),
      el('div', { class: 'stat-box' }, [
        el('div', { class: 'stat-value highlight' }, tokenCount.toString()),
        el('div', { class: 'stat-label' }, 'Tokens')
      ]),
      el('div', { class: 'stat-box' }, [
        el('div', { class: 'stat-value' }, `${ratio}x`),
        el('div', { class: 'stat-label' }, 'Tokens per Char')
      ])
    );
  }

  // Bind events
  textarea.addEventListener('input', renderTokens);
  
  presetButtons.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') return;
    const preset = e.target.getAttribute('data-preset');
    if (preset && PRESETS[preset]) {
      textarea.value = PRESETS[preset];
      renderTokens();
    }
  });

  // Init with English
  textarea.value = PRESETS.english;
  renderTokens();

  container.append(header, presetButtons, textarea, statsArea, outputArea);
  body.replaceChildren(container);
}
