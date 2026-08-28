# Painel administrativo — v0

## Objetivo e acesso

O painel concentra as operações editoriais em `/admin`. A página pública não exibe link nem controle administrativo. Usuário e hash SHA-256 são fornecidos por `VITE_ADMIN_USERNAME` e `VITE_ADMIN_PASSWORD_HASH` em `.env.local`; uma marca em `sessionStorage` mantém a sessão até sair ou fechar a aba. O arquivo `.env.local` é ignorado pelo Git; `.env.example` contém somente chaves vazias.

**Limite verificado:** esta v0 restringe a interface, não os dados no servidor, porque ainda não existe backend. Antes de produção, autenticação, autorização por papel, MFA, validação server-side, armazenamento persistente e auditoria são obrigatórios.

## Operações disponíveis

1. Alterar o ícone de qualquer perfil com imagem de até 2 MB.
2. Criar perfil com nome e `@` único de 3 a 30 letras minúsculas ou números.
3. Criar publicação vinculada a um perfil existente.
4. Adicionar PDF de até 10 MB ao acervo.
5. Substituir o catálogo do planejador por um CSV de turmas de até 5 MB.

Todas as alterações permanecem na memória da aba. O link `CARB` no painel volta ao portal sem recarregar a página e permite conferir o resultado. Recarregar ou fechar a aba restaura os dados iniciais.

## Contrato do CSV

O grão é **uma turma ofertada por período**. A chave é `(periodo, codigo, turma)` e deve ser única. O separador pode ser vírgula ou ponto e vírgula.

Colunas obrigatórias:

- `codigo`, `componente`, `turma`, `professor`, `local`, `horarios`.

Colunas opcionais:

- `periodo`, `matriculados`, `capacidade`, `semestre_diurno`, `semestre_noturno`.

`horarios` aceita um ou mais encontros separados por `|`, no formato `dia HH:MM-HH:MM`. Exemplo sintético:

```csv
codigo;componente;turma;professor;local;horarios;matriculados;capacidade;semestre_diurno;semestre_noturno;periodo
DIR101;Direito sintético;01;Docente fictício;Sala 1;segunda 07:00-08:50|quarta 07:00-08:50;20;40;1;1;2026.2
```

O importador rejeita colunas ausentes, campos obrigatórios vazios, horários fora da grade, contagens negativas, semestres inválidos e chaves duplicadas. O CSV deve conter apenas dados públicos de oferta; listas de estudantes e matrículas individuais estão fora do contrato.

## Fluxo de estado

```text
/admin -> login local -> validação do arquivo/formulário -> estado React da aba -> visualização pública
```

Nenhum upload é enviado pela rede nesta v0. PDFs recebem uma URL temporária do navegador; imagens usam `data:` URL; publicações, perfis e turmas ficam em memória.

## Evolução obrigatória antes de produção

- autenticar no servidor com MFA e permitir apenas o papel `admin`;
- repetir autorização e validação em cada operação server-side;
- persistir metadados em banco e arquivos em armazenamento de objetos;
- registrar login, negação e alterações editoriais em trilha de auditoria;
- substituir a autenticação no frontend por um provedor server-side e guardar segredos em cofre próprio;
- testar negação de acesso, tipos/tamanhos de upload e restauração.
