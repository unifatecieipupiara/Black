// Página de cobranças (Feirão da Negociação) — acesso só da gestora.
// Os alunos ficam no Firestore (coleção "cobrancas"); as regras liberam
// leitura e escrita apenas para o e-mail da gestora.

import { FIREBASE_CONFIG } from './config.js';
import Sortable from './vendor/sortable.esm.js';
import {
  $,
  esc,
  normalizar,
  toast,
  copiar,
  digitos,
  formatarTelefone,
  numeroWhats,
  NO_ANDROID,
  linkWhats,
  primeiroNome,
} from './util.js';

const GESTORA = 'agaleriacampos@gmail.com';
// Polos atendidos. Alunos cadastrados antes do campo "polo" contam como o primeiro (Ipupiara).
const POLOS = [
  { id: 'ipupiara', curto: 'Ipupiara', nome: 'UniFatecie – Polo Ipupiara' },
  { id: 'barra-do-mendes', curto: 'Barra do Mendes', nome: 'UniFatecie – Polo Barra do Mendes' },
];
const poloPorId = Object.fromEntries(POLOS.map((p) => [p.id, p]));
const poloDe = (aluno) => poloPorId[aluno?.polo] || POLOS[0];
const CHAVE_ULTIMO_POLO = 'cob-ultimo-polo';

// Tipo de curso: define as mensagens. Alunos antigos (sem o campo) contam como Graduação.
const TIPOS = [
  { id: 'graduacao', curto: 'Graduação', nome: 'Graduação / 2ª Graduação (Feirão)' },
  { id: 'pos', curto: 'Pós-Graduação', nome: 'Pós-Graduação' },
];
const tipoPorId = Object.fromEntries(TIPOS.map((t) => [t.id, t]));
const tipoDe = (aluno) => tipoPorId[aluno?.tipo] || TIPOS[0];
function ultimoPolo() {
  try {
    return poloPorId[localStorage.getItem(CHAVE_ULTIMO_POLO)] ? localStorage.getItem(CHAVE_ULTIMO_POLO) : POLOS[0].id;
  } catch {
    return POLOS[0].id;
  }
}
const VERSAO_FIREBASE = '13.1.0';

// Etapas na ordem do menu lateral (uma aberta por vez).
// "cancelado" guarda o id antigo da coluna Cancelado: agora é o pedido aguardando deferimento.
const ETAPAS = [
  { id: 'contatar', nome: 'Entrar em contato', icone: '📞' },
  { id: 'bloqueado', nome: 'Bloqueados', icone: '🔒' },
  { id: 'negociacao', nome: 'Em negociação', icone: '🤝' },
  { id: 'aguardando', nome: 'Aguardando pagamento', icone: '⏳' },
  { id: 'finalizado', nome: 'Finalizado', icone: '✅' },
  { id: 'cancelado', nome: 'Aguardando deferimento', icone: '📅', grupo: 'Cancelamento' },
  { id: 'deferido', nome: 'Cancelado', icone: '✖️' },
];
// Etapas que não contam em "Mensalidades em aberto".
const ETAPAS_ENCERRADAS = ['finalizado', 'cancelado', 'deferido'];
// Pedido de cancelamento: a partir da data de previsão, o card pede para conferir o deferimento.
const ETAPA_PEDIDO = 'cancelado';
const ETAPAS_COM_PREVISAO = ['cancelado', 'deferido'];
const CHAVE_ULTIMA_ETAPA = 'cob-ultima-etapa';
const etapaPorId = Object.fromEntries(ETAPAS.map((e) => [e.id, e]));
const indiceEtapa = (id) => ETAPAS.findIndex((e) => e.id === id);

// ---------------------------------------------------------------- mensagens
// Tom leve: convite para o Feirão, sem cobrança direta.
//  {nome}      primeiro nome do aluno
//  {mensalidades}  "a mensalidade em aberto" / "as 3 mensalidades em aberto"
//  {qtdTexto}  "1 mensalidade em aberto" / "3 mensalidades em aberto"
//  {polo}      polo do aluno (Ipupiara ou Barra do Mendes)

const MENSAGENS = {
  // Graduação e 2ª Graduação: convite para o Feirão da Negociação.
  graduacao: {
    contatar: `Olá, {nome}! Tudo bem? 😊

Aqui é da *{polo}*. Estou passando para te contar uma novidade: começou o nosso *Feirão da Negociação*, com condições especiais para quem quer deixar tudo em dia e seguir os estudos com tranquilidade.

Separei uma condição especial para você e queria te apresentar. Posso te mandar os detalhes por aqui? 💛`,

    negociacao: `Oi, {nome}! 😊

Sobre o *Feirão da Negociação*: consegui condições bem especiais para regularizar {mensalidades}, com *descontos* e opções de pagamento que cabem no seu bolso.

Me conta o que fica melhor para você, pagamento à vista ou parcelado, que eu já preparo a proposta certinha. 😉`,

    aguardando: `Oi, {nome}! Tudo certo? 😊

Passando só para lembrar do pagamento que combinamos no *Feirão da Negociação*. Assim que fizer, me manda o comprovante por aqui que eu já confirmo e deixo tudo regularizado. ✅

Se precisar de alguma ajuda, é só me chamar!`,

    finalizado: `{nome}, pagamento confirmado! 🎉

Muito obrigada pela confiança. Agora é seguir firme nos estudos, e conte sempre com a gente aqui no *{polo}*! 💛`,

    cancelado: `Oi, {nome}! Tudo bem? 😊

Conforme conversamos, o cancelamento da sua matrícula foi encaminhado. ✅

Se em algum momento quiser voltar a estudar, as portas estão abertas. Conte sempre com a gente aqui no *{polo}*! 💛`,

    bloqueado: `Olá, {nome}! Tudo bem? 😊

Aqui é da *{polo}*. Vi que o seu acesso ao curso está *bloqueado*, porque há {qtdTexto}, e quero te ajudar a resolver isso.

Com o nosso *Feirão da Negociação*, você regulariza com condições especiais e o seu acesso volta a ser liberado para seguir os estudos. 📚

Posso te mandar as condições por aqui? 💛`,

    deferido: `Oi, {nome}! Tudo bem? 😊

Passando para avisar que o seu pedido de cancelamento foi *deferido* e o cancelamento da sua matrícula está concluído. ✅

Se em algum momento quiser voltar a estudar, as portas estão abertas. Conte sempre com a gente aqui no *{polo}*! 💛`,
  },

  // Pós-Graduação: não participa do Feirão. Motivo do contato: parte financeira;
  // a gestora pode atualizar os boletos e retirar os juros de atraso.
  pos: {
    contatar: `Olá, {nome}! Tudo bem? 😊

Aqui é da *{polo}*. Estou entrando em contato porque identifiquei {qtdTexto} na sua *pós-graduação*.

A boa notícia é que consigo *atualizar os boletos* e *retirar os juros de atraso*, para você regularizar de forma simples.

Tem interesse em realizar essa negociação hoje? 💛`,

    negociacao: `Oi, {nome}! 😊

Sobre a sua *pós-graduação*: para regularizar {mensalidades}, eu *atualizo os boletos* e *retiro os juros de atraso*. Você paga só o valor original, sem acréscimos.

Me conta qual data fica melhor para o pagamento que eu já gero os boletos atualizados para você. 😉`,

    aguardando: `Oi, {nome}! Tudo certo? 😊

Passando só para lembrar dos boletos atualizados da sua *pós-graduação*, já sem os juros de atraso. Assim que pagar, me manda o comprovante por aqui que eu confirmo e deixo tudo regularizado. ✅

Se precisar que eu reenvie algum boleto, é só me chamar!`,

    finalizado: `{nome}, pagamento confirmado! 🎉

Muito obrigada! A parte financeira da sua pós-graduação está regularizada. Conte sempre com a gente aqui no *{polo}*! 💛`,

    cancelado: `Oi, {nome}! Tudo bem? 😊

Conforme conversamos, o cancelamento da sua *pós-graduação* foi encaminhado. ✅

Se em algum momento quiser retomar os estudos, as portas estão abertas. Conte sempre com a gente aqui no *{polo}*! 💛`,

    bloqueado: `Olá, {nome}! Tudo bem? 😊

Aqui é da *{polo}*. Vi que o seu acesso à *pós-graduação* está *bloqueado*, porque há {qtdTexto}.

Consigo *atualizar os boletos* e *retirar os juros de atraso* para você regularizar de forma simples, e assim o seu acesso volta a ser liberado. 📚

Tem interesse em resolver isso hoje? 💛`,

    deferido: `Oi, {nome}! Tudo bem? 😊

Passando para avisar que o seu pedido de cancelamento foi *deferido* e o cancelamento da sua *pós-graduação* está concluído. ✅

Se em algum momento quiser retomar os estudos, as portas estão abertas. Conte sempre com a gente aqui no *{polo}*! 💛`,
  },
};

// Mensagens para situações fora do funil. "tipos": em quais tipos de curso aparecem.
const MENSAGENS_EXTRAS = [
  {
    // Aluno que só fez a matrícula e sumiu: não estuda e não paga.
    // Quem não acessa o curso tem os boletos estornados ao cancelar.
    id: 'sem-acesso',
    nome: 'Evasão',
    tipos: ['graduacao'], // Graduação e 2ª Graduação
    texto: `Olá, {nome}! Tudo bem? 😊

Aqui é da *{polo}*. Vi que você fez a matrícula no seu *curso*, mas ainda não começou a acessar as aulas, e quis passar para saber como você está.

Se quiser *retomar os estudos*, eu te ajudo com o acesso e com os primeiros passos. 📚

Se preferir *cancelar*, também resolvo por aqui: como você ainda não acessou o curso, os boletos são *estornados* e você *não paga nada*.

Me conta: você quer continuar ou prefere cancelar? 💛`,
  },
];
const extrasDe = (aluno) => MENSAGENS_EXTRAS.filter((m) => m.tipos.includes(tipoDe(aluno).id));

// "1 mensalidade em aberto" / "3 mensalidades em aberto" (sem artigo).
function qtdSemArtigo(qtd) {
  if (qtd === 1) return '1 mensalidade em aberto';
  if (qtd > 1) return `${qtd} mensalidades em aberto`;
  return 'mensalidades em aberto';
}

function textoMensalidades(qtd) {
  if (qtd === 1) return 'a mensalidade em aberto';
  if (qtd > 1) return `as ${qtd} mensalidades em aberto`;
  return 'as mensalidades em aberto';
}

function montarMensagem(aluno, etapa) {
  const nome = primeiroNome(aluno?.nome);
  const valores = {
    nome: nome ? nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase() : '',
    mensalidades: textoMensalidades(Number(aluno?.qtd) || 0),
    qtdTexto: qtdSemArtigo(Number(aluno?.qtd) || 0),
    polo: poloDe(aluno).nome,
  };
  const modelo = extrasDe(aluno).find((m) => m.id === etapa)?.texto ?? MENSAGENS[tipoDe(aluno).id]?.[etapa] ?? '';
  return modelo.replace(/\{(\w+)\}/g, (m, k) => (k in valores ? valores[k] : m));
}

// ---------------------------------------------------------------- estado

// Etapa aberta: a do endereço (#bloqueado…), senão a última usada, senão "Entrar em contato".
function etapaInicial() {
  const doEndereco = decodeURIComponent(location.hash.slice(1));
  if (etapaPorId[doEndereco]) return doEndereco;
  try {
    const salva = localStorage.getItem(CHAVE_ULTIMA_ETAPA);
    if (etapaPorId[salva]) return salva;
  } catch {
    /* sem armazenamento local: tudo bem */
  }
  return ETAPAS[0].id;
}

// Datas da previsão de cancelamento ficam como "AAAA-MM-DD".
const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dataBR = (iso) => String(iso || '').split('-').reverse().join('/');
const ehDataISO = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
// Pedido de cancelamento cuja previsão já chegou: conferir se foi deferido.
const paraConferir = (a) => a.etapa === ETAPA_PEDIDO && ehDataISO(a.previsaoCancelamento) && a.previsaoCancelamento <= hojeISO();

const estado = {
  usuario: null,
  alunos: [],
  busca: '',
  filtroPolo: 'todos',
  filtroTipo: 'todos',
  etapaAtual: etapaInicial(),
  editandoId: null,
  msgAlunoId: null,
  carregando: true,
};
let F = null; // módulo do Firestore
let A = null; // módulo de autenticação
let auth = null;
let colecao = null;
let pararDeOuvir = null;

// ---------------------------------------------------------------- tela de acesso

function mostrarAcesso(tipo, detalhe = '') {
  $('#app').hidden = true;
  $('#telaAcesso').hidden = false;
  const email = estado.usuario?.email ? `<strong>${esc(estado.usuario.email)}</strong>` : 'Esta conta';
  const telas = {
    carregando: '<p>Carregando…</p>',
    login: `
      <div class="acesso-icone">🔒</div>
      <h2>Cobranças</h2>
      <p>Área restrita à gestora. Entre com a sua conta Google.</p>
      <button type="button" class="btn btn-primario" data-acao="entrar">Entrar com Google</button>`,
    negado: `
      <div class="acesso-icone">⛔</div>
      <h2>Sem permissão</h2>
      <p>${email} não tem acesso à área de cobranças.</p>
      <p class="pequeno">${esc(detalhe || 'Esta página é exclusiva da gestora.')}</p>
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
  $('#usuario').innerHTML = u
    ? `<a class="btn btn-topo" href="./">← Painel</a>
       <a class="btn btn-topo" href="depoimentos.html">💬 Depoimentos</a>
       <span class="usuario-nome" title="${esc(u.email)}">${esc(primeiroNome(u.nome))}</span>
       <button type="button" class="btn btn-topo" data-acao="sair">Sair</button>`
    : '';
}

// ---------------------------------------------------------------- quadro

const doPolo = () =>
  estado.alunos.filter(
    (a) =>
      (estado.filtroPolo === 'todos' || poloDe(a).id === estado.filtroPolo) &&
      (estado.filtroTipo === 'todos' || tipoDe(a).id === estado.filtroTipo),
  );

function filtrados() {
  const q = normalizar(estado.busca.trim());
  const qDig = digitos(estado.busca);
  return doPolo().filter((a) => {
    if (!q) return true;
    return normalizar(`${a.nome} ${a.telefone} ${a.obs || ''}`).includes(q) || (qDig.length >= 3 && digitos(a.telefone).includes(qDig));
  });
}

// Linha da previsão de cancelamento no card (só no pedido aguardando deferimento).
function linhaPrevisao(a) {
  if (a.etapa !== ETAPA_PEDIDO) return '';
  if (!ehDataISO(a.previsaoCancelamento)) {
    return `<button type="button" class="cob-sem-data" data-acao="editar" data-id="${esc(a.id)}">📅 Informar previsão do cancelamento</button>`;
  }
  if (paraConferir(a)) {
    return `<p class="cob-alerta">⚠️ Conferir deferimento · previsão ${esc(dataBR(a.previsaoCancelamento))}</p>`;
  }
  return `<p class="cob-previsao">📅 Previsão do cancelamento: ${esc(dataBR(a.previsaoCancelamento))}</p>`;
}

function cardAluno(a) {
  // Para o card ficar menor, o WhatsApp, a data de atualização e a linha "Planilha: …"
  // (vencimentos e total) não aparecem aqui: ficam salvos e visíveis ao editar o cadastro.
  // O WhatsApp também é usado na tela de mensagem.
  const obsVisivel = String(a.obs || '')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('Planilha:'))
    .join('\n');
  const qtd = Number(a.qtd) || 0;
  const destinos = ETAPAS.filter((e) => e.id !== a.etapa)
    .map((e) => `<option value="${e.id}">${e.icone} ${esc(e.nome)}</option>`)
    .join('');
  return `
    <article class="cob-card${paraConferir(a) ? ' cob-card-alerta' : ''}" data-id="${esc(a.id)}">
      <div class="cob-topo">
        <h4>${esc(a.nome)}</h4>
        ${qtd ? `<span class="cob-qtd">${qtd} ${qtd === 1 ? 'mensalidade' : 'mensalidades'}</span>` : ''}
      </div>
      <div class="cob-tags">
        <span class="cob-polo polo-${esc(poloDe(a).id)}">📍 ${esc(poloDe(a).curto)}</span>
        <span class="cob-tipo tipo-${esc(tipoDe(a).id)}">🎓 ${esc(tipoDe(a).curto)}</span>
      </div>
      ${linhaPrevisao(a)}
      ${obsVisivel ? `<p class="cob-obs">${esc(obsVisivel)}</p>` : ''}
      <div class="cob-acoes">
        <button type="button" class="btn btn-mini btn-primario" data-acao="msg" data-id="${esc(a.id)}">💬 Mensagem</button>
        <button type="button" class="btn btn-mini" data-acao="editar" data-id="${esc(a.id)}" aria-label="Editar ${esc(a.nome)}">✏️</button>
        <select class="btn btn-mini cob-mover" data-mover="${esc(a.id)}" aria-label="Mover ${esc(a.nome)} para outra etapa">
          <option value="">➜ Mover</option>
          ${destinos}
        </select>
      </div>
    </article>`;
}

function renderPolos() {
  const chip = (acao, chave, id, rotulo, n, ativo) =>
    `<button type="button" class="chip ${ativo ? 'ativo' : ''}" data-acao="${acao}" data-${chave}="${id}" aria-pressed="${ativo}">${esc(rotulo)} (${n})</button>`;
  const polos = [{ id: 'todos', curto: 'Todos os polos' }, ...POLOS]
    .map((p) => chip('filtro-polo', 'polo', p.id, p.curto, p.id === 'todos' ? estado.alunos.length : estado.alunos.filter((a) => poloDe(a).id === p.id).length, estado.filtroPolo === p.id))
    .join('');
  const tipos = [{ id: 'todos', curto: 'Todos os cursos' }, ...TIPOS]
    .map((t) => chip('filtro-tipo', 'tipo', t.id, t.curto, t.id === 'todos' ? estado.alunos.length : estado.alunos.filter((a) => tipoDe(a).id === t.id).length, estado.filtroTipo === t.id))
    .join('');
  $('#cobPolos').innerHTML = `${polos}<span class="cob-sep" aria-hidden="true"></span>${tipos}`;
}

function renderResumo() {
  renderPolos();
  const base = doPolo();
  const emAberto = base.filter((a) => !ETAPAS_ENCERRADAS.includes(a.etapa)).reduce((s, a) => s + (Number(a.qtd) || 0), 0);
  $('#cobResumo').innerHTML = `
    <div class="cob-resumo-item"><span class="resumo-n">${base.length}</span><span class="resumo-nome">Alunos</span></div>
    <div class="cob-resumo-item destaque"><span class="resumo-n">${emAberto}</span><span class="resumo-nome" title="Soma das mensalidades em atraso dos alunos que não estão em Finalizado nem no cancelamento">Mensalidades em aberto</span></div>`;
}

// O menu é montado uma vez (as áreas de soltar o card ficam fixas) e só os números mudam.
function montarMenu() {
  $('#cobMenu').innerHTML = `
    <p class="cob-menu-titulo">Etapas</p>
    ${ETAPAS.map(
      (e) => `
      ${e.grupo ? `<p class="cob-menu-grupo">${esc(e.grupo)}</p>` : ''}
      <div class="cob-menu-item et-${e.id}" data-etapa="${e.id}">
        <button type="button" class="cob-menu-btn" data-acao="ver-etapa" data-etapa="${e.id}">
          <span class="cob-menu-nome"><span aria-hidden="true">${e.icone}</span> ${esc(e.nome)}</span>
          <span class="cob-menu-alerta" hidden></span>
          <span class="cob-menu-n">0</span>
        </button>
        <div class="cob-menu-alvo" data-etapa="${e.id}" aria-hidden="true"></div>
      </div>`,
    ).join('')}`;
}

function renderMenu(lista) {
  const base = doPolo();
  for (const e of ETAPAS) {
    const item = document.querySelector(`.cob-menu-item[data-etapa="${e.id}"]`);
    const ativo = e.id === estado.etapaAtual;
    item.classList.toggle('ativo', ativo);
    const btn = item.querySelector('.cob-menu-btn');
    if (ativo) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
    item.querySelector('.cob-menu-n').textContent = lista.filter((a) => a.etapa === e.id).length;
    const alerta = item.querySelector('.cob-menu-alerta');
    const conferir = e.id === ETAPA_PEDIDO ? base.filter(paraConferir).length : 0;
    alerta.hidden = !conferir;
    alerta.textContent = conferir ? `⚠️ ${conferir}` : '';
    alerta.title = conferir ? `${conferir} pedido(s) para conferir o deferimento` : '';
  }
}

function renderConferir() {
  const n = doPolo().filter(paraConferir).length;
  const el = $('#cobConferir');
  el.hidden = !n || estado.etapaAtual === ETAPA_PEDIDO;
  if (el.hidden) return;
  el.innerHTML = `⚠️ <strong>${n} ${n === 1 ? 'pedido de cancelamento chegou' : 'pedidos de cancelamento chegaram'} à data de previsão.</strong> Confira se ${n === 1 ? 'foi deferido' : 'foram deferidos'}.
    <button type="button" class="btn btn-mini" data-acao="ver-etapa" data-etapa="${ETAPA_PEDIDO}">Ver pedidos</button>`;
}

function renderQuadro() {
  renderResumo();
  renderRepetidos();
  renderConferir();
  const lista = filtrados();
  renderMenu(lista);
  const etapa = etapaPorId[estado.etapaAtual];
  const doEtapa = lista
    .filter((a) => a.etapa === etapa.id)
    // No pedido de cancelamento, os mais urgentes (data mais próxima) primeiro.
    .sort((x, y) =>
      etapa.id === ETAPA_PEDIDO
        ? String(x.previsaoCancelamento || '9999').localeCompare(String(y.previsaoCancelamento || '9999'))
        : (y.atualizadoEm || 0) - (x.atualizadoEm || 0),
    );
  $('#cobTitulo').innerHTML = `<span aria-hidden="true">${etapa.icone}</span> ${esc(etapa.nome)} <span class="coluna-n">${doEtapa.length}</span>`;
  $('.cob-etapa').className = `cob-etapa et-${etapa.id}`;
  const listaEl = $('#cobLista');
  listaEl.dataset.etapa = etapa.id;
  if (doEtapa.length) {
    listaEl.innerHTML = doEtapa.map(cardAluno).join('');
    return;
  }
  // Busca sem resultado nesta etapa: mostra em quais etapas o aluno está.
  const outras = estado.busca.trim()
    ? ETAPAS.map((e) => ({ e, n: lista.filter((a) => a.etapa === e.id).length })).filter((x) => x.n)
    : [];
  listaEl.innerHTML = `<p class="coluna-vazia">${
    outras.length
      ? `Nenhum aluno com essa busca aqui. Encontrado em: ${outras
          .map((x) => `<button type="button" class="btn btn-mini" data-acao="ver-etapa" data-etapa="${x.e.id}">${x.e.icone} ${esc(x.e.nome)} (${x.n})</button>`)
          .join(' ')}`
      : 'Nenhum aluno nesta etapa.'
  }</p>`;
}

function verEtapa(id) {
  if (!etapaPorId[id]) return;
  estado.etapaAtual = id;
  history.replaceState(null, '', `#${id}`);
  try {
    localStorage.setItem(CHAVE_ULTIMA_ETAPA, id);
  } catch {
    /* sem armazenamento local: tudo bem */
  }
  renderQuadro();
  centralizarEtapaNoMenu();
}

// No celular, o menu é uma faixa rolável: deixa a etapa aberta à vista (sem rolar a página).
function centralizarEtapaNoMenu() {
  const menu = $('#cobMenu');
  const item = menu.querySelector('.cob-menu-item.ativo');
  if (!item || menu.scrollWidth <= menu.clientWidth) return;
  menu.scrollLeft = item.offsetLeft - (menu.clientWidth - item.offsetWidth) / 2;
}

function prepararArrastar() {
  montarMenu();
  // Arrastar o card até uma etapa do menu muda a etapa do aluno.
  Sortable.create($('#cobLista'), {
    group: { name: 'cobrancas', pull: true, put: false },
    sort: false, // a ordem é pela última atualização (ou pela data, no cancelamento)
    animation: 150,
    draggable: '.cob-card',
    delay: 200, // no celular, segure um instante antes de arrastar (para a tela ainda rolar)
    delayOnTouchOnly: true,
    filter: 'button, a, select',
    preventOnFilter: false,
    ghostClass: 'cob-fantasma',
    chosenClass: 'cob-escolhido',
    onStart: () => document.body.classList.add('cob-arrastando'),
    onMove: (evt) => {
      document.querySelectorAll('.cob-menu-item.alvo').forEach((el) => el.classList.remove('alvo'));
      evt.to.closest?.('.cob-menu-item')?.classList.add('alvo');
    },
    onEnd: () => {
      document.body.classList.remove('cob-arrastando');
      document.querySelectorAll('.cob-menu-item.alvo').forEach((el) => el.classList.remove('alvo'));
    },
  });
  for (const alvo of document.querySelectorAll('.cob-menu-alvo')) {
    Sortable.create(alvo, {
      group: { name: 'cobrancas', pull: false, put: true },
      sort: false,
      onAdd: (evt) => {
        const id = evt.item.dataset.id;
        evt.item.remove();
        moverPara(id, alvo.dataset.etapa);
      },
    });
  }
}

// ---------------------------------------------------------------- gravação

async function moverPara(id, etapa) {
  const aluno = estado.alunos.find((a) => a.id === id);
  if (!aluno || !etapaPorId[etapa] || aluno.etapa === etapa) return renderQuadro();
  // Pedido de cancelamento sem data: abre o cadastro para informar a previsão.
  if (etapa === ETAPA_PEDIDO && !ehDataISO(aluno.previsaoCancelamento)) {
    renderQuadro();
    return abrirFormAluno(aluno, { etapa });
  }
  try {
    await F.updateDoc(F.doc(colecao, id), { etapa, atualizadoEm: F.serverTimestamp() });
    toast(`${primeiroNome(aluno.nome)} → ${etapaPorId[etapa].nome}`);
  } catch (err) {
    console.error(err);
    toast(
      err.code === 'permission-denied'
        ? 'Sem permissão para salvar: publique as regras mais recentes do Firestore.'
        : `Erro ao mover: ${err.message || err}`,
      'erro',
    );
    renderQuadro();
  }
}

// Mínimo de mensalidades: 0 em Finalizado e no cancelamento; 1 nas demais etapas.
const minimoMensalidades = (etapa) => (ETAPAS_ENCERRADAS.includes(etapa) ? 0 : 1);

// Ajusta o cadastro à etapa escolhida: data de previsão (cancelamento) e mínimo de mensalidades.
function ajustarFormPorEtapa() {
  const f = $('#formAluno');
  const mostrar = ETAPAS_COM_PREVISAO.includes(f.etapa.value);
  $('#campoPrevisao').hidden = !mostrar;
  f.previsao.required = f.etapa.value === ETAPA_PEDIDO;
  f.qtd.min = String(minimoMensalidades(f.etapa.value));
}

function abrirFormAluno(aluno, opcoes = {}) {
  estado.editandoId = aluno?.id || null;
  const f = $('#formAluno');
  $('#dlgAlunoTitulo').textContent = opcoes.etapa === ETAPA_PEDIDO ? 'Pedido de cancelamento' : aluno ? 'Editar aluno' : 'Novo aluno';
  f.nome.value = aluno?.nome || '';
  f.telefone.value = aluno?.telefone || '';
  f.qtd.value = aluno?.qtd ?? 1;
  const tipoAtual = aluno ? tipoDe(aluno).id : estado.filtroTipo !== 'todos' ? estado.filtroTipo : TIPOS[0].id;
  f.tipo.innerHTML = TIPOS.map((t) => `<option value="${t.id}" ${t.id === tipoAtual ? 'selected' : ''}>${esc(t.nome)}</option>`).join('');
  const poloAtual = aluno ? poloDe(aluno).id : estado.filtroPolo !== 'todos' ? estado.filtroPolo : ultimoPolo();
  f.polo.innerHTML = POLOS.map((p) => `<option value="${p.id}" ${p.id === poloAtual ? 'selected' : ''}>${esc(p.curto.startsWith('Polo') ? p.curto : `Polo ${p.curto}`)}</option>`).join('');
  const etapaAtual = opcoes.etapa || aluno?.etapa || estado.etapaAtual;
  f.etapa.innerHTML = ETAPAS.map((e) => `<option value="${e.id}" ${e.id === etapaAtual ? 'selected' : ''}>${esc(e.nome)}</option>`).join('');
  f.previsao.value = ehDataISO(aluno?.previsaoCancelamento) ? aluno.previsaoCancelamento : '';
  ajustarFormPorEtapa();
  f.obs.value = aluno?.obs || '';
  $('#btnExcluir').hidden = !aluno;
  $('#dlgAluno').showModal();
  if (opcoes.etapa === ETAPA_PEDIDO) f.previsao.focus();
  else f.nome.focus();
}

async function salvarAluno(e) {
  e.preventDefault();
  const f = $('#formAluno');
  const nome = f.nome.value.trim();
  const telefone = formatarTelefone(f.telefone.value);
  const qtd = Math.round(Number(f.qtd.value));
  const etapa = etapaPorId[f.etapa.value] ? f.etapa.value : ETAPAS[0].id;
  const previsao = ehDataISO(f.previsao.value) ? f.previsao.value : '';
  if (!nome) return f.nome.focus();
  // WhatsApp é opcional (alunos importados podem vir sem), mas, se informado, precisa do DDD.
  if (telefone && digitos(telefone).length < 10) {
    toast('Informe o WhatsApp com DDD', 'erro');
    return f.telefone.focus();
  }
  if (!Number.isInteger(qtd) || qtd < minimoMensalidades(etapa) || qtd > 120) {
    toast(qtd === 0 ? 'Mensalidades 0 só em Finalizado e no cancelamento' : 'Quantidade de mensalidades inválida', 'erro');
    return f.qtd.focus();
  }
  if (etapa === ETAPA_PEDIDO && !previsao) {
    toast('Informe a data de previsão do cancelamento', 'erro');
    return f.previsao.focus();
  }
  const id = estado.editandoId;
  const atual = estado.alunos.find((a) => a.id === id);
  const repetido = telefone && estado.alunos.find((a) => a.id !== id && numeroWhats(telefone) && numeroWhats(a.telefone) === numeroWhats(telefone));
  if (repetido && !confirm(`Esse WhatsApp já está cadastrado para ${repetido.nome}. Salvar mesmo assim?`)) return;
  const polo = poloPorId[f.polo.value] ? f.polo.value : POLOS[0].id;
  try {
    localStorage.setItem(CHAVE_ULTIMO_POLO, polo);
  } catch {
    /* sem armazenamento local: tudo bem */
  }
  const tipo = tipoPorId[f.tipo.value] ? f.tipo.value : TIPOS[0].id;
  const dados = { nome, telefone, qtd, polo, tipo, etapa, obs: f.obs.value.trim(), atualizadoEm: F.serverTimestamp() };
  // A previsão só é gravada no cancelamento (ou quando o aluno já tinha uma).
  if (ETAPAS_COM_PREVISAO.includes(etapa) || atual?.previsaoCancelamento) dados.previsaoCancelamento = previsao;
  $('#dlgAluno').close();
  try {
    if (id) await F.updateDoc(F.doc(colecao, id), dados);
    else await F.addDoc(colecao, { ...dados, criadoEm: F.serverTimestamp() });
    toast(id ? (atual && atual.etapa !== etapa ? `${primeiroNome(nome)} → ${etapaPorId[etapa].nome}` : 'Aluno atualizado') : 'Aluno cadastrado');
  } catch (err) {
    console.error(err);
    toast(
      err.code === 'permission-denied'
        ? 'Sem permissão para salvar: publique as regras mais recentes do Firestore.'
        : `Erro ao salvar: ${err.message || err}`,
      'erro',
    );
  }
}

async function excluirAluno() {
  const aluno = estado.alunos.find((a) => a.id === estado.editandoId);
  if (!aluno || !confirm(`Excluir ${aluno.nome}? Essa ação não pode ser desfeita.`)) return;
  $('#dlgAluno').close();
  try {
    await F.deleteDoc(F.doc(colecao, aluno.id));
    toast('Aluno excluído');
  } catch (err) {
    toast(`Erro ao excluir: ${err.message || err}`, 'erro');
  }
}

// ---------------------------------------------------------------- importar planilha
// Cada linha da planilha é uma mensalidade em atraso: "Status | Vencimento | Valor | Aluno | Filial".
// As linhas são agrupadas por aluno. Cada card guarda os vencimentos importados
// ("AAAA-MM-DD|valor"), para que uma nova planilha UNA as mensalidades no card
// existente sem contar o mesmo mês duas vezes.

const reais = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\s/g, ' ');
const chaveNome = (nome) => normalizar(nome).replace(/\s+/g, ' ').trim();
let previaImportacao = [];

function poloDaFilial(filial) {
  const f = normalizar(filial);
  return f.includes('barra') ? 'barra-do-mendes' : 'ipupiara';
}

// Resumo de uma lista de vencimentos: quantidade, total e período.
function resumoVencimentos(lista) {
  const ordenada = [...new Set(lista)].sort();
  const total = ordenada.reduce((s, v) => s + (Number(v.split('|')[1]) || 0), 0);
  const br = (v) => v.split('|')[0].split('-').reverse().join('/');
  const qtd = ordenada.length;
  return {
    vencimentos: ordenada,
    qtd,
    total: Math.round(total * 100) / 100,
    periodo: qtd ? (qtd === 1 ? br(ordenada[0]) : `${br(ordenada[0])} a ${br(ordenada[qtd - 1])}`) : '',
  };
}

const linhaPlanilha = (r) =>
  `Planilha: ${r.qtd} ${r.qtd === 1 ? 'mensalidade' : 'mensalidades'} (${r.periodo}) · total até o vencimento ${reais(r.total)}`;

// Troca a linha "Planilha: …" da observação, mantendo as anotações da gestora.
function obsComResumo(obs, resumo) {
  const outras = String(obs || '')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('Planilha:'));
  return [linhaPlanilha(resumo), ...outras].join('\n').slice(0, 2000);
}

// Entre cards repetidos, o principal é o que tem WhatsApp, depois o de etapa mais avançada.
function escolherPrincipal(cards) {
  return [...cards].sort(
    (a, b) =>
      Number(Boolean(b.telefone)) - Number(Boolean(a.telefone)) ||
      indiceEtapa(b.etapa) - indiceEtapa(a.etapa) ||
      (a.criadoEm || 0) - (b.criadoEm || 0),
  )[0];
}

const cardsPorNome = () => {
  const mapa = new Map();
  for (const a of estado.alunos) {
    const k = chaveNome(a.nome);
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k).push(a);
  }
  return mapa;
};

// Células da planilha: data (10/12/2025), valor (R$ 99,00 · 99,00 · 1.234,56), telefone.
const ehData = (c) => /^\d{1,2}\/\d{1,2}\/(\d{2}|\d{4})$/.test(c);
function valorDe(c) {
  const t = String(c || '').replace(/^R\$\s*/i, '');
  if (/^\d{1,3}(\.\d{3})+,\d{2}$|^\d+,\d{2}$/.test(t)) return Number(t.replace(/\./g, '').replace(',', '.'));
  if (/^\d+\.\d{2}$/.test(t)) return Number(t);
  if (/^R\$/i.test(c) && /^\d+$/.test(t)) return Number(t);
  return null;
}
const ehTelefone = (c) => digitos(c).length >= 8 && !ehData(c) && valorDe(c) === null;
const ehTexto = (c) => Boolean(c) && /[a-zà-ú]/i.test(c) && !ehData(c) && valorDe(c) === null && !ehTelefone(c);
const ehStatus = (c) => /atras|aberto|vencid|pendent|inadimpl/i.test(c);
// Na célula com mais de um número, fica o primeiro.
const telefoneDaCelula = (c) => formatarTelefone(String(c || '').split(/[\/,;|]|\se\s/)[0].replace(/\(?[a-zà-ú][^)]*\)?/gi, '')).slice(0, 40);

// Lê uma linha em um dos formatos aceitos:
//  - Graduação: Polo, Aluno, Telefone, Vencimento, Valor
//  - Antigo:    Status, Vencimento, Valor, Aluno, Filial
function lerLinha(celulas) {
  const iData = celulas.findIndex(ehData);
  const iValor = celulas.findIndex((c, i) => i !== iData && valorDe(c) !== null);
  if (iData < 0 || iValor < 0) return null;
  const antes = celulas.slice(0, Math.min(iData, iValor));
  const textosAntes = antes.filter(ehTexto);
  let nome = '';
  let filial = '';
  let telefone = '';
  let formato = 'graduacao';
  const soStatusAntes = !textosAntes.length || (textosAntes.length === 1 && ehStatus(textosAntes[0]));
  if (textosAntes.length >= 2) {
    [filial, nome] = textosAntes;
    telefone = antes.find(ehTelefone) || '';
  } else if (soStatusAntes && iValor === iData + 1 && ehTexto(celulas[iValor + 1])) {
    formato = 'antigo';
    nome = celulas[iValor + 1];
    filial = celulas[iValor + 2] || '';
  } else if (textosAntes.length === 1 && !soStatusAntes) {
    nome = textosAntes[0];
    telefone = antes.find(ehTelefone) || '';
  }
  if (!nome || /\d/.test(nome)) return null;
  let [d, m, a] = celulas[iData].split('/');
  if (a.length === 2) a = `20${a}`;
  return {
    nome: nome.replace(/\s+/g, ' '),
    filial,
    telefone: telefone ? telefoneDaCelula(telefone) : '',
    formato,
    vencimento: `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}|${valorDe(celulas[iValor]).toFixed(2)}`,
  };
}

function interpretarPlanilha(texto) {
  const grupos = new Map();
  let ignoradas = 0;
  for (const bruta of String(texto).split(/\r?\n/)) {
    const linha = bruta.trim();
    if (!linha) continue;
    const celulas = (linha.includes('\t') ? linha.split('\t') : linha.split(/\s{2,}/)).map((c) => c.trim());
    const l = lerLinha(celulas);
    if (!l) {
      ignoradas += 1; // cabeçalho ou linha fora do formato
      continue;
    }
    const chave = chaveNome(l.nome);
    if (!grupos.has(chave)) grupos.set(chave, { nome: l.nome, polo: poloDaFilial(l.filial), telefone: '', formato: l.formato, vencimentos: [] });
    const g = grupos.get(chave);
    if (!g.telefone && l.telefone) g.telefone = l.telefone;
    g.vencimentos.push(l.vencimento);
  }

  const existentes = cardsPorNome();
  const alunos = [...grupos.values()].map((g) => {
    const daPlanilha = resumoVencimentos(g.vencimentos);
    const cards = existentes.get(chaveNome(g.nome)) || [];
    // Planilha antiga: mensalidades de R$ 29,90 costumam ser de Pós-Graduação (confira na prévia).
    // A planilha de Graduação (Polo, Aluno, Telefone…) já vem como Graduação.
    const sugerePos = g.formato === 'antigo' && Math.abs(daPlanilha.total / daPlanilha.qtd - 29.9) < 0.005;
    const base = { nome: g.nome, polo: g.polo, telefone: g.telefone, tipo: sugerePos ? 'pos' : 'graduacao', sugerePos, daPlanilha };
    if (!cards.length) return { ...base, acao: 'novo', final: daPlanilha, incluir: true };

    const alvo = escolherPrincipal(cards);
    const guardados = cards.flatMap((c) => (Array.isArray(c.vencimentos) ? c.vencimentos : []));
    const final = resumoVencimentos([...guardados, ...daPlanilha.vencimentos]);
    // Card sem vencimentos guardados (cadastro manual ou importação antiga): fica com a maior quantidade.
    if (!guardados.length) final.qtd = Math.max(Number(alvo.qtd) || 0, final.qtd);
    const novos = daPlanilha.vencimentos.filter((v) => !guardados.includes(v)).length;
    // O card fica com o WhatsApp que já tem; só recebe o da planilha se estiver sem.
    const ganhaTelefone = !alvo.telefone && Boolean(g.telefone);
    const muda = final.qtd !== (Number(alvo.qtd) || 0) || !guardados.length || novos > 0 || ganhaTelefone;
    return { ...base, acao: muda ? 'unir' : 'igual', alvo, novos, ganhaTelefone, semHistorico: !guardados.length, repetidos: cards.length, final, incluir: muda };
  });
  alunos.sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'));
  return { alunos, ignoradas };
}

function abrirImportar() {
  previaImportacao = [];
  // Alunos novos entram na etapa aberta se ela for de entrada (Entrar em contato ou Bloqueados).
  const entrada = ['contatar', 'bloqueado'].includes(estado.etapaAtual) ? estado.etapaAtual : 'contatar';
  // (O pedido de cancelamento fica de fora: ele precisa da data de previsão de cada aluno.)
  $('#impEtapa').innerHTML = ETAPAS.filter((e) => e.id !== ETAPA_PEDIDO).map((e) => `<option value="${e.id}" ${e.id === entrada ? 'selected' : ''}>${e.icone} ${esc(e.nome)}</option>`).join('');
  $('#impTexto').value = '';
  $('#impPrevia').innerHTML = '';
  $('#impConfirmar').disabled = true;
  $('#impConfirmar').textContent = 'Importar';
  $('#dlgImportar').showModal();
  $('#impTexto').focus();
}

function situacao(a) {
  if (a.acao === 'novo') return '<span class="imp-novo">Novo card</span>';
  const rep = a.repetidos > 1 ? `<br><span class="imp-aviso">${a.repetidos} cards com esse nome — use "Juntar repetidos"</span>` : '';
  if (a.acao === 'igual') return `<span class="imp-igual">Já está atualizado</span>${rep}`;
  const detalhe = a.semHistorico
    ? 'passa a guardar os vencimentos da planilha'
    : a.novos
      ? `+${a.novos} ${a.novos === 1 ? 'mensalidade nova' : 'mensalidades novas'}`
      : a.final.qtd !== (Number(a.alvo.qtd) || 0)
        ? 'atualiza a quantidade'
        : '';
  const partes = [detalhe && `${detalhe} → ${a.final.qtd} no total`, a.ganhaTelefone && 'recebe o WhatsApp da planilha'].filter(Boolean);
  return `<span class="imp-unir">Unir com o card existente</span><br><span class="imp-aviso">${partes.join(' · ')}</span>${rep}`;
}

function lerPlanilha() {
  const { alunos, ignoradas } = interpretarPlanilha($('#impTexto').value);
  previaImportacao = alunos;
  if (!alunos.length) {
    $('#impPrevia').innerHTML = '<p class="acesso-erro">Não encontrei nenhuma linha no formato esperado (Polo, Aluno, Telefone, Vencimento e Valor).</p>';
    $('#impConfirmar').disabled = true;
    return;
  }
  const linhas = alunos
    .map((a, i) => {
      const existente = a.acao !== 'novo';
      const polo = existente
        ? esc(poloDe(a.alvo).curto)
        : `<select data-imp="polo" data-i="${i}">${POLOS.map((p) => `<option value="${p.id}" ${p.id === a.polo ? 'selected' : ''}>${esc(p.curto)}</option>`).join('')}</select>`;
      const curso = existente
        ? esc(tipoDe(a.alvo).curto)
        : `<select data-imp="tipo" data-i="${i}">${TIPOS.map((t) => `<option value="${t.id}" ${t.id === a.tipo ? 'selected' : ''}>${esc(t.curto)}</option>`).join('')}</select>${a.sugerePos ? '<br><span class="imp-aviso">sugestão pelo valor R$ 29,90 — confira</span>' : ''}`;
      return `
      <tr class="${a.acao === 'igual' ? 'imp-linha-igual' : ''}">
        <td><input type="checkbox" data-imp="incluir" data-i="${i}" ${a.incluir ? 'checked' : ''} ${a.acao === 'igual' ? 'disabled' : ''} aria-label="Importar ${esc(a.nome)}"></td>
        <td><strong>${esc(a.nome)}</strong></td>
        <td class="imp-tel">${a.acao !== 'novo' && a.alvo.telefone ? esc(a.alvo.telefone) : a.telefone ? esc(a.telefone) : '—'}</td>
        <td>${situacao(a)}</td>
        <td class="num">${a.daPlanilha.qtd}</td>
        <td class="num">${reais(a.daPlanilha.total)}</td>
        <td>${esc(a.daPlanilha.periodo)}</td>
        <td>${polo}</td>
        <td>${curso}</td>
      </tr>`;
    })
    .join('');
  const linhasPlanilha = alunos.reduce((s, a) => s + a.daPlanilha.qtd, 0);
  const n = (acao) => alunos.filter((a) => a.acao === acao).length;
  $('#impPrevia').innerHTML = `
    <p class="pequeno"><strong>${alunos.length} alunos</strong> em ${linhasPlanilha} mensalidades${ignoradas ? ` (${ignoradas} linha(s) ignorada(s), como o cabeçalho)` : ''}:
      ${n('novo')} novo(s), ${n('unir')} para unir com cards existentes, ${n('igual')} já atualizado(s).
      Novos entram na etapa escolhida acima, com o WhatsApp da planilha; os existentes mantêm etapa, WhatsApp e anotações (quem estiver sem WhatsApp recebe o da planilha).</p>
    <div class="imp-tabela-caixa">
      <table class="imp-tabela">
        <thead><tr><th></th><th>Aluno</th><th>WhatsApp</th><th>Situação</th><th>Mens.</th><th>Total</th><th>Vencimentos</th><th>Polo</th><th>Curso</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`;
  atualizarBotaoImportar();
}

function atualizarBotaoImportar() {
  const n = previaImportacao.filter((a) => a.incluir).length;
  $('#impConfirmar').disabled = !n;
  $('#impConfirmar').textContent = n ? `Importar ${n} aluno${n > 1 ? 's' : ''}` : 'Nada para importar';
}

document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-imp]');
  if (!el) return;
  const a = previaImportacao[Number(el.dataset.i)];
  if (!a) return;
  if (el.dataset.imp === 'incluir') a.incluir = el.checked;
  else a[el.dataset.imp] = el.value;
  atualizarBotaoImportar();
});

async function confirmarImportacao() {
  const lista = previaImportacao.filter((a) => a.incluir);
  if (!lista.length) return;
  // Pedido de cancelamento precisa de data: alunos novos vão para "Entrar em contato" nesse caso.
  const escolhida = etapaPorId[$('#impEtapa').value] ? $('#impEtapa').value : 'contatar';
  const etapaEntrada = escolhida === ETAPA_PEDIDO ? 'contatar' : escolhida;
  const botao = $('#impConfirmar');
  botao.disabled = true;
  let novos = 0;
  let unidos = 0;
  try {
    for (const a of lista) {
      botao.textContent = `Importando ${novos + unidos + 1} de ${lista.length}…`;
      if (a.acao === 'novo') {
        await F.addDoc(colecao, {
          nome: a.nome,
          telefone: a.telefone || '',
          qtd: a.final.qtd,
          polo: a.polo,
          tipo: a.tipo,
          etapa: etapaEntrada,
          vencimentos: a.final.vencimentos,
          obs: obsComResumo('', a.final),
          criadoEm: F.serverTimestamp(),
          atualizadoEm: F.serverTimestamp(),
        });
        novos += 1;
      } else {
        await F.updateDoc(F.doc(colecao, a.alvo.id), {
          qtd: a.final.qtd,
          vencimentos: a.final.vencimentos,
          obs: obsComResumo(a.alvo.obs, a.final),
          ...(a.ganhaTelefone ? { telefone: a.telefone } : {}),
          atualizadoEm: F.serverTimestamp(),
        });
        unidos += 1;
      }
    }
    $('#dlgImportar').close();
    toast(`Pronto: ${novos} novo(s) e ${unidos} unido(s) com cards existentes.`);
  } catch (err) {
    console.error(err);
    toast(`Importados ${novos + unidos} de ${lista.length}. Erro: ${err.message || err}`, 'erro');
    atualizarBotaoImportar();
  }
}

// ---------------------------------------------------------------- juntar cards repetidos

function gruposRepetidos() {
  return [...cardsPorNome().values()].filter((cards) => cards.length > 1);
}

function renderRepetidos() {
  const el = $('#cobRepetidos');
  const grupos = gruposRepetidos();
  el.hidden = !grupos.length;
  if (!grupos.length) return;
  const extras = grupos.reduce((s, g) => s + g.length - 1, 0);
  el.innerHTML = `⚠️ <strong>${grupos.length} aluno(s) com cards repetidos</strong> (${extras} card(s) a mais): ${grupos
    .slice(0, 4)
    .map((g) => esc(g[0].nome))
    .join(', ')}${grupos.length > 4 ? '…' : ''}
    <button type="button" class="btn btn-mini btn-primario" data-acao="juntar-repetidos">🔗 Juntar repetidos</button>`;
}

async function juntarRepetidos() {
  const grupos = gruposRepetidos();
  if (!grupos.length) return;
  const extras = grupos.reduce((s, g) => s + g.length - 1, 0);
  if (!confirm(`Juntar ${grupos.length} aluno(s) repetido(s)? Fica um card por aluno (o que tem WhatsApp ou a etapa mais avançada) e ${extras} card(s) a mais serão apagados. As mensalidades não são contadas em dobro.`)) return;
  let feitos = 0;
  try {
    for (const cards of grupos) {
      const principal = escolherPrincipal(cards);
      const outros = cards.filter((c) => c.id !== principal.id);
      const guardados = cards.flatMap((c) => (Array.isArray(c.vencimentos) ? c.vencimentos : []));
      const resumo = resumoVencimentos(guardados);
      // Sem vencimentos guardados (importação antiga), os cards repetidos vieram da mesma planilha: fica a maior quantidade.
      const qtd = guardados.length ? resumo.qtd : Math.max(...cards.map((c) => Number(c.qtd) || 0));
      const anotacoes = [...new Set(cards.flatMap((c) => String(c.obs || '').split('\n')).filter((l) => l.trim() && !l.startsWith('Planilha:')))];
      const linhaAntiga = cards.map((c) => String(c.obs || '').split('\n').find((l) => l.startsWith('Planilha:'))).find(Boolean);
      const obs = (guardados.length ? [linhaPlanilha(resumo), ...anotacoes] : [linhaAntiga, ...anotacoes].filter(Boolean)).join('\n').slice(0, 2000);
      const dados = {
        qtd,
        obs,
        telefone: principal.telefone || outros.find((c) => c.telefone)?.telefone || '',
        atualizadoEm: F.serverTimestamp(),
      };
      if (guardados.length) dados.vencimentos = resumo.vencimentos;
      await F.updateDoc(F.doc(colecao, principal.id), dados);
      for (const c of outros) await F.deleteDoc(F.doc(colecao, c.id));
      feitos += 1;
    }
    toast(`${feitos} aluno(s) juntado(s). Agora há um card por aluno.`);
  } catch (err) {
    console.error(err);
    toast(`Juntados ${feitos} de ${grupos.length}. Erro: ${err.message || err}`, 'erro');
  }
}

// ---------------------------------------------------------------- mensagem

function abrirMensagem(aluno) {
  estado.msgAlunoId = aluno.id;
  $('#dlgMsgTitulo').textContent = `Mensagem para ${primeiroNome(aluno.nome)} · ${tipoDe(aluno).curto}`;
  const opcao = (id, nome) => `<option value="${id}" ${id === aluno.etapa ? 'selected' : ''}>${esc(nome)}</option>`;
  const extras = extrasDe(aluno);
  $('#msgEtapa').innerHTML = extras.length
    ? `<optgroup label="Etapas do funil">${ETAPAS.map((e) => opcao(e.id, e.nome)).join('')}</optgroup>
       <optgroup label="Outras situações">${extras.map((m) => opcao(m.id, m.nome)).join('')}</optgroup>`
    : ETAPAS.map((e) => opcao(e.id, e.nome)).join('');
  $('#msgTelefone').value = aluno.telefone || '';
  atualizarMensagem();
  $('#dlgMsg').showModal();
}

function atualizarMensagem() {
  const aluno = estado.alunos.find((a) => a.id === estado.msgAlunoId);
  $('#msgTexto').value = montarMensagem(aluno, $('#msgEtapa').value);
  atualizarLinkWhats();
}

function atualizarLinkWhats() {
  const botao = $('#msgWhats');
  botao.href = linkWhats($('#msgTelefone').value, $('#msgTexto').value);
  if (NO_ANDROID) {
    botao.removeAttribute('target');
    botao.textContent = '💬 Abrir no WhatsApp Business';
  }
}

// ---------------------------------------------------------------- eventos

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-acao]');
  if (!el) return;
  const aluno = el.dataset.id ? estado.alunos.find((a) => a.id === el.dataset.id) : null;
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
    case 'novo':
      return abrirFormAluno(null);
    case 'importar':
      return abrirImportar();
    case 'imp-ler':
      return lerPlanilha();
    case 'imp-confirmar':
      return confirmarImportacao();
    case 'juntar-repetidos':
      return juntarRepetidos();
    case 'filtro-polo':
      estado.filtroPolo = el.dataset.polo;
      return renderQuadro();
    case 'filtro-tipo':
      estado.filtroTipo = el.dataset.tipo;
      return renderQuadro();
    case 'editar':
      return aluno && abrirFormAluno(aluno);
    case 'excluir':
      return excluirAluno();
    case 'msg':
      return aluno && abrirMensagem(aluno);
    case 'ver-etapa':
      return verEtapa(el.dataset.etapa);
    case 'msg-copiar':
      return copiar($('#msgTexto').value, 'Mensagem copiada!');
    case 'fechar-dialogo':
      return el.closest('dialog').close();
  }
});

$('#formAluno').addEventListener('submit', salvarAluno);
$('#formAluno').etapa.addEventListener('change', ajustarFormPorEtapa);
// Fechou o cadastro sem salvar (ex.: arrastou para o cancelamento e desistiu): o card volta ao lugar.
$('#dlgAluno').addEventListener('close', () => renderQuadro());
// "➜ Mover" no card.
document.addEventListener('change', (e) => {
  const sel = e.target.closest('select[data-mover]');
  if (!sel || !sel.value) return;
  const destino = sel.value;
  sel.value = '';
  moverPara(sel.dataset.mover, destino);
});
window.addEventListener('hashchange', () => {
  const id = decodeURIComponent(location.hash.slice(1));
  if (etapaPorId[id] && id !== estado.etapaAtual) verEtapa(id);
});
$('#cobBusca').addEventListener('input', (e) => {
  estado.busca = e.target.value;
  renderQuadro();
});
$('#msgEtapa').addEventListener('change', atualizarMensagem);
$('#msgTelefone').addEventListener('input', atualizarLinkWhats);
$('#msgTexto').addEventListener('input', atualizarLinkWhats);
for (const dlg of document.querySelectorAll('dialog')) {
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });
}
setInterval(() => {
  if (!$('#app').hidden && !document.hidden) renderQuadro();
}, 60_000);

// ---------------------------------------------------------------- início

const paraMs = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'number' ? v : null);

function abrirQuadro() {
  $('#telaAcesso').hidden = true;
  $('#app').hidden = false;
  renderQuadro();
  centralizarEtapaNoMenu();
  pararDeOuvir?.();
  pararDeOuvir = F.onSnapshot(
    colecao,
    (snap) => {
      estado.alunos = snap.docs.map((d) => {
        const dados = d.data({ serverTimestamps: 'estimate' });
        return { ...dados, id: d.id, criadoEm: paraMs(dados.criadoEm), atualizadoEm: paraMs(dados.atualizadoEm) };
      });
      renderQuadro();
    },
    (err) => {
      console.error(err);
      if (err.code === 'permission-denied') {
        mostrarAcesso('negado', 'O Firebase recusou o acesso. Confira se a versão mais recente das regras (firestore.rules) foi publicada.');
      } else {
        mostrarAcesso('erro', err.message || String(err));
      }
    },
  );
}

async function iniciar() {
  mostrarAcesso('carregando');
  prepararArrastar();
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
    colecao = F.collection(F.getFirestore(app), 'cobrancas');
  } catch (err) {
    console.error(err);
    return mostrarAcesso('erro', `Não foi possível conectar: ${err.message || err}`);
  }

  A.onAuthStateChanged(auth, (u) => {
    estado.usuario = u ? { nome: u.displayName || u.email, email: u.email } : null;
    renderUsuario();
    pararDeOuvir?.();
    pararDeOuvir = null;
    estado.alunos = [];
    if (!u) return mostrarAcesso('login');
    if (String(u.email || '').toLowerCase() !== GESTORA) return mostrarAcesso('negado');
    abrirQuadro();
  });
}

iniciar();
