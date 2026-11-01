# Black Friday · UniFatecie – Polo Ipupiara

Painel simples para a campanha de Black Friday (novembro):

- **Links de matrícula e cupons** no topo (uso interno): Graduação, 2ª Graduação, Pós-Graduação e Transferência.
- **Lista de cursos** com valores e **mensagem pronta** para copiar ou abrir direto no WhatsApp
  (a mensagem não inclui link nem cupom).
- **Leads** compartilhados entre a equipe: WhatsApp, status (*Entrar em contato*, *Em andamento*, *Sem retorno*,
  *Matriculado*, *Perdido*) e observação opcional (ex.: curso de interesse).
- Exportação dos leads para planilha (CSV, abre no Excel / Google Planilhas).

Não precisa instalar nada: é um site estático (HTML, CSS e JavaScript).

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `js/dados.js` | **Cursos, valores, links, cupons e mensagens prontas.** É o arquivo para editar. |
| `js/config.js` | Configuração do Firebase (onde os leads ficam guardados). |
| `firestore.rules` | Regras de segurança: quais e-mails podem acessar os leads. |
| `index.html`, `css/`, `js/app.js`, `js/armazenamento.js` | O sistema em si. |

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

## Editar cursos, valores, cupons e mensagens

Tudo fica em [`js/dados.js`](js/dados.js). Pelo próprio GitHub: abra o arquivo → ícone de lápis
(*Edit*) → altere → *Commit changes*. O site atualiza sozinho em 1–2 minutos.

- **Valores da Black Friday:** `GRUPOS_BLACK` (Grupo Base a Grupo 6, "de/por"). O grupo de cada
  curso é encontrado pela mensalidade normal. Para um valor específico de um curso, preencha a
  última coluna da linha do curso.
- **Cursos:** uma linha por curso (nome, modalidade, duração, mensalidade normal, estágio, TCC,
  prova no polo, aula no MegaPolo). Os de Graduação e 2ª Graduação vieram do Notion.
- **Pós-Graduação:** uma linha por curso (área, nome, meses, carga horária e, se for o caso,
  lançamento / em breve / destaque / parcela diferente). Condição padrão em `POS_CONDICAO`
  (12× R$ 29,90) e matrícula no tipo "Pós-Graduação".

Enquanto faltar algum link, cupom, desconto ou lista de cursos, o topo da página mostra um aviso
amarelo dizendo o que ainda falta. Ele some sozinho quando tudo estiver preenchido.

> **Atenção:** este repositório é público. Cursos, valores, links e cupons ficam visíveis para
> quem abrir o repositório ou o site. Os **leads não ficam aqui**: eles são guardados no Firebase e
> só aparecem para os e-mails autorizados.
