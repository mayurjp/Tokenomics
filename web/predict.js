// Guess before you look.
//
// The lesson on this card is a surprise — reasoning is a far bigger share of the bill than
// almost anyone expects — and a surprise only lands if you committed to an answer first.
// Reading "75% was thinking" is a fact you skim. Being wrong about it is a thing you
// remember.
//
// Deliberately small: three buttons, one tap, no score, no streak, no persistence. It
// resets on reload, which is right for a one-shot reveal. And it never invents the answer —
// reveal() is handed the measured share from the run that just happened.

import { el } from './dom.js';

export function createPrediction({ question, choices, unit = '%' }) {
  const node = el('div', { class: 'predict' });
  const outcome = el('p', { class: 'predict-outcome', hidden: '' });

  let guess = null;

  const buttons = choices.map((value) => {
    const button = el('button', { type: 'button', class: 'chip predict-chip' }, `${value}${unit}`);
    button.addEventListener('click', () => {
      guess = value;
      buttons.forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
    });
    return button;
  });

  node.replaceChildren(
    el('p', { class: 'predict-q' }, question),
    el('div', { class: 'chips' }, buttons),
    outcome
  );

  return {
    node,
    // Handed to the diagram so the answer appears directly beneath the bars that prove it,
    // not above them where it would spoil the reveal.
    outcomeNode: outcome,

    get guess() {
      return guess;
    },

    // actual: the measured value. Everything said here is derived from it.
    reveal(actual) {
      const rounded = Math.round(actual);
      buttons.forEach((b) => (b.disabled = true));
      outcome.hidden = false;

      if (guess === null) {
        outcome.className = 'predict-outcome';
        outcome.replaceChildren(
          el('strong', {}, `It was ${rounded}${unit}.`),
          ' No guess on record — pick one before the next run and see how close you get.'
        );
        return;
      }

      const delta = Math.abs(rounded - guess);
      const close = delta <= 10;

      outcome.className = `predict-outcome ${close ? 'is-close' : 'is-off'}`;
      outcome.replaceChildren(
        el('strong', {}, `It was ${rounded}${unit}.`),
        close
          ? ` You said ${guess}${unit} — close.`
          : ` You said ${guess}${unit}, so it is ${rounded > guess ? 'bigger' : 'smaller'} than you thought by ${delta} points.`
      );
    },

    reset() {
      outcome.hidden = true;
      buttons.forEach((b) => (b.disabled = false));
    },
  };
}
