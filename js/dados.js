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
//  VALORES DA BLACK FRIDAY — Graduação, 2ª Graduação e Transferência
//  O grupo de cada curso é encontrado pela mensalidade normal ("de").
//  "transferencia: false" = o grupo não aceita transferência.
//  Para um valor específico de um curso, preencha a última coluna
//  ("valor Black") na tabela de cursos lá embaixo.
// ---------------------------------------------------------------------

export const GRUPOS_BLACK = [
  { nome: 'Grupo Base', de: 67.5, por: 45.0, transferencia: true },
  { nome: 'Grupo 1', de: 89.7, por: 59.8, transferencia: true },
  { nome: 'Grupo 2', de: 99.0, por: 66.0, transferencia: true },
  { nome: 'Grupo 3', de: 149.7, por: 99.8, transferencia: true },
  { nome: 'Grupo 4', de: 239.7, por: 159.8, transferencia: false },
  { nome: 'Grupo 5', de: 277.7, por: 212.9, transferencia: false },
  { nome: 'Grupo 6', de: 299.0, por: 229.23, transferencia: false },
];

// Tipos de curso em que os grupos acima valem.
export const TIPOS_COM_GRUPOS = ['graduacao', 'segunda'];

// ---------------------------------------------------------------------
//  MENSAGEM PRONTA
//  Marcadores que podem ser usados:
//    {curso}     nome do curso
//    {grau}      bacharelado, licenciatura, tecnólogo…
//    {duracao}   duração do curso
//    {oferta}    "~R$ 99,00~ por *R$ 79,20*" (ou só o valor, sem desconto)
//    {valor}     valor com desconto (ou o normal, se não houver desconto)
//    {valorDe}   valor normal, quando há desconto
//    {matricula} valor da matrícula do tipo de ingresso
//    {primeiraMensalidade} mês da 1ª mensalidade do tipo de ingresso
//    {detalhes}  observações de prova, estágio, TCC e MegaPolo (ver OBSERVACOES)
//    {polo}      nome do polo
//    {campanha}  nome da campanha
//  Linhas cujos marcadores ficarem vazios são removidas automaticamente.
//  Formatação do WhatsApp: *negrito*, _itálico_, ~riscado~.
// ---------------------------------------------------------------------

const MENSAGEM_PADRAO = `Nosso curso foi desenvolvido para unir *flexibilidade e organização*, garantindo que você estude de acordo com a sua rotina sem abrir mão da qualidade reconhecida pelo MEC.

Estamos na *{campanha}* e tenho uma condição especial para você:

🎓 *{curso}*
📘 {grau} · EAD
⏱️ Duração: {duracao}
💰 Mensalidade: {oferta}
✨ Matrícula: {matricula}
🗓️ 1ª Mensalidade: {primeiraMensalidade}

{detalhes}

_Valor já com *desconto de pontualidade* para o pagamento efetuado até a data de vencimento._`;

// Mensagem da Pós-Graduação (parcelado, sem TCC/estágio).
//  Marcadores extras: {cargaHoraria}, {lancamento}, {area}
const MENSAGEM_POS = `Nosso curso foi desenvolvido para unir *flexibilidade e organização*, garantindo que você estude de acordo com a sua rotina sem abrir mão da qualidade reconhecida pelo MEC.

Estamos na *{campanha}* e tenho uma condição especial para você:

🎓 *{curso}*
📘 Pós-Graduação · EAD
⏱️ Duração: {duracao} · {cargaHoraria}
💰 Investimento: {oferta}
✨ Matrícula: {matricula}
🚀 Lançamento: {lancamento}`;

// Textos de cada observação, conforme o curso tenha (sim) ou não cada item.
// Deixe '' para não mostrar a linha.
export const OBSERVACOES = {
  provaPolo: {
    sim: '📝 As provas presenciais são realizadas no Polo mais próximo, a partir do 2º ano do curso, geralmente a cada 3 meses.',
    nao: '📝 Esse curso tem apenas uma prova presencial, geralmente realizada no último ano.',
  },
  estagio: {
    sim: '🎓 Esse curso exige Estágio Obrigatório.',
    nao: '🎓 Esse curso não exige Estágio Obrigatório.',
  },
  tcc: {
    sim: '📖 Esse curso exige TCC.',
    nao: '📖 Esse curso não exige TCC.',
  },
  megaPolo: {
    sim: '📚 Esse curso possui aulas presenciais no MegaPolo a partir do 3° ano de curso, entre 2 e 4 vezes ao ano. Na Bahia temos 5 MegaPolos: Salvador, Feira de Santana, Barreiras, Xique-Xique e Vitória da Conquista.',
    nao: '',
  },
};

// ---------------------------------------------------------------------
//  TIPOS DE INGRESSO
//  Cada tipo vira um card no topo da página.
//  "link" e "cupom" são de USO INTERNO: aparecem só no card do topo e
//  nunca entram na mensagem enviada ao lead.
//  "matricula" é o valor da matrícula que vai na mensagem.
//  "extras" são outros links que aparecem no card, ao lado de "Acessar link".
//  "cupons": um ou mais vouchers, cada um com o código e quando usar.
// ---------------------------------------------------------------------

export const TIPOS = [
  {
    id: 'graduacao',
    nome: 'Graduação',
    link: 'https://matriculasunifatecie.com.br/',
    cupons: [{ codigo: 'TAXA1', descricao: 'Valor R$ 1,00' }],
    matricula: 'R$ 1,00', // com o voucher TAXA1
    primeiraMensalidade: 'Dezembro',
    obs: 'Use o voucher no momento da matrícula.',
    mensagem: MENSAGEM_PADRAO,
  },
  {
    id: 'segunda',
    nome: '2ª Graduação',
    link: 'https://segundagraduacao.fatecie.edu.br/inscription?origem=polo&polo=BwOyo2BF1ALSH3PNae9bLQ==',
    cupons: [{ codigo: 'TAXA1', descricao: 'Matrícula grátis' }],
    matricula: 'Grátis', // com o voucher TAXA1
    primeiraMensalidade: 'Dezembro',
    obs: 'Para quem já tem diploma de graduação.',
    mensagem: MENSAGEM_PADRAO,
  },
  {
    id: 'pos',
    nome: 'Pós-Graduação',
    link: 'https://matriculapos.fatecie.edu.br/inscription?origem=polo',
    extras: [{ rotulo: 'Catálogo e valores', url: 'https://repositorio-dec-unifatecie.dociletulip6.chatgpt.site/#catalogo' }],
    cupons: [
      { codigo: '29TAXA1', descricao: 'Matrícula grátis · todos os cursos · novas matrículas' },
      {
        codigo: 'POS40POLO',
        descricao:
          'Matrícula grátis + 40% de desconto nas mensalidades · novas matrículas de alunos de 2ª Graduação que desejam iniciar uma Pós-Graduação',
      },
    ],
    matricula: 'Grátis', // com o voucher 29TAXA1 ou POS40POLO
    obs: 'Use o voucher no momento da matrícula.',
    mensagem: MENSAGEM_POS,
  },
  {
    id: 'transferencia',
    nome: 'Transferência',
    link: 'https://matriculasunifatecie.com.br/matricula-transferencia-externa-polos/',
    cupons: [{ codigo: 'TAXA1', descricao: 'Valor R$ 1,00' }],
    matricula: 'R$ 1,00', // com o voucher TAXA1
    primeiraMensalidade: 'Dezembro',
    obs: 'Só para cursos dos grupos Base, 1, 2 e 3.',
    mensagem: MENSAGEM_PADRAO,
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
  ['Educação Especial', '2ª Licenciatura', '1 ano', 99.0, S, N, S, N],
  ['Educação Física', 'Bacharel para Licenciados', '2 anos', 99.0, S, S, N, N],
  ['Educação Física', 'Licenciatura para Bacharel', '2 anos', 99.0, S, S, N, N],
  ['Filosofia', '2ª Licenciatura', '1 ano', 99.0, S, N, N, N],
  ['Geografia', '2ª Licenciatura', '1 ano', 99.0, S, N, N, N],
  ['História', '2ª Licenciatura', '1 ano', 99.0, S, N, N, N],
  ['Letras – Português/Inglês', '2ª Licenciatura', '1 ano', 99.0, S, N, N, N],
  ['Letras – Português/Libras', '2ª Licenciatura', '1 ano', 99.0, S, N, N, N],
  ['Matemática', '2ª Licenciatura', '1 ano', 99.0, S, N, N, N],
  ['Pedagogia', '2ª Licenciatura', '1 ano', 99.0, S, N, N, N], // ** no Notion
  ['Sociologia', '2ª Licenciatura', '1 ano', 99.0, S, N, N, N], // ** no Notion
];

// ---------------------------------------------------------------------
//  PÓS-GRADUAÇÃO  (catálogo Black Friday · novembro/2026)
//  Colunas: área, curso, duração (meses), carga horária (h), [opções]
//  Opções: lançamento, em breve, destaque, parcela (padrão: 12× R$ 29,90)
//  Áreas: E = Educação, G = Gestão e Negócios, S = Saúde e Bem-Estar,
//         A = Engenharia e Arquitetura, I = Inovação e Inteligência Artificial,
//         D = Direito
// ---------------------------------------------------------------------

export const POS_CONDICAO = { parcelas: 12, valorParcela: 29.9 };

const AREAS = {
  E: 'Educação',
  G: 'Gestão e Negócios',
  S: 'Saúde e Bem-Estar',
  A: 'Engenharia e Arquitetura',
  I: 'Inovação e Inteligência Artificial',
  D: 'Direito',
};

const NOV = { lancamento: 'nov./2026' };
const DEZ = { lancamento: 'dez./2026', emBreve: true };
const JAN = { lancamento: 'jan./2027', emBreve: true };
const DESTAQUE = { destaque: true };

const POS_GRADUACAO = [
  // ----- Lançamentos nov./2026
  ['A', 'Especialização em Agricultura de Precisão e Tecnologias no Agronegócio', 3, 360, NOV],
  ['I', 'Especialização em Arquitetura de Software e Desenvolvimento SaaS com IA', 3, 360, NOV],
  ['S', 'Especialização em Desenvolvimento Infantil e Transtornos do Neurodesenvolvimento', 3, 360, NOV],
  ['I', 'Especialização em Engenharia de Agentes de IA e Sistemas Inteligentes', 3, 360, NOV],
  ['G', 'Especialização em Engenharia de Vendas Digitais: CRM, Automação e Inteligência Comercial', 3, 360, NOV],
  ['A', 'Especialização em Fitossanidade e Manejo Integrado de Culturas', 3, 360, NOV],
  ['G', 'Especialização em Gestão da Produção Agropecuária e Cadeias de Suprimentos', 3, 360, NOV],
  ['G', 'Especialização em Gestão de Custos, Finanças e Comercialização no Agronegócio', 3, 360, NOV],
  ['I', 'Especialização em Gestão de Produtos Digitais e Product Management', 3, 360, NOV],
  ['A', 'Especialização em Lean Construction, Produtividade e Gestão de Obras', 3, 360, NOV],
  ['E', 'Especialização em Libras, Surdez e Educação Bilíngue', 3, 360, NOV],
  ['G', 'Especialização em Marketing de Performance, Gestão de Tráfego e Conversão', 3, 360, NOV],
  ['S', 'Especialização em Nutrição Materno-Infantil', 3, 360, NOV],
  ['S', 'Especialização em Nutrição no Envelhecimento e Longevidade', 3, 360, NOV],
  ['A', 'Especialização em Orçamento, Custos e Planejamento de Obras', 3, 360, NOV],
  ['I', 'Especialização em UX/UI Design e Pesquisa de Experiência do Usuário', 3, 360, NOV],
  ['I', 'Especialização em Cibersegurança e Defesa Digital', 3, 360, NOV],
  ['A', 'Especialização em Gestão, Fiscalização e Contratos de Obras Públicas', 3, 360, NOV],
  // ----- Lançamentos dez./2026 (em breve)
  ['E', 'Especialização em ABA Aplicada ao Contexto Escolar', 3, 360, DEZ],
  ['E', 'Especialização em Altas Habilidades, Superdotação e Dupla Excepcionalidade', 3, 360, DEZ],
  ['A', 'Especialização em BIM e Gestão da Informação da Construção', 3, 360, DEZ],
  ['D', 'Especialização em Ciências Forenses e Perícia Jurídica', 3, 360, DEZ],
  ['D', 'Especialização em Direito Digital, Inteligência Artificial e Proteção de Dados', 3, 360, DEZ],
  ['D', 'Especialização em Direito Imobiliário e Condominial', 3, 360, DEZ],
  ['E', 'Especialização em Educação Especial e Deficiência Intelectual e Múltipla', 3, 360, DEZ],
  ['E', 'Especialização em Educação para as Relações Étnico-Raciais e Diversidade', 3, 360, DEZ],
  ['S', 'Especialização em Neurodesenvolvimento, Autismo e Intervenção Multiprofissional', 3, 360, DEZ],
  ['E', 'Especialização em Neurodiversidade e Práticas Pedagógicas Inclusivas', 3, 360, DEZ],
  ['E', 'Especialização em Orientação Educacional e Mediação Escolar', 3, 360, DEZ],
  ['S', 'Especialização em Psicologia do Esporte e Performance', 3, 360, DEZ],
  ['S', 'Especialização em Saúde Mental, Trabalho e Bem-Estar Organizacional', 3, 360, DEZ],
  ['S', 'Especialização em Terapia Ocupacional Aplicada ao Transtorno do Espectro Autista', 3, 360, DEZ],
  // ----- Lançamentos jan./2027 (em breve)
  ['S', 'Especialização em Análise do Comportamento Aplicada — ABA', 3, 360, JAN],
  ['G', 'Especialização em Auditoria, Controles Internos e Prevenção de Fraudes', 3, 360, JAN],
  ['S', 'Especialização em Autismo e Intervenção Comportamental', 3, 360, JAN],
  ['G', 'Especialização em Compliance, Governança Corporativa e Gestão de Riscos', 3, 360, JAN],
  ['G', 'Especialização em Compliance, Integridade e Proteção de Dados', 3, 360, JAN],
  ['D', 'Especialização em Compras Públicas e Planejamento das Contratações', 3, 360, JAN],
  ['S', 'Especialização em Fonoaudiologia Hospitalar e Disfagia', 3, 360, JAN],
  ['S', 'Especialização em Fonoaudiologia Neurofuncional', 3, 360, JAN],
  ['E', 'Especialização em Gestão de Polos e Operações da Educação a Distância', 3, 360, JAN],
  ['D', 'Especialização em Gestão e Fiscalização de Contratos Públicos', 3, 360, JAN],
  ['D', 'Especialização em Licitações e Contratos Administrativos', 3, 360, JAN],
  ['E', 'MBA em Regulação, Avaliação e Gestão Estratégica do Ensino Superior', 3, 360, JAN],
  ['S', 'Especialização em Psicologia Existencial e Desenvolvimento Humano', 3, 360, JAN],
  ['E', 'Especialização em Supervisão Escolar e Coordenação Pedagógica', 3, 360, JAN],
  ['S', 'Especialização em Audiologia Clínica e Reabilitação Auditiva', 3, 360, JAN],
  ['S', 'Especialização em Fonoaudiologia da Linguagem e Desenvolvimento Infantil', 3, 360, JAN],
  ['E', 'Especialização em Inspeção Escolar, Legislação e Regularização Educacional', 3, 360, JAN],
  ['S', 'Especialização em Motricidade Orofacial e Distúrbios da Fala', 3, 360, JAN],
  // ----- Catálogo
  ['S', 'Especialização em Administração Hospitalar e Serviços de Saúde', 5, 360],
  ['G', 'Especialização em Agricultura e Manejo Sustentável', 5, 360],
  ['E', 'Especialização em Alfabetização e Letramento', 4, 360],
  ['E', 'Especialização em Aprendizagem Contínua: Metodologia do Ensino de História para Professores', 3, 360],
  ['E', 'Especialização em Aprendizagem Organizacional', 4, 360],
  ['A', 'Especialização em Arquitetura e Urbanismo', 6, 400],
  ['E', 'Especialização em Artes e Ludicidade', 4, 360],
  ['E', 'Especialização em Atendimento Educacional Especializado – AEE', 3, 360, DESTAQUE],
  ['S', 'Especialização em Auditoria em Saúde', 5, 360],
  ['G', 'Especialização em Auditoria, Contabilidade e Perícia Contábil', 5, 360],
  ['E', 'Especialização em Biblioteconomia e Gestão de Bibliotecas', 3, 360],
  ['S', 'Especialização em Biociência Avançada: Tecnologias Biológicas', 5, 360],
  ['G', 'Especialização em Comércio Global 360: Marketing Internacional e Negócios Internacionais', 4, 360],
  ['G', 'Especialização em Comunicação e Liderança: Gestão Estratégica', 3, 360],
  ['G', 'Especialização em Comunicação e Mídias Digitais', 5, 360],
  ['A', 'Especialização em Construções Verdes: Sustentabilidade e Responsabilidade Ambiental', 4, 360],
  ['G', 'Especialização em Controladoria e Custos', 5, 360],
  ['G', 'Especialização em Criação e Desenvolvimento de Produtos', 3, 360],
  ['S', 'Especialização em Cuidados Avançados: Pré e Pós-Operatório em Estética Facial e Corporal', 5, 360],
  ['G', 'Especialização em Desenvolvimento Pessoal e Gestão de Carreira', 4, 360],
  ['G', 'Especialização em Design Criativo', 5, 400],
  ['S', 'Especialização em Diagnóstico Avançado: Análises Clínicas e Laboratoriais', 5, 360],
  ['E', 'Especialização em Didática e Metodologia do Ensino Básico e Superior', 4, 360],
  ['D', 'Especialização em Direito Constitucional', 4, 360],
  ['D', 'Especialização em Direito Constitucional e Prática Trabalhista', 5, 400],
  ['D', 'Especialização em Direito do Trabalho e Previdenciário', 5, 360],
  ['D', 'Especialização em Direito Penal', 3, 360],
  ['D', 'Especialização em Direito Tributário e Direito Empresarial', 5, 360],
  ['D', 'Especialização em Direito, Psicologia e Gestão de Conflitos Laborais', 5, 400],
  ['E', 'Especialização em EAD e Novas Tecnologias Educacionais', 4, 360],
  ['E', 'Especialização em Educação 5.0: Metodologias e Tecnologias Inovadoras', 4, 360],
  ['E', 'Especialização em Educação de Jovens e Adultos', 4, 360],
  ['E', 'Especialização em Educação Digital e Inovação Pedagógica', 3, 360],
  ['E', 'Especialização em Educação do Campo', 4, 360],
  ['E', 'Especialização em Educação do Futuro', 5, 360],
  ['E', 'Especialização em Educação Especial (Atendimento às Necessidades Especiais)', 4, 360],
  ['E', 'Especialização em Educação Especial e Inclusiva – Neuropedagogia e Psicomotricidade', 4, 360, DESTAQUE],
  ['E', 'Especialização em Educação Física e Psicomotricidade', 3, 360],
  ['E', 'Especialização em Educação Física Escolar', 3, 360],
  ['E', 'Especialização em Educação Física, Abordagens Pedagógicas', 4, 400],
  ['E', 'Especialização em Educação Infantil', 4, 360],
  ['E', 'Especialização em Educação Infantil e Alfabetização', 4, 380],
  ['G', 'Especialização em Empreendedorismo e Inovação', 3, 360],
  ['S', 'Especialização em Enfermagem do Trabalho', 5, 360],
  ['A', 'Especialização em Engenharia de Segurança do Trabalho', 6, 750, { destaque: true, parcela: 149.9 }],
  ['A', 'Especialização em Engenharia de Software', 4, 380],
  ['A', 'Especialização em Engenharia de Software e Segurança da Informação', 4, 380],
  ['E', 'Especialização em Ensino de Inglês', 4, 380],
  ['E', 'Especialização em Ensino Religioso', 4, 360],
  ['S', 'Especialização em Envelhecimento Saudável: Prevenção, Tratamento e Cuidado', 3, 360],
  ['G', 'Especialização em Estratégias Transformadoras em Políticas Públicas e Gestão Social', 4, 380],
  ['E', 'Especialização em Filosofia: Tradições e Reflexões', 4, 360],
  ['G', 'Especialização em Finanças Integradas, Corporativas e Públicas', 5, 360],
  ['G', 'Especialização em Future Thinking: Pensamento e Estudos do Futuro', 5, 360],
  ['G', 'Especialização em Gastronomia: Nutrição Humana e Educação Alimentar', 4, 360],
  ['A', 'Especialização em Gerenciamento de Obras', 6, 400],
  ['G', 'Especialização em Gestão Comercial e Vendas', 5, 360],
  ['E', 'Especialização em Gestão da Aprendizagem e Inovação Tecnológica na Educação', 4, 380],
  ['G', 'Especialização em Gestão da Tecnologia da Informação', 5, 360],
  ['G', 'Especialização em Gestão de Conflitos e Desenvolvimento Organizacional', 4, 360],
  ['G', 'Especialização em Gestão de Cooperativas de Crédito', 5, 360],
  ['G', 'Especialização em Gestão de Logística e Operações', 5, 360],
  ['G', 'Especialização em Gestão de Pessoas e Desenvolvimento Humano', 5, 480],
  ['G', 'Especialização em Gestão de Unidades de Conservação', 4, 380],
  ['G', 'Especialização em Gestão do Agronegócio', 5, 360],
  ['G', 'Especialização em Gestão e Qualidade em Saúde Pública', 4, 380],
  ['G', 'Especialização em Gestão Empresarial', 5, 360],
  ['E', 'Especialização em Gestão Escolar', 4, 360, DESTAQUE],
  ['G', 'Especialização em Gestão Estratégica de Pessoas', 5, 360],
  ['G', 'Especialização em Gestão Estratégica de Projetos', 5, 400],
  ['G', 'Especialização em Gestão Financeira', 5, 360],
  ['S', 'Especialização em Gestão Hospitalar', 5, 360],
  ['S', 'Especialização em Gestão Integrada: Segurança e Saúde Ocupacional no Ambiente Corporativo', 4, 360],
  ['G', 'Especialização em Gestão Pública', 5, 360],
  ['S', 'Especialização em Iniciação e Treinamento em Lutas', 4, 360],
  ['I', 'Especialização em Inteligência Artificial e Ciência de Dados', 4, 360],
  ['I', 'Especialização em Inteligência Artificial Generativa: Inovação, Automação e Produtividade', 4, 360],
  ['I', 'Especialização em Inteligência Artificial na Educação', 4, 360],
  ['I', 'Especialização em Letramento Digital e Inteligência Artificial na Educação', 4, 360],
  ['G', 'Especialização em Liderança Corporativa', 4, 380],
  ['G', 'Especialização em Liderança de Projetos e Inovação Estratégica', 4, 380],
  ['E', 'Especialização em Língua Portuguesa: Redação Avançada', 3, 360],
  ['E', 'Especialização em Literatura Brasileira e Internacional', 4, 440],
  ['E', 'Especialização em Literatura e Cultura', 3, 360],
  ['E', 'Especialização em Ludopedagogia', 3, 360],
  ['G', 'Especialização em Marketing Digital', 5, 360],
  ['E', 'Especialização em Mediação para o Ensino a Distância: InovaEducação', 3, 360],
  ['E', 'Especialização em Metodologia do Ensino de Biologia e Ciências', 3, 360],
  ['E', 'Especialização em Metodologia do Ensino de Geografia', 3, 360],
  ['E', 'Especialização em Metodologia do Ensino de Matemática', 3, 360],
  ['G', 'Especialização em Negócios Imobiliários', 5, 360],
  ['E', 'Especialização em Neuroaprendizagem', 4, 360],
  ['E', 'Especialização em Neuropsicologia Educacional', 4, 380],
  ['S', 'Especialização em Nutrição Clínica e Dietética', 4, 360],
  ['E', 'Especialização em Pedagogia e Inclusão: Educação Especial', 5, 480],
  ['S', 'Especialização em Personal Trainer', 3, 360],
  ['G', 'Especialização em Planejamento Urbano e Cidades Sustentáveis', 4, 360],
  ['S', 'Especialização em Procedimentos Injetáveis', 5, 460],
  ['S', 'Especialização em Psicologia Clínica e Saúde Mental', 5, 400],
  ['S', 'Especialização em Psicologia Organizacional', 5, 360],
  ['E', 'Especialização em Psicopedagogia e Práticas Educacionais', 4, 380],
  ['E', 'Especialização em Psicopedagogia Institucional e Clínica', 7, 820, DESTAQUE],
  ['A', 'Especialização em Química Ambiental', 5, 360],
  ['D', 'Especialização em Saúde Ocupacional e Direito do Trabalho', 5, 400],
  ['S', 'Especialização em Saúde Ocupacional: Ginástica Laboral, Ergonomia e Performance no Ambiente de Trabalho', 4, 360],
  ['S', 'Especialização em Saúde Pública', 5, 360],
  ['A', 'Especialização em Segurança Contra Incêndio e Pânico', 6, 400],
  ['G', 'Especialização em Segurança e Eficiência na Produção: Gestão de Riscos', 4, 360],
  ['D', 'Especialização em Segurança Pública', 5, 360],
  ['S', 'Especialização em Serviço Social e Políticas Públicas com Ênfase em Saúde', 3, 360],
  ['G', 'Especialização em Serviços Sociais e Liderança: Projetos Sociais Sustentáveis', 3, 360],
  ['E', 'Especialização em Sociologia da Educação', 4, 400],
  ['A', 'Especialização em Solos e Nutrição de Plantas', 4, 360],
  ['G', 'Especialização em Storytelling Digital: Produção de Narrativas Cativantes para Redes Sociais', 3, 360],
  ['E', 'Especialização em Teologia Cristã e Estudos Bíblicos Avançados', 4, 380],
  ['E', 'Especialização em Terapia Ocupacional com Ênfase em Educação Especial e Inclusiva', 6, 360],
  ['E', 'Especialização em Transtorno do Espectro Autista – TEA', 9, 1000],
  ['S', 'Especialização em Treinamento Resistido e Aeróbio', 3, 360],
  ['S', 'Especialização em Zoologia', 4, 360],
  ['G', 'Especialização Master em Gestão Social e Políticas Públicas', 3, 360],
  ['G', 'Especialização Master em Marketing e Inteligência de Mercado', 3, 360],
  ['E', 'MBA em Ciências da Computação para Licenciados', 4, 380],
  ['E', 'MBA em Educação Executiva', 4, 380],
  ['G', 'MBA em Gestão Ambiental e Futuro Sustentável', 4, 360],
  ['G', 'MBA em Gestão Avançada e Liderança Transformadora', 4, 380],
  ['G', 'MBA em Gestão Contábil e Auditoria Avançada', 4, 380],
  ['A', 'MBA em Gestão da Produção Industrial', 6, 440],
  ['G', 'MBA em Gestão da Qualidade e Auditoria', 4, 380],
  ['G', 'MBA em Gestão da Qualidade e Processos Industriais', 4, 380],
  ['G', 'MBA em Gestão de Marcas e Produtos', 4, 380],
  ['G', 'MBA em Gestão de Operações e Supply Chain', 4, 380],
  ['G', 'MBA em Gestão de Pessoas 5.0', 4, 380],
  ['G', 'MBA em Gestão de Projetos e Inovação', 4, 380],
  ['G', 'MBA em Gestão de Projetos e Processos', 4, 380],
  ['G', 'MBA em Gestão de Projetos em TI', 4, 380],
  ['G', 'MBA em Gestão de Vendas e Marketing', 4, 380],
  ['G', 'MBA em Gestão de Vendas e Negócios', 4, 380],
  ['G', 'MBA em Gestão Estratégica de Comércio Exterior', 3, 400],
  ['G', 'MBA em Gestão Estratégica de Custos', 4, 380],
  ['G', 'MBA em Gestão Estratégica e Marketing Digital', 4, 380],
  ['I', 'MBA em Inbound Marketing com Ênfase em IA: Atração de Leads e Conversão', 4, 360],
  ['I', 'MBA em Inteligência Artificial e Automação de Negócios: IA e Business Intelligence', 4, 360],
  ['I', 'MBA em Liderança para o Futuro: Transformação Digital e Inteligência Artificial', 4, 360],
  ['I', 'MBA em Marketing de Influência e Produção de Conteúdos Digitais com Recursos de IA', 4, 360],
  ['I', 'MBA em Marketing Digital com Ênfase em Inteligência Artificial', 4, 360],
  ['G', 'MBA em Marketing Digital e E-Commerce', 4, 380],
  ['G', 'MBA em Marketing Digital e Negócios Disruptivos', 4, 380],
  ['G', 'MBA em Marketing Imobiliário', 4, 380],
  ['G', 'MBA Executivo em Contabilidade e Finanças Corporativas', 4, 360],
  ['I', 'MBA Executivo em Inteligência Artificial: Gestão Estratégica na Era da IA', 4, 360],
];

function montarCurso(tipo, [nome, grau, duracao, valorNormal, estagio, tcc, provaPolo, megaPolo, valorBlack]) {
  return { tipo, nome, grau, duracao, valorNormal, estagio, tcc, provaPolo, megaPolo, valorBlack };
}

function montarPos([area, nome, meses, horas, opcoes = {}]) {
  return {
    tipo: 'pos',
    area: AREAS[area] || area,
    nome,
    duracao: `${meses} meses`,
    cargaHoraria: `${horas}h`,
    parcelas: POS_CONDICAO.parcelas,
    valorParcela: opcoes.parcela ?? POS_CONDICAO.valorParcela,
    lancamento: opcoes.lancamento || '',
    emBreve: Boolean(opcoes.emBreve),
    destaque: Boolean(opcoes.destaque),
  };
}

export const CURSOS = [
  ...GRADUACAO.map((linha) => montarCurso('graduacao', linha)),
  ...SEGUNDA_GRADUACAO.map((linha) => montarCurso('segunda', linha)),
  ...POS_GRADUACAO.map(montarPos),
];
