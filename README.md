# Portal CARB

Base documental do Portal do Centro Acadêmico Ruy Barbosa (CARB), concebido como ponto único de acesso a informações e serviços da vida acadêmica.

## Estado

Este repositório inicia pela documentação da arquitetura e da conformidade. A implementação deve começar somente após a validação dos itens marcados como `TBD` e dos critérios de aceite da STI-UFBA.

## Escopo funcional

- avisos e notícias acadêmicas;
- catálogo de cursos e oportunidades;
- hub de sistemas institucionais;
- planejador de matrícula;
- solicitação de carteirinha estudantil;
- integrações futuras, condicionadas a avaliação: vagas, agente de matrícula e AcademyCARB.

## Documentação

- [Desenho completo do projeto](docs/architecture.md)
- [Matriz de conformidade](docs/compliance.md)
- [Segurança](docs/security.md)
- [Privacidade e proteção de dados](docs/privacy.md)
- [Acessibilidade](docs/accessibility.md)
- [Migração Supabase -> STI-UFBA](docs/sti-migration.md)

## Convenções de rastreabilidade

Cada requisito recebe um identificador estável:

- `OBR-*`: requisito obrigatório, decorrente de lei, norma aplicável, política institucional ou condição de homologação;
- `REC-*`: recomendação de boa prática ou controle cuja aplicabilidade deve ser confirmada;
- `DA-*`: decisão arquitetural do projeto;
- `TBD-*`: definição pendente de autoridade competente.

Um requisito só pode ser considerado atendido quando possuir evidência verificável, responsável e critério de aceite. Planejamento ou intenção não equivalem a implementação.

## Decisões vigentes

1. React + TypeScript + Tailwind CSS + Shadcn/ui no frontend (`DA-ARC-01`).
2. PostgreSQL/Supabase na fase inicial, com RLS e migrações SQL versionadas (`DA-ARC-02`).
3. Dados pessoais não serão acessados diretamente pelo frontend em operações privilegiadas (`DA-SEC-01`).
4. O planejador de matrícula será local-first sempre que possível, sem persistir grade ou histórico do estudante (`DA-PRIV-01`).
5. Integrações externas não entram no MVP sem avaliação formal de privacidade, segurança e contratação (`DA-ARC-03`).
6. A STI-UFBA é o destino de homologação e hospedagem; capacidades exatas de identidade, execução, banco e armazenamento permanecem `TBD` (`DA-MIG-01`).

## Critério mínimo para iniciar código

- escopo do MVP aprovado;
- controlador, operadores e responsáveis definidos;
- inventário inicial de dados e bases legais validado;
- arquitetura e modelo de ameaças aprovados;
- requisitos da STI-UFBA confirmados;
- critérios de acessibilidade e segurança incorporados ao backlog.

