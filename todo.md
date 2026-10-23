- [x] implemente o refresh token

A API usa access tokens curtos e refresh tokens rotativos. Existem dois fluxos independentes no Swagger (/docs):

usuários internos: POST /auth/login e POST /auth/refresh;
O access token pode ser enviado como Authorization: Bearer <token>. O refresh token é gravado por padrão em cookie HttpOnly e é rotacionado a cada renovação. No Swagger, faça o login e execute o endpoint de refresh com o corpo vazio; o navegador enviará o cookie automaticamente. Logout e troca de senha revogam a sessão persistida.
*Nota: Observe as alterações em /docs/openapi.json para fazer essas alterações*
