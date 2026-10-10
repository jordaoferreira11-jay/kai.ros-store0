# Kai.ros — protótipo de loja online

## Como abrir
1. Descompacte `kai-ros-site.zip`.
2. Abra `index.html` num navegador moderno.
3. Teste o catálogo, editor, carrinho, pedido de orçamento e painel Admin.

## Funcionalidades nesta versão
- Página responsiva com categorias e catálogo.
- Editor visual básico para cor, tamanho, texto e carregamento de imagem.
- Carrinho e cálculo de totais estimados.
- Formulário de pedido e de orçamento.
- Painel de demonstração para estados de pedidos e alteração de preços.
- Exportação de pedidos em CSV.
- Persistência local via localStorage do navegador.

## Limitações importantes
Esta é uma **demonstração front-end**, não uma loja pronta para receber encomendas reais. Os pedidos e preços são guardados apenas no navegador usado para testar; não há base de dados central, autenticação de administrador, armazenamento privado de artes, notificações, integração real com WhatsApp, M-Pesa ou e-Mola, nem confirmação de pagamentos. Não introduza dados reais de clientes nesta versão.

## Próxima fase para produção
Implementar backend/API, PostgreSQL, autenticação e permissões, armazenamento privado de ficheiros, validação e proteção contra uploads maliciosos, envio de email/WhatsApp, integração contratada com fornecedores de pagamento, política de privacidade e testes de segurança. Configurar número oficial de WhatsApp, preços reais, prazos e entregas antes de publicar.
