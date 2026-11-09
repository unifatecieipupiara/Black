import { FIREBASE_CONFIG } from './config.js';
import { criarArmazenamento } from './armazenamento.js';
import { abrirDados, ChaveIncorreta, formatoDeChaveValido } from './cofre.js';
import Sortable from './vendor/sortable.esm.js';
import {
  $,
  esc,
  normalizar,
  slug,
  toast,
  copiar,
  digitos,
  formatarTelefone,
  numeroWhats,
  NO_ANDROID,
  linkWhats,
  alvoWhats,
  dataHora,
  primeiroNome,
} from './util.js';

// Dados da campanha: só existem depois do login (vêm criptografados — ver cofre.js).
let POLO = {};
let GRUPOS_BLACK = [];
let TIPOS_COM_GRUPOS = [];
let OBSERVACOES = {};
let CAMPANHA = null;
const ID_CAMPANHA = '__campanha';
let TIPOS = [];
let tipoPorId = {};
let cursos = [];
let cursoPorId = {};

// ---------------------------------------------------------------- base

// Etapas do funil de leads. "Sem retorno" saiu do funil: esses leads aparecem em "Entrar em contato".
const STATUS = [
  { id: 'contatar', nome: 'Entrar em contato' },
  { id: 'andamento', nome: 'Em andamento' },
  { id: 'matriculado', nome: 'Matriculado' },
  { id: 'perdido', nome: 'Perdido' },
];
const statusPorId = Object.fromEntries(STATUS.map((s) => [s.id, s]));
const statusDe = (lead) => (statusPorId[lead?.status] ? lead.status : 'contatar');
const indiceStatus = (id) => STATUS.findIndex((s) => s.id === id);
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const dataCurta = (ms) => (ms ? new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '');


function aplicarDados(d) {
  POLO = d.POLO || {};
  GRUPOS_BLACK = d.GRUPOS_BLACK || [];
  TIPOS_COM_GRUPOS = d.TIPOS_COM_GRUPOS || [];
  OBSERVACOES = d.OBSERVACOES || {};
  CAMPANHA = d.CAMPANHA || null;
  TIPOS = d.TIPOS || [];
  tipoPorId = Object.fromEntries(TIPOS.map((t) => [t.id, t]));
  cursos = (d.CURSOS || [])
    .map((c) => ({ ...c, id: c.id || slug(`${c.tipo}-${c.nome}-${c.grau || ''}`) }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  cursoPorId = Object.fromEntries(cursos.map((c) => [c.id, c]));
}

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
    .map((campo) => {
      const chave = c[campo] ? 'sim' : 'nao';
      // Texto próprio do curso (ex.: estágio flexível na 2ª Licenciatura) ou o padrão.
      return c.observacoes?.[campo]?.[chave] ?? OBSERVACOES[campo]?.[chave] ?? '';
    })
    .filter(Boolean);
}

// "Grátis" → "grátis" no meio da frase; valores em R$ ficam como estão.
const textoMatricula = (m) => (/^R\$/.test(m) ? m : String(m).toLowerCase());

const rotuloCurso = (c) => (c.grau ? `${c.nome} – ${c.grau}` : c.nome);

const estado = {
  aba: 'cursos',
  filtroTipo: 'todos',
  filtroArea: 'todas',
  buscaCurso: '',
  store: null,
  erroStore: null,
  usuario: null,
  carregandoLeads: true,
  semPermissao: false,
  leads: [],
  perfis: {},
  mesPlacar: { ano: new Date().getFullYear(), mes: new Date().getMonth() },
  buscaLead: '',
  editandoId: null,
  registrandoMatricula: false,
};


// ---------------------------------------------------------------- mensagens

// Mensagem geral da campanha (vai com a imagem e o link de todos os cursos).
function mensagemCampanha() {
  if (!CAMPANHA) return '';
  const valores = { polo: POLO.nome || '', campanha: POLO.campanha || '', link: CAMPANHA.link || '' };
  return CAMPANHA.mensagem.replace(/\{(\w+)\}/g, (m, k) => (k in valores ? valores[k] : m)).trim();
}

function montarMensagem({ cursoId, ingresso }) {
  if (cursoId === ID_CAMPANHA) return mensagemCampanha();
  const curso = cursoPorId[cursoId];
  if (!curso) return '';
  const tipo = tipoPorId[ingresso] || tipoPorId[curso.tipo];
  const modelo = curso.mensagem || tipo?.mensagem || '';
  const { normal, black } = precoCurso(curso);
  const parcelado = typeof curso.valorParcela === 'number';
  const valor = parcelado ? curso.valorParcela : (black ?? normal);
  let oferta = '';
  if (parcelado) oferta = `*${curso.parcelas}× de ${reais(curso.valorParcela)}*`;
  else if (valor !== null) oferta = black !== null ? `~${reais(normal)}~ por *${reais(black)}*` : `*${reais(normal)}*`;
  const valores = {
    curso: curso.nome || '',
    grau: curso.grau || '',
    duracao: curso.duracao || '',
    modalidade: curso.modalidade || 'EAD',
    cargaHoraria: curso.cargaHoraria || '',
    area: curso.area || '',
    lancamento: curso.lancamento || '',
    valor: valor !== null ? reais(valor) : '',
    valorDe: !parcelado && black !== null ? reais(normal) : '',
    oferta,
    matricula: curso.matricula || tipo?.matricula || '',
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
  const semCupom = TIPOS.filter((t) => !(t.cupons || []).some((c) => c.codigo)).map((t) => t.nome);
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
    // Atalho para a página de cobranças: só para a gestora (as regras do Firestore também garantem isso).
    const gestora = String(usuario.email || '').toLowerCase() === 'agaleriacampos@gmail.com';
    el.innerHTML = `${gestora ? '<a class="btn btn-topo" href="cobrancas.html">💰 Cobranças</a>' : ''}
      <button type="button" class="usuario-nome usuario-editar" data-acao="editar-nome" title="${esc(usuario.email)} · toque para editar seu nome">${esc(usuario.nome)} ✏️</button>
      <button type="button" class="btn btn-topo" data-acao="sair">Sair</button>`;
  } else {
    el.innerHTML = '';
  }
}

// ---------------------------------------------------------------- cards de matrícula

function renderMatriculas() {
  $('#cardsMatricula').innerHTML = TIPOS.map((t) => {
    const temLink = Boolean(t.link);
    return `
      <article class="card-matricula tipo-${esc(t.id)}">
        <h3>${esc(t.nome)}</h3>
        ${
          (t.cupons || []).filter((c) => c.codigo).length
            ? t.cupons
                .filter((c) => c.codigo)
                .map(
                  (c) => `
        <div class="cupom">
          <span class="cupom-rotulo">Voucher</span>
          <span class="cupom-codigo">${esc(c.codigo)}</span>
          <button type="button" class="btn btn-mini" data-acao="copiar-cupom" data-codigo="${esc(c.codigo)}" aria-label="Copiar voucher ${esc(c.codigo)}">Copiar</button>
          ${c.descricao ? `<span class="cupom-desc">${esc(c.descricao)}</span>` : ''}
        </div>`,
                )
                .join('')
            : '<div class="cupom"><span class="cupom-rotulo">Voucher</span><span class="cupom-codigo">—</span></div>'
        }
        <div class="card-acoes">
          ${
            temLink
              ? `<a class="btn btn-primario" href="${esc(t.link)}" target="_blank" rel="noopener">Acessar link ↗</a>`
              : '<span class="sem-link">Link ainda não cadastrado</span>'
          }
          ${(t.extras || [])
            .filter((x) => x.url)
            .map((x) => `<a class="btn" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.rotulo || 'Abrir')} ↗</a>`)
            .join('')}
        </div>
        ${t.matricula ? `<p class="card-obs">Matrícula: <strong>${esc(t.matricula)}</strong></p>` : ''}
        ${t.obs ? `<p class="card-obs">${esc(t.obs)}</p>` : ''}
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

function renderFiltrosArea() {
  const el = $('#filtrosArea');
  const areas = [...new Set(cursos.filter((c) => c.tipo === estado.filtroTipo && c.area).map((c) => c.area))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );
  el.hidden = areas.length < 2;
  if (el.hidden) {
    estado.filtroArea = 'todas';
    el.innerHTML = '';
    return;
  }
  if (estado.filtroArea !== 'todas' && !areas.includes(estado.filtroArea)) estado.filtroArea = 'todas';
  el.innerHTML = ['todas', ...areas]
    .map(
      (a) =>
        `<button type="button" class="chip chip-area ${estado.filtroArea === a ? 'ativo' : ''}" data-acao="filtro-area" data-area="${esc(a)}" aria-pressed="${estado.filtroArea === a}">${esc(a === 'todas' ? 'Todas as áreas' : a)}</button>`,
    )
    .join('');
}

// Nº de mensalidades: parcelas (Pós) ou duração × 12 ("3 anos e meio" → 42).
function totalMensalidades(c) {
  if (typeof c.parcelas === 'number') return c.parcelas;
  const m = /^(\d+)\s+anos?(\s+e\s+meio)?/.exec(c.duracao || '');
  return m ? Number(m[1]) * 12 + (m[2] ? 6 : 0) : null;
}

// Só o que o curso tem.
function etiquetasCurso(c) {
  return [
    c.destaque && '★ Destaque',
    c.lancamento && `Lançamento ${c.lancamento}`,
    c.emBreve && 'Em breve',
    c.tcc && 'TCC',
    c.estagio && (c.estagioFlexivel ? 'Estágio flexível' : 'Estágio obrigatório'),
    // Todo curso de graduação tem ao menos uma prova presencial no polo;
    // "Prova Polo: SIM" no Notion = provas frequentes, a cada 3 meses.
    typeof c.provaPolo === 'boolean' && (c.provaPolo ? 'Provas no polo a cada 3 meses' : 'Prova presencial no polo'),
    c.megaPolo && 'Aula presencial no MegaPolo',
    aceitaTransferencia(c) && 'Aceita transferência',
  ].filter(Boolean);
}

function cardCurso(c) {
  const tipo = tipoPorId[c.tipo];
  const parcelado = typeof c.valorParcela === 'number';
  const mensalidades = totalMensalidades(c);
  const sub = parcelado
    ? [c.duracao, c.cargaHoraria].filter(Boolean).join(' · ')
    : [c.duracao, mensalidades ? `${mensalidades} mensalidades` : ''].filter(Boolean).join(' · ');
  const etiquetas = etiquetasCurso(c);
  const { normal, black } = precoCurso(c);
  return `
    <article class="card-curso">
      <h4 class="curso-titulo">${c.grau ? `<span class="curso-grau">${esc(c.grau)} em</span> ` : ''}${esc(c.nome)}</h4>
      ${etiquetas.length ? `<ul class="pills">${etiquetas.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}
      ${sub ? `<p class="curso-sub">${esc(sub)}</p>` : ''}
      ${
        parcelado
          ? `<p class="preco"><span class="preco-por"><strong>${c.parcelas}× ${reais(c.valorParcela)}</strong></span>${
              c.matricula || tipo?.matricula ? `<span class="preco-nota">+ matrícula ${esc(textoMatricula(c.matricula || tipo.matricula))}</span>` : ''
            }</p>`
          : ''
      }
      ${
        normal !== null
          ? `<p class="preco">${black !== null ? `<span class="preco-de">de <s>${reais(normal)}</s></span>` : ''}<span class="preco-por">${black !== null ? 'por ' : ''}<strong>${reais(black ?? normal)}</strong><span class="preco-mes">/mês</span></span>${black === null ? '<span class="preco-nota">valor normal</span>' : ''}</p>`
          : ''
      }
      <div class="card-acoes">
        <button type="button" class="btn btn-primario" data-acao="copiar-msg" data-curso="${esc(c.id)}">📋 Copiar mensagem</button>
        <button type="button" class="btn" data-acao="abrir-msg" data-curso="${esc(c.id)}">💬 Personalizar</button>
      </div>
    </article>`;
}

function renderCursos() {
  renderFiltrosTipo();
  renderFiltrosArea();
  const q = normalizar(estado.buscaCurso.trim());
  const visiveis = cursos.filter(
    (c) =>
      (estado.filtroTipo === 'todos' || c.tipo === estado.filtroTipo) &&
      (estado.filtroArea === 'todas' || c.area === estado.filtroArea) &&
      (!q || normalizar(`${c.nome} ${c.grau || ''} ${c.area || ''} ${tipoPorId[c.tipo]?.nome || ''}`).includes(q)),
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

// ---------------------------------------------------------------- campanha (imagem + texto)

// A imagem é baixada uma vez ao abrir o painel, para o compartilhamento ser imediato.
async function prepararImagemCampanha() {
  if (!CAMPANHA?.imagem) return;
  try {
    const resposta = await fetch(CAMPANHA.imagem);
    if (!resposta.ok) throw new Error(`erro ${resposta.status}`);
    const blob = await resposta.blob();
    const nome = CAMPANHA.imagem.split('/').pop() || 'campanha.jpg';
    estado.arquivoCampanha = new File([blob], nome, { type: blob.type || 'image/jpeg' });
  } catch (err) {
    console.error('Imagem da campanha:', err);
  }
  renderCampanha();
}

function podeCompartilharImagem() {
  const arq = estado.arquivoCampanha;
  try {
    return Boolean(arq && navigator.canShare && navigator.canShare({ files: [arq], text: 'x' }));
  } catch {
    return false;
  }
}

const podeCopiarImagem = () => typeof ClipboardItem !== 'undefined' && Boolean(navigator.clipboard?.write);

// comTexto = false: só a imagem (o texto já foi enviado no passo 1 da tela de mensagem).
async function compartilharCampanha(comTexto = true) {
  const texto = mensagemCampanha();
  if (!podeCompartilharImagem()) {
    await copiar(texto, 'Texto copiado! Copie também a imagem e cole os dois no WhatsApp.');
    return;
  }
  try {
    await navigator.share(comTexto ? { files: [estado.arquivoCampanha], text: texto } : { files: [estado.arquivoCampanha] });
  } catch (err) {
    if (err.name !== 'AbortError') toast(`Não foi possível compartilhar: ${err.message || err}`, 'erro');
  }
}

// A área de transferência só aceita PNG: converte a imagem antes de copiar.
async function pngDaCampanha() {
  const arq = estado.arquivoCampanha || (await (await fetch(CAMPANHA.imagem)).blob());
  const bmp = await createImageBitmap(arq);
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  canvas.getContext('2d').drawImage(bmp, 0, 0);
  return new Promise((ok, erro) => canvas.toBlob((b) => (b ? ok(b) : erro(new Error('falha ao gerar PNG'))), 'image/png'));
}

async function copiarImagemCampanha() {
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngDaCampanha() })]);
    toast('Imagem copiada! Cole na conversa do WhatsApp (Ctrl+V).');
  } catch (err) {
    console.error(err);
    toast('Não foi possível copiar a imagem. Use "Baixar imagem".', 'erro');
  }
}

function renderCampanha() {
  const el = $('#campanha');
  if (!el) return;
  if (!CAMPANHA) {
    el.innerHTML = '';
    return;
  }
  const compartilhar = podeCompartilharImagem();
  el.innerHTML = `
    <article class="card-campanha">
      <img class="campanha-img" src="${esc(CAMPANHA.imagem)}" alt="Arte da campanha Black Friday" loading="lazy">
      <div class="campanha-corpo">
        <h3 class="curso-titulo">📣 ${esc(CAMPANHA.titulo)}</h3>
        <p class="curso-sub">Imagem + texto com o link para todos os cursos. Ideal para o primeiro contato.</p>
        <div class="card-acoes">
          ${compartilhar ? '<button type="button" class="btn btn-primario" data-acao="campanha-enviar">📤 Enviar com imagem</button>' : ''}
          <button type="button" class="btn ${compartilhar ? '' : 'btn-primario'}" data-acao="campanha-copiar-texto">📋 Copiar texto</button>
          ${podeCopiarImagem() ? '<button type="button" class="btn" data-acao="campanha-copiar-imagem">🖼️ Copiar imagem</button>' : ''}
          <button type="button" class="btn" data-acao="campanha-personalizar">💬 Personalizar</button>
          <a class="btn" href="${esc(CAMPANHA.imagem)}" download>⬇ Baixar imagem</a>
        </div>
        <p class="campanha-dica">${
          compartilhar
            ? 'Em “Enviar com imagem”, escolha o WhatsApp Business e a conversa (busque pelo nome ou número): a imagem vai com o texto na legenda. Para um lead novo, use “Personalizar”.'
            : 'No computador: copie a imagem e cole na conversa do WhatsApp (Ctrl+V); depois copie o texto e cole na legenda.'
        }</p>
      </div>
    </article>`;
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
  renderPlacar();
  renderQuadroLeads();
}

// ---------- placar de matrículas do mês (por usuário)

const qtdMatriculas = (l) => Math.max(1, Math.round(Number(l.matriculas) || 1));

function matriculasDoMes(ano, mes) {
  const porUsuario = new Map();
  let total = 0;
  for (const l of estado.leads) {
    if (statusDe(l) !== 'matriculado') continue;
    const quando = l.matriculadoEm || l.atualizadoEm;
    if (!quando) continue;
    const d = new Date(quando);
    if (d.getFullYear() !== ano || d.getMonth() !== mes) continue;
    // Matrículas antigas (antes do registro de quem matriculou) contam para quem atualizou o lead.
    const quem = l.matriculadoPor ? estado.perfis[l.matriculadoPor] || 'Usuário sem nome' : l.atualizadoPor || 'Sem registro';
    const n = qtdMatriculas(l);
    porUsuario.set(quem, (porUsuario.get(quem) || 0) + n);
    total += n;
  }
  return { ranking: [...porUsuario].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR')), total };
}

function renderPlacar() {
  const { ano, mes } = estado.mesPlacar;
  const hoje = new Date();
  const ehMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth();
  const { ranking, total } = matriculasDoMes(ano, mes);
  $('#placar').innerHTML = `
    <div class="placar-topo">
      <button type="button" class="btn btn-mini" data-acao="mes-anterior" aria-label="Mês anterior">◀</button>
      <strong>🏆 Matrículas de ${MESES[mes]}/${ano}</strong>
      <button type="button" class="btn btn-mini" data-acao="mes-seguinte" aria-label="Próximo mês" ${ehMesAtual ? 'disabled' : ''}>▶</button>
    </div>
    ${
      ranking.length
        ? `<div class="placar-lista">
            ${ranking.map(([nome, n], i) => `<div class="placar-item"><span class="placar-nome">${i === 0 ? '🥇 ' : ''}${esc(nome)}</span><span class="placar-n">${n}</span></div>`).join('')}
            <div class="placar-item placar-total"><span class="placar-nome">Total</span><span class="placar-n">${total}</span></div>
          </div>`
        : '<p class="pequeno">Nenhuma matrícula registrada neste mês ainda.</p>'
    }`;
}

// ---------- funil

function cardLead(l) {
  const st = statusDe(l);
  const i = indiceStatus(st);
  const tel = l.telefone
    ? `<a class="cob-tel" href="${esc(linkWhats(l.telefone))}"${alvoWhats} title="Abrir conversa no WhatsApp">📱 ${esc(l.telefone)}</a>`
    : '';
  const titulo = l.nome ? esc(l.nome) : l.telefone ? esc(l.telefone) : 'Sem número';
  const n = qtdMatriculas(l);
  const meta = l.atualizadoEm ? `Atualizado em ${dataCurta(l.atualizadoEm)}${l.atualizadoPor ? ` por ${esc(primeiroNome(l.atualizadoPor))}` : ''}` : '';
  return `
    <article class="cob-card" data-id="${esc(l.id)}">
      <div class="cob-topo">
        <h4>${titulo}</h4>
        ${st === 'matriculado' ? `<span class="cob-qtd lead-matr">${n} ${n === 1 ? 'matrícula' : 'matrículas'}</span>` : ''}
      </div>
      ${tel}
      ${l.obs ? `<p class="cob-obs">${esc(l.obs)}</p>` : ''}
      ${meta ? `<p class="cob-meta" title="Criado em ${esc(dataHora(l.criadoEm))}${l.criadoPor ? ` por ${esc(l.criadoPor)}` : ''}">${meta}</p>` : ''}
      <div class="cob-acoes">
        <button type="button" class="btn btn-mini btn-primario" data-acao="msg-lead" data-id="${esc(l.id)}">💬 Mensagem</button>
        <button type="button" class="btn btn-mini" data-acao="editar-lead" data-id="${esc(l.id)}" aria-label="Editar lead">✏️</button>
        ${i > 0 ? `<button type="button" class="btn btn-mini" data-acao="lead-voltar" data-id="${esc(l.id)}" title="Etapa anterior" aria-label="Voltar etapa">◀</button>` : ''}
        ${i < STATUS.length - 1 ? `<button type="button" class="btn btn-mini" data-acao="lead-avancar" data-id="${esc(l.id)}" title="Próxima etapa" aria-label="Avançar etapa">▶</button>` : ''}
      </div>
    </article>`;
}

function renderQuadroLeads() {
  const q = normalizar(estado.buscaLead.trim());
  const qDig = digitos(estado.buscaLead);
  const lista = estado.leads.filter((l) => {
    if (!q) return true;
    return normalizar(`${l.nome || ''} ${l.telefone} ${l.obs || ''}`).includes(q) || (qDig.length >= 3 && digitos(l.telefone).includes(qDig));
  });
  for (const s of STATUS) {
    const daEtapa = lista.filter((l) => statusDe(l) === s.id).sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0));
    const col = document.querySelector(`#quadroLeads .coluna[data-etapa="${s.id}"]`);
    col.querySelector('.coluna-n').textContent = daEtapa.length;
    col.querySelector('.coluna-lista').innerHTML = daEtapa.length
      ? daEtapa.map(cardLead).join('')
      : `<p class="coluna-vazia">${estado.leads.length ? 'Nenhum lead aqui.' : 'Clique em + Novo lead para começar.'}</p>`;
  }
}

let arrastarPronto = false;
function prepararArrastarLeads() {
  if (arrastarPronto) return;
  arrastarPronto = true;
  for (const lista of document.querySelectorAll('#quadroLeads .coluna-lista')) {
    Sortable.create(lista, {
      group: 'leads',
      sort: false,
      animation: 150,
      draggable: '.cob-card',
      delay: 200, // no celular, segure um instante antes de arrastar
      delayOnTouchOnly: true,
      filter: 'button, a',
      preventOnFilter: false,
      ghostClass: 'cob-fantasma',
      chosenClass: 'cob-escolhido',
      onEnd: (evt) => {
        if (evt.from !== evt.to) moverLead(evt.item.dataset.id, evt.to.dataset.etapa);
      },
    });
  }
}

async function moverLead(id, status) {
  const lead = estado.leads.find((l) => l.id === id);
  if (!lead || !statusPorId[status] || statusDe(lead) === status) return renderQuadroLeads();
  // Matrícula: abre o cadastro para informar o nome do aluno e a quantidade de matrículas.
  if (status === 'matriculado') return abrirFormLead(lead, { status: 'matriculado' });
  try {
    await estado.store.atualizar(id, { status });
    toast(`${lead.nome ? primeiroNome(lead.nome) : lead.telefone} → ${statusPorId[status].nome}`);
  } catch (err) {
    console.error(err);
    toast(`Erro ao mover: ${err.message || err}`, 'erro');
    renderQuadroLeads();
  }
}

async function editarMeuNome() {
  const atual = estado.usuario?.nome || '';
  const nome = (prompt('Como você quer aparecer no painel? (ex.: "Atualizado por …" e placar de matrículas)', atual) || '').trim().slice(0, 60);
  if (!nome || nome === atual) return;
  try {
    estado.usuario = await estado.store.salvarNome(nome);
    renderUsuario();
    renderPlacar();
    toast('Nome atualizado');
  } catch (err) {
    console.error(err);
    toast(
      err.code === 'permission-denied' ? 'Sem permissão para salvar o nome: publique as regras mais recentes do Firestore.' : `Erro ao salvar o nome: ${err.message || err}`,
      'erro',
    );
  }
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
  const campanha = CAMPANHA
    ? `<option value="${ID_CAMPANHA}" ${selecionado === ID_CAMPANHA ? 'selected' : ''}>📣 ${esc(CAMPANHA.titulo)} (com imagem)</option>`
    : '';
  return `<option value="">${esc(rotuloVazio)}</option>${campanha}${grupos}`;
}

function opcoesTipos(selecionado, rotuloVazio) {
  return (
    (rotuloVazio !== undefined ? `<option value="">${esc(rotuloVazio)}</option>` : '') +
    TIPOS.map((t) => `<option value="${esc(t.id)}" ${t.id === selecionado ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')
  );
}

function abrirFormLead(lead, opcoes = {}) {
  estado.editandoId = lead?.id || null;
  estado.registrandoMatricula = opcoes.status === 'matriculado';
  const f = $('#formLead');
  $('#dlgLeadTitulo').textContent = estado.registrandoMatricula ? 'Registrar matrícula' : lead ? 'Editar lead' : 'Novo lead';
  f.telefone.value = lead?.telefone || '';
  f.nome.value = lead?.nome || '';
  const st = opcoes.status || (lead ? statusDe(lead) : 'andamento');
  f.status.innerHTML = STATUS.map((s) => `<option value="${s.id}" ${s.id === st ? 'selected' : ''}>${s.nome}</option>`).join('');
  f.matriculas.value = lead?.matriculas || 1;
  f.obs.value = lead?.obs || '';
  $('#campoMatriculas').hidden = st !== 'matriculado';
  $('#leadDicaMatricula').hidden = !estado.registrandoMatricula;
  $('#btnExcluirLead').hidden = !lead;
  $('#dlgLead').showModal();
  (estado.registrandoMatricula ? f.nome : f.telefone).focus();
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
  if (repetido && !confirm(`Este WhatsApp já está cadastrado (${statusPorId[statusDe(repetido)].nome}). Salvar mesmo assim?`)) {
    return;
  }
  const status = f.status.value;
  const dados = { telefone, status, nome: f.nome.value.trim(), obs: f.obs.value.trim() };
  if (status === 'matriculado') dados.matriculas = Math.min(20, Math.max(1, Math.round(Number(f.matriculas.value) || 1)));
  const anterior = estado.leads.find((l) => l.id === id);
  // Nova matrícula: quando o lead entra em "Matriculado" (registra data e quem matriculou, para o placar).
  const novaMatricula = status === 'matriculado' && !(anterior && statusDe(anterior) === 'matriculado' && anterior.matriculadoEm);
  estado.registrandoMatricula = false;
  $('#dlgLead').close();
  try {
    if (id) await estado.store.atualizar(id, dados, { matricula: novaMatricula });
    else await estado.store.criar(dados, { matricula: novaMatricula });
    toast(novaMatricula ? '🎉 Matrícula registrada!' : id ? 'Lead atualizado' : 'Lead cadastrado');
  } catch (err) {
    console.error(err);
    toast(`Erro ao salvar: ${err.message || err}`, 'erro');
    renderQuadroLeads();
  }
}

async function excluirLead() {
  const lead = estado.leads.find((l) => l.id === estado.editandoId);
  if (!lead || !confirm(`Excluir o lead ${lead.nome || lead.telefone}? Essa ação não pode ser desfeita.`)) return;
  $('#dlgLead').close();
  try {
    await estado.store.excluir(lead.id);
    toast('Lead excluído');
  } catch (err) {
    toast(`Erro ao excluir: ${err.message || err}`, 'erro');
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
  const ehCampanha = $('#msgCurso').value === ID_CAMPANHA;
  const doisPassos = ehCampanha && podeCompartilharImagem();
  const compartilhar = $('#msgCompartilhar');
  compartilhar.hidden = !doisPassos;
  compartilhar.textContent = '2️⃣ Enviar imagem';
  $('#msgIngresso').disabled = ehCampanha;
  $('#msgIngresso').closest('label').hidden = ehCampanha;
  $('#msgTexto').rows = ehCampanha ? 4 : 14;
  // O WhatsApp não aceita, vindo de um site, imagem + número ao mesmo tempo.
  const dica = $('#msgDica');
  dica.hidden = !ehCampanha;
  dica.textContent = doisPassos
    ? 'O WhatsApp não deixa um site mandar imagem direto para um número. Faça em 2 passos: 1️⃣ toque em "Enviar texto", envie e volte aqui; 2️⃣ toque em "Enviar imagem" e escolha a conversa do lead, que vai estar em primeiro na lista.'
    : 'O WhatsApp não deixa um site mandar imagem direto para um número. Abra a conversa pelo botão do WhatsApp e depois cole a imagem (botão "Copiar imagem" no card da campanha).';
  atualizarLinkWhats();
}

function atualizarLinkWhats() {
  const botao = $('#msgWhats');
  botao.href = linkWhats($('#msgTelefone').value, $('#msgTexto').value);
  if (NO_ANDROID) botao.removeAttribute('target');
  const app = NO_ANDROID ? 'WhatsApp Business' : 'WhatsApp';
  const doisPassos = $('#msgCurso').value === ID_CAMPANHA && podeCompartilharImagem();
  botao.textContent = doisPassos ? `1️⃣ Enviar texto (${app})` : `💬 Abrir no ${app}`;
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
  const cabecalho = ['Nome', 'WhatsApp', 'Status', 'Matrículas', 'Matriculado em', 'Observação', 'Criado em', 'Criado por', 'Atualizado em', 'Atualizado por'];
  const linhas = [...estado.leads]
    .sort((a, b) => (a.criadoEm || 0) - (b.criadoEm || 0))
    .map((l) => [
      l.nome || '',
      l.telefone,
      statusPorId[statusDe(l)].nome,
      statusDe(l) === 'matriculado' ? qtdMatriculas(l) : '',
      statusDe(l) === 'matriculado' ? dataHora(l.matriculadoEm || l.atualizadoEm) : '',
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
      return copiar(el.dataset.codigo, 'Voucher copiado!');
    case 'filtro-tipo':
      estado.filtroTipo = el.dataset.tipo;
      estado.filtroArea = 'todas';
      return renderCursos();
    case 'filtro-area':
      estado.filtroArea = el.dataset.area;
      return renderCursos();
    case 'copiar-msg':
      return copiar(montarMensagem({ cursoId: el.dataset.curso }), 'Mensagem copiada!');
    case 'campanha-enviar':
      return compartilharCampanha();
    case 'campanha-copiar-texto':
      return copiar(mensagemCampanha(), 'Texto da campanha copiado!');
    case 'campanha-copiar-imagem':
      return copiarImagemCampanha();
    case 'campanha-personalizar':
      return abrirMensagem({ cursoId: ID_CAMPANHA });
    case 'msg-compartilhar':
      return compartilharCampanha(false);
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
    case 'novo-lead':
      return abrirFormLead(null);
    case 'editar-lead':
      return abrirFormLead(estado.leads.find((l) => l.id === el.dataset.id));
    case 'excluir-lead':
      return excluirLead();
    case 'lead-avancar':
    case 'lead-voltar': {
      const lead = estado.leads.find((l) => l.id === el.dataset.id);
      const destino = lead && STATUS[indiceStatus(statusDe(lead)) + (acao === 'lead-avancar' ? 1 : -1)];
      return destino && moverLead(lead.id, destino.id);
    }
    case 'editar-nome':
      return editarMeuNome();
    case 'mes-anterior':
    case 'mes-seguinte': {
      const d = new Date(estado.mesPlacar.ano, estado.mesPlacar.mes + (acao === 'mes-anterior' ? -1 : 1), 1);
      estado.mesPlacar = { ano: d.getFullYear(), mes: d.getMonth() };
      return renderPlacar();
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

$('#formLead').status.addEventListener('change', (e) => {
  $('#campoMatriculas').hidden = e.target.value !== 'matriculado';
});
// Fechou o cadastro sem salvar (ex.: arrastou para "Matriculado" e cancelou): o card volta para onde estava.
$('#dlgLead').addEventListener('close', () => {
  estado.registrandoMatricula = false;
  if (!$('#leadsConteudo').hidden) renderQuadroLeads();
});

$('#buscaCurso').addEventListener('input', (e) => {
  estado.buscaCurso = e.target.value;
  renderCursos();
});
$('#buscaLead').addEventListener('input', (e) => {
  estado.buscaLead = e.target.value;
  renderQuadroLeads();
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
  if (estado.aba === 'leads' && !document.hidden && !$('#leadsConteudo').hidden) renderQuadroLeads();
}, 60_000);

// ---------------------------------------------------------------- início

let pararDeOuvir = null;
let appAberto = false;

// ---------------------------------------------------------------- tela de acesso

function mostrarAcesso(tipo, detalhe = '') {
  $('#app').hidden = true;
  $('#telaAcesso').hidden = false;
  const el = $('#acessoConteudo');
  const email = estado.usuario?.email ? `<strong>${esc(estado.usuario.email)}</strong>` : 'Esta conta';
  const telas = {
    carregando: '<p>Carregando…</p>',
    login: `
      <div class="acesso-icone">🔒</div>
      <h2>Acesso restrito</h2>
      <p>Entre com a sua conta Google autorizada para ver cursos, valores, vouchers e leads.</p>
      <button type="button" class="btn btn-primario" data-acao="entrar">Entrar com Google</button>`,
    'sem-permissao': `
      <div class="acesso-icone">⛔</div>
      <h2>Sem permissão</h2>
      <p>${email} não está autorizada a acessar este painel.</p>
      <p class="pequeno">Se o e-mail já está na lista, confira se a versão mais recente das regras foi publicada no Firestore. Se não está, peça para a gestora incluir, ou entre com outra conta.</p>
      <button type="button" class="btn" data-acao="sair">Entrar com outra conta</button>`,
    chave: `
      <div class="acesso-icone">🔑</div>
      <h2>Chave de acesso</h2>
      <p>No primeiro acesso, cole a chave que abre os dados da campanha. Ela fica salva e não será pedida de novo.</p>
      ${detalhe ? `<p class="acesso-erro" role="alert">${esc(detalhe)}</p>` : ''}
      <form id="formChave" autocomplete="off">
        <label>Chave
          <input name="chave" required spellcheck="false" autocapitalize="off" placeholder="Cole a chave aqui">
        </label>
        <button type="submit" class="btn btn-primario">Abrir painel</button>
      </form>
      <button type="button" class="btn" data-acao="sair">Sair</button>`,
    erro: `
      <div class="acesso-icone">⚠️</div>
      <h2>Não foi possível abrir o painel</h2>
      ${detalhe ? `<p class="acesso-erro" role="alert">${esc(detalhe)}</p>` : ''}
      <button type="button" class="btn btn-primario" onclick="location.reload()">Tentar de novo</button>`,
  };
  el.innerHTML = telas[tipo] || telas.carregando;
  el.querySelector('input')?.focus();
}

// Lê a chave (ou usa a digitada), abre os dados e mostra o painel.
async function desbloquear(chaveDigitada) {
  mostrarAcesso('carregando');
  let chave = chaveDigitada;
  if (!chave) {
    try {
      chave = await estado.store.lerChave();
    } catch (err) {
      console.error(err);
      if (err.code === 'permission-denied') return mostrarAcesso('sem-permissao');
      return mostrarAcesso('erro', err.message || String(err));
    }
    if (!chave) return mostrarAcesso('chave');
  }

  let dados;
  try {
    dados = await abrirDados(chave);
  } catch (err) {
    console.error(err);
    if (err instanceof ChaveIncorreta) {
      return mostrarAcesso('chave', chaveDigitada ? 'Essa chave não abre os dados. Confira e cole de novo.' : 'A chave salva não abre os dados. Cole a chave atual.');
    }
    return mostrarAcesso('erro', err.message || String(err));
  }

  if (chaveDigitada) {
    try {
      await estado.store.salvarChave(chave);
    } catch (err) {
      console.error(err);
      if (err.code === 'permission-denied') return mostrarAcesso('sem-permissao');
      return mostrarAcesso('erro', `A chave está certa, mas não foi possível salvá-la: ${err.message || err}`);
    }
  }

  aplicarDados(dados);
  abrirApp();
}

function abrirApp() {
  appAberto = true;
  $('#telaAcesso').hidden = true;
  $('#app').hidden = false;
  renderTopo();
  renderAvisos();
  renderMatriculas();
  renderCursos();
  renderCampanha();
  prepararImagemCampanha();
  mudarAba(location.hash.slice(1) || 'cursos');

  prepararArrastarLeads();
  estado.store.ouvirPerfis?.((perfis) => {
    estado.perfis = perfis;
    if (!$('#leadsConteudo').hidden) renderPlacar();
  });

  estado.semPermissao = false;
  estado.leads = [];
  estado.carregandoLeads = true;
  pararDeOuvir?.();
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
  renderLeads();
}

document.addEventListener('submit', (e) => {
  if (e.target.id !== 'formChave') return;
  e.preventDefault();
  const chave = e.target.chave.value.trim();
  if (!formatoDeChaveValido(chave)) {
    mostrarAcesso('chave', 'Isso não parece a chave de acesso. Copie e cole a chave inteira.');
    return;
  }
  desbloquear(chave);
});

// ---------------------------------------------------------------- início

async function iniciar() {
  mostrarAcesso('carregando');
  try {
    estado.store = await criarArmazenamento(FIREBASE_CONFIG);
  } catch (err) {
    console.error(err);
    mostrarAcesso('erro', `Não foi possível conectar: ${err.message || err}`);
    return;
  }

  estado.store.aoMudarUsuario((usuario) => {
    // Saiu depois de abrir o painel: recarrega para limpar tudo da memória.
    if (!usuario && appAberto) {
      location.reload();
      return;
    }
    estado.usuario = usuario;
    renderUsuario();
    if (!usuario) {
      mostrarAcesso('login');
      return;
    }
    if (!appAberto) desbloquear();
  });
}

iniciar();
