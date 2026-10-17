# Azero Clean: trocar Z-API pela Evolution API

> Esta mudança vive na branch `feat/evolution-api`. A `main` (produção) continua na Z-API
> até você fazer o merge e virar o secret `WHATSAPP_PROVIDER`.

## O que muda

`supabase/functions/send-whatsapp/index.ts` (e um texto de erro em `src/lib/admin.ts`).

- As mensagens, os eventos (novo, confirmado, alterado, cancelado), os gatilhos SQL e o painel admin ficam **iguais**.
- A função ganhou o secret `WHATSAPP_PROVIDER`:
  - Sem ele (ou com `zapi`), continua usando a Z-API. **Publicar esta versão não muda nada em produção.**
  - Com `evolution`, passa a enviar pela Evolution.
- Para voltar atrás é só trocar o secret para `zapi`, sem precisar de um novo deploy.

## Pré-requisitos

1. Evolution rodando na VPS (guia em `troca_zapi/README.md`).
2. **Acesso pela internet com HTTPS**, porque a função roda nos servidores do Supabase, não na sua VPS. Escolha uma opção:
   - Domínio ou subdomínio (DuckDNS é grátis) com Nginx e Certbot apontando para a porta 8080.
   - Ou Cloudflare Tunnel (`cloudflared`), que dispensa abrir a 8080.
   - Funciona até com `http://IP:8080`, mas aí a apikey viaja sem criptografia. Use isso só para teste.
3. Uma instância da Azero criada e conectada (passos 2 a 4 da coleção do Postman), com o nome `azero-clean`.
   - Use o **número de WhatsApp da Azero**. O WhatsApp aceita até 4 aparelhos conectados, então dá para manter a Z-API ligada durante o teste e desligá-la só depois da troca.

## Passo a passo da migração

### 1. Publicar a versão nova (sem efeito ainda)

A partir desta branch (ou da `main` depois do merge), publique:

```bash
supabase functions deploy send-whatsapp --project-ref vicrmbzgpmzfmehklzrf
```

Faça um agendamento de teste. Ele ainda deve sair pela Z-API, e o log mostra `"provider":"zapi"`.

### 2. Cadastrar os secrets da Evolution

```bash
supabase secrets set EVOLUTION_URL=https://wa.seudominio.com EVOLUTION_API_KEY=SUA_CHAVE EVOLUTION_INSTANCE=azero-clean --project-ref vicrmbzgpmzfmehklzrf
```

O aviso de **novo agendamento para o dono** vai para o número do secret `OWNER_WHATSAPP` (com DDI). Use um número **diferente** do que está conectado na Evolution; sem esse secret, o dono não recebe esse aviso no WhatsApp (o cliente continua recebendo o "Olá… recebemos"):

```bash
supabase secrets set OWNER_WHATSAPP=5588994987680 --project-ref vicrmbzgpmzfmehklzrf
```

### 3. Virar a chave

```bash
supabase secrets set WHATSAPP_PROVIDER=evolution --project-ref vicrmbzgpmzfmehklzrf
```

Teste: faça um agendamento pelo site e depois confirme pelo painel admin. Em **Edge Functions → send-whatsapp → Logs**, procure `"provider":"evolution"` e `"cliente":"ok"`.

### 4. Se algo der errado, volte na hora

```bash
supabase secrets set WHATSAPP_PROVIDER=zapi --project-ref vicrmbzgpmzfmehklzrf
```

Deixe a Z-API ativa uns dias até ter certeza. Só depois cancele o plano.

## Erros comuns nos logs

| Log | Causa |
|---|---|
| `Evolution API não configurado`, `missing: [...]` | falta algum secret |
| `Evolution 401` | `EVOLUTION_API_KEY` errada |
| `Evolution 404` | `EVOLUTION_INSTANCE` com o nome errado |
| `Evolution 400 ... "exists":false` | o número do cliente não tem WhatsApp |
| `TimeoutError` / `connection refused` | VPS fora do ar, porta fechada ou HTTPS mal configurado |
| a mensagem sai, mas "não entrega" | a instância desconectou: veja `GET /instance/connectionState/azero-clean` |

## Mais empresas no mesmo servidor

Crie uma instância por empresa (`POST /instance/create` com outro `instanceName`). Em cada projeto Supabase, aponte o `EVOLUTION_INSTANCE` para a instância daquela empresa. A Evolution e a VPS são as mesmas para todas.
