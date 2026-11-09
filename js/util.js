// Funções compartilhadas pelo painel (app.js) e pela página de cobranças (cobrancas.js).

export const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
export const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const normalizar = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
export const slug = (s) => normalizar(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function toast(texto, tipo = 'ok') {
  const el = document.createElement('div');
  el.className = `toast toast-${tipo}`;
  el.setAttribute('role', 'status');
  el.textContent = texto;
  (document.querySelector('dialog[open]') || document.body).appendChild(el);
  setTimeout(() => el.classList.add('saindo'), 1800);
  setTimeout(() => el.remove(), 2200);
}

export async function copiar(texto, aviso = 'Copiado!') {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    (document.querySelector('dialog[open]') || document.body).appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast(aviso);
}

export function digitos(t) {
  return String(t ?? '').replace(/\D/g, '');
}

export function formatarTelefone(t) {
  let d = digitos(t);
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return String(t ?? '').trim();
}

export function numeroWhats(t) {
  let d = digitos(t).replace(/^0+/, '');
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return d;
}

// No Android, os links abrem direto o WhatsApp Business (com.whatsapp.w4b).
// Se o Business não estiver instalado, cai no link normal (wa.me).
export const NO_ANDROID = /Android/i.test(navigator.userAgent);

export function linkWhats(telefone, texto = '') {
  const numero = numeroWhats(telefone);
  const normal = `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
  if (!NO_ANDROID) return normal;
  const params = [numero ? `phone=${numero}` : '', texto ? `text=${encodeURIComponent(texto)}` : ''].filter(Boolean).join('&');
  return `intent://send?${params}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;S.browser_fallback_url=${encodeURIComponent(normal)};end`;
}

// No Android o link abre o app direto; nova aba só deixaria uma aba em branco.
export const alvoWhats = NO_ANDROID ? '' : ' target="_blank" rel="noopener"';

export function tempoRelativo(ms) {
  if (!ms) return '';
  const s = (Date.now() - ms) / 1000;
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  const dias = Math.floor(s / 86400);
  if (dias < 7) return `há ${dias} dia${dias > 1 ? 's' : ''}`;
  return new Date(ms).toLocaleDateString('pt-BR');
}

export const dataHora = (ms) => (ms ? new Date(ms).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '');
export const primeiroNome = (s) => String(s ?? '').trim().split(/\s+/)[0] || '';
