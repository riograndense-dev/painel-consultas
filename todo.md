- [x] Desfazer com que apenas `Ctrl +` ou `Ctrl -` amplie e reduza o mapa, fazendo com que seja possível interagir com o mapa quando clicado nele, e que pare de rolar a página
- [x] Fazer com que os gráficos sejam uma aba separada, como o mapa
- [x] Melhorar os cards dos produtos

*Nota: API documentada em `/docs/openapi.json`.*

## Contexto para o agente do backend

O frontend já envia `search` e `dias` para `GET /mapa/clientes/cidades` e `GET /mapa/clientes/pracas`, e já está preparado para ler os campos `quantidade_clientes_ativos` e `quantidade_clientes_inativos`. A API documentada atual ainda não oferece esses dados; enquanto isso, a interface mostra “Aguardando API” em vez de apresentar uma contagem parcial ou incorreta.

Alterações necessárias nos dois endpoints de mapa:

1. Adicionar o query param `dias: int = 30`, com mínimo 1 e máximo 365.
2. Fazer `search` considerar também os campos gerais do cliente (`CLIENTE`, `CODCLI` e `CGCENT`), além dos nomes/códigos de cidade ou praça já suportados. O filtro deve ser aplicado aos clientes antes do agrupamento.
3. Acrescentar em cada item da resposta:
   - `quantidade_clientes_ativos: int`
   - `quantidade_clientes_inativos: int`
4. Usar exatamente a mesma regra de atividade de `GET /clients/`: cliente ativo quando possui compra dentro da janela `dias`; caso contrário, inativo.
5. Garantir que, para cada grupo, `quantidade_clientes_ativos + quantidade_clientes_inativos == quantidade_clientes` (usando clientes distintos se o agrupamento atual puder duplicá-los).
6. Respeitar todos os filtros existentes (`cidade`, `codpraca`, `seqrota`, `codusur`) antes de calcular as três quantidades.
7. Atualizar `MapaCidadeResponse`, `MapaPracaResponse` e o OpenAPI. Os dois novos campos devem ser inteiros não nulos e obrigatórios.

Exemplo esperado de uma praça:

```json
{
  "CODPRACA": 12,
  "PRACA": "CENTRO",
  "SEQROTA": 3,
  "latitude": -30.03,
  "longitude": -51.23,
  "quantidade_clientes": 42,
  "quantidade_clientes_ativos": 31,
  "quantidade_clientes_inativos": 11
}
```
