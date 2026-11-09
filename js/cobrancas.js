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
  alvoWhats,
  tempoRelativo,
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

const ETAPAS = [
  { id: 'contatar', nome: 'Entrar em contato' },
  { id: 'negociacao', nome: 'Em negociação' },
  { id: 'aguardando', nome: 'Aguardando pagamento' },
  { id: 'finalizado', nome: 'Finalizado' },
];
const etapaPorId = Object.fromEntries(ETAPAS.map((e) => [e.id, e]));
const indiceEtapa = (id) => ETAPAS.findIndex((e) => e.id === id);

// ---------------------------------------------------------------- mensagens
// Tom leve: convite para o Feirão, sem cobrança direta.
//  {nome}      primeiro nome do aluno
//  {mensalidades}  "a mensalidade em aberto" / "as 3 mensalidades em aberto"
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
  },

  // Pós-Graduação: não participa do Feirão (sem falar em desconto).
  pos: {
    contatar: `Olá, {nome}! Tudo bem? 😊

Aqui é da *{polo}*. Estou passando para conversar rapidinho sobre a sua *pós-graduação*. Quero te ajudar a deixar tudo organizado para você seguir com tranquilidade até o seu certificado. 🎓

Posso te mandar os detalhes por aqui? 💛`,

    negociacao: `Oi, {nome}! 😊

Sobre a sua *pós-graduação*: para regularizar {mensalidades}, posso ver com você a melhor forma de pagamento, à vista ou parcelado, do jeito que ficar mais tranquilo para você.

Me conta o que fica melhor que eu já preparo tudo certinho. 😉`,

    aguardando: `Oi, {nome}! Tudo certo? 😊

Passando só para lembrar do pagamento que combinamos da sua *pós-graduação*. Assim que fizer, me manda o comprovante por aqui que eu já confirmo e deixo tudo regularizado. ✅

Se precisar de alguma ajuda, é só me chamar!`,

    finalizado: `{nome}, pagamento confirmado! 🎉

Muito obrigada! Sua pós-graduação está em dia. Agora é seguir firme até o certificado, e conte sempre com a gente aqui no *{polo}*! 💛`,
  },
};

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
    polo: poloDe(aluno).nome,
  };
  return (MENSAGENS[tipoDe(aluno).id]?.[etapa] || '').replace(/\{(\w+)\}/g, (m, k) => (k in valores ? valores[k] : m));
}

// ---------------------------------------------------------------- estado

const estado = {
  usuario: null,
  alunos: [],
  busca: '',
  filtroPolo: 'todos',
  filtroTipo: 'todos',
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

function cardAluno(a) {
  const i = indiceEtapa(a.etapa);
  // A linha "Planilha: …" (vencimentos e total) fica só na edição, para o card ficar menor.
  const obsVisivel = String(a.obs || '')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('Planilha:'))
    .join('\n');
  const qtd = Number(a.qtd) || 0;
  return `
    <article class="cob-card" data-id="${esc(a.id)}">
      <div class="cob-topo">
        <h4>${esc(a.nome)}</h4>
        ${qtd ? `<span class="cob-qtd">${qtd} ${qtd === 1 ? 'mensalidade' : 'mensalidades'}</span>` : ''}
      </div>
      <div class="cob-tags">
        <span class="cob-polo polo-${esc(poloDe(a).id)}">📍 ${esc(poloDe(a).curto)}</span>
        <span class="cob-tipo tipo-${esc(tipoDe(a).id)}">🎓 ${esc(tipoDe(a).curto)}</span>
      </div>
      ${
        a.telefone
          ? `<a class="cob-tel" href="${esc(linkWhats(a.telefone))}"${alvoWhats}>📱 ${esc(a.telefone)}</a>`
          : `<button type="button" class="cob-sem-tel" data-acao="editar" data-id="${esc(a.id)}">📱 Adicionar WhatsApp</button>`
      }
      ${obsVisivel ? `<p class="cob-obs">${esc(obsVisivel)}</p>` : ''}
      ${a.atualizadoEm ? `<p class="cob-meta">Atualizado ${esc(tempoRelativo(a.atualizadoEm))}</p>` : ''}
      <div class="cob-acoes">
        <button type="button" class="btn btn-mini btn-primario" data-acao="msg" data-id="${esc(a.id)}">💬 Mensagem</button>
        <button type="button" class="btn btn-mini" data-acao="editar" data-id="${esc(a.id)}" aria-label="Editar ${esc(a.nome)}">✏️</button>
        ${i > 0 ? `<button type="button" class="btn btn-mini" data-acao="voltar" data-id="${esc(a.id)}" title="Etapa anterior" aria-label="Voltar etapa">◀</button>` : ''}
        ${i < ETAPAS.length - 1 ? `<button type="button" class="btn btn-mini" data-acao="avancar" data-id="${esc(a.id)}" title="Próxima etapa" aria-label="Avançar etapa">▶</button>` : ''}
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
  const conta = (id) => base.filter((a) => a.etapa === id).length;
  const emAberto = base.filter((a) => a.etapa !== 'finalizado').reduce((s, a) => s + (Number(a.qtd) || 0), 0);
  $('#cobResumo').innerHTML = `
    <div class="cob-resumo-item"><span class="resumo-n">${base.length}</span><span class="resumo-nome">Alunos</span></div>
    ${ETAPAS.map((e) => `<div class="cob-resumo-item et-${e.id}"><span class="resumo-n">${conta(e.id)}</span><span class="resumo-nome">${esc(e.nome)}</span></div>`).join('')}
    <div class="cob-resumo-item destaque"><span class="resumo-n">${emAberto}</span><span class="resumo-nome" title="Soma das mensalidades em atraso dos alunos que ainda não finalizaram">Mensalidades em aberto</span></div>`;
}

function renderQuadro() {
  renderResumo();
  renderRepetidos();
  const lista = filtrados();
  for (const e of ETAPAS) {
    const doEtapa = lista
      .filter((a) => a.etapa === e.id)
      .sort((x, y) => (y.atualizadoEm || 0) - (x.atualizadoEm || 0));
    const col = document.querySelector(`.coluna[data-etapa="${e.id}"]`);
    col.querySelector('.coluna-n').textContent = doEtapa.length;
    col.querySelector('.coluna-lista').innerHTML = doEtapa.length
      ? doEtapa.map(cardAluno).join('')
      : '<p class="coluna-vazia">Nenhum aluno aqui.</p>';
  }
}

function prepararArrastar() {
  for (const lista of document.querySelectorAll('.coluna-lista')) {
    Sortable.create(lista, {
      group: 'cobrancas',
      sort: false, // a ordem dentro da coluna é pela última atualização
      animation: 150,
      draggable: '.cob-card',
      delay: 200, // no celular, segure um instante antes de arrastar (para a tela ainda rolar)
      delayOnTouchOnly: true,
      filter: 'button, a',
      preventOnFilter: false,
      ghostClass: 'cob-fantasma',
      chosenClass: 'cob-escolhido',
      onEnd: (evt) => {
        if (evt.from === evt.to) return;
        moverPara(evt.item.dataset.id, evt.to.dataset.etapa);
      },
    });
  }
}

// ---------------------------------------------------------------- gravação

async function moverPara(id, etapa) {
  const aluno = estado.alunos.find((a) => a.id === id);
  if (!aluno || !etapaPorId[etapa] || aluno.etapa === etapa) return renderQuadro();
  try {
    await F.updateDoc(F.doc(colecao, id), { etapa, atualizadoEm: F.serverTimestamp() });
    toast(`${primeiroNome(aluno.nome)} → ${etapaPorId[etapa].nome}`);
  } catch (err) {
    console.error(err);
    toast(`Erro ao mover: ${err.message || err}`, 'erro');
    renderQuadro();
  }
}

function abrirFormAluno(aluno) {
  estado.editandoId = aluno?.id || null;
  const f = $('#formAluno');
  $('#dlgAlunoTitulo').textContent = aluno ? 'Editar aluno' : 'Novo aluno';
  f.nome.value = aluno?.nome || '';
  f.telefone.value = aluno?.telefone || '';
  f.qtd.value = aluno?.qtd ?? 1;
  const tipoAtual = aluno ? tipoDe(aluno).id : estado.filtroTipo !== 'todos' ? estado.filtroTipo : TIPOS[0].id;
  f.tipo.innerHTML = TIPOS.map((t) => `<option value="${t.id}" ${t.id === tipoAtual ? 'selected' : ''}>${esc(t.nome)}</option>`).join('');
  const poloAtual = aluno ? poloDe(aluno).id : estado.filtroPolo !== 'todos' ? estado.filtroPolo : ultimoPolo();
  f.polo.innerHTML = POLOS.map((p) => `<option value="${p.id}" ${p.id === poloAtual ? 'selected' : ''}>${esc(p.curto.startsWith('Polo') ? p.curto : `Polo ${p.curto}`)}</option>`).join('');
  f.etapa.innerHTML = ETAPAS.map((e) => `<option value="${e.id}" ${e.id === (aluno?.etapa || 'contatar') ? 'selected' : ''}>${esc(e.nome)}</option>`).join('');
  f.obs.value = aluno?.obs || '';
  $('#btnExcluir').hidden = !aluno;
  $('#dlgAluno').showModal();
  f.nome.focus();
}

async function salvarAluno(e) {
  e.preventDefault();
  const f = $('#formAluno');
  const nome = f.nome.value.trim();
  const telefone = formatarTelefone(f.telefone.value);
  const qtd = Math.round(Number(f.qtd.value));
  if (!nome) return f.nome.focus();
  if (digitos(telefone).length < 10) {
    toast('Informe o WhatsApp com DDD', 'erro');
    return f.telefone.focus();
  }
  if (!Number.isInteger(qtd) || qtd < 1 || qtd > 120) {
    toast('Quantidade de mensalidades inválida', 'erro');
    return f.qtd.focus();
  }
  const id = estado.editandoId;
  const repetido = estado.alunos.find((a) => a.id !== id && numeroWhats(telefone) && numeroWhats(a.telefone) === numeroWhats(telefone));
  if (repetido && !confirm(`Esse WhatsApp já está cadastrado para ${repetido.nome}. Salvar mesmo assim?`)) return;
  const polo = poloPorId[f.polo.value] ? f.polo.value : POLOS[0].id;
  try {
    localStorage.setItem(CHAVE_ULTIMO_POLO, polo);
  } catch {
    /* sem armazenamento local: tudo bem */
  }
  const tipo = tipoPorId[f.tipo.value] ? f.tipo.value : TIPOS[0].id;
  const dados = { nome, telefone, qtd, polo, tipo, etapa: f.etapa.value, obs: f.obs.value.trim(), atualizadoEm: F.serverTimestamp() };
  $('#dlgAluno').close();
  try {
    if (id) await F.updateDoc(F.doc(colecao, id), dados);
    else await F.addDoc(colecao, { ...dados, criadoEm: F.serverTimestamp() });
    toast(id ? 'Aluno atualizado' : 'Aluno cadastrado');
  } catch (err) {
    console.error(err);
    toast(`Erro ao salvar: ${err.message || err}`, 'erro');
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

function interpretarPlanilha(texto) {
  const grupos = new Map();
  let ignoradas = 0;
  for (const bruta of String(texto).split(/\r?\n/)) {
    const linha = bruta.trim();
    if (!linha) continue;
    const celulas = (linha.includes('\t') ? linha.split('\t') : linha.split(/\s{2,}/)).map((c) => c.trim());
    const iData = celulas.findIndex((c) => /^\d{2}\/\d{2}\/\d{4}$/.test(c));
    const iValor = celulas.findIndex((c) => /^R\$\s*[\d.]+,\d{2}$/.test(c));
    const nome = iValor >= 0 ? celulas[iValor + 1] : '';
    if (iData < 0 || iValor < 0 || !nome || /\d/.test(nome)) {
      ignoradas += 1; // cabeçalho ou linha fora do formato
      continue;
    }
    const valor = Number(celulas[iValor].replace(/[^\d,]/g, '').replace(',', '.'));
    const [d, m, a] = celulas[iData].split('/');
    const chave = chaveNome(nome);
    if (!grupos.has(chave)) grupos.set(chave, { nome: nome.replace(/\s+/g, ' '), polo: poloDaFilial(celulas[iValor + 2] || ''), vencimentos: [] });
    grupos.get(chave).vencimentos.push(`${a}-${m}-${d}|${valor.toFixed(2)}`);
  }

  const existentes = cardsPorNome();
  const alunos = [...grupos.values()].map((g) => {
    const daPlanilha = resumoVencimentos(g.vencimentos);
    const cards = existentes.get(chaveNome(g.nome)) || [];
    // Sugestão: mensalidades de R$ 29,90 costumam ser de Pós-Graduação (confira na prévia).
    const sugerePos = Math.abs(daPlanilha.total / daPlanilha.qtd - 29.9) < 0.005;
    const base = { nome: g.nome, polo: g.polo, tipo: sugerePos ? 'pos' : 'graduacao', sugerePos, daPlanilha };
    if (!cards.length) return { ...base, acao: 'novo', final: daPlanilha, incluir: true };

    const alvo = escolherPrincipal(cards);
    const guardados = cards.flatMap((c) => (Array.isArray(c.vencimentos) ? c.vencimentos : []));
    const final = resumoVencimentos([...guardados, ...daPlanilha.vencimentos]);
    // Card sem vencimentos guardados (cadastro manual ou importação antiga): fica com a maior quantidade.
    if (!guardados.length) final.qtd = Math.max(Number(alvo.qtd) || 0, final.qtd);
    const novos = daPlanilha.vencimentos.filter((v) => !guardados.includes(v)).length;
    const muda = final.qtd !== (Number(alvo.qtd) || 0) || !guardados.length || novos > 0;
    return { ...base, acao: muda ? 'unir' : 'igual', alvo, novos, semHistorico: !guardados.length, repetidos: cards.length, final, incluir: muda };
  });
  alunos.sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'));
  return { alunos, ignoradas };
}

function abrirImportar() {
  previaImportacao = [];
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
      : 'atualiza a quantidade';
  return `<span class="imp-unir">Unir com o card existente</span><br><span class="imp-aviso">${detalhe} → ${a.final.qtd} no total</span>${rep}`;
}

function lerPlanilha() {
  const { alunos, ignoradas } = interpretarPlanilha($('#impTexto').value);
  previaImportacao = alunos;
  if (!alunos.length) {
    $('#impPrevia').innerHTML = '<p class="acesso-erro">Não encontrei nenhuma linha no formato esperado (vencimento, valor em R$, nome do aluno e filial).</p>';
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
      Novos entram em "Entrar em contato", sem WhatsApp; os existentes mantêm etapa, WhatsApp e anotações.</p>
    <div class="imp-tabela-caixa">
      <table class="imp-tabela">
        <thead><tr><th></th><th>Aluno</th><th>Situação</th><th>Mens.</th><th>Total</th><th>Vencimentos</th><th>Polo</th><th>Curso</th></tr></thead>
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
          telefone: '',
          qtd: a.final.qtd,
          polo: a.polo,
          tipo: a.tipo,
          etapa: 'contatar',
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
  $('#msgEtapa').innerHTML = ETAPAS.map((e) => `<option value="${e.id}" ${e.id === aluno.etapa ? 'selected' : ''}>${esc(e.nome)}</option>`).join('');
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
    case 'avancar':
    case 'voltar': {
      if (!aluno) return;
      const destino = ETAPAS[indiceEtapa(aluno.etapa) + (el.dataset.acao === 'avancar' ? 1 : -1)];
      return destino && moverPara(aluno.id, destino.id);
    }
    case 'msg-copiar':
      return copiar($('#msgTexto').value, 'Mensagem copiada!');
    case 'fechar-dialogo':
      return el.closest('dialog').close();
  }
});

$('#formAluno').addEventListener('submit', salvarAluno);
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
