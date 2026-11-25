// Página de depoimentos do site (unifatecie-ead) — acesso da equipe autorizada.
// Os alunos enviam pelo formulário da página inicial do site; cada depoimento
// entra no Firestore (coleção "depoimentos") como "pendente". Aqui a equipe
// aprova (vai para o carrossel do site), edita, tira do site ou exclui.
// As regras do Firestore (firestore.rules) garantem quem pode fazer o quê.

import { FIREBASE_CONFIG } from './config.js';
import { $, esc, toast, primeiroNome, tempoRelativo, dataHora } from './util.js';

const GESTORA = 'agaleriacampos@gmail.com';
const VERSAO_FIREBASE = '13.1.0';

const POLOS = [
  { id: 'ipupiara', nome: 'Polo Ipupiara' },
  { id: 'barra-do-mendes', nome: 'Polo Barra do Mendes' },
];
const poloPorId = Object.fromEntries(POLOS.map((p) => [p.id, p]));

const FILTROS = [
  { id: 'pendente', nome: '⏳ Pendentes' },
  { id: 'aprovado', nome: '✅ No site' },
];

const estado = {
  usuario: null,
  depoimentos: [],
  filtro: 'pendente',
  editandoId: null,
  carregando: true,
};
let F = null; // módulo do Firestore
let A = null; // módulo de autenticação
let auth = null;
let colecao = null;
let pararDeOuvir = null;

const paraMs = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'number' ? v : null);
const iniciais = (nome) =>
  String(nome || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || '?';
const fotoValida = (f) => typeof f === 'string' && f.startsWith('data:image/jpeg;base64,');

// ---------------------------------------------------------------- tela de acesso

function mostrarAcesso(tipo, detalhe = '') {
  $('#app').hidden = true;
  $('#telaAcesso').hidden = false;
  const email = estado.usuario?.email ? `<strong>${esc(estado.usuario.email)}</strong>` : 'Esta conta';
  const telas = {
    carregando: '<p>Carregando…</p>',
    login: `
      <div class="acesso-icone">🔒</div>
      <h2>Depoimentos</h2>
      <p>Área restrita à equipe do polo. Entre com a sua conta Google.</p>
      <button type="button" class="btn btn-primario" data-acao="entrar">Entrar com Google</button>`,
    negado: `
      <div class="acesso-icone">⛔</div>
      <h2>Sem permissão</h2>
      <p>${email} não tem acesso aos depoimentos.</p>
      <p class="pequeno">${esc(detalhe || 'Peça para incluir o seu e-mail nas regras do Firestore.')}</p>
      <a class="btn" href="./">← Voltar ao painel</a>
      <button type="button" class="btn" data-acao="sair">Entrar com outra conta</button>`,
    erro: `
      <div class="acesso-icone">⚠️</div>
      <h2>Não foi possível abrir</h2>
      ${detalhe ? `<p class="acesso-erro" role="alert">${esc(detalhe)}</p>` : ''}
      <button type="button" class="btn btn-primario" onclick="location.reload()">Tentar de novo</button>`,
  };
  $('#acessoConteudo').innerHTML = telas[tipo] || telas.carregando;
}

function renderUsuario() {
  const u = estado.usuario;
  const gestora = String(u?.email || '').toLowerCase() === GESTORA;
  $('#usuario').innerHTML = u
    ? `<a class="btn btn-topo" href="./">← Painel</a>
       ${gestora ? '<a class="btn btn-topo" href="cobrancas.html">💰 Cobranças</a>' : ''}
       <span class="usuario-nome" title="${esc(u.email)}">${esc(primeiroNome(u.nome))}</span>
       <button type="button" class="btn btn-topo" data-acao="sair">Sair</button>`
    : '';
}

// ---------------------------------------------------------------- lista

const statusDe = (d) => (d.status === 'aprovado' ? 'aprovado' : 'pendente');

function renderFiltros() {
  const n = (id) => estado.depoimentos.filter((d) => statusDe(d) === id).length;
  $('#depFiltros').innerHTML = FILTROS.map((f) => {
    const ativo = estado.filtro === f.id;
    return `<button type="button" class="chip ${ativo ? 'ativo' : ''}" data-acao="filtro" data-filtro="${f.id}" aria-pressed="${ativo}">${f.nome} (${n(f.id)})</button>`;
  }).join('');
}

function cardDepoimento(d) {
  const polo = poloPorId[d.polo]?.nome || '';
  const aprovado = statusDe(d) === 'aprovado';
  const foto = fotoValida(d.foto)
    ? `<img class="dep-foto" src="${esc(d.foto)}" alt="Foto de ${esc(d.nome)}">`
    : `<span class="dep-foto dep-iniciais" aria-hidden="true">${esc(iniciais(d.nome))}</span>`;
  const quando = d.criadoEm ? `Enviado ${tempoRelativo(d.criadoEm)} (${dataHora(d.criadoEm)})` : 'Enviado agora';
  const editado = d.atualizadoPor && d.atualizadoEm ? ` · ${aprovado ? 'Aprovado' : 'Atualizado'} por ${esc(primeiroNome(d.atualizadoPor))} ${tempoRelativo(d.atualizadoEm)}` : '';
  return `
    <article class="dep-card ${aprovado ? 'dep-aprovado' : ''}">
      <div class="dep-topo">
        ${foto}
        <div class="dep-quem">
          <h3>${esc(d.nome)}</h3>
          <p>${esc(d.curso)}${polo ? ` – ${esc(polo)}` : ''}</p>
        </div>
        <span class="dep-status">${aprovado ? '✅ No site' : '⏳ Pendente'}</span>
      </div>
      <p class="dep-texto">${esc(d.texto)}</p>
      <p class="cob-meta">${esc(quando)}${editado}${d.autorizacao ? ' · Autorizou a publicação' : ''}</p>
      <div class="cob-acoes">
        ${
          aprovado
            ? `<button type="button" class="btn btn-mini" data-acao="tirar" data-id="${esc(d.id)}">↩️ Tirar do site</button>`
            : `<button type="button" class="btn btn-mini btn-primario" data-acao="aprovar" data-id="${esc(d.id)}">✅ Aprovar e publicar</button>`
        }
        <button type="button" class="btn btn-mini" data-acao="editar" data-id="${esc(d.id)}">✏️ Editar</button>
        <button type="button" class="btn btn-mini btn-perigo" data-acao="excluir" data-id="${esc(d.id)}">🗑️ Excluir</button>
      </div>
    </article>`;
}

function renderLista() {
  renderFiltros();
  const el = $('#depLista');
  if (estado.carregando) {
    el.innerHTML = '<p class="vazio">Carregando depoimentos…</p>';
    return;
  }
  const lista = estado.depoimentos
    .filter((d) => statusDe(d) === estado.filtro)
    .sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
  el.innerHTML = lista.length
    ? lista.map(cardDepoimento).join('')
    : `<p class="vazio">${
        estado.filtro === 'pendente'
          ? 'Nenhum depoimento esperando aprovação. 🎉'
          : 'Nenhum depoimento aprovado ainda. Os aprovados aparecem aqui e no carrossel do site.'
      }</p>`;
}

// ---------------------------------------------------------------- ações

const quem = () => estado.usuario?.nome || estado.usuario?.email || '';

async function mudarStatus(dep, status) {
  try {
    await F.updateDoc(F.doc(colecao, dep.id), { status, atualizadoEm: F.serverTimestamp(), atualizadoPor: quem() });
    toast(status === 'aprovado' ? 'Aprovado! Já aparece no site.' : 'Tirado do site. Voltou para Pendentes.');
  } catch (err) {
    console.error(err);
    toast(`Não foi possível salvar: ${err.code || err.message}`, 'erro');
  }
}

function abrirEdicao(dep) {
  const form = $('#formDep');
  estado.editandoId = dep.id;
  form.polo.innerHTML = POLOS.map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join('');
  form.nome.value = dep.nome || '';
  form.curso.value = dep.curso || '';
  form.polo.value = poloPorId[dep.polo] ? dep.polo : POLOS[0].id;
  form.texto.value = dep.texto || '';
  form.tirarFoto.checked = false;
  $('#campoTirarFoto').hidden = !fotoValida(dep.foto);
  $('#dlgDep').showModal();
}

async function salvarEdicao(e) {
  e.preventDefault();
  const form = e.target;
  const dep = estado.depoimentos.find((d) => d.id === estado.editandoId);
  if (!dep) return $('#dlgDep').close();
  const dados = {
    nome: form.nome.value.trim(),
    curso: form.curso.value.trim(),
    polo: form.polo.value,
    texto: form.texto.value.trim(),
    atualizadoEm: F.serverTimestamp(),
    atualizadoPor: quem(),
  };
  if (!dados.nome || !dados.curso || !dados.texto) return toast('Preencha nome, curso e depoimento.', 'erro');
  if (form.tirarFoto.checked) dados.foto = F.deleteField();
  try {
    await F.updateDoc(F.doc(colecao, dep.id), dados);
    $('#dlgDep').close();
    toast('Depoimento salvo.');
  } catch (err) {
    console.error(err);
    toast(`Não foi possível salvar: ${err.code || err.message}`, 'erro');
  }
}

async function excluir(dep) {
  if (!confirm(`Excluir o depoimento de ${dep.nome}? Ele some do painel${statusDe(dep) === 'aprovado' ? ' e do site' : ''} e não dá para desfazer.`)) return;
  try {
    await F.deleteDoc(F.doc(colecao, dep.id));
    toast('Depoimento excluído.');
  } catch (err) {
    console.error(err);
    toast(`Não foi possível excluir: ${err.code || err.message}`, 'erro');
  }
}

// ---------------------------------------------------------------- eventos

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-acao]');
  if (!el) return;
  const dep = el.dataset.id ? estado.depoimentos.find((d) => d.id === el.dataset.id) : null;
  switch (el.dataset.acao) {
    case 'entrar': {
      const provedor = new A.GoogleAuthProvider();
      provedor.setCustomParameters({ prompt: 'select_account' });
      try {
        await A.signInWithPopup(auth, provedor);
      } catch (err) {
        if (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment') return A.signInWithRedirect(auth, provedor);
        if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') toast(`Não foi possível entrar: ${err.code || err.message}`, 'erro');
      }
      return;
    }
    case 'sair':
      return A.signOut(auth);
    case 'filtro':
      estado.filtro = el.dataset.filtro;
      return renderLista();
    case 'aprovar':
      return dep && mudarStatus(dep, 'aprovado');
    case 'tirar':
      return dep && mudarStatus(dep, 'pendente');
    case 'editar':
      return dep && abrirEdicao(dep);
    case 'excluir':
      return dep && excluir(dep);
    case 'fechar-dialogo':
      return el.closest('dialog')?.close();
    default:
  }
});

$('#formDep').addEventListener('submit', salvarEdicao);
for (const dlg of document.querySelectorAll('dialog')) {
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });
}
// Atualiza o "há X min" de vez em quando.
setInterval(() => {
  if (!$('#app').hidden && !document.hidden && !document.querySelector('dialog[open]')) renderLista();
}, 60_000);

// ---------------------------------------------------------------- início

function abrirLista() {
  $('#telaAcesso').hidden = true;
  $('#app').hidden = false;
  estado.carregando = true;
  renderLista();
  pararDeOuvir?.();
  pararDeOuvir = F.onSnapshot(
    colecao,
    (snap) => {
      estado.depoimentos = snap.docs.map((d) => {
        const dados = d.data({ serverTimestamps: 'estimate' });
        return { ...dados, id: d.id, criadoEm: paraMs(dados.criadoEm), atualizadoEm: paraMs(dados.atualizadoEm) };
      });
      estado.carregando = false;
      renderLista();
    },
    (err) => {
      console.error(err);
      if (err.code === 'permission-denied') {
        mostrarAcesso('negado', 'O Firebase recusou o acesso. Confira se a versão mais recente das regras (firestore.rules) foi publicada e se o seu e-mail está na lista.');
      } else {
        mostrarAcesso('erro', err.message || String(err));
      }
    },
  );
}

async function iniciar() {
  mostrarAcesso('carregando');
  try {
    const base = `https://www.gstatic.com/firebasejs/${VERSAO_FIREBASE}`;
    const [{ initializeApp }, modAuth, modFs] = await Promise.all([
      import(`${base}/firebase-app.js`),
      import(`${base}/firebase-auth.js`),
      import(`${base}/firebase-firestore.js`),
    ]);
    A = modAuth;
    F = modFs;
    const app = initializeApp(FIREBASE_CONFIG);
    auth = A.getAuth(app);
    colecao = F.collection(F.getFirestore(app), 'depoimentos');
  } catch (err) {
    console.error(err);
    return mostrarAcesso('erro', `Não foi possível conectar: ${err.message || err}`);
  }

  A.onAuthStateChanged(auth, (u) => {
    estado.usuario = u ? { nome: u.displayName || u.email, email: u.email } : null;
    renderUsuario();
    pararDeOuvir?.();
    pararDeOuvir = null;
    estado.depoimentos = [];
    if (!u) return mostrarAcesso('login');
    // Quem pode ver é decidido pelas regras do Firestore: se não puder, cai em "negado".
    abrirLista();
  });
}

iniciar();
