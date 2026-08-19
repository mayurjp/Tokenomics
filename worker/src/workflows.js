// The workflow catalog lives server-side on purpose.
//
// The browser sends only a workflow id — never prompt text. That keeps this Worker
// from being an open Gemini relay: whoever finds the endpoint can run these prompts
// and nothing else, against these models and nothing else. It is the cheapest and
// most effective abuse control available for a shared key, so it is here from day one.
//
// Phase 2 (caching) adds a second entry whose prompt is padded past Gemini's implicit
// cache minimum — see docs/phase2-caching-design.md.

export const WORKFLOWS = [
  {
    id: 'phase1',
    label: 'Pass 1 — measure a single call',
    description:
      'Fires one fixed prompt at Gemini and reports exactly what the API said it cost, ' +
      'in tokens. Nothing is estimated or counted locally.',
    model: 'gemini-3.5-flash',
    // Gemini 3.x models think by default, and on this prompt the thinking dwarfs both the
    // input and the output. Exposing it as a toggle turns that into the demo.
    supportsThinkingToggle: true,
    prompt:
      'Explain in three short paragraphs why a large language model bills for input ' +
      'tokens and output tokens separately, and what that means for someone designing ' +
      'a prompt they intend to send thousands of times.',
  },
];

export function findWorkflow(id) {
  return WORKFLOWS.find((w) => w.id === id);
}

// What the frontend is allowed to see: everything. There are no secrets in a workflow —
// the prompt is public by design so the page can show the user what it is about to send.
export function toPublicWorkflow(workflow) {
  return {
    id: workflow.id,
    label: workflow.label,
    description: workflow.description,
    model: workflow.model,
    prompt: workflow.prompt,
    supportsThinkingToggle: workflow.supportsThinkingToggle === true,
  };
}
