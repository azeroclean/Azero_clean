# Configurar o WhatsApp (Z-API)

O site já está pronto. Falta só ligar as chaves do Z-API.

O que acontece depois de configurado:

| Quando | Quem recebe | Mensagem |
| --- | --- | --- |
| Cliente agenda pelo site | Cliente | "Recebemos seu agendamento" com os detalhes, aguardando confirmação |
| Cliente agenda pelo site | Dono (secret `OWNER_WHATSAPP`) | "🔔 Novo agendamento no site" com nome, WhatsApp, data, serviços e valor |
| Admin muda o status para **confirmado** | Cliente | "Seu agendamento na Azero Clean foi confirmado" com os detalhes |

## 1. Pegar as chaves no Z-API

No painel do Z-API (https://app.z-api.io):

1. Crie ou abra a instância e conecte o WhatsApp da Azero pelo QR Code.
2. Copie o **ID da instância** e o **Token da instância**.
3. Se a **Segurança** da conta estiver ativada, copie o **Client-Token** (security token). Se estiver desativada, pode pular.

## 2. Colocar as chaves no Supabase

Supabase → seu projeto → **Edge Functions → Secrets** (ou **Project Settings → Edge Functions**) e adicione:

| Nome | Valor |
| --- | --- |
| `ZAPI_INSTANCE_ID` | ID da instância |
| `ZAPI_TOKEN` | Token da instância |
| `ZAPI_CLIENT_TOKEN` | Client-Token (só se a segurança estiver ativa) |
| `OWNER_WHATSAPP` | número do dono com DDI, ex: `5588994987680` (sem ele o dono não recebe o aviso de novo agendamento) |
| `WEBHOOK_SECRET` | uma senha qualquer, ex: `azero-2026-x7k9` (opcional, mas recomendado) |

Ou, pelo terminal:

```bash
supabase secrets set ZAPI_INSTANCE_ID=... ZAPI_TOKEN=... ZAPI_CLIENT_TOKEN=... WEBHOOK_SECRET=... --project-ref vicrmbzgpmzfmehklzrf
```

## 3. Publicar a função

```bash
supabase functions deploy send-whatsapp --project-ref vicrmbzgpmzfmehklzrf
```

## 4. Ligar os gatilhos no banco

1. Abra `supabase/whatsapp-trigger.sql`.
2. Se você criou o `WEBHOOK_SECRET`, troque `COLOQUE_AQUI_O_WEBHOOK_SECRET` pelo mesmo valor.
3. Cole tudo no **Supabase → SQL Editor** e clique em **Run**.

## 5. Testar

1. Faça um agendamento pelo site: o WhatsApp do dono deve receber o aviso.
2. No painel admin, confirme o agendamento: o cliente deve receber a confirmação.

Se nada chegar, veja **Supabase → Edge Functions → send-whatsapp → Logs**. A função diz exatamente o que faltou, por exemplo `"Z-API não configurado", "missing": ["ZAPI_TOKEN"]`.
