# Exercício de resposta a incidente — ambiente local

## Data

2026-09-04.

## Escopo

Exercício de mesa executado com comandos reais contra o banco local, cobrindo detecção, registro, identificação do ator, contenção, revogação de sessão, preservação de evidência, recuperação e verificação final de uma suspeita de uso indevido de conta administrativa.

Fora de escopo: qualquer serviço remoto, infraestrutura da UFBA, ambiente de produção, teste de intrusão e comunicação a titulares ou autoridades. Nada foi executado contra sistema externo.

## Ambiente

- Supabase local (`supabase@2.116.0`) sobre Docker, iniciado apenas para o exercício.
- Esquema reconstruído do zero com `supabase db reset --local`, portanto igual ao que as migrations produzem.
- Comandos aplicados por `psql` dentro do contêiner do banco, em uma transação encerrada com `rollback`. O exercício não deixa resíduo no banco.

## Dados utilizados

Somente fixtures sintéticas criadas para o exercício:

- `50000000-0000-4000-8000-000000000001` — “Pessoa custodiante do exercicio” (`SUPERADMIN`/`TECHNICAL_CUSTODIAN`);
- `50000000-0000-4000-8000-000000000002` — “Pessoa editora do exercicio” (`EDITOR`/`COMMUNICATION_DIRECTOR`);
- endereços em `example.invalid`, domínio reservado que não entrega correio.

Nenhum dado pessoal real, credencial, token, JWT válido, chave `service_role` ou conteúdo institucional foi usado ou registrado. Os papéis de banco (`authenticated`, `service_role`) foram simulados com `set local role` e um objeto de claims sintético, sem emissão de token.

## Cenário

Conta editorial sintética passa a apresentar comportamento atípico: nova autenticação, duas sessões administrativas simultâneas, criação de publicações em sequência e uma tentativa de conceder a si mesma o papel `SUPERADMIN`.

## Detecção

A detecção usou duas consultas sobre dados que a aplicação já persiste.

Volume por evento na janela recente:

```sql
select event::text as evento, count(*) as ocorrencias
from public.audit_logs
where created_at > now() - interval '15 minutes'
  and actor_user_id = '50000000-0000-4000-8000-000000000002'
group by 1 order by 2 desc, 1;
```

```text
    evento     | ocorrencias
---------------+-------------
 POST_CREATED  |           3
 LOGIN_SUCCESS |           1
```

Sessões administrativas simultâneas por conta:

```sql
select p.full_name as conta, count(*) as sessoes_vigentes
from public.admin_sessions s join public.profiles p on p.id = s.user_id
where s.revoked_at is null and s.expires_at > now() and s.user_id::text like '50000000%'
group by 1 order by 2 desc;
```

```text
              conta              | sessoes_vigentes
---------------------------------+------------------
 Pessoa editora do exercicio     |                2
 Pessoa custodiante do exercicio |                1
```

A tentativa de escalada de privilégio foi negada pelo backend e não gerou concessão de papel:

```text
ERROR:  Somente SUPERADMIN com MFA pode conceder papéis.
```

## Evidências

`public.audit_logs` atribuiu cada ação ao ator, permitindo a identificação sem inferência:

```text
                 ator                 |            nome             |    evento     |   entidade
--------------------------------------+-----------------------------+---------------+--------------
 50000000-0000-4000-8000-000000000002 | Pessoa editora do exercicio | POST_CREATED  | post
 50000000-0000-4000-8000-000000000002 | Pessoa editora do exercicio | POST_CREATED  | post
 50000000-0000-4000-8000-000000000002 | Pessoa editora do exercicio | POST_CREATED  | post
 50000000-0000-4000-8000-000000000002 | Pessoa editora do exercicio | LOGIN_SUCCESS | auth_session
```

Ao final do exercício, seis registros de auditoria referenciavam o incidente. A trilha resistiu às duas tentativas de adulteração:

```text
-- update em audit_logs
ERROR:  audit_logs é append-only
-- delete em audit_logs
ERROR:  audit_logs é append-only
```

## Classificação

Suspeita de comprometimento de conta administrativa com privilégio editorial, sem escalada bem-sucedida e sem exposição de conteúdo não publicado. Severidade alta pelo potencial de publicação indevida em nome de um perfil institucional; impacto observado limitado a três rascunhos sintéticos, que permanecem em `DRAFT` e não são visíveis ao público.

Em operação real, a classificação de severidade e o acionamento formal dependem do responsável operacional definido em `TBD-STI-07` e da avaliação de dados pessoais pelo controlador e pelo encarregado.

## Contenção

Desativação da conta pela pessoa custodiante, com autoridade verificada no banco:

```sql
select public.set_user_active('50000000-0000-4000-8000-000000000002', false);
```

A desativação revogou as sessões administrativas da conta na mesma transação:

```text
              session_id              | revogada
--------------------------------------+----------
 51000000-0000-4000-8000-000000000002 | t
 51000000-0000-4000-8000-000000000003 | t
```

A sessão contida tentou continuar operando com o mesmo JWT AAL2 e falhou tanto na escrita quanto na leitura:

```text
ERROR:  Sem autorização editorial.
 posts_visiveis_para_a_conta_contida
-------------------------------------
                                   0
```

Isso confirma que a revogação vale no servidor, e não apenas na interface: um token ainda válido no relógio do Auth deixa de exercer autoridade administrativa assim que a `admin_sessions` correspondente é revogada.

## Erradicação

Reset de MFA da conta afetada pelo limite transacional exposto às Edge Functions:

```sql
select public.begin_mfa_reset('50000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000001');
```

O retorno foi `0` sessões revogadas — resultado correto, porque a contenção anterior já havia revogado todas. Depois do reset, a autoridade administrativa ficou bloqueada:

```text
 autoridade_bloqueada
----------------------
 t
```

## Recuperação

Reativação da conta pela pessoa custodiante e verificação de um novo fator:

```text
 conta_reativada | autoridade_ainda_bloqueada
-----------------+----------------------------
 t               | t

 autoridade_liberada_apos_novo_fator
-------------------------------------
 f
```

A conta volta a existir como ativa, mas a autoridade administrativa só é liberada depois que um fator MFA verificado é registrado. Reativar não basta para reabrir o acesso privilegiado.

## Verificação

```text
 sessoes_ainda_validas | eventos_de_revogacao | eventos_de_desativacao | eventos_de_reativacao
-----------------------+----------------------+------------------------+-----------------------
                     0 |                    2 |                      1 |                     1
```

Nenhuma sessão administrativa permaneceu válida para a conta afetada; a desativação, a reativação e as duas revogações ficaram registradas na trilha.

## Lições aprendidas

1. A ordem importa: conter primeiro e resetar o MFA depois faz o reset retornar zero sessões revogadas. Quem responde ao incidente precisa ler esse zero como confirmação da contenção anterior, não como falha.
2. Reativar uma conta não devolve autoridade administrativa. O procedimento operacional deve prever o cadastro de um novo fator como etapa própria, com quem confirma a identidade da pessoa.
3. A detecção depende hoje de consulta manual a `audit_logs` e `admin_sessions`. Não há alerta automático, correlação nem retenção fora do banco da aplicação.
4. `LOGIN_FAILED` é registrado sem ator quando a credencial é inválida, o que é adequado para privacidade, mas impede correlacionar tentativas por conta sem outra fonte. Correlação por origem depende de log de borda, que não existe no repositório.

## Limitações

- Exercício sintético, local e de mesa. Não substitui simulação com a equipe real, nem exercício em ambiente institucional.
- Não houve teste de intrusão, varredura ou qualquer ação contra serviço externo.
- Não foram exercitados: alerta automático, SIEM, retenção de log fora do banco, restauração a partir de backup, comunicação a titulares, notificação à autoridade e acionamento de plantão. Todos dependem de decisão externa — ver `TBD-STI-05`, `TBD-STI-07` e as pendências de governança em [decisions.md](decisions.md).
- O exercício comprova o comportamento do banco e das funções; não comprova o comportamento do provedor de autenticação sob carga real nem a eficácia do processo humano.

## Resultado

Os oito passos previstos foram executados e produziram o resultado esperado: a atividade foi detectada com dados já persistidos, o ator foi identificado pela trilha, a contenção revogou as sessões no servidor, a evidência resistiu a adulteração e a recuperação exigiu novo fator MFA.

O exercício não constitui homologação, aceite institucional nem prova de prontidão para produção.
