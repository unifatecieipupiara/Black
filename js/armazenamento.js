// Guarda e sincroniza os leads.
// - Com Firebase configurado: login Google + Firestore (compartilhado em tempo real).
// - Sem configuração: "modo demonstração", salvo só no navegador (localStorage).
//
// Perfis (coleção "perfis", um documento por usuário): nome de exibição editável,
// usado em "Atualizado por …" e no placar de matrículas do mês.
// Matrícula: ao marcar um lead como Matriculado, grava matriculadoEm (data) e
// matriculadoPor (uid de quem matriculou) para o placar mensal.
// "apelidos" do usuário: nomes antigos dele (nome do Google, e-mail e nomes
// anteriores do perfil). O painel troca esses nomes pelo atual nos leads.

const VERSAO_FIREBASE = '13.1.0';

export async function criarArmazenamento(config) {
  if (!config || !config.apiKey || !config.projectId) return criarDemo();
  return criarFirebase(config);
}

const paraMs = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'number' ? v : null);

async function criarFirebase(config) {
  const base = `https://www.gstatic.com/firebasejs/${VERSAO_FIREBASE}`;
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`),
  ]);

  const app = initializeApp(config);
  const auth = A.getAuth(app);
  const db = F.getFirestore(app);
  const colecao = F.collection(db, 'leads');
  const perfis = F.collection(db, 'perfis');
  let usuarioAtual = null;
  const quem = () => usuarioAtual?.nome || usuarioAtual?.email || '';

  // Carrega (ou cria) o perfil do usuário. Se as regras ainda não liberam "perfis", usa o nome do Google.
  async function carregarPerfil(u) {
    const padrao = u.displayName || u.email;
    try {
      const snap = await F.getDoc(F.doc(perfis, u.uid));
      if (snap.exists() && snap.data().nome) return snap.data().nome;
      await F.setDoc(F.doc(perfis, u.uid), { nome: padrao, email: String(u.email || '').toLowerCase() });
    } catch (err) {
      console.warn('Perfil:', err.code || err.message);
    }
    return padrao;
  }

  const marcarMatricula = (dados, opcoes) =>
    opcoes?.matricula ? { ...dados, matriculadoEm: F.serverTimestamp(), matriculadoPor: usuarioAtual?.uid || '' } : dados;

  return {
    modo: 'firebase',

    async entrar() {
      const provedor = new A.GoogleAuthProvider();
      provedor.setCustomParameters({ prompt: 'select_account' });
      try {
        await A.signInWithPopup(auth, provedor);
      } catch (e) {
        if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
          return A.signInWithRedirect(auth, provedor);
        }
        if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
        throw e;
      }
    },

    sair: () => A.signOut(auth),

    aoMudarUsuario(callback) {
      return A.onAuthStateChanged(auth, async (u) => {
        if (!u) {
          usuarioAtual = null;
          callback(null);
          return;
        }
        usuarioAtual = { uid: u.uid, nome: u.displayName || u.email, email: u.email, apelidos: [u.displayName, u.email].filter(Boolean) };
        usuarioAtual.nome = await carregarPerfil(u);
        callback(usuarioAtual);
      });
    },

    async salvarNome(nome) {
      await F.setDoc(F.doc(perfis, usuarioAtual.uid), { nome, email: String(usuarioAtual.email || '').toLowerCase() });
      if (usuarioAtual.nome && usuarioAtual.nome !== nome) usuarioAtual.apelidos.push(usuarioAtual.nome);
      usuarioAtual.nome = nome;
      return usuarioAtual;
    },

    // Nomes de todos os usuários (uid → nome), para o placar de matrículas.
    ouvirPerfis(aoReceber) {
      return F.onSnapshot(
        perfis,
        (snap) => aoReceber(Object.fromEntries(snap.docs.map((d) => [d.id, d.data().nome || d.data().email || '']))),
        (err) => console.warn('Perfis:', err.code || err.message),
      );
    },

    ouvirLeads(aoReceber, aoErrar) {
      return F.onSnapshot(
        colecao,
        (snap) =>
          aoReceber(
            snap.docs.map((d) => {
              const dados = d.data({ serverTimestamps: 'estimate' });
              return {
                ...dados,
                id: d.id,
                criadoEm: paraMs(dados.criadoEm),
                atualizadoEm: paraMs(dados.atualizadoEm),
                matriculadoEm: paraMs(dados.matriculadoEm),
              };
            }),
          ),
        aoErrar,
      );
    },

    criar(dados, opcoes) {
      const agora = F.serverTimestamp();
      return F.addDoc(colecao, marcarMatricula({ ...dados, criadoEm: agora, criadoPor: quem(), atualizadoEm: agora, atualizadoPor: quem() }, opcoes));
    },

    atualizar(id, dados, opcoes) {
      return F.updateDoc(F.doc(colecao, id), marcarMatricula({ ...dados, atualizadoEm: F.serverTimestamp(), atualizadoPor: quem() }, opcoes));
    },

    excluir(id) {
      return F.deleteDoc(F.doc(colecao, id));
    },

    // Troca só o nome de "Criado por"/"Atualizado por" (a data de atualização não muda).
    corrigirAutor(id, campos) {
      return F.updateDoc(F.doc(colecao, id), campos);
    },

    // Chave que abre os dados da campanha (config/acesso → campo "chave").
    async lerChave() {
      const snap = await F.getDoc(F.doc(db, 'config', 'acesso'));
      return snap.exists() ? snap.data().chave || null : null;
    },

    salvarChave(chave) {
      return F.setDoc(F.doc(db, 'config', 'acesso'), { chave, atualizadoEm: F.serverTimestamp(), atualizadoPor: quem() });
    },
  };
}

function criarDemo() {
  const CHAVE = 'bf-leads-demo';
  const CHAVE_NOME = 'bf-nome-demo';
  const ler = (k, padrao) => {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? padrao;
    } catch {
      return padrao;
    }
  };
  const usuario = { uid: 'demo', nome: ler(CHAVE_NOME, 'Demonstração'), email: '', apelidos: ['Demonstração'] };
  const ouvintes = new Set();
  const ouvintesPerfis = new Set();

  const lerLeads = () => ler(CHAVE, []);
  const avisar = () => {
    const lista = lerLeads();
    ouvintes.forEach((fn) => fn(lista));
  };
  const gravar = (lista) => {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
    avisar();
  };
  const novoId = () =>
    globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const marcarMatricula = (dados, opcoes) => (opcoes?.matricula ? { ...dados, matriculadoEm: Date.now(), matriculadoPor: usuario.uid } : dados);

  window.addEventListener('storage', (e) => {
    if (e.key === CHAVE) avisar();
  });

  return {
    modo: 'demo',
    async entrar() {},
    async sair() {},
    aoMudarUsuario(callback) {
      setTimeout(() => callback(usuario));
      return () => {};
    },
    async salvarNome(nome) {
      if (usuario.nome !== nome) usuario.apelidos.push(usuario.nome);
      usuario.nome = nome;
      localStorage.setItem(CHAVE_NOME, JSON.stringify(nome));
      ouvintesPerfis.forEach((fn) => fn({ [usuario.uid]: nome }));
      return usuario;
    },
    ouvirPerfis(aoReceber) {
      ouvintesPerfis.add(aoReceber);
      setTimeout(() => aoReceber({ [usuario.uid]: usuario.nome }));
      return () => ouvintesPerfis.delete(aoReceber);
    },
    ouvirLeads(aoReceber) {
      ouvintes.add(aoReceber);
      setTimeout(() => aoReceber(lerLeads()));
      return () => ouvintes.delete(aoReceber);
    },
    async criar(dados, opcoes) {
      const agora = Date.now();
      gravar([...lerLeads(), marcarMatricula({ ...dados, id: novoId(), criadoEm: agora, criadoPor: usuario.nome, atualizadoEm: agora, atualizadoPor: usuario.nome }, opcoes)]);
    },
    async atualizar(id, dados, opcoes) {
      gravar(lerLeads().map((l) => (l.id === id ? marcarMatricula({ ...l, ...dados, atualizadoEm: Date.now(), atualizadoPor: usuario.nome }, opcoes) : l)));
    },
    async excluir(id) {
      gravar(lerLeads().filter((l) => l.id !== id));
    },
    async corrigirAutor(id, campos) {
      gravar(lerLeads().map((l) => (l.id === id ? { ...l, ...campos } : l)));
    },
    async lerChave() {
      return localStorage.getItem('bf-chave-demo');
    },
    async salvarChave(chave) {
      localStorage.setItem('bf-chave-demo', chave);
    },
  };
}
