import { POLO, GRUPOS_BLACK, TIPOS_COM_GRUPOS, OBSERVACOES, TIPOS, CURSOS } from './dados.js';
import { FIREBASE_CONFIG } from './config.js';
import { criarArmazenamento } from './armazenamento.js';

// ---------------------------------------------------------------- base

const STATUS = [
  { id: 'andamento', nome: 'Em andamento' },
  { id: 'sem_retorno', nome: 'Sem retorno' },
  { id: 'matriculado', nome: 'Matriculado' },
  { id: 'perdido', nome: 'Perdido' },
];
const statusPorId = Object.fromEntries(STATUS.map((s) => [s.id, s]));
const tipoPorId = Object.fromEntries(TIPOS.map((t) => [t.id, t]));

const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const normalizar = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
const slug = (s) => normalizar(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const cursos = CURSOS.map((c) => ({ ...c, id: c.id || slug(`${c.tipo}-${c.nome}-${c.grau || ''}`) })).sort((a, b) =>
  a.nome.localeCompare(b.nome, 'pt-BR'),
);

// ---------------------------------------------------------------- valores

const reais = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\s/g, ' ');

function grupoCurso(c) {
  if (!TIPOS_COM_GRUPOS.includes(c.tipo) || typeof c.valorNormal !== 'number') return null;
  return GRUPOS_BLACK.find((g) => Math.abs(g.de - c.valorNormal) < 0.005) || null;
}

function precoCurso(c) {
  const normal = typeof c.valorNormal === 'number' ? c.valorNormal : null;
  if (normal === null) return { normal: null, black: null };
  const black = typeof c.valorBlack === 'number' ? c.valorBlack : (grupoCurso(c)?.por ?? null);
  return { normal, black: black !== null && black < normal ? black : null };
}

// Transferência: só cursos de Graduação de grupos que aceitam transferência.
function aceitaTransferencia(c) {
  return c.tipo === 'graduacao' && Boolean(grupoCurso(c)?.transferencia);
}

function detalhesCurso(c) {
  return ['provaPolo', 'estagio', 'tcc', 'megaPolo']
    .filter((campo) => typeof c[campo] === 'boolean')
    .map((campo) => OBSERVACOES[campo]?.[c[campo] ? 'sim' : 'nao'] || '')
    .filter(Boolean);
}

const rotuloCurso = (c) => (c.grau ? `${c.nome} – ${c.grau}` : c.nome);
const cursoPorId = Object.fromEntries(cursos.map((c) => [c.id, c]));

const estado = {
  aba: 'cursos',
  filtroTipo: 'todos',
  buscaCurso: '',
  store: null,
  erroStore: null,
  usuario: null,
  carregandoLeads: true,
  semPermissao: false,
  leads: [],
  filtroStatus: 'todos',
  buscaLead: '',
  editandoId: null,
};

// ---------------------------------------------------------------- utilidades

function toast(texto, tipo = 'ok') {
  const el = document.createElement('div');
  el.className = `toast toast-${tipo}`;
  el.setAttribute('role', 'status');
  el.textContent = texto;
  (document.querySelector('dialog[open]') || document.body).appendChild(el);
  setTimeout(() => el.classList.add('saindo'), 1800);
  setTimeout(() => el.remove(), 2200);
}

async function copiar(texto, aviso = 'Copiado!') {
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

function digitos(t) {
  return String(t ?? '').replace(/\D/g, '');
}

function formatarTelefone(t) {
  let d = digitos(t);
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return String(t ?? '').trim();
}

function numeroWhats(t) {
  let d = digitos(t).replace(/^0+/, '');
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return d;
}

function linkWhats(telefone, texto) {
  return `https://wa.me/${numeroWhats(telefone)}?text=${encodeURIComponent(texto)}`;
}

function tempoRelativo(ms) {
  if (!ms) return '';
  const s = (Date.now() - ms) / 1000;
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  const dias = Math.floor(s / 86400);
  if (dias < 7) return `há ${dias} dia${dias > 1 ? 's' : ''}`;
  return new Date(ms).toLocaleDateString('pt-BR');
}

const dataHora = (ms) => (ms ? new Date(ms).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '');
const primeiroNome = (s) => String(s ?? '').trim().split(/\s+/)[0] || '';

// ---------------------------------------------------------------- mensagens

function montarMensagem({ cursoId, ingresso }) {
  const curso = cursoPorId[cursoId];
  if (!curso) return '';
  const tipo = tipoPorId[ingresso] || tipoPorId[curso.tipo];
  const modelo = curso.mensagem || tipo?.mensagem || '';
  const { normal, black } = precoCurso(curso);
  const valor = black ?? normal;
  const valores = {
    curso: curso.nome || '',
    grau: curso.grau || '',
    duracao: curso.duracao || '',
    valor: valor !== null ? reais(valor) : '',
    valorDe: black !== null ? reais(normal) : '',
    oferta: valor === null ? '' : black !== null ? `~${reais(normal)}~ por *${reais(black)}*` : `*${reais(normal)}*`,
    matricula: tipo?.matricula || '',
    primeiraMensalidade: tipo?.primeiraMensalidade || '',
    detalhes: detalhesCurso(curso).join('\n'),
    polo: POLO.nome,
    campanha: POLO.campanha,
  };

  const linhas = modelo.split('\n').flatMap((linhaOriginal) => {
    const linha = linhaOriginal;
    const chaves = [...linha.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((k) => k in valores);
    if (chaves.length && chaves.every((k) => !valores[k])) return [];
    return [linha.replace(/\{(\w+)\}/g, (m, k) => (k in valores ? valores[k] : m))];
  });
  return linhas.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ---------------------------------------------------------------- topo e avisos

function renderTopo() {
  $('#tituloPolo').textContent = POLO.nome;
  $('#subtitulo').textContent = [POLO.campanha, POLO.periodo].filter(Boolean).join(' · ');
  document.title = `${POLO.campanha} · ${POLO.nome}`;
  $('#rodape').textContent = `${POLO.nome} · ${POLO.campanha}`;
}

function renderAvisos() {
  const avisos = [];
  const pendencias = [];
  const semLink = TIPOS.filter((t) => !t.link).map((t) => t.nome);
  const semCupom = TIPOS.filter((t) => !t.cupom).map((t) => t.nome);
  const semCursos = TIPOS.filter((t) => ['graduacao', 'segunda', 'pos'].includes(t.id) && !cursos.some((c) => c.tipo === t.id)).map(
    (t) => t.nome,
  );
  const semBlack = cursos.filter((c) => precoCurso(c).normal !== null && precoCurso(c).black === null);
  if (semLink.length) pendencias.push(`link de matrícula (${semLink.join(', ')})`);
  if (semCupom.length) pendencias.push(`cupom (${semCupom.join(', ')})`);
  if (semBlack.length) {
    const nomes = semBlack.map((c) => `${c.nome} (${tipoPorId[c.tipo]?.nome || c.tipo})`);
    pendencias.push(
      `valor da Black Friday de ${nomes.length > 6 ? `${nomes.length} cursos` : nomes.join(', ')} — aparece o valor normal`,
    );
  }
  if (semCursos.length) pendencias.push(`cursos de ${semCursos.join(', ')}`);
  if (pendencias.length) {
    avisos.push(
      `<div class="aviso aviso-alerta">⚠️ <strong>Ainda falta cadastrar:</strong><ul>${pendencias.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>`,
    );
  }
  if (estado.store?.modo === 'demo') {
    avisos.push(
      '<div class="aviso">ℹ️ <strong>Modo demonstração:</strong> os leads ficam salvos só neste navegador. Depois de configurar o Firebase, eles passam a ser compartilhados entre vocês.</div>',
    );
  }
  $('#avisos').innerHTML = avisos.join('');
}

function renderUsuario() {
  const el = $('#usuario');
  const { store, usuario } = estado;
  if (!store) {
    el.innerHTML = '';
  } else if (store.modo === 'demo') {
    el.innerHTML = '<span class="usuario-nome">Modo demonstração</span>';
  } else if (usuario) {
    el.innerHTML = `<span class="usuario-nome" title="${esc(usuario.email)}">${esc(primeiroNome(usuario.nome))}</span>
      <button type="button" class="btn btn-topo" data-acao="sair">Sair</button>`;
  } else {
    el.innerHTML = '<button type="button" class="btn btn-topo" data-acao="entrar">Entrar com Google</button>';
  }
}

// ---------------------------------------------------------------- cards de matrícula

function renderMatriculas() {
  $('#cardsMatricula').innerHTML = TIPOS.map((t) => {
    const temLink = Boolean(t.link);
    return `
      <article class="card-matricula tipo-${esc(t.id)}">
        <h3>${esc(t.nome)}</h3>
        <div class="cupom">
          <span class="cupom-rotulo">Cupom</span>
          <span class="cupom-codigo">${t.cupom ? esc(t.cupom) : '—'}</span>
          ${t.cupom ? `<button type="button" class="btn btn-mini" data-acao="copiar-cupom" data-tipo="${esc(t.id)}" aria-label="Copiar cupom ${esc(t.nome)}">Copiar</button>` : ''}
        </div>
        ${t.matricula ? `<p class="card-obs">Matrícula: <strong>${esc(t.matricula)}</strong></p>` : ''}
        ${t.obs ? `<p class="card-obs">${esc(t.obs)}</p>` : ''}
        <div class="card-acoes">
          ${
            temLink
              ? `<a class="btn btn-primario" href="${esc(t.link)}" target="_blank" rel="noopener">Acessar link ↗</a>`
              : '<span class="sem-link">Link ainda não cadastrado</span>'
          }
        </div>
      </article>`;
  }).join('');
}

// ---------------------------------------------------------------- cursos

function renderFiltrosTipo() {
  const usados = TIPOS.filter((t) => cursos.some((c) => c.tipo === t.id));
  const opcoes = [{ id: 'todos', nome: 'Todos' }, ...usados];
  $('#filtrosTipo').innerHTML = opcoes
    .map(
      (t) =>
        `<button type="button" class="chip ${estado.filtroTipo === t.id ? 'ativo' : ''}" data-acao="filtro-tipo" data-tipo="${esc(t.id)}" aria-pressed="${estado.filtroTipo === t.id}">${esc(t.nome)}</button>`,
    )
    .join('');
}

function cardCurso(c) {
  const tipo = tipoPorId[c.tipo];
  const sub = [c.grau, c.duracao].filter(Boolean).join(' · ');
  const { normal, black } = precoCurso(c);
  const grupo = grupoCurso(c);
  const flags = [
    ...(c.tipo === 'graduacao' ? [['Transferência', aceitaTransferencia(c)]] : []),
    ['TCC', c.tcc],
    ['Estágio', c.estagio],
    ['Prova no polo', c.provaPolo],
    ['Aula no MegaPolo', c.megaPolo],
  ].filter(([, v]) => typeof v === 'boolean');
  return `
    <article class="card-curso">
      <div class="etiquetas">
        <span class="etiqueta tipo-${esc(c.tipo)}">${esc(tipo?.nome || c.tipo)}</span>
        ${grupo ? `<span class="etiqueta etiqueta-grupo">${esc(grupo.nome)}</span>` : ''}
      </div>
      <h4>${esc(c.nome)}</h4>
      ${sub ? `<p class="curso-sub">${esc(sub)}</p>` : ''}
      ${
        normal !== null
          ? `<p class="preco">${black !== null ? `<span class="preco-de">de <s>${reais(normal)}</s></span>` : ''}<span class="preco-por">${black !== null ? 'por ' : ''}<strong>${reais(black ?? normal)}</strong><span class="preco-mes">/mês</span></span>${black === null ? '<span class="preco-nota">valor normal</span>' : ''}</p>`
          : ''
      }
      ${flags.length ? `<ul class="flags">${flags.map(([nome, v]) => `<li class="${v ? 'sim' : 'nao'}">${v ? '✓' : '✗'} ${esc(nome)}</li>`).join('')}</ul>` : ''}
      <div class="card-acoes">
        <button type="button" class="btn btn-primario" data-acao="copiar-msg" data-curso="${esc(c.id)}">📋 Copiar mensagem</button>
        <button type="button" class="btn" data-acao="abrir-msg" data-curso="${esc(c.id)}">💬 Personalizar</button>
      </div>
    </article>`;
}

function renderCursos() {
  renderFiltrosTipo();
  const q = normalizar(estado.buscaCurso.trim());
  const visiveis = cursos.filter(
    (c) =>
      (estado.filtroTipo === 'todos' || c.tipo === estado.filtroTipo) &&
      (!q || normalizar(`${c.nome} ${c.grau || ''} ${tipoPorId[c.tipo]?.nome || ''}`).includes(q)),
  );
  if (!visiveis.length) {
    $('#listaCursos').innerHTML = '<p class="vazio">Nenhum curso encontrado.</p>';
    return;
  }
  $('#listaCursos').innerHTML = TIPOS.map((t) => {
    const doTipo = visiveis.filter((c) => c.tipo === t.id);
    if (!doTipo.length) return '';
    return `<h3 class="grupo-titulo">${esc(t.nome)} <span>(${doTipo.length})</span></h3>
      <div class="grade-cursos">${doTipo.map(cardCurso).join('')}</div>`;
  }).join('');
}

// ---------------------------------------------------------------- leads

function renderContador() {
  const el = $('#contLeads');
  const n = estado.leads.length;
  el.hidden = !n;
  el.textContent = n;
}

function renderLeads() {
  renderContador();
  const elEstado = $('#leadsEstado');
  const elConteudo = $('#leadsConteudo');
  const mostrarEstado = (html) => {
    elEstado.innerHTML = html;
    elEstado.hidden = false;
    elConteudo.hidden = true;
  };

  if (estado.erroStore) {
    return mostrarEstado(
      `<p>Não foi possível conectar ao banco de dados.</p><p class="pequeno">${esc(estado.erroStore)}</p><button type="button" class="btn" onclick="location.reload()">Tentar de novo</button>`,
    );
  }
  if (!estado.store) return mostrarEstado('<p>Carregando…</p>');
  if (!estado.usuario) {
    return mostrarEstado(
      '<p>Entre com a sua conta Google para ver e cadastrar os leads.</p><button type="button" class="btn btn-primario" data-acao="entrar">Entrar com Google</button>',
    );
  }
  if (estado.semPermissao) {
    return mostrarEstado(
      `<p><strong>${esc(estado.usuario.email)}</strong> ainda não tem permissão para ver os leads.</p>
       <p class="pequeno">Peça para a gestora incluir este e-mail nas regras do Firestore, ou entre com outra conta.</p>
       <button type="button" class="btn" data-acao="sair">Entrar com outra conta</button>`,
    );
  }
  if (estado.carregandoLeads) return mostrarEstado('<p>Carregando leads…</p>');

  elEstado.hidden = true;
  elConteudo.hidden = false;
  renderResumo();
  renderListaLeads();
}

function renderResumo() {
  const total = estado.leads.length;
  const conta = (id) => estado.leads.filter((l) => l.status === id).length;
  const matriculados = conta('matriculado');
  const blocos = [
    { id: 'todos', nome: 'Total', n: total },
    ...STATUS.map((s) => ({ id: s.id, nome: s.nome, n: conta(s.id) })),
  ];
  $('#resumo').innerHTML =
    '<div class="resumo-grade">' +
    blocos
      .map(
        (b) => `
      <button type="button" class="resumo-item st-${b.id} ${estado.filtroStatus === b.id ? 'ativo' : ''}" data-acao="filtro-status" data-status="${b.id}" aria-pressed="${estado.filtroStatus === b.id}">
        <span class="resumo-n">${b.n}</span><span class="resumo-nome">${esc(b.nome)}</span>
      </button>`,
      )
      .join('') +
    '</div>' +
    `<p class="taxa">Taxa de matrícula: <strong>${total ? Math.round((matriculados / total) * 100) : 0}%</strong></p>`;
}

function renderListaLeads() {
  const q = normalizar(estado.buscaLead.trim());
  const qDig = digitos(estado.buscaLead);
  const lista = estado.leads
    .filter((l) => estado.filtroStatus === 'todos' || l.status === estado.filtroStatus)
    .filter((l) => {
      if (!q) return true;
      return normalizar(`${l.telefone} ${l.obs || ''}`).includes(q) || (qDig.length >= 3 && digitos(l.telefone).includes(qDig));
    })
    .sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0));

  if (!lista.length) {
    $('#listaLeads').innerHTML = estado.leads.length
      ? '<p class="vazio">Nenhum lead encontrado com esse filtro.</p>'
      : '<p class="vazio">Nenhum lead cadastrado ainda. Clique em <strong>+ Novo lead</strong> para começar.</p>';
    return;
  }

  $('#listaLeads').innerHTML = lista
    .map((l) => {
      const rotulo = l.telefone || 'Sem número';
      const atualizado = l.atualizadoEm
        ? `Atualizado ${tempoRelativo(l.atualizadoEm)}${l.atualizadoPor ? ` por ${esc(primeiroNome(l.atualizadoPor))}` : ''}`
        : '';
      return `
      <article class="lead st-${esc(l.status)}">
        <div class="lead-principal">
          <div class="lead-cabeca">
            <h4>${
              l.telefone
                ? `<a href="https://wa.me/${numeroWhats(l.telefone)}" target="_blank" rel="noopener" title="Abrir conversa no WhatsApp">📱 ${esc(l.telefone)}</a>`
                : 'Sem número'
            }</h4>
            <select class="status-select st-${esc(l.status)}" data-acao="mudar-status" data-id="${esc(l.id)}" aria-label="Status do lead ${esc(rotulo)}">
              ${STATUS.map((s) => `<option value="${s.id}" ${s.id === l.status ? 'selected' : ''}>${s.nome}</option>`).join('')}
            </select>
          </div>
          ${l.obs ? `<p class="lead-obs">${esc(l.obs)}</p>` : ''}
          <p class="lead-meta" title="Criado em ${esc(dataHora(l.criadoEm))}${l.criadoPor ? ` por ${esc(l.criadoPor)}` : ''}">${atualizado}</p>
        </div>
        <div class="lead-acoes">
          <button type="button" class="btn btn-mini" data-acao="msg-lead" data-id="${esc(l.id)}">💬 Mensagem</button>
          <button type="button" class="btn btn-mini" data-acao="editar-lead" data-id="${esc(l.id)}">✏️ Editar</button>
          <button type="button" class="btn btn-mini btn-perigo" data-acao="excluir-lead" data-id="${esc(l.id)}" aria-label="Excluir lead ${esc(rotulo)}">🗑️</button>
        </div>
      </article>`;
    })
    .join('');
}

// ---------------------------------------------------------------- formulários

function opcoesCursos(selecionado, rotuloVazio) {
  const grupos = TIPOS.map((t) => {
    const doTipo = cursos.filter((c) => c.tipo === t.id);
    if (!doTipo.length) return '';
    return `<optgroup label="${esc(t.nome)}">${doTipo
      .map((c) => `<option value="${esc(c.id)}" ${c.id === selecionado ? 'selected' : ''}>${esc(rotuloCurso(c))}</option>`)
      .join('')}</optgroup>`;
  }).join('');
  return `<option value="">${esc(rotuloVazio)}</option>${grupos}`;
}

function opcoesTipos(selecionado, rotuloVazio) {
  return (
    (rotuloVazio !== undefined ? `<option value="">${esc(rotuloVazio)}</option>` : '') +
    TIPOS.map((t) => `<option value="${esc(t.id)}" ${t.id === selecionado ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')
  );
}

function abrirFormLead(lead) {
  estado.editandoId = lead?.id || null;
  const f = $('#formLead');
  $('#dlgLeadTitulo').textContent = lead ? 'Editar lead' : 'Novo lead';
  f.telefone.value = lead?.telefone || '';
  f.status.innerHTML = STATUS.map(
    (s) => `<option value="${s.id}" ${s.id === (lead?.status || 'andamento') ? 'selected' : ''}>${s.nome}</option>`,
  ).join('');
  f.obs.value = lead?.obs || '';
  $('#dlgLead').showModal();
  f.telefone.focus();
}

async function salvarLead(e) {
  e.preventDefault();
  const f = $('#formLead');
  const telefone = formatarTelefone(f.telefone.value);
  if (digitos(telefone).length < 10) {
    toast('Informe o WhatsApp com DDD', 'erro');
    f.telefone.focus();
    return;
  }
  const id = estado.editandoId;
  const repetido = estado.leads.find((l) => l.id !== id && numeroWhats(l.telefone) === numeroWhats(telefone));
  if (
    repetido &&
    !confirm(`Este WhatsApp já está cadastrado (status: ${statusPorId[repetido.status]?.nome || repetido.status}). Salvar mesmo assim?`)
  ) {
    return;
  }
  const dados = { telefone, status: f.status.value, obs: f.obs.value.trim() };
  $('#dlgLead').close();
  try {
    if (id) await estado.store.atualizar(id, dados);
    else await estado.store.criar(dados);
    toast(id ? 'Lead atualizado' : 'Lead cadastrado');
  } catch (err) {
    console.error(err);
    toast(`Erro ao salvar: ${err.message || err}`, 'erro');
  }
}

// ---------------------------------------------------------------- mensagem (diálogo)

function abrirMensagem({ cursoId = '', ingresso = '', telefone = '' } = {}) {
  $('#msgCurso').innerHTML = opcoesCursos(cursoId, 'Escolha o curso');
  $('#msgIngresso').innerHTML = opcoesTipos(ingresso || cursoPorId[cursoId]?.tipo || TIPOS[0]?.id);
  $('#msgTelefone').value = telefone;
  atualizarMensagem();
  $('#dlgMensagem').showModal();
}

function atualizarMensagem() {
  const texto = montarMensagem({
    cursoId: $('#msgCurso').value,
    ingresso: $('#msgIngresso').value,
  });
  $('#msgTexto').value = texto;
  const curso = cursoPorId[$('#msgCurso').value];
  const aviso = $('#msgAviso');
  let textoAviso = '';
  if (curso && $('#msgIngresso').value === 'transferencia' && !aceitaTransferencia(curso)) {
    const grupo = grupoCurso(curso);
    textoAviso =
      curso.tipo !== 'graduacao'
        ? 'Transferência vale só para cursos de Graduação.'
        : `Este curso não aceita transferência${grupo ? ` (${grupo.nome})` : ''}. Transferência só para os grupos Base, 1, 2 e 3.`;
  }
  aviso.textContent = textoAviso ? `⚠️ ${textoAviso}` : '';
  aviso.hidden = !textoAviso;
  atualizarLinkWhats();
}

function atualizarLinkWhats() {
  $('#msgWhats').href = linkWhats($('#msgTelefone').value, $('#msgTexto').value);
}

// ---------------------------------------------------------------- exportar

function exportarCsv() {
  if (!estado.leads.length) {
    toast('Não há leads para exportar', 'erro');
    return;
  }
  const seguro = (v) => {
    const s = String(v ?? '');
    return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
  };
  const cabecalho = ['WhatsApp', 'Status', 'Observação', 'Criado em', 'Criado por', 'Atualizado em', 'Atualizado por'];
  const linhas = [...estado.leads]
    .sort((a, b) => (a.criadoEm || 0) - (b.criadoEm || 0))
    .map((l) => [
      l.telefone,
      statusPorId[l.status]?.nome || l.status,
      l.obs,
      dataHora(l.criadoEm),
      l.criadoPor,
      dataHora(l.atualizadoEm),
      l.atualizadoPor,
    ]);
  const csv = '﻿' + [cabecalho, ...linhas].map((r) => r.map(seguro).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-black-friday-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------- abas

function mudarAba(aba) {
  estado.aba = aba === 'leads' ? 'leads' : 'cursos';
  for (const btn of document.querySelectorAll('[data-aba]')) {
    const ativa = btn.dataset.aba === estado.aba;
    btn.classList.toggle('ativo', ativa);
    btn.setAttribute('aria-selected', String(ativa));
  }
  $('#abaCursos').hidden = estado.aba !== 'cursos';
  $('#abaLeads').hidden = estado.aba !== 'leads';
  if (location.hash !== `#${estado.aba}`) history.replaceState(null, '', `#${estado.aba}`);
}

// ---------------------------------------------------------------- eventos

async function executarAcao(acao, el) {
  const { store } = estado;
  switch (acao) {
    case 'copiar-cupom':
      return copiar(tipoPorId[el.dataset.tipo].cupom, 'Cupom copiado!');
    case 'filtro-tipo':
      estado.filtroTipo = el.dataset.tipo;
      return renderCursos();
    case 'copiar-msg':
      return copiar(montarMensagem({ cursoId: el.dataset.curso }), 'Mensagem copiada!');
    case 'abrir-msg':
      return abrirMensagem({ cursoId: el.dataset.curso });
    case 'msg-copiar':
      return copiar($('#msgTexto').value, 'Mensagem copiada!');
    case 'fechar-dialogo':
      return el.closest('dialog').close();
    case 'entrar':
      try {
        await store?.entrar();
      } catch (err) {
        console.error(err);
        toast(`Não foi possível entrar: ${err.code || err.message}`, 'erro');
      }
      return;
    case 'sair':
      return store?.sair();
    case 'filtro-status':
      estado.filtroStatus = el.dataset.status;
      return renderLeads();
    case 'novo-lead':
      return abrirFormLead(null);
    case 'editar-lead':
      return abrirFormLead(estado.leads.find((l) => l.id === el.dataset.id));
    case 'excluir-lead': {
      const lead = estado.leads.find((l) => l.id === el.dataset.id);
      if (!lead || !confirm(`Excluir o lead "${lead.nome}"? Essa ação não pode ser desfeita.`)) return;
      try {
        await store.excluir(lead.id);
        toast('Lead excluído');
      } catch (err) {
        toast(`Erro ao excluir: ${err.message || err}`, 'erro');
      }
      return;
    }
    case 'msg-lead': {
      const lead = estado.leads.find((l) => l.id === el.dataset.id);
      if (lead) abrirMensagem({ telefone: lead.telefone });
      return;
    }
    case 'exportar':
      return exportarCsv();
  }
}

document.addEventListener('click', (e) => {
  const aba = e.target.closest('[data-aba]');
  if (aba) return mudarAba(aba.dataset.aba);
  const el = e.target.closest('[data-acao]');
  if (el && el.tagName !== 'SELECT') executarAcao(el.dataset.acao, el);
});

document.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.dataset?.acao !== 'mudar-status') return;
  try {
    await estado.store.atualizar(el.dataset.id, { status: el.value });
    toast(`Status: ${statusPorId[el.value].nome}`);
  } catch (err) {
    toast(`Erro ao atualizar: ${err.message || err}`, 'erro');
  }
});

$('#buscaCurso').addEventListener('input', (e) => {
  estado.buscaCurso = e.target.value;
  renderCursos();
});
$('#buscaLead').addEventListener('input', (e) => {
  estado.buscaLead = e.target.value;
  renderListaLeads();
});

$('#formLead').addEventListener('submit', salvarLead);

$('#msgCurso').addEventListener('change', (e) => {
  const tipo = cursoPorId[e.target.value]?.tipo;
  if (tipo) $('#msgIngresso').value = tipo;
  atualizarMensagem();
});
$('#msgIngresso').addEventListener('input', atualizarMensagem);
$('#msgTelefone').addEventListener('input', atualizarLinkWhats);
$('#msgTexto').addEventListener('input', atualizarLinkWhats);

// fecha o diálogo ao clicar fora dele
for (const dlg of document.querySelectorAll('dialog')) {
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });
}

window.addEventListener('hashchange', () => mudarAba(location.hash.slice(1)));
setInterval(() => {
  if (estado.aba === 'leads' && !document.hidden && !$('#leadsConteudo').hidden) renderListaLeads();
}, 60_000);

// ---------------------------------------------------------------- início

let pararDeOuvir = null;

async function iniciar() {
  renderTopo();
  renderAvisos();
  renderMatriculas();
  renderCursos();
  mudarAba(location.hash.slice(1) || 'cursos');
  renderLeads();

  try {
    estado.store = await criarArmazenamento(FIREBASE_CONFIG);
  } catch (err) {
    console.error(err);
    estado.erroStore = err.message || String(err);
    renderLeads();
    return;
  }
  renderAvisos();
  renderUsuario();
  renderLeads();

  estado.store.aoMudarUsuario((usuario) => {
    estado.usuario = usuario;
    estado.semPermissao = false;
    estado.leads = [];
    estado.carregandoLeads = Boolean(usuario);
    pararDeOuvir?.();
    pararDeOuvir = null;
    if (usuario) {
      pararDeOuvir = estado.store.ouvirLeads(
        (leads) => {
          estado.leads = leads;
          estado.carregandoLeads = false;
          renderLeads();
        },
        (err) => {
          console.error(err);
          estado.carregandoLeads = false;
          if (err.code === 'permission-denied') estado.semPermissao = true;
          else estado.erroStore = err.message || String(err);
          renderLeads();
        },
      );
    }
    renderUsuario();
    renderLeads();
  });
}

iniciar();
