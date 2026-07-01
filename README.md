# Gincana Online

MVP simples para gincana de igreja com placar público ao vivo, provas online e painel administrativo.

## Requisitos

- Python 3.9+
- Banco PostgreSQL no Supabase

Instale as dependências:

```bash
python3 -m pip install -r requirements.txt
```

## Variáveis de ambiente

Defina estas variáveis localmente e também na Vercel:

```bash
export DATABASE_URL="postgresql://..."
export SUPABASE_URL="https://..."
export SUPABASE_ANON_KEY="..."
export ADMIN_PASSWORD="sua-senha-adm"
```

Não versione `.env` com credenciais reais. O backend usa `DATABASE_URL` para conectar ao PostgreSQL; `SUPABASE_URL` e `SUPABASE_ANON_KEY` ficam disponíveis para evoluções futuras com APIs públicas do Supabase.

Na Vercel, use em `DATABASE_URL` a connection string do **Supabase Pooler** (IPv4/Transaction Pooler ou Session Pooler), não a string **Direct connection** IPv6. Em funções serverless, a conexão direta IPv6 pode falhar com erros como `Cannot assign requested address`.

## Como rodar localmente

```bash
python3 server.py
```

Depois acesse:

- Placar público: http://127.0.0.1:8000/
- Painel ADM: http://127.0.0.1:8000/admin

Senha ADM:

```text
valor definido em ADMIN_PASSWORD
```

## Banco de dados

O projeto usa Supabase/PostgreSQL. O schema fica em:

```text
supabase/schema.sql
```

Na primeira request que usa o banco, o backend executa o schema automaticamente com `CREATE TABLE IF NOT EXISTS` e garante os registros iniciais do placar para `Meninos` e `Meninas`.

## Deploy na Vercel

O projeto já inclui:

- `vercel.json`
- `api/index.py`
- `requirements.txt`

Na Vercel, configure as mesmas variáveis de ambiente:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ADMIN_PASSWORD`

Em `DATABASE_URL`, cole a URL do Supabase em **Project Settings > Database > Connection string > Pooler**. Evite a URL Direct connection na Vercel.

Depois faça o deploy normalmente. O `vercel.json` roteia todas as URLs para `api/index.py`, que reutiliza o mesmo backend do servidor local. O import da função não abre conexão com o banco; a inicialização acontece de forma lazy dentro da primeira rota que precisa de dados.

## O que está no MVP

- Placar público com atualização automática.
- Painel ADM com login simples.
- Edição manual da pontuação de Meninos e Meninas.
- Criação e edição de provas com link público único.
- Respostas organizadas dentro de cada prova.
- Questões de múltipla escolha, múltipla seleção, texto curto e texto longo.
- Imagem opcional por URL ou arquivo convertido em base64.
- Envio de respostas com nome e grupo.
- Correção automática para múltipla escolha e múltipla seleção.
- Resumo por prova com totais por grupo e média.
- Detalhes das respostas por participante.
- Registro de saídas da aba.
- Bloqueio básico de copiar, colar, seleção de texto e botão direito durante a prova.

## Melhorias futuras sugeridas

- Upload real de imagens para Supabase Storage.
- Pontuação parcial em questões de múltipla seleção.
- Revisão manual e atribuição de pontos para questões de texto.
- Exportação das respostas em CSV.
- Usuários ADM com senha criptografada.
- WebSocket ou Server-Sent Events para atualização em tempo real.
