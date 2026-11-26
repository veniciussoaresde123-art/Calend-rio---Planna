# Planna

Agenda pessoal mobile-first para a Anna. A Fase 1 inclui autenticação pelo Supabase Auth e cadastro, consulta, edição, conclusão e exclusão de compromissos protegidos por RLS.

## Tecnologias

- React 19 + TypeScript + Vite
- Supabase Auth e Postgres (projeto já conectado)
- Horários apresentados e interpretados no fuso `America/Bahia`

## Preparar para rodar

1. Instale Node.js 20.19+ ou 22.12+ e pnpm.
2. Copie `.env.example` para `.env.local` e preencha os dados do Supabase. A URL e a chave `sb_publishable_...` são credenciais públicas próprias para o navegador; não coloque uma chave `service_role`/secret no front-end.
3. Instale as dependências com `pnpm install`.
4. Inicie em desenvolvimento com `pnpm dev` e abra o endereço local exibido.

O schema inicial foi aplicado ao projeto Supabase conectado e está versionado em `supabase/migrations/20261126000046_create_events.sql`. Se precisar recriar outro banco, aplique essa migration pelo Supabase CLI ou pelo SQL Editor.

## Configuração do Supabase Auth

- Em **Authentication → URL Configuration**, adicione o endereço local de desenvolvimento e a URL final do app às URLs permitidas.
- E-mail e senha estão implementados. Se a confirmação por e-mail estiver ativa, a Anna deverá confirmar o endereço antes do primeiro login.
- O botão Google está pronto no cliente, mas só funciona depois de ativar Google em **Authentication → Sign In / Providers** e configurar as credenciais/URLs de callback do provedor.
- A sessão é persistida e renovada pelo cliente Supabase. A chave pública não substitui a sessão: cada consulta autenticada usa o token da conta, e as políticas RLS limitam as linhas a `auth.uid()`.

## Como conferir a Fase 1

1. Cadastre uma conta com e-mail e senha (ou use uma conta existente).
2. Crie um compromisso; ele deve aparecer na agenda do dia e permanecer depois de recarregar.
3. Edite o título/horário, conclua e remova um compromisso. A exclusão pede confirmação.
4. Confira no Supabase **Table Editor → events** que os registros possuem `user_id` e em **Authentication → Policies** que RLS está habilitado.

## Etapas seguintes

- Fase 2: calendário dia/semana/mês, categorias e painel “Meu dia” completo.
- Fase 3: PWA e notificações push agendadas no servidor.
- Fase 4: entrada por voz e interpretação de linguagem natural via API protegida no servidor.
- Fase 5: configurações, tema escuro, robustez e testes.

