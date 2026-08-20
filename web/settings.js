import { el } from './dom.js';
import { getKey, setKey, clearKey, isRemembered, maskKey } from './keystore.js';
import { isDemo } from './api.js';

export function mountSettings(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const render = () => {
    const key = getKey();
    
    if (key) {
      const clearBtn = el('button', { type: 'button', class: 'ghost' }, 'Clear Key');
      clearBtn.addEventListener('click', () => {
        clearKey();
        window.location.reload(); // Reload to flush state and caches
      });
      
      container.replaceChildren(
        el('div', { class: 'keypanel' }, [
          el('div', { style: 'display: flex; justify-content: space-between; align-items: center;' }, [
            el('div', {}, [
              el('strong', {}, 'Live Mode Active'),
              el('span', { class: 'muted', style: 'margin-left: 0.5rem;' }, `Using key: ${maskKey(key)}`)
            ]),
            clearBtn
          ])
        ])
      );
    } else {
      const input = el('input', { type: 'password', placeholder: 'Paste Gemini API Key...', style: 'flex: 1; padding: 0.4rem; border: 1px solid var(--line); border-radius: 4px;' });
      const remember = el('input', { type: 'checkbox', id: 'remember-key' });
      const rememberLabel = el('label', { for: 'remember-key', class: 'small muted' }, ' Remember me');
      const saveBtn = el('button', { type: 'button' }, 'Save Key');
      
      saveBtn.addEventListener('click', () => {
        const val = input.value.trim();
        if (val) {
          setKey(val, remember.checked);
          window.location.reload();
        }
      });
      
      container.replaceChildren(
        el('div', { class: 'keypanel', style: 'padding: 1rem; margin-bottom: 1.5rem;' }, [
          el('h3', {}, 'Bring Your Own Key'),
          el('p', { class: 'muted small', style: 'margin-top: 0;' }, 'You are currently seeing fabricated demo numbers. Enter your Gemini API key to run live measurements. Your key is stored strictly in your browser.'),
          el('div', { style: 'display: flex; gap: 0.5rem; align-items: center;' }, [
            input,
            remember, rememberLabel,
            saveBtn
          ])
        ])
      );
    }
  };
  
  render();
}
