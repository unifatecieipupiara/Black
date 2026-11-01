// =====================================================================
//  DADOS DA CAMPANHA
//  Edite aqui: nome do polo, links de matrícula, cupons, cursos, valores
//  e as mensagens prontas. Não é preciso mexer em nenhum outro arquivo.
// =====================================================================

export const POLO = {
  nome: 'UniFatecie – Polo Ipupiara',
  campanha: 'Black Friday',
  periodo: '01 a 30 de novembro',
};

// Deixe "true" enquanto os cursos/valores abaixo forem apenas exemplos.
// Mostra um aviso no topo da página para ninguém enviar valores errados.
export const DADOS_DE_EXEMPLO = true;

// ---------------------------------------------------------------------
//  TIPOS DE INGRESSO
//  Cada tipo vira um card no topo da página (link + cupom) e tem a sua
//  própria mensagem pronta.
//
//  Marcadores que podem ser usados na mensagem:
//    {nome}      primeiro nome do lead (some sozinho se não houver nome)
//    {curso}     nome do curso
//    {grau}      bacharelado, licenciatura, tecnólogo…
//    {duracao}   duração do curso
//    {oferta}    "de ~R$ X~ por *R$ Y*" (ou só o valor, se não houver "valorDe")
//    {valor}     valor promocional
//    {valorDe}   valor original
//    {detalhes}  lista de detalhes do curso, um por linha
//    {link}      link de matrícula do tipo de ingresso
//    {cupom}     cupom do tipo de ingresso
//    {polo}      nome do polo
//    {campanha}  nome da campanha
//  Linhas cujos marcadores ficarem vazios são removidas automaticamente.
// ---------------------------------------------------------------------

export const TIPOS = [
  {
    id: 'graduacao',
    nome: 'Graduação',
    link: '', // EXEMPLO: cole aqui o link de matrícula
    cupom: 'CUPOM-GRAD', // EXEMPLO
    obs: 'Use o cupom no momento da matrícula.',
    mensagem: `Olá, {nome}! Tudo bem? 😊

Aqui é da *{polo}*. Estamos na *{campanha}* e tenho uma condição especial para você:

🎓 *{curso}*
📘 {grau} · EAD
⏱️ Duração: {duracao}
💰 {oferta}
{detalhes}

👉 Garanta sua vaga pelo link de matrícula:
{link}

🎟️ Na hora da matrícula, use o cupom: *{cupom}*

Qualquer dúvida, é só me chamar por aqui!`,
  },
  {
    id: 'segunda',
    nome: '2ª Graduação',
    link: '', // EXEMPLO
    cupom: 'CUPOM-2GRAD', // EXEMPLO
    obs: 'Para quem já tem diploma de graduação.',
    mensagem: `Olá, {nome}! Tudo bem? 😊

Aqui é da *{polo}*. Já tem um diploma de graduação? Na *{campanha}* a sua *segunda graduação* está com condição especial:

🎓 *{curso}*
📘 {grau} · EAD
⏱️ Duração: {duracao}
💰 {oferta}
{detalhes}

👉 Garanta sua vaga pelo link de matrícula:
{link}

🎟️ Na hora da matrícula, use o cupom: *{cupom}*

Qualquer dúvida, é só me chamar por aqui!`,
  },
  {
    id: 'pos',
    nome: 'Pós-Graduação',
    link: '', // EXEMPLO
    cupom: 'CUPOM-POS', // EXEMPLO
    obs: 'Use o cupom no momento da matrícula.',
    mensagem: `Olá, {nome}! Tudo bem? 😊

Aqui é da *{polo}*. Na *{campanha}* a sua pós-graduação está com condição especial:

🎓 *{curso}*
⏱️ Duração: {duracao}
💰 {oferta}
{detalhes}

👉 Faça sua matrícula pelo link:
{link}

🎟️ Na hora da matrícula, use o cupom: *{cupom}*

Qualquer dúvida, é só me chamar por aqui!`,
  },
  {
    id: 'transferencia',
    nome: 'Transferência',
    link: '', // EXEMPLO
    cupom: 'CUPOM-TRANSF', // EXEMPLO
    obs: 'Para quem vem de outra instituição.',
    mensagem: `Olá, {nome}! Tudo bem? 😊

Aqui é da *{polo}*. Quer transferir seu curso para a UniFatecie? Na *{campanha}* a transferência está com condição especial:

🎓 *{curso}*
💰 {oferta}
{detalhes}

👉 Faça sua transferência pelo link:
{link}

🎟️ Na hora da matrícula, use o cupom: *{cupom}*

Qualquer dúvida, é só me chamar por aqui!`,
  },
];

// ---------------------------------------------------------------------
//  CURSOS
//  tipo:     graduacao | segunda | pos | transferencia
//  valorDe:  opcional (aparece riscado)
//  detalhes: opcional, uma frase por item
//  mensagem: opcional — use só se este curso precisar de um texto diferente
// ---------------------------------------------------------------------

export const CURSOS = [
  // ===== EXEMPLOS — substituir pelos cursos reais =====
  {
    tipo: 'graduacao',
    nome: 'Administração',
    grau: 'Bacharelado',
    duracao: '4 anos',
    valorDe: 'R$ XXX,XX',
    valor: 'R$ XX,XX/mês',
    detalhes: ['Matrícula com desconto', 'Aulas 100% online'],
  },
  {
    tipo: 'graduacao',
    nome: 'Pedagogia',
    grau: 'Licenciatura',
    duracao: '4 anos',
    valorDe: 'R$ XXX,XX',
    valor: 'R$ XX,XX/mês',
    detalhes: ['Matrícula com desconto'],
  },
  {
    tipo: 'graduacao',
    nome: 'Gestão de Recursos Humanos',
    grau: 'Tecnólogo',
    duracao: '2 anos',
    valorDe: 'R$ XXX,XX',
    valor: 'R$ XX,XX/mês',
  },
  {
    tipo: 'segunda',
    nome: 'Pedagogia',
    grau: 'Licenciatura',
    duracao: '2 anos',
    valorDe: 'R$ XXX,XX',
    valor: 'R$ XX,XX/mês',
  },
  {
    tipo: 'pos',
    nome: 'MBA em Gestão de Pessoas',
    duracao: '12 meses',
    valorDe: 'R$ XXX,XX',
    valor: '18x de R$ XX,XX',
    detalhes: ['Aulas 100% online'],
  },
  {
    tipo: 'pos',
    nome: 'Neuropsicopedagogia',
    duracao: '12 meses',
    valor: '18x de R$ XX,XX',
  },
];
