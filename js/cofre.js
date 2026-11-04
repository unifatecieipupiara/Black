// Abre os dados da campanha (cursos, valores, links, vouchers e mensagens).
// No repositório eles ficam só criptografados (js/dados.enc.json, AES-GCM 256).
// A chave fica no Firestore (config/acesso) e só os e-mails autorizados leem.

const ARQUIVO = new URL('./dados.enc.json', import.meta.url);

function deBase64(texto) {
  const b = String(texto).trim().replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
}

export function formatoDeChaveValido(chave) {
  try {
    return deBase64(chave).length === 32;
  } catch {
    return false;
  }
}

export class ChaveIncorreta extends Error {}

export async function abrirDados(chave) {
  if (!formatoDeChaveValido(chave)) throw new ChaveIncorreta('Formato de chave inválido.');
  const resposta = await fetch(ARQUIVO, { cache: 'no-store' });
  if (!resposta.ok) throw new Error(`Não foi possível baixar os dados (erro ${resposta.status}).`);
  const { iv, dados } = await resposta.json();
  const k = await crypto.subtle.importKey('raw', deBase64(chave), 'AES-GCM', false, ['decrypt']);
  let bytes;
  try {
    bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deBase64(iv) }, k, deBase64(dados));
  } catch {
    throw new ChaveIncorreta('A chave não abre os dados.');
  }
  const codigo = new TextDecoder().decode(bytes);
  const url = URL.createObjectURL(new Blob([codigo], { type: 'text/javascript' }));
  try {
    return await import(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}
