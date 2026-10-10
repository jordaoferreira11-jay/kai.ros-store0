# Kai.ros — loja online com backend

Projeto inicial full-stack para loja de personalização de camisetas, bonés, bordados e DTF, com preços em MZN.

## Incluído
- Website público responsivo (`public/index.html`).
- Catálogo que lê produtos da API e usa catálogo local apenas como fallback visual se a API ainda não estiver ativa.
- Encomendas e pedidos de orçamento enviados à API.
- API Node.js/Express com PostgreSQL.
- Base de dados para produtos, administradores e encomendas (`sql/schema.sql`).
- Painel administrativo protegido em `/admin.html`: login, consulta de pedidos, alteração de estados, gestão de produtos e preços.
- Hash de palavras-passe com bcrypt, tokens JWT de curta duração, limitação de pedidos, Helmet e validação básica.
- Endpoint de saúde `/api/health`.

## Requisitos
- Node.js 20 ou superior.
- PostgreSQL 14 ou superior (local ou serviço gerido).

## Executar localmente
1. Cria uma base de dados PostgreSQL chamada `kairos`.
2. Copia `.env.example` para `.env`.
3. Preenche `DATABASE_URL`, `JWT_SECRET` (mínimo 32 caracteres), `ADMIN_EMAIL` e `ADMIN_PASSWORD`.
4. Instala dependências: `npm install`.
5. Inicia: `npm start`.
6. Abre `http://localhost:3000` para a loja e `http://localhost:3000/admin.html` para o painel.

O servidor cria as tabelas e insere quatro produtos de demonstração se a tabela de produtos estiver vazia. O primeiro administrador é criado apenas se `ADMIN_EMAIL` e `ADMIN_PASSWORD` estiverem definidos e ainda não existir esse email. Guarda a palavra-passe com segurança e altera-a após o primeiro acesso.

## Identidade Kai.ros
- Logótipo oficial fornecido pelo proprietário: `public/kairos-logo.jpeg`.
- Contacto/WhatsApp: `+258 849 350 194`.
- M-Pesa: `849 350 194`.
- e-Mola: `879 350 191`.
- A integração de pagamentos não está ativa; os números são apenas instruções para pagamento sujeito a confirmação manual.

## Publicação online
Podes alojar a aplicação num serviço que execute Node.js (por exemplo, Render ou Railway) e usar uma base PostgreSQL gerida (por exemplo, Supabase ou Neon). Configura no ambiente de produção:
- `NODE_ENV=production`
- `DATABASE_URL`
- `JWT_SECRET` forte e aleatório
- `ADMIN_EMAIL` e `ADMIN_PASSWORD` apenas no primeiro arranque para criação do administrador
- `PUBLIC_URL` com a origem do website, se for alojado em domínio separado
- `DATABASE_SSL=true` apenas se o fornecedor exigir SSL e a configuração for compatível

Não publiques o ficheiro `.env` no GitHub. Não partilhes as credenciais no chat.

## Antes de usar com clientes reais — necessário
1. **Pagamentos:** M-Pesa/e-Mola ainda não estão ligados. É necessário obter acesso oficial de comerciante e integrar o fornecedor; o formulário apenas guarda a preferência de pagamento.
2. **Ficheiros de arte:** o endpoint de upload atual é privado e protegido para administradores. O editor público ainda não envia automaticamente a arte ao armazenamento do servidor. Para produção, integrar armazenamento de objetos privado (por exemplo, Supabase Storage ou S3), com políticas de acesso, análise de ficheiros e expiração.
3. **WhatsApp/email:** notificações automáticas não estão configuradas. Configurar um fornecedor e o número oficial da loja.
4. **Preços:** substituir os valores de demonstração pelos preços confirmados da Kai.ros e implementar a regra final de orçamento para cada técnica, dimensão e quantidade.
5. **Editor:** a pré-visualização do editor é ilustrativa; não é um ficheiro de produção DTF/CMYK nem garante dimensões físicas de impressão.
6. **Segurança e privacidade:** definir políticas de retenção, cópias de segurança, termos de venda, política de privacidade e testar segurança antes de aceitar dados pessoais.
7. **Armazenamento persistente:** o diretório local não deve ser usado como armazenamento de produção num alojamento efémero; use armazenamento de objetos privado.

## API principal
- `GET /api/health` — estado da API/base de dados.
- `GET /api/products` — catálogo ativo.
- `POST /api/orders` — criar encomenda.
- `POST /api/quotes` — criar pedido de orçamento.
- `POST /api/admin/login` — iniciar sessão.
- `GET /api/admin/orders` — listar encomendas (JWT).
- `PATCH /api/admin/orders/:id` — atualizar estado (JWT).
- `GET/POST/PATCH/DELETE /api/admin/products` — gerir produtos (JWT).
- `POST /api/admin/uploads` — upload privado administrativo (JWT).

O projeto não está publicado nem tem credenciais de alojamento ou de pagamento associadas. A publicação exige contas do proprietário e configuração das variáveis de ambiente.
