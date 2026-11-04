// Ferramenta para editar os dados criptografados da campanha.
//
//   CHAVE_DADOS=<chave> node ferramentas/dados.mjs abrir    → cria js/dados.js (texto puro, NÃO vai para o GitHub)
//   CHAVE_DADOS=<chave> node ferramentas/dados.mjs fechar   → criptografa js/dados.js em js/dados.enc.json
//   node ferramentas/dados.mjs nova-chave                   → gera uma chave nova
//
// A chave é a mesma salva no Firestore em config/acesso (campo "chave").

import { readFile, writeFile } from 'node:fs/promises';
import { webcrypto as crypto } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ABERTO = path.join(raiz, 'js', 'dados.js');
const FECHADO = path.join(raiz, 'js', 'dados.enc.json');

const b64 = (bytes) => Buffer.from(bytes).toString('base64');
const deB64 = (texto) => new Uint8Array(Buffer.from(String(texto).trim().replace(/-/g, '+').replace(/_/g, '/'), 'base64'));

async function chave(uso) {
  const bruta = process.env.CHAVE_DADOS;
  if (!bruta) throw new Error('Defina a variável CHAVE_DADOS com a chave de acesso.');
  const bytes = deB64(bruta);
  if (bytes.length !== 32) throw new Error('Chave inválida: precisa ter 32 bytes em base64.');
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, [uso]);
}

async function fechar() {
  const texto = await readFile(ABERTO, 'utf8');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrado = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await chave('encrypt'), new TextEncoder().encode(texto));
  await writeFile(FECHADO, JSON.stringify({ v: 1, alg: 'AES-GCM-256', iv: b64(iv), dados: b64(cifrado) }) + '\n');
  console.log(`OK: ${path.relative(raiz, ABERTO)} → ${path.relative(raiz, FECHADO)}`);
}

async function abrir() {
  const { iv, dados } = JSON.parse(await readFile(FECHADO, 'utf8'));
  const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(iv) }, await chave('decrypt'), deB64(dados));
  await writeFile(ABERTO, new TextDecoder().decode(bytes));
  console.log(`OK: ${path.relative(raiz, FECHADO)} → ${path.relative(raiz, ABERTO)} (não faça commit deste arquivo)`);
}

const comandos = {
  abrir,
  fechar,
  'nova-chave': async () => console.log(Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')),
};

const cmd = process.argv[2];
if (!comandos[cmd]) {
  console.error('Uso: node ferramentas/dados.mjs abrir | fechar | nova-chave');
  process.exit(1);
}
comandos[cmd]().catch((e) => {
  console.error('Erro:', e.message);
  process.exit(1);
});
