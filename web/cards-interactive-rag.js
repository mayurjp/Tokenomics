/*  */import { el } from './dom.js';
import { embed, cosineSimilarity } from './gemini.js';
import { isDemo } from './api.js';
import { demoEmbed } from './fixtures.js';
import { DOC_CHUNKS, REFERENCE_DOC } from './content.js';

export function interactiveRagCard(body) {
  const chunks = DOC_CHUNKS.filter(c => c.trim().length > 0);
  
  const container = el('div', { class: 'rag-interactive' });
  
  // Step 1: PDF Box
  const pdfBox = el('div', { class: 'pdf-box', tabindex: '0', role: 'button' }, [
    el('div', { class: 'pdf-header' }, [
      el('div', { class: 'pdf-icon' }, '📄'),
      el('div', { class: 'pdf-details' }, [
        el('h3', {}, 'Internal_Handbook.pdf'),
        el('p', { class: 'muted small' }, 'Simulated enterprise knowledge base')
      ])
    ]),
    el('div', { class: 'pdf-preview small muted' }, REFERENCE_DOC.substring(0, 300) + '...'),
    el('div', { class: 'pdf-action-hint', style: 'margin-top: 1rem; text-align: center;' }, [
      el('button', { type: 'button', class: 'hint-pulse', style: 'pointer-events: none;' }, 'Click to Chunk Document')
    ])
  ]);
  
  const chunksContainer = el('div', { class: 'chunks-container', hidden: true });
  const promptContainer = el('div', { class: 'prompt-container', hidden: true });
  
  const promptConstructContainer = el('div', { class: 'prompt-construct-container', hidden: true });
  const llmContainer = el('div', { class: 'llm-container', hidden: true });
  
  pdfBox.addEventListener('click', () => {
    if (pdfBox.classList.contains('selected')) return;
    pdfBox.classList.add('selected');
    pdfBox.querySelector('.pdf-action-hint').hidden = true;
    chunksContainer.hidden = false;
    renderChunks(chunksContainer, chunks);
    promptContainer.hidden = false;
  });
  
  pdfBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pdfBox.click();
    }
  });

  const defaultQuestion = 'Why does output cost more than input?';
  const promptInput = el('input', { 
    type: 'text', 
    placeholder: 'Ask a question...', 
    value: defaultQuestion,
    class: 'full-width'
  });
  const searchBtn = el('button', { type: 'button' }, 'Search (Embed & Match)');
  const resultsDiv = el('div', { class: 'rag-results' });
  
  promptContainer.append(
    el('p', { class: 'muted small' }, 'Type a prompt to see how semantic search matches chunks in real-time.'),
    el('div', { class: 'controls search-controls' }, [promptInput, searchBtn]),
    resultsDiv
  );
  
  searchBtn.addEventListener('click', async () => {
    if (!promptInput.value.trim()) return;
    
    searchBtn.disabled = true;
    searchBtn.textContent = 'Searching...';
    try {
      const q = promptInput.value;
      const qVector = isDemo() ? await demoEmbed(q) : await embed(q);
      
      let bestScore = -1;
      let bestIndex = -1;
      
      const chunkNodes = chunksContainer.querySelectorAll('.chunk-box');
      chunkNodes.forEach(n => n.classList.remove('highlighted'));
      
      // Calculate scores
      const scores = [];
      for (let i = 0; i < chunks.length; i++) {
        const cVector = isDemo() ? await demoEmbed(chunks[i]) : await embed(chunks[i]);
        let score = cosineSimilarity(qVector, cVector);
        
        if (isDemo() && q === defaultQuestion) {
           if (chunks[i].includes('SECTION 2.')) {
             score = 0.92;
           } else {
             score = Math.min(score, 0.4);
           }
        }
        
        scores.push(score);
        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }
      
      if (bestIndex !== -1) {
        chunkNodes.forEach((n, i) => {
          const scoreEl = n.querySelector('.chunk-score');
          if (scoreEl) {
            scoreEl.textContent = `Score: ${scores[i].toFixed(2)}`;
            if (i === bestIndex) scoreEl.classList.add('best-score');
            else scoreEl.classList.remove('best-score');
          }
        });

        chunkNodes[bestIndex].classList.add('highlighted');
        chunkNodes[bestIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        const docTokens = Math.ceil(REFERENCE_DOC.length / 4);
        const chunkTokens = Math.ceil(chunks[bestIndex].length / 4);
        const saved = docTokens - chunkTokens;
        
        resultsDiv.replaceChildren(
          el('p', { class: 'savings' }, `✅ Best match: Chunk ${bestIndex + 1} with similarity ${bestScore.toFixed(3)}.`),
          el('p', { class: 'money' }, [
            el('strong', {}, 'LLM Bandwidth Saved: '),
            `Sent ~${chunkTokens.toLocaleString()} tokens instead of ~${docTokens.toLocaleString()} tokens. `,
            el('span', { class: 'muted small block' }, `(Saving ~${saved.toLocaleString()} tokens on every request)`)
          ])
        );

        // Populate Step 4
        promptConstructContainer.hidden = false;
        renderPromptConstruction(promptConstructContainer, chunks[bestIndex], q);

        // Populate Step 5
        llmContainer.hidden = false;
        renderLlmGeneration(llmContainer, chunkTokens);
      }
    } catch (e) {
      resultsDiv.replaceChildren(el('p', { class: 'error' }, e.message));
    } finally {
      searchBtn.disabled = false;
      searchBtn.textContent = 'Search (Embed & Match)';
    }
  });
  
  const step1 = el('div', { class: 'rag-step step-1' }, [
    el('h4', { class: 'step-title' }, '1. Document'),
    pdfBox
  ]);
  
  const step2 = el('div', { class: 'rag-step step-2' }, [
    el('h4', { class: 'step-title' }, '2. Chunking'),
    chunksContainer
  ]);
  
  const step3 = el('div', { class: 'rag-step step-3' }, [
    el('h4', { class: 'step-title' }, '3. Retrieval (Search)'),
    promptContainer
  ]);

  const step4 = el('div', { class: 'rag-step step-4' }, [
    el('h4', { class: 'step-title' }, '4. Prompt Construction'),
    promptConstructContainer
  ]);

  const step5 = el('div', { class: 'rag-step step-5' }, [
    el('h4', { class: 'step-title' }, '5. LLM Generation'),
    llmContainer
  ]);

  container.append(
    step1, 
    createConnector('conn-1-2'), 
    step2, 
    createConnector('conn-2-3'), 
    step3, 
    createConnector('conn-3-4'), 
    step4, 
    createConnector('conn-4-5'), 
    step5
  );
  
  body.replaceChildren(container);
}

function createConnector(connClass) {
  return el('div', { class: `rag-connector ${connClass}` }, [
    el('div', { class: 'connector-line' }),
    el('div', { class: 'connector-arrow' }, '▶')
  ]);
}

function renderChunks(container, chunks) {
  const grid = el('div', { class: 'chunk-grid' });
  chunks.forEach((c, i) => {
    grid.append(el('div', { class: 'chunk-box' }, [
      el('div', { class: 'chunk-header' }, [
        el('strong', {}, `Chunk ${i + 1}`),
        el('span', { class: 'chunk-score muted small' }, '')
      ]),
      el('p', { class: 'small muted' }, c.substring(0, 100) + '...')
    ]));
  });
  container.replaceChildren(
    el('p', { class: 'muted small' }, `Document split into ${chunks.length} semantic chunks.`),
    grid
  );
}

function renderPromptConstruction(container, chunk, question) {
  const codeBlock = el('div', { class: 'constructed-prompt' }, [
    el('div', { class: 'prompt-part system-part' }, [
      el('span', { class: 'part-label' }, 'System Instruction'),
      el('p', {}, 'You are a helpful assistant. Use the following context to answer the question.')
    ]),
    el('div', { class: 'prompt-part context-part' }, [
      el('span', { class: 'part-label' }, 'Retrieved Context (Chunk)'),
      el('p', {}, chunk)
    ]),
    el('div', { class: 'prompt-part user-part' }, [
      el('span', { class: 'part-label' }, 'User Question'),
      el('p', {}, question)
    ])
  ]);

  container.replaceChildren(
    el('p', { class: 'muted small' }, 'The top chunk is stitched together with the system instruction and user query to form the final LLM payload.'),
    codeBlock
  );
}

function renderLlmGeneration(container, chunkTokens) {
  const totalInputTokens = chunkTokens + 25;
  const outputTokens = 45;
  
  const llmBox = el('div', { class: 'llm-box' }, [
    el('div', { class: 'llm-header' }, [
      el('span', { class: 'llm-icon' }, '🧠'),
      el('strong', {}, 'Gemini 1.5 Flash (Processing Mechanics)')
    ]),
    
    // Static Architecture Diagram
    renderArchitectureDiagram(totalInputTokens, outputTokens),
    
    el('div', { class: 'llm-output' }, [
      el('span', { class: 'part-label' }, 'Model Output:'),
      el('p', {}, 'Output costs more than input because reading the prompt is a highly parallelized process, while generating text is sequential. Each new token requires a sequential pass over everything written so far, making it more expensive.')
    ])
  ]);

  container.replaceChildren(
    el('p', { class: 'muted small' }, 'A structural breakdown of why output tokens are inherently more expensive to compute than input tokens.'),
    llmBox
  );
}

function renderArchitectureDiagram(inputTokens, outputTokens) {
  return el('div', { class: 'arch-diagram' }, [
    
    // External Input
    el('div', { class: 'arch-node external' }, [
      el('div', { class: 'arch-node-title' }, 'User Input (Prompt)'),
      el('div', { class: 'arch-node-desc' }, `${inputTokens} Tokens sent from client`)
    ]),
    
    el('div', { class: 'arch-arrow' }, '↓'),
    
    // Internal Boundary
    el('div', { class: 'arch-internal-boundary' }, [
      
      el('div', { class: 'arch-node' }, [
        el('div', { class: 'arch-node-title' }, 'Tokenizer'),
        el('div', { class: 'arch-node-desc' }, 'Converts text into integer IDs')
      ]),
      
      el('div', { class: 'arch-arrow' }, '↓'),
      
      el('div', { class: 'arch-node parallel' }, [
        el('div', { class: 'arch-node-title' }, 'Pre-fill Phase (Parallel Compute)'),
        el('div', { class: 'arch-node-desc' }, `Attention layers process all ${inputTokens} input tokens simultaneously. (Fast & Cheap)`)
      ]),
      
      el('div', { class: 'arch-arrow' }, '↓'),
      
      el('div', { class: 'arch-node sequential' }, [
        el('div', { class: 'arch-node-title' }, 'Decode Phase (Autoregressive Loop)'),
        el('div', { class: 'arch-node-desc' }, `Generates the next token one-by-one. Each of the ${outputTokens} output tokens requires a full forward pass. (Slow & Expensive)`)
      ])
    ]),
    
    el('div', { class: 'arch-arrow' }, '↓'),
    
    // External Output
    el('div', { class: 'arch-node external' }, [
      el('div', { class: 'arch-node-title' }, 'Model Output (Response)'),
      el('div', { class: 'arch-node-desc' }, `~${outputTokens} Tokens received by client`)
    ])
  ]);
}
