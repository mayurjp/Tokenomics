// Minimal DOM helper. Lives on its own so every card can use it without importing
// anything that imports them back.

export function el(tag, attrs, children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs || {})) node.setAttribute(name, value);
  if (tag === 'input' && attrs && 'checked' in attrs) node.checked = true;

  for (const child of [].concat(children ?? [])) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }
  return node;
}
