# Sucessão institucional

A sucessão convida uma conta individual, exige ativação e MFA, concede a nova atribuição e encerra a anterior. A conta antiga não é reutilizada nem apagada: fica inativa, com autoria e logs preservados, e suas sessões/fatores são revogados conforme a operação.

O fluxo cobre Diretor de Comunicação/`EDITOR`, Presidente/`ADMIN` e custódia técnica/`SUPERADMIN`. A proteção do último SUPERADMIN usa transação e advisory lock. O bootstrap inicial é excepcional e reproduzível por script; depois dele, mudanças devem ocorrer pelo sistema e ficar auditadas.
