// =====================================================================
//  DADOS DA CAMPANHA
//  Edite aqui: nome do polo, links de matrícula, cupons (uso interno),
//  cursos, valores e as mensagens prontas. Não é preciso mexer em nenhum outro arquivo.
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
//  Cada tipo vira um card no topo da página e tem a sua própria mensagem.
//  "link" e "cupom" são de USO INTERNO: aparecem só no card do topo e
//  nunca entram na mensagem enviada ao lead.
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

Quer garantir essa condição? É só me responder por aqui que eu te ajudo com a matrícula! 😉`,
  },
  {
    id: 'segunda',
    nome: '2ª Graduação',
    link: 'https://segundagraduacao.fatecie.edu.br/inscription?origem=polo&polo=BwOyo2BF1ALSH3PNae9bLQ==',
    cupom: 'CUPOM-2GRAD', // EXEMPLO
    obs: 'Para quem já tem diploma de graduação.',
    mensagem: `Olá, {nome}! Tudo bem? 😊

Aqui é da *{polo}*. Já tem um diploma de graduação? Na *{campanha}* a sua *segunda graduação* está com condição especial:

🎓 *{curso}*
📘 {grau} · EAD
⏱️ Duração: {duracao}
💰 {oferta}
{detalhes}

Quer garantir essa condição? É só me responder por aqui que eu te ajudo com a matrícula! 😉`,
  },
  {
    id: 'pos',
    nome: 'Pós-Graduação',
    link: 'https://matriculapos.fatecie.edu.br/inscription?origem=polo',
    cupom: 'CUPOM-POS', // EXEMPLO
    obs: 'Use o cupom no momento da matrícula.',
    mensagem: `Olá, {nome}! Tudo bem? 😊

Aqui é da *{polo}*. Na *{campanha}* a sua pós-graduação está com condição especial:

🎓 *{curso}*
⏱️ Duração: {duracao}
💰 {oferta}
{detalhes}

Quer garantir essa condição? É só me responder por aqui que eu te ajudo com a matrícula! 😉`,
  },
  {
    id: 'transferencia',
    nome: 'Transferência',
    link: 'https://matriculasunifatecie.com.br/matricula-transferencia-externa-polos/',
    cupom: 'CUPOM-TRANSF', // EXEMPLO
    obs: 'Para quem vem de outra instituição.',
    mensagem: `Olá, {nome}! Tudo bem? 😊

Aqui é da *{polo}*. Quer transferir seu curso para a UniFatecie? Na *{campanha}* a transferência está com condição especial:

🎓 *{curso}*
💰 {oferta}
{detalhes}

Quer garantir essa condição? É só me responder por aqui que eu te ajudo com a matrícula! 😉`,
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
