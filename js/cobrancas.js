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
  },
};

// Mensagens para situações fora do funil. "tipos": em quais tipos de curso aparecem.
const MENSAGENS_EXTRAS = [
  {
    // Aluno que só fez a matrícula e sumiu: não estuda e não paga.
    // Quem não acessa o curso tem os boletos estornados ao cancelar.
    id: 'sem-acesso',
    nome: 'Matriculou e não acessou',
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
      Novos entram em "Entrar em contato", com o WhatsApp da planilha; os existentes mantêm etapa, WhatsApp e anotações (quem estiver sem WhatsApp recebe o da planilha).</p>
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
