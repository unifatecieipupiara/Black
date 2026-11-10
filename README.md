# Black Friday · UniFatecie – Polo Ipupiara

Painel simples para a campanha de Black Friday (novembro):

- **Links de matrícula e vouchers** no topo (uso interno): Graduação, 2ª Graduação, Pós-Graduação e Transferência.
- **Lista de cursos** com valores e **mensagem pronta** para copiar ou abrir direto no WhatsApp
  (a mensagem não inclui link nem voucher).
- **Leads** compartilhados entre a equipe, em um funil arrastável (*Entrar em contato* → *Em andamento* →
  *Matriculado* / *Perdido*): WhatsApp, nome (opcional), observação e quantidade de matrículas.
  Ao levar um lead para *Matriculado*, o painel registra quem matriculou e quando.
- **Placar de matrículas do mês** por usuário (nome editável tocando no próprio nome no topo).
- Exportação dos leads para planilha (CSV, abre no Excel / Google Planilhas).

Não precisa instalar nada: é um site estático (HTML, CSS e JavaScript).

## Acesso

Tudo fica atrás do login com Google: sem entrar com um e-mail autorizado (lista em
[`firestore.rules`](firestore.rules)), a página mostra só a tela "Acesso restrito".

Cursos, valores, links, vouchers e mensagens ficam **criptografados** no repositório
([`js/dados.enc.json`](js/dados.enc.json), AES-GCM 256). A chave que abre esse arquivo fica no
Firestore, em `config/acesso` (campo `chave`), e só os e-mails autorizados conseguem lê-la.
No primeiro acesso o painel pede a chave uma vez e a salva lá; depois ela não é mais pedida.
Para consultar a chave: Firebase → Firestore Database → coleção `config` → documento `acesso`.

## Cobranças (só a gestora)

A página [`cobrancas.html`](cobrancas.html) é um funil de cobrança (Entrar em
contato → Em negociação → Aguardando pagamento → Finalizado), com cadastro do aluno (nome,
WhatsApp, mensalidades em atraso, polo, tipo de curso e observação) e mensagem pronta para cada
etapa: Graduação/2ª Graduação usam o **Feirão da Negociação**; Pós-Graduação tem mensagens próprias. Para Graduação/2ª Graduação, em "Outras
situações" há a mensagem para quem **matriculou e não acessou** (retornar ao curso ou cancelar sem pagar nada,
pois os boletos de quem não acessou são estornados). Os cards podem
ser arrastados entre as etapas (no celular, segure um instante antes de arrastar).

Os alunos ficam no Firestore (coleção `cobrancas`), e as regras liberam acesso **somente** ao
e-mail da gestora. O atalho "💰 Cobranças" aparece no topo do painel só para ela.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `js/dados.enc.json` | **Cursos, valores, links, vouchers e mensagens**, criptografados. |
| `ferramentas/dados.mjs` | Abre (`abrir`) e criptografa de novo (`fechar`) os dados com a chave. |
| `js/config.js` | Configuração do Firebase (onde os leads ficam guardados). |
| `firestore.rules` | Regras de segurança: quais e-mails podem acessar o painel, os leads e a chave. |
| `index.html`, `css/`, `js/app.js`, `js/armazenamento.js`, `js/cofre.js` | O sistema em si. |

Enquanto o Firebase não estiver configurado, o sistema funciona em **modo demonstração**:
os leads ficam salvos só no navegador de quem está usando.

## Configurar o Firebase (uma vez só, ~10 minutos)

1. Acesse <https://console.firebase.google.com> com a sua conta Google e clique em **Criar um projeto**
   (ex.: `black-friday-polo`). O Google Analytics pode ser desativado.
2. **Login com Google**: menu *Criação* (Build) → **Authentication** → *Vamos começar* →
   aba *Método de login* → **Google** → *Ativar* → escolha o e-mail de suporte → *Salvar*.
3. **Domínio do site**: ainda em Authentication → aba **Configurações** → *Domínios autorizados* →
   *Adicionar domínio* → `unifatecieipupiara.github.io`.
4. **Banco de dados**: menu *Criação* → **Firestore Database** → *Criar banco de dados* →
   local `southamerica-east1 (São Paulo)` → **modo de produção** → *Criar*.
5. **Regras de acesso**: no Firestore, aba **Regras** → apague o que estiver lá, cole o conteúdo do
   arquivo [`firestore.rules`](firestore.rules), **troque os dois e-mails** pelos e-mails Google da
   gestora e da colaboradora → *Publicar*.
   (Para incluir mais alguém depois, basta adicionar o e-mail nessa lista e publicar de novo.)
6. **Chaves do app**: ícone de engrenagem → **Configurações do projeto** → em *Seus apps* clique no
   ícone **`</>`** (Web) → dê um apelido → *Registrar app* (não precisa marcar Hosting).
   Copie o bloco `firebaseConfig` que aparece e cole em [`js/config.js`](js/config.js).

> As chaves do `firebaseConfig` não são senha. Quem garante que só vocês acessam os leads são as
> regras do passo 5 — por isso os e-mails ficam só lá, no console do Firebase, e não no código.

## Publicar o site (GitHub Pages)

No GitHub: repositório → **Settings** → **Pages** → em *Build and deployment* escolha
*Deploy from a branch*, branch **`main`**, pasta **`/ (root)`** → *Save*.
Em 1–2 minutos o site fica disponível em <https://unifatecieipupiara.github.io/Black/>.

## Editar cursos, valores, vouchers e mensagens

Os dados ficam em `js/dados.js`, que **nunca vai para o GitHub** (está no `.gitignore`); no
repositório só existe a versão criptografada. Para editar (precisa do Node.js e da chave):

```bash
CHAVE_DADOS='<chave>' node ferramentas/dados.mjs abrir     # cria js/dados.js
# … edite js/dados.js …
CHAVE_DADOS='<chave>' node ferramentas/dados.mjs fechar    # atualiza js/dados.enc.json
```

Depois faça commit só do `js/dados.enc.json`. O site atualiza sozinho em 1–2 minutos.

- **Valores da Black Friday:** `GRUPOS_BLACK` (Grupo Base a Grupo 6, "de/por"). O grupo de cada
  curso é encontrado pela mensalidade normal. Para um valor específico de um curso, preencha a
  última coluna da linha do curso.
- **Cursos:** uma linha por curso (nome, modalidade, duração, mensalidade normal, estágio, TCC,
  prova no polo, aula no MegaPolo). Os de Graduação e 2ª Graduação vieram do Notion.
- **Pós-Graduação:** uma linha por curso (área, nome, meses, carga horária e, se for o caso,
  lançamento / em breve / destaque / parcela diferente). Condição padrão em `POS_CONDICAO`
  (12× R$ 29,90) e matrícula no tipo "Pós-Graduação".

Enquanto faltar algum link, voucher, desconto ou lista de cursos, o topo da página mostra um aviso
amarelo dizendo o que ainda falta. Ele some sozinho quando tudo estiver preenchido.

> **Atenção:** este repositório é público. O código fica visível, mas os dados da campanha só
> aparecem criptografados e os **leads não ficam aqui**: eles são guardados no Firebase e só
> aparecem para os e-mails autorizados.
