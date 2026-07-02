# Gincana Online

MVP estatico para gincana de igreja. A Vercel entrega somente HTML, CSS e JavaScript; o navegador acessa o Supabase diretamente com `@supabase/supabase-js` via CDN.

## Arquitetura

- `public/index.html`: placar publico.
- `public/admin.html`: painel administrativo.
- `public/exam.html`: prova publica.
- `public/assets/supabase.js`: configuracao e operacoes de banco.
- `supabase/schema.sql`: tabelas, migracao do schema antigo e permissoes.
- `vercel.json`: diretorio estatico e rewrites amigaveis.

Nao ha servidor Python, API propria, build ou Vercel Function.

## Configurar o Supabase

1. Abra **Supabase > SQL Editor** no projeto.
2. Execute todo o arquivo `supabase/schema.sql`.
3. Confirme que as tabelas `scores`, `exams` e `submissions` aparecem no Table Editor.

O SQL migra automaticamente as tabelas da versao Python, caso elas ainda existam, e preserva placar, provas e respostas.

O cliente usa a URL e a chave publica definidas em `public/assets/supabase.js`. A chave publishable/anon foi feita para uso no navegador; nunca coloque uma chave `service_role` ou secret nesse arquivo.

## Seguranca do MVP

Este projeto foi intencionalmente configurado para uma gincana pequena:

- A senha ADM e `gincana123`, validada no navegador e salva no `localStorage`.
- O RLS esta desativado nas tres tabelas.
- A role `anon` pode ler e alterar os dados.
- As respostas corretas ficam no JSON da prova e podem ser vistas por alguem com conhecimento tecnico.

Isso dificulta apenas o uso casual da interface; **nao e seguranca real**. Antes de usar em um contexto maior, adote Supabase Auth, RLS por usuario e uma funcao protegida para correcao e administracao.

## Rodar localmente

Qualquer servidor de arquivos estaticos funciona. Por exemplo:

```bash
npx --yes serve public
```

Abra os enderecos exibidos pelo comando:

- `/` para o placar.
- `/admin.html` para o painel local.
- `/exam.html?id=ID_DA_PROVA` para uma prova local.

Os atalhos `/admin`, `/exam/ID` e `/prova/ID` sao aplicados pela Vercel em producao.

## Deploy na Vercel

Importe o repositorio na Vercel e publique. O `vercel.json` define `public` como output estatico e contem somente rewrites:

- `/admin` -> `/admin.html`
- `/exam/:id` -> `/exam.html?id=:id`
- `/prova/:id` -> `/exam.html?id=:id`

Nao configure `DATABASE_URL`, runtime Python ou Function. Tambem nao e necessario configurar variaveis de ambiente para esta versao, pois a URL e a chave publica do Supabase estao no JavaScript do navegador.

## Funcionalidades

- Placar Meninos/Meninas com polling a cada 5 segundos e barras animadas.
- Edicao do placar no ADM.
- Criacao, edicao, ativacao e exclusao de provas.
- Questoes de escolha unica, multipla selecao, texto curto e texto longo.
- Imagem opcional por URL ou data URL.
- Uma pergunta por vez, progresso, protecoes basicas e contagem de saidas da aba.
- Correcao automatica das questoes objetivas.
- Respostas agrupadas por prova e por grupo, com resumo e detalhes.

## Melhorias futuras

- Trocar a senha local por Supabase Auth e habilitar RLS real.
- Mover a correcao automatica para uma RPC ou Edge Function protegida.
- Fazer upload de imagens no Supabase Storage em vez de salvar base64.
- Adicionar revisao manual e pontos para respostas de texto.
- Exportar respostas em CSV.
