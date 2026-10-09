# Pedido ao backend: paginação de clientes inativados

O frontend já oferece paginação local na aba **Atualizações**, mas ainda precisa baixar todos os registros de `GET /clients/inativados`. Para que a paginação seja eficiente em carteiras grandes, o endpoint deve paginar na origem.

## Alteração solicitada

Adicionar os query params abaixo a `GET /clients/inativados`, preservando os filtros atuais (`dias`, `cnpj`, `cidade` e `codusur`):

- `pagina: int = 1`, mínimo `1`;
- `limite: int = 20`, mínimo `1` e máximo `100`.

A ordenação deve permanecer determinística:

1. `data_inativacao` decrescente;
2. `CODCLI` crescente como critério de desempate.

## Resposta proposta

```json
{
  "items": [
    {
      "CODCLI": 123,
      "CLIENTE": "Cliente Exemplo",
      "CGCENT": "12.345.678/0001-99",
      "data_ultima_compra": "2026-08-31",
      "data_inativacao": "2026-09-30",
      "dias_inativo": 39
    }
  ],
  "pagina": 1,
  "limite": 20,
  "total": 157,
  "total_paginas": 8
}
```

Os totais devem considerar todos os filtros aplicados. Uma página além do limite deve retornar `items: []`, mantendo os metadados corretos.

## Última compra

Hoje o endpoint informa somente `data_ultima_compra`. Para evitar uma chamada adicional a `GET /clients/situacao` sempre que o usuário expande um cliente, recomenda-se incluir opcionalmente `ultima_compra` no mesmo formato de `UltimaCompraResponse`. Uma alternativa é aceitar `incluir_ultima_compra: bool = false`, permitindo que o frontend solicite valor, pedido e itens apenas quando necessário.

## Compatibilidade

A mudança de uma lista simples para um objeto paginado é incompatível com clientes atuais. Se a API precisar preservar compatibilidade, sugere-se uma destas opções:

- publicar a resposta paginada em `/clients/inativados/paginado`; ou
- manter a lista quando `pagina` e `limite` não forem enviados e retornar o objeto paginado quando ambos estiverem presentes.

Após a implementação, atualizar o OpenAPI com os parâmetros, o envelope paginado e os limites de validação.
