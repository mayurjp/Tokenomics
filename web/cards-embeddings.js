import { el } from './dom.js';

// Pre-calculated mock 2D coordinates and categories for simplicity
const WORDS = [
  { id: 'dog', text: 'Dog', x: 20, y: 80, cluster: 'animal' },
  { id: 'cat', text: 'Cat', x: 25, y: 70, cluster: 'animal' },
  { id: 'wolf', text: 'Wolf', x: 15, y: 85, cluster: 'animal' },
  
  { id: 'apple', text: 'Apple', x: 80, y: 20, cluster: 'food' },
  { id: 'banana', text: 'Banana', x: 85, y: 30, cluster: 'food' },
  { id: 'cherry', text: 'Cherry', x: 70, y: 15, cluster: 'food' },
  
  { id: 'car', text: 'Car', x: 20, y: 20, cluster: 'vehicle' },
  { id: 'truck', text: 'Truck', x: 30, y: 15, cluster: 'vehicle' },
  { id: 'bus', text: 'Bus', x: 15, y: 30, cluster: 'vehicle' }
];

// Calculate distance
const dist = (w1, w2) => Math.sqrt(Math.pow(w1.x - w2.x, 2) + Math.pow(w1.y - w2.y, 2));

export function embeddingsCard(body) {
  const container = el('div', { class: 'embeddings-sandbox' });

  // Header
  const header = el('div', { class: 'sandbox-header' }, [
    el('h3', {}, 'Embeddings Space (Semantic Search)'),
    el('p', { class: 'muted small' }, 'Click on any word to see its "Semantic Distance" to other words. Words with similar meanings are mathematically closer together in the vector space!')
  ]);

  // Main UI
  const layout = el('div', { class: 'emb-layout' });

  const plotBox = el('div', { class: 'emb-plot', id: 'emb-plot' });
  const infoBox = el('div', { class: 'emb-info' }, [
    el('h4', {}, 'Semantic Distance'),
    el('div', { id: 'emb-results' }, [
      el('div', { class: 'muted small' }, 'Click a word on the graph to calculate distances.')
    ])
  ]);

  layout.append(plotBox, infoBox);
  container.append(header, layout);
  body.replaceChildren(container);

  // Render points
  const points = WORDS.map(w => {
    const pt = el('div', { 
      class: `emb-point cluster-${w.cluster}`,
      'data-id': w.id
    }, w.text);
    pt.style.left = `${w.x}%`;
    pt.style.bottom = `${w.y}%`;
    
    pt.addEventListener('click', () => handleSelect(w));
    
    return pt;
  });
  
  plotBox.append(...points);

  const handleSelect = (selectedWord) => {
    // Reset visual state
    container.querySelectorAll('.emb-point').forEach(p => p.classList.remove('active', 'neighbor'));
    
    // Set active
    const activePt = container.querySelector(`.emb-point[data-id="${selectedWord.id}"]`);
    activePt.classList.add('active');

    // Calculate distances
    let results = WORDS.map(w => {
      return { word: w, distance: dist(selectedWord, w) };
    }).filter(r => r.word.id !== selectedWord.id);
    
    // Sort by distance
    results.sort((a, b) => a.distance - b.distance);

    // Highlight top 2 nearest neighbors
    results.slice(0, 2).forEach(r => {
      container.querySelector(`.emb-point[data-id="${r.word.id}"]`).classList.add('neighbor');
    });

    // Render info box
    const resultNodes = results.slice(0, 5).map((r, index) => {
      return el('div', { class: `emb-result-row ${index < 2 ? 'is-close' : ''}` }, [
        el('span', {}, r.word.text),
        el('span', { class: 'muted' }, `Dist: ${r.distance.toFixed(1)}`)
      ]);
    });
    
    const resBox = container.querySelector('#emb-results');
    resBox.replaceChildren(...resultNodes);
  };
}
