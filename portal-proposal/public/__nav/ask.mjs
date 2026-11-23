// The site's own question box, in place of the browser's prompt() / confirm() (Brian, 3 Nov 2026): those show English
// "OK / Cancel" on many phones, cannot be styled, and ask for dates as typed text. No HTML strings; styles set here.
//   const v = await ask({ title, text, fields: [{ name, label, type: 'text' | 'date' | 'url', value, required }], ok, danger })
//     → { name: value, … } or null when cancelled
//   const yes = await confirmBox(text, { ok, danger }) → true / false
const th = () => (document.documentElement.lang || 'th').startsWith('th');
const CSS = `
dialog.ask-box{border:1px solid color-mix(in srgb,CanvasText 22%,transparent);border-radius:8px;padding:0;width:min(92vw,420px);background:Canvas;color:CanvasText;box-shadow:0 12px 32px #0006;font:inherit}
dialog.ask-box::backdrop{background:#0008}
dialog.ask-box form{display:grid;gap:12px;padding:18px 18px 16px}
dialog.ask-box h2{margin:0;font-size:17px;line-height:1.35}
dialog.ask-box p{margin:0;line-height:1.5;white-space:pre-line}
dialog.ask-box label{display:grid;gap:5px;font-size:14px}
dialog.ask-box input{font:inherit;font-size:16px;padding:9px 10px;border:1px solid color-mix(in srgb,CanvasText 30%,transparent);border-radius:6px;background:Canvas;color:CanvasText;min-height:44px}
dialog.ask-box .ask-row{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:4px}
dialog.ask-box button{font:inherit;font-size:15px;min-height:44px;padding:0 16px;border-radius:6px;border:1px solid color-mix(in srgb,CanvasText 30%,transparent);background:Canvas;color:CanvasText;cursor:pointer}
dialog.ask-box button.ask-ok{background:#1F5F8B;border-color:#1F5F8B;color:#fff}
dialog.ask-box button.ask-ok.danger{background:#A63A2E;border-color:#A63A2E}
dialog.ask-box button:focus-visible,dialog.ask-box input:focus-visible{outline:2px solid #E3A94A;outline-offset:2px}`;
function style() {
  if (document.getElementById('ask-box-style')) return;
  const s = document.createElement('style'); s.id = 'ask-box-style'; s.textContent = CSS; document.head.append(s);
}
const make = (tag, props = {}, ...kids) => { const n = document.createElement(tag); for (const [k, v] of Object.entries(props)) if (v != null) { if (k === 'class') n.className = v; else if (k in n && k !== 'list') n[k] = v; else n.setAttribute(k, v); } n.append(...kids.filter((k) => k != null)); return n; };

export function ask({ title = '', text = '', fields = [], ok, cancel, danger = false } = {}) {
  style();
  return new Promise((resolve) => {
    const inputs = fields.map((f) => make('input', { name: f.name, type: f.type || 'text', value: f.value ?? '', required: f.required ? true : null, maxLength: f.maxlength || 500, autocomplete: 'off', spellcheck: f.type === 'text' ? null : 'false' }));
    const okBtn = make('button', { type: 'submit', class: `ask-ok${danger ? ' danger' : ''}` }, ok || (th() ? 'ตกลง' : 'OK'));
    const cancelBtn = make('button', { type: 'button' }, cancel || (th() ? 'ยกเลิก' : 'Cancel'));
    const form = make('form', { method: 'dialog' },
      title ? make('h2', {}, title) : null, text ? make('p', {}, text) : null,
      ...fields.map((f, i) => make('label', {}, make('span', {}, f.label || ''), inputs[i])),
      make('div', { class: 'ask-row' }, cancelBtn, okBtn));
    const box = make('dialog', { class: 'ask-box', 'aria-label': title || text }, form);
    let answer = null;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      answer = Object.fromEntries(fields.map((f, i) => [f.name, inputs[i].value]));
      box.close();
    });
    cancelBtn.addEventListener('click', () => box.close());
    box.addEventListener('close', () => { box.remove(); resolve(answer); });
    document.body.append(box);
    box.showModal();
    (inputs[0] || okBtn).focus();
    if (inputs[0]?.type === 'text') inputs[0].select?.();
  });
}

export async function confirmBox(text, { ok, cancel, danger = false, title = '' } = {}) {
  return (await ask({ title, text, ok, cancel, danger })) !== null;
}
