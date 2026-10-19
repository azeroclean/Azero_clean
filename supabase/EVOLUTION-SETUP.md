# Azero Clean: WhatsApp pela Evolution API

Todas as mensagens saem pela Evolution API na VPS da Azero, pela Edge Function `send-whatsapp`.

| Quando | Quem recebe | Mensagem |
| --- | --- | --- |
| Cliente agenda pelo site | Cliente | "Recebemos seu agendamento" com os detalhes e a localização |
| Cliente agenda pelo site | Dono (`OWNER_WHATSAPP`) | "🔔 Novo agendamento no site" |
| Admin confirma | Cliente | "Seu agendamento foi confirmado" com os detalhes e a localização |
| Admin remarca ou troca o serviço | Cliente | "O que mudou" e "Como ficou" |
| Admin cancela ou exclui | Cliente | aviso de cancelamento |
| 15 minutos antes do horário | Cliente | "⏰ Faltam 15 minutos" com endereço e link Como chegar |

## Pré-requisitos

1. Evolution rodando na VPS.
2. **Acesso pela internet com HTTPS**, porque a função roda nos servidores do Supabase, não na sua VPS:
   - Domínio ou subdomínio (DuckDNS é grátis) com Nginx e Certbot apontando para a porta 8080.
   - Ou Cloudflare Tunnel (`cloudflared`), que dispensa abrir a 8080.
   - `http://IP:8080` funciona, mas a apikey viaja sem criptografia. Use só para teste.
3. Uma instância da Azero criada e conectada ao **número de WhatsApp da Azero**.

## Configuração

### 1. Secrets

```bash
supabase secrets set EVOLUTION_URL=https://wa.seudominio.com EVOLUTION_API_KEY=SUA_CHAVE EVOLUTION_INSTANCE=azero-clean --project-ref vicrmbzgpmzfmehklzrf
```

O aviso de **novo agendamento para o dono** vai para o número do secret `OWNER_WHATSAPP` (com DDI). Use um número **diferente** do que está conectado na Evolution; sem esse secret, o dono não recebe esse aviso (o cliente continua recebendo o "Olá… recebemos"):

```bash
supabase secrets set OWNER_WHATSAPP=5588994987680 --project-ref vicrmbzgpmzfmehklzrf
```

Opcionais: `BUSINESS_ADDRESS` e `BUSINESS_MAPS_URL` trocam o endereço e o link "Como chegar" das mensagens sem publicar a função de novo. `WEBHOOK_SECRET` protege a função contra chamadas de fora (use o mesmo valor em `whatsapp-trigger.sql`).

### 2. Publicar a função

```bash
supabase functions deploy send-whatsapp --project-ref vicrmbzgpmzfmehklzrf
```

### 3. Gatilhos no banco (SQL Editor)

1. `supabase/whatsapp-trigger.sql`: mensagens de novo agendamento e confirmação.
2. `supabase/lembrete-15min.sql`: lembrete 15 minutos antes (precisa do `pg_cron`; se der erro, ative em Database → Extensions).

### 4. Testar

Faça um agendamento pelo site e depois confirme pelo painel admin. Em **Edge Functions → send-whatsapp → Logs**, procure `"cliente":"ok"`. No SQL Editor:

```sql
select created, status_code, content from net._http_response order by created desc limit 5;
```

## Erros comuns nos logs

| Log | Causa |
|---|---|
| `Evolution API não configurada`, `missing: [...]` | falta algum secret |
| `Evolution 401` | `EVOLUTION_API_KEY` errada |
| `Evolution 404` | `EVOLUTION_INSTANCE` com o nome errado |
| `Evolution 400 ... "exists":false` | o número do cliente não tem WhatsApp |
| `TimeoutError` / `connection refused` | VPS fora do ar, porta fechada ou HTTPS mal configurado |
| a mensagem sai, mas "não entrega" | a instância desconectou: veja `GET /instance/connectionState/azero-clean` |

## Mais empresas no mesmo servidor

Crie uma instância por empresa (`POST /instance/create` com outro `instanceName`). Em cada projeto Supabase, aponte o `EVOLUTION_INSTANCE` para a instância daquela empresa. A Evolution e a VPS são as mesmas para todas.
