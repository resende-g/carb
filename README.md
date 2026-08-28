# Portal CARB — v0

Protótipo visual e funcional do Portal do Centro Acadêmico Ruy Barbosa (CARB), executado integralmente em `localhost` com dados sintéticos. A documentação normativa e arquitetural permanece em `docs/`; este protótipo não é evidência de conformidade ou prontidão para produção.

## Executar

Pré-requisito: Node.js 20.19 ou 22.12 ou superior e npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Antes de iniciar, preencha `VITE_ADMIN_USERNAME` e `VITE_ADMIN_PASSWORD_HASH` em `.env.local`; o segundo valor é o SHA-256 da senha administrativa. O arquivo local é ignorado pelo Git e nunca deve ser publicado.

Acesse `http://localhost:5173`. Para verificar a lógica e gerar a versão de produção local:

```bash
npm test -- --run
npm run build
```

O painel administrativo fica exclusivamente em `http://localhost:5173/admin`; não existe link para ele na página pública. Usuário, senha e hash reais são mantidos fora do repositório.

## Escopo implementado

- feed de avisos sintéticos com perfis institucionais, quatro reações locais e compartilhamento;
- catálogo de links públicos para sistemas, sem captura de credenciais;
- planejador alimentado com as 280 turmas do relatório de 2026.2, filtros por professor, turno e semestre, bloqueio de conflitos, grade semanal, trajetória acadêmica local e impressão em PDF;
- acervo local com as matrizes diurna/noturna e o relatório de turmas em PDF;
- painel `/admin` com login de sessão para criar publicações e perfis, alterar ícones, importar turmas por CSV e adicionar PDFs ao acervo;
- navegação responsiva, operação por teclado, foco visível e suporte a movimento reduzido.

Os dados acadêmicos estáticos estão em `src/academic-data.json` e foram extraídos dos três PDFs fornecidos para o protótipo. Eles não substituem a consulta ao SIGAA.

## Limitações do protótipo

- Reações e marcações de componentes concluídos ficam apenas em `localStorage`; alterações administrativas duram somente a sessão aberta.
- O planejador usa uma fotografia estática das turmas consultadas em 27/08/2026 ou um CSV administrativo de turmas. O portal não aceita lista de estudantes, matrícula ou histórico individual.
- O login da v0 restringe a interface no navegador, mas não é autorização server-side. Não há RLS, backend, banco, telemetria, conta estudantil, carteirinha, comentários ou integrações acadêmicas.
- Os dados e estados demonstrativos podem ser manipulados no navegador; não use este fluxo como controle editorial real.
- Não há coleta de matrícula nem solicitação de doação.

## Próximos limites de integração

Supabase ou outro backend só deve entrar após aprovação de contrato de dados, privacidade e segurança, com identidade, autorização server-side, RLS, auditoria e proteção antiabuso. A integração e a hospedagem pela STI-UFBA dependem da definição de OIDC, infraestrutura, banco, segredos, observabilidade, critérios de homologação e fontes oficiais. Nada disso está implementado nesta etapa.

## Documentação

- [Desenho completo do projeto](docs/architecture.md)
- [Matriz de conformidade](docs/compliance.md)
- [Segurança](docs/security.md)
- [Privacidade e proteção de dados](docs/privacy.md)
- [Acessibilidade](docs/accessibility.md)
- [Migração Supabase -> STI-UFBA](docs/sti-migration.md)
- [Funcionamento do painel administrativo v0](docs/admin-v0.md)

## Convenções de rastreabilidade

Cada requisito recebe um identificador estável:

- `OBR-*`: requisito obrigatório, decorrente de lei, norma aplicável, política institucional ou condição de homologação;
- `REC-*`: recomendação de boa prática ou controle cuja aplicabilidade deve ser confirmada;
- `DA-*`: decisão arquitetural do projeto;
- `TBD-*`: definição pendente de autoridade competente.

Um requisito só pode ser considerado atendido quando possuir evidência verificável, responsável e critério de aceite. Planejamento ou intenção não equivalem a implementação.

## Decisões documentais vigentes para fases posteriores

1. React + TypeScript + Tailwind CSS + Shadcn/ui no frontend (`DA-ARC-01`).
2. PostgreSQL/Supabase na fase inicial, com RLS e migrações SQL versionadas (`DA-ARC-02`).
3. Dados pessoais não serão acessados diretamente pelo frontend em operações privilegiadas (`DA-SEC-01`).
4. O planejador de matrícula será local-first sempre que possível, sem persistir grade ou histórico do estudante (`DA-PRIV-01`).
5. Integrações externas não entram no MVP sem avaliação formal de privacidade, segurança e contratação (`DA-ARC-03`).
6. A STI-UFBA é o destino de homologação e hospedagem; capacidades exatas de identidade, execução, banco e armazenamento permanecem `TBD` (`DA-MIG-01`).

## Critérios pendentes para produção

- escopo do MVP aprovado;
- controlador, operadores e responsáveis definidos;
- inventário inicial de dados e bases legais validado;
- arquitetura e modelo de ameaças aprovados;
- requisitos da STI-UFBA confirmados;
- critérios de acessibilidade e segurança incorporados ao backlog.
