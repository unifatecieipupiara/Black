// Guarda e sincroniza os leads.
// - Com Firebase configurado: login Google + Firestore (compartilhado em tempo real).
// - Sem configuração: "modo demonstração", salvo só no navegador (localStorage).

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
  let usuarioAtual = null;
  const quem = () => usuarioAtual?.nome || usuarioAtual?.email || '';

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
      return A.onAuthStateChanged(auth, (u) => {
        usuarioAtual = u ? { nome: u.displayName || u.email, email: u.email } : null;
        callback(usuarioAtual);
      });
    },

    ouvirLeads(aoReceber, aoErrar) {
      return F.onSnapshot(
        colecao,
        (snap) =>
          aoReceber(
            snap.docs.map((d) => {
              const dados = d.data({ serverTimestamps: 'estimate' });
              return { ...dados, id: d.id, criadoEm: paraMs(dados.criadoEm), atualizadoEm: paraMs(dados.atualizadoEm) };
            }),
          ),
        aoErrar,
      );
    },

    criar(dados) {
      const agora = F.serverTimestamp();
      return F.addDoc(colecao, { ...dados, criadoEm: agora, criadoPor: quem(), atualizadoEm: agora, atualizadoPor: quem() });
    },

    atualizar(id, dados) {
      return F.updateDoc(F.doc(colecao, id), { ...dados, atualizadoEm: F.serverTimestamp(), atualizadoPor: quem() });
    },

    excluir(id) {
      return F.deleteDoc(F.doc(colecao, id));
    },
  };
}

function criarDemo() {
  const CHAVE = 'bf-leads-demo';
  const usuario = { nome: 'Demonstração', email: '' };
  const ouvintes = new Set();

  const ler = () => {
    try {
      return JSON.parse(localStorage.getItem(CHAVE)) || [];
    } catch {
      return [];
    }
  };
  const avisar = () => {
    const lista = ler();
    ouvintes.forEach((fn) => fn(lista));
  };
  const gravar = (lista) => {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
    avisar();
  };
  const novoId = () =>
    globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

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
    ouvirLeads(aoReceber) {
      ouvintes.add(aoReceber);
      setTimeout(() => aoReceber(ler()));
      return () => ouvintes.delete(aoReceber);
    },
    async criar(dados) {
      const agora = Date.now();
      gravar([...ler(), { ...dados, id: novoId(), criadoEm: agora, criadoPor: usuario.nome, atualizadoEm: agora, atualizadoPor: usuario.nome }]);
    },
    async atualizar(id, dados) {
      gravar(ler().map((l) => (l.id === id ? { ...l, ...dados, atualizadoEm: Date.now(), atualizadoPor: usuario.nome } : l)));
    },
    async excluir(id) {
      gravar(ler().filter((l) => l.id !== id));
    },
  };
}
