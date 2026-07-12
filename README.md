# Dashboard Financeiro — Ouro Verde / AutoVerde

Versão web pública do dashboard financeiro (originalmente um artifact do Claude.ai),
adaptada para rodar via **GitHub + Vercel**, com os dados salvos num banco **Postgres**
gerenciado pela própria Vercel.

## Estrutura do projeto

```
autoverde-dashboard/
├── public/
│   └── index.html       ← o dashboard (visual, gráficos, formulários)
├── api/
│   └── data.js          ← função serverless: lê/grava no Postgres
├── package.json
├── vercel.json
└── README.md
```

## Passo a passo para publicar

### 1. Criar o repositório no GitHub

1. Acesse github.com e clique em **New repository**.
2. Nome sugerido: `autoverde-dashboard`.
3. Deixe **Private** se não quiser que o código apareça publicamente no GitHub
   (isso não afeta o site final, que pode ser público mesmo com o código privado).
4. Não marque nenhuma opção de inicialização (sem README, sem .gitignore — já temos os nossos).
5. Clique em **Create repository**.

### 2. Subir os arquivos para o GitHub

No terminal (ou no VS Code, usando o painel "Source Control"), dentro da pasta deste projeto:

```bash
git init
git add .
git commit -m "Primeira versão do dashboard financeiro"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/autoverde-dashboard.git
git push -u origin main
```

Troque `SEU-USUARIO` pelo seu usuário do GitHub. Se preferir, pode usar o botão
**"Publish branch"** direto no VS Code, sem digitar comandos.

### 3. Importar o projeto na Vercel

1. Acesse vercel.com e clique em **Add New → Project**.
2. Escolha **Import Git Repository** e selecione `autoverde-dashboard`.
3. A Vercel detecta automaticamente que é um projeto simples com uma pasta `public/`
   e uma pasta `api/` — não precisa mudar nenhuma configuração de build.
4. Clique em **Deploy**. Em ~1 minuto o site já estará no ar num link tipo
   `https://autoverde-dashboard.vercel.app`.

Neste ponto o site já abre, mas ainda **não tem banco de dados conectado** —
os formulários vão dar erro de conexão até o passo 4.

### 4. Conectar o banco de dados (Postgres)

1. Dentro do projeto na Vercel, vá na aba **Storage**.
2. Clique em **Create Database** → escolha **Postgres** (ou "Neon", que é o mesmo
   provedor usado por trás do "Vercel Postgres" atualmente).
3. Dê um nome (ex: `autoverde-db`) e confirme a região (escolha uma perto do Brasil,
   ex: `Washington, D.C., USA (iad1)`, que é a mais próxima disponível).
4. Depois de criado, clique em **Connect Project** e selecione o projeto
   `autoverde-dashboard`. Isso cria automaticamente as variáveis de ambiente
   (`POSTGRES_URL` etc.) que o arquivo `api/data.js` já espera encontrar.
5. Vá em **Deployments** → nos três pontinhos do último deploy → **Redeploy**,
   para que o projeto passe a enxergar a variável de ambiente recém-criada.

Pronto — a tabela `dashboard_kv` é criada automaticamente na primeira vez que
alguém salvar um dado (o código faz isso sozinho, não precisa rodar SQL manual).

### 5. Testar

1. Abra o link `https://autoverde-dashboard.vercel.app` (ou o domínio que a Vercel
   gerou/você configurou).
2. Preencha o formulário "Lançamento diário" e clique em **Salvar dia**.
3. Abra o mesmo link em outra aba (ou peça para outra pessoa abrir) — os dados
   devem aparecer iguais para todo mundo, confirmando que está gravando no banco
   compartilhado.

### 6. Domínio próprio (opcional)

Se quiser um endereço tipo `dashboard.ouroverde.com.br` em vez do `.vercel.app`:

1. Na Vercel, vá em **Settings → Domains** do projeto.
2. Adicione o domínio desejado.
3. A Vercel mostra os registros DNS (CNAME ou A) que você precisa cadastrar no
   painel do seu provedor de domínio (Registro.br, GoDaddy, etc.).

## ⚠️ Sobre o dashboard ser público

Como configurado, **qualquer pessoa com o link acessa e edita** todos os dados
financeiros (faturamento, contratos, títulos a receber) — não há login nem senha.
Isso foi uma escolha explícita para simplificar o lançamento inicial. Se em algum
momento for necessário restringir o acesso, os caminhos mais simples são:

- **Vercel Password Protection** (disponível em planos pagos da Vercel — protege
  o site inteiro com uma senha única, sem precisar programar nada).
- **Autenticação real com Supabase Auth**, como já estava sugerido no handoff
  técnico original do Igor — permite usuário/senha por pessoa e histórico de quem
  alterou o quê.

## Diferenças em relação à versão artifact (Claude.ai)

| Antes (artifact) | Agora (GitHub + Vercel) |
|---|---|
| `window.storage.get/set` | `fetch('/api/data')` chamando a função serverless |
| Dados vivos só dentro do Claude.ai | Dados no Postgres, acessível de qualquer lugar |
| Link de artifact do Claude | URL própria (`.vercel.app` ou domínio customizado) |
| Sem controle de deploy | Cada `git push` gera um novo deploy automático |

Toda a lógica de cálculo (`computeDerived`, `monthCloseSeries`, `accumSeries`) e o
visual (cores, cards, gráficos) são exatamente os mesmos do artifact original —
nada disso precisou ser reescrito.
