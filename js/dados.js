// =====================================================================
//  DADOS DA CAMPANHA
//  Edite aqui: nome do polo, links de matrícula, cupons (uso interno),
//  desconto da Black Friday, cursos, valores e as mensagens prontas.
//  Não é preciso mexer em nenhum outro arquivo.
// =====================================================================

export const POLO = {
  nome: 'UniFatecie – Polo Ipupiara',
  campanha: 'Black Friday',
  periodo: '01 a 30 de novembro',
};

// ---------------------------------------------------------------------
//  DESCONTO DA BLACK FRIDAY (em %), por tipo de curso.
//  null = ainda não definido: o sistema mostra só o valor normal.
//  Ex.: graduacao: 20  →  "de R$ 99,00 por R$ 79,20"
//  Para um valor específico de um curso, preencha a última coluna
//  ("valor Black") na tabela de cursos lá embaixo.
// ---------------------------------------------------------------------

export const DESCONTO_BLACK = {
  graduacao: null,
  segunda: null,
  pos: null,
};

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
//    {oferta}    "de ~R$ X~ por *R$ Y*" (ou só o valor, se não houver desconto)
//    {valor}     valor com desconto (ou o normal, se não houver desconto)
//    {valorDe}   valor normal, quando há desconto
//    {detalhes}  TCC, estágio, provas no polo e aulas no MegaPolo
//    {polo}      nome do polo
//    {campanha}  nome da campanha
//  Linhas cujos marcadores ficarem vazios são removidas automaticamente.
// ---------------------------------------------------------------------

export const TIPOS = [
  {
    id: 'graduacao',
    nome: 'Graduação',
    link: '', // falta o link de matrícula da Graduação
    cupom: '',
    obs: 'Use o cupom no momento da matrícula.',
    mensagem: `Olá, {nome}! Tudo bem? 😊

Aqui é da *{polo}*. Estamos na *{campanha}* e tenho uma condição especial para você:

🎓 *{curso}*
📘 {grau} · EAD
⏱️ Duração: {duracao}
💰 Mensalidade: {oferta}
{detalhes}

Quer garantir essa condição? É só me responder por aqui que eu te ajudo com a matrícula! 😉`,
  },
  {
    id: 'segunda',
    nome: '2ª Graduação',
    link: 'https://segundagraduacao.fatecie.edu.br/inscription?origem=polo&polo=BwOyo2BF1ALSH3PNae9bLQ==',
    cupom: '',
    obs: 'Para quem já tem diploma de graduação.',
    mensagem: `Olá, {nome}! Tudo bem? 😊

Aqui é da *{polo}*. Já tem um diploma de graduação? Na *{campanha}* a sua *segunda graduação* está com condição especial:

🎓 *{curso}*
📘 {grau} · EAD
⏱️ Duração: {duracao}
💰 Mensalidade: {oferta}
{detalhes}

Quer garantir essa condição? É só me responder por aqui que eu te ajudo com a matrícula! 😉`,
  },
  {
    id: 'pos',
    nome: 'Pós-Graduação',
    link: 'https://matriculapos.fatecie.edu.br/inscription?origem=polo',
    cupom: '',
    obs: 'Use o cupom no momento da matrícula.',
    mensagem: `Olá, {nome}! Tudo bem? 😊

Aqui é da *{polo}*. Na *{campanha}* a sua pós-graduação está com condição especial:

🎓 *{curso}*
⏱️ Duração: {duracao}
💰 Mensalidade: {oferta}
{detalhes}

Quer garantir essa condição? É só me responder por aqui que eu te ajudo com a matrícula! 😉`,
  },
  {
    id: 'transferencia',
    nome: 'Transferência',
    link: 'https://matriculasunifatecie.com.br/matricula-transferencia-externa-polos/',
    cupom: '',
    obs: 'Para quem vem de outra instituição.',
    mensagem: `Olá, {nome}! Tudo bem? 😊

Aqui é da *{polo}*. Quer transferir seu curso para a UniFatecie? Na *{campanha}* a transferência está com condição especial:

🎓 *{curso}*
📘 {grau} · EAD
💰 Mensalidade: {oferta}
{detalhes}

Quer garantir essa condição? É só me responder por aqui que eu te ajudo com a matrícula! 😉`,
  },
];

// ---------------------------------------------------------------------
//  CURSOS  (importados do Notion — valores normais, sem desconto)
//
//  Colunas:
//   curso, modalidade, duração, mensalidade normal (R$),
//   estágio, TCC, prova no polo, aula no MegaPolo, [valor Black (opcional)]
//  S = sim, N = não
// ---------------------------------------------------------------------

const S = true;
const N = false;

const GRADUACAO = [
  ['Administração', 'Bacharelado', '3 anos', 99.0, N, N, N, N],
  ['Agente Comunitário', 'Tecnólogo', '2 anos e meio', 149.7, N, N, N, N],
  ['Análise e Desenvolvimento de Sistemas', 'Tecnólogo', '2 anos', 99.0, N, N, N, N],
  ['Arquitetura e Urbanismo', 'Bacharelado', '5 anos', 239.7, S, S, N, S],
  ['Artes', 'Licenciatura', '4 anos', 99.0, S, S, S, N],
  ['Artes Visuais', 'Bacharelado', '3 anos', 99.0, N, S, N, N],
  ['Biblioteconomia', 'Bacharelado', '3 anos', 99.0, S, S, N, N],
  ['Biomedicina', 'Bacharelado', '4 anos', 277.7, S, S, N, S],
  ['Ciência do Futuro', 'Tecnólogo', '1 ano e meio', 99.0, N, N, N, N],
  ['Ciências Biológicas', 'Bacharelado', '4 anos', 99.0, S, S, N, N],
  ['Ciências Biológicas', 'Licenciatura', '4 anos', 99.0, S, S, S, N],
  ['Ciências Contábeis', 'Bacharelado', '3 anos', 99.0, N, N, N, N],
  ['Ciências Econômicas', 'Bacharelado', '3 anos', 89.7, N, S, N, N],
  ['Comércio Exterior', 'Tecnólogo', '1 ano e meio', 99.0, N, N, N, N],
  ['Design de Interiores', 'Tecnólogo', '1 ano e meio', 99.0, N, N, N, N],
  ['Design de Moda', 'Tecnólogo', '1 ano e meio', 99.0, N, N, N, N],
  ['Design de Produto', 'Tecnólogo', '1 ano e meio', 67.5, N, N, N, N],
  ['Design Gráfico', 'Tecnólogo', '1 ano e meio', 99.0, N, N, N, N],
  ['Educação Especial', 'Licenciatura', '4 anos', 99.0, S, S, S, N],
  ['Educação Física', 'Bacharelado', '4 anos', 99.0, S, S, N, S],
  ['Educação Física', 'Licenciatura', '4 anos', 99.0, S, S, S, N],
  ['Engenharia Agronômica', 'Bacharelado', '5 anos', 239.7, S, S, N, S],
  ['Engenharia Ambiental e Sanitária', 'Bacharelado', '5 anos', 149.7, S, S, N, S],
  ['Engenharia Civil', 'Bacharelado', '5 anos', 239.7, S, S, N, S],
  ['Engenharia da Computação', 'Bacharelado', '4 anos', 239.7, N, N, N, N],
  ['Engenharia de Produção', 'Bacharelado', '5 anos', 149.7, S, S, N, S],
  ['Engenharia de Software', 'Bacharelado', '4 anos', 149.7, N, N, N, N],
  ['Engenharia Elétrica', 'Bacharelado', '5 anos', 239.7, S, S, N, S],
  ['Engenharia Mecânica', 'Bacharelado', '5 anos', 239.7, S, S, N, S],
  ['Estética e Cosmética', 'Tecnólogo', '2 anos e meio', 149.7, N, N, N, N],
  ['Estudos Teóricos Psicanalíticos', 'Bacharelado', '4 anos', 239.7, S, S, N, N],
  ['Farmácia', 'Bacharelado', '4 anos', 277.7, S, S, N, S],
  ['Filosofia', 'Licenciatura', '4 anos', 99.0, S, S, S, N],
  ['Fisioterapia', 'Bacharelado', '4 anos', 277.7, S, S, N, S],
  ['Fonoaudiologia', 'Bacharelado', '4 anos', 299.0, S, S, N, S],
  ['Gastronomia', 'Tecnólogo', '1 ano e meio', 99.0, N, N, N, N],
  ['Geografia', 'Licenciatura', '4 anos', 99.0, S, S, S, N],
  ['Gestão Ambiental', 'Tecnólogo', '2 anos', 99.0, N, N, N, N],
  ['Gestão Comercial', 'Tecnólogo', '1 ano e meio', 99.0, N, N, N, N],
  ['Gestão da Qualidade', 'Tecnólogo', '1 ano e meio', 99.0, N, N, N, N],
  ['Gestão de Produção Industrial', 'Tecnólogo', '2 anos e meio', 99.0, N, N, N, N],
  ['Gestão de Recursos Humanos', 'Tecnólogo', '1 ano e meio', 99.0, N, N, N, N],
  ['Gestão de Segurança Privada', 'Tecnólogo', '1 ano e meio', 99.0, N, N, N, N],
  ['Gestão do Agronegócio', 'Tecnólogo', '2 anos e meio', 99.0, N, N, N, N],
  ['Gestão Financeira', 'Tecnólogo', '1 ano e meio', 99.0, N, N, N, N],
  ['Gestão Hospitalar', 'Tecnólogo', '3 anos', 99.0, N, N, N, N],
  ['Gestão Pública', 'Tecnólogo', '1 ano e meio', 99.0, N, N, N, N],
  ['História', 'Licenciatura', '4 anos', 99.0, S, S, S, N],
  ['Hotelaria', 'Tecnólogo', '1 ano e meio', 99.0, N, N, N, N],
  ['IA e Machine Learning', 'Tecnólogo', '2 anos', 99.0, N, N, N, N],
  ['Investigação Forense e Perícia', 'Tecnólogo', '3 anos', 99.0, N, N, N, N], // ** no Notion
  ['Jogos Digitais', 'Tecnólogo', '2 anos', 67.5, N, N, N, N],
  ['Jornalismo', 'Bacharelado', '4 anos', 99.0, S, S, N, N],
  ['Letras – Português/Inglês', 'Licenciatura', '4 anos', 99.0, S, S, S, N],
  ['Letras – Português/Libras', 'Licenciatura', '4 anos', 99.0, S, S, S, N],
  ['Logística', 'Tecnólogo', '1 ano e meio', 99.0, N, N, N, N],
  ['Marketing', 'Tecnólogo', '1 ano e meio', 99.0, N, N, N, N],
  ['Matemática', 'Licenciatura', '4 anos', 99.0, S, S, S, N],
  ['Música', 'Licenciatura', '4 anos', 99.0, S, S, S, N],
  ['Negócios Imobiliários', 'Tecnólogo', '1 ano e meio', 99.0, N, N, N, N],
  ['Nutrição', 'Bacharelado', '4 anos', 277.7, S, S, N, S],
  ['Pedagogia', 'Licenciatura', '4 anos', 99.0, S, S, S, N],
  ['Podologia', 'Tecnólogo', '2 anos e meio', 277.7, N, N, N, N],
  ['Processos Escolares', 'Tecnólogo', '2 anos', 89.7, N, N, S, N],
  ['Processos Gerenciais', 'Tecnólogo', '1 ano e meio', 99.0, N, N, N, N],
  ['Processos Químicos', 'Tecnólogo', '3 anos', 99.0, N, N, N, N],
  ['Produção Publicitária', 'Tecnólogo', '1 ano e meio', 67.5, N, N, N, N],
  ['Psicopedagogia', 'Bacharelado', '4 anos', 99.0, S, S, S, N],
  ['Publicidade e Propaganda', 'Bacharelado', '4 anos', 99.0, N, S, N, N],
  ['Química', 'Bacharelado', '3 anos e meio', 99.0, S, S, N, N],
  ['Radiologia', 'Tecnólogo', '3 anos', 299.0, S, N, N, S],
  ['Secretariado', 'Tecnólogo', '1 ano e meio', 99.0, N, N, N, N],
  ['Segurança da Informação', 'Tecnólogo', '2 anos', 99.0, N, N, N, N],
  ['Segurança do Trabalho', 'Tecnólogo', '2 anos e meio', 99.0, N, N, N, N],
  ['Segurança no Trânsito', 'Tecnólogo', '1 ano e meio', 67.5, N, N, N, N], // ** no Notion
  ['Segurança Pública', 'Tecnólogo', '1 ano e meio', 99.0, N, N, N, N], // ** no Notion
  ['Serviço Social', 'Bacharelado', '4 anos', 99.0, S, S, N, N],
  ['Sistemas de Informação', 'Bacharelado', '4 anos', 99.0, N, N, N, N],
  ['Sistemas para Internet', 'Tecnólogo', '2 anos', 99.0, N, N, N, N],
  ['Sociologia', 'Licenciatura', '4 anos', 99.0, S, S, S, N],
  ['Teologia', 'Bacharelado', '3 anos', 89.7, S, S, N, N],
  ['Terapia Ocupacional', 'Bacharelado', '4 anos', 299.0, S, S, N, S],
  ['Terapias Integrativas e Complementares', 'Tecnólogo', '2 anos e meio', 149.7, N, N, N, N],
];

const SEGUNDA_GRADUACAO = [
  ['Administração', '2º Bacharelado', '1 ano', 99.0, N, N, N, N],
  ['Artes', '2ª Licenciatura', '1 ano', 99.0, S, N, N, N],
  ['Ciências Biológicas', '2ª Licenciatura', '1 ano', 99.0, S, N, N, N],
  ['Ciências Contábeis', '2º Bacharelado', '1 ano', 99.0, N, N, N, N],
  ['Ciências Econômicas', '2º Bacharelado', '1 ano', 74.75, N, S, N, N],
  ['Educação Especial', '2ª Licenciatura', '1 ano', 99.0, S, N, S, N],
  ['Educação Física', 'Bacharel para Licenciados', '2 anos', 99.0, S, S, N, N],
  ['Educação Física', 'Licenciatura para Bacharel', '2 anos', 99.0, S, S, N, N],
  ['Engenharia de Produção', '2º Bacharelado', '1 ano', 124.75, S, S, N, S], // ** no Notion
  ['Filosofia', '2ª Licenciatura', '1 ano', 99.0, S, N, N, N],
  ['Geografia', '2ª Licenciatura', '1 ano', 99.0, S, N, N, N],
  ['História', '2ª Licenciatura', '1 ano', 99.0, S, N, N, N],
  ['Letras – Português/Inglês', '2ª Licenciatura', '1 ano', 99.0, S, N, N, N],
  ['Letras – Português/Libras', '2ª Licenciatura', '1 ano', 99.0, S, N, N, N],
  ['Matemática', '2ª Licenciatura', '1 ano', 99.0, S, N, N, N],
  ['Pedagogia', '2ª Licenciatura', '1 ano', 99.0, S, N, N, N], // ** no Notion
  ['Sociologia', '2ª Licenciatura', '1 ano', 99.0, S, N, N, N], // ** no Notion
];

// Pós-Graduação: ainda não cadastrada.
const POS_GRADUACAO = [];

function montarCurso(tipo, [nome, grau, duracao, valorNormal, estagio, tcc, provaPolo, megaPolo, valorBlack]) {
  return { tipo, nome, grau, duracao, valorNormal, estagio, tcc, provaPolo, megaPolo, valorBlack };
}

export const CURSOS = [
  ...GRADUACAO.map((linha) => montarCurso('graduacao', linha)),
  ...SEGUNDA_GRADUACAO.map((linha) => montarCurso('segunda', linha)),
  ...POS_GRADUACAO.map((linha) => montarCurso('pos', linha)),
];
