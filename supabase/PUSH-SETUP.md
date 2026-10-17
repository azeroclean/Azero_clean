# Notificações do admin com o site fechado (Web Push)

Depois de configurado, cada novo agendamento aparece como notificação:

- **Computador (Windows/Mac):** na barra de tarefas / central de notificações, mesmo com a aba do painel fechada.
- **Android:** na barra de notificações do celular.
- **iPhone:** só com o painel instalado na tela de início (passo 5).

Clicar na notificação abre o painel admin.

## 1. Gerar as chaves (uma vez só)

No terminal, na pasta do projeto:

```bash
npx web-push generate-vapid-keys
```

Ele mostra uma **Public Key** e uma **Private Key**. Não compartilhe a Private Key.

## 2. Cadastrar as chaves no Supabase

```bash
supabase secrets set VAPID_PUBLIC_KEY=COLE_A_PUBLIC_KEY VAPID_PRIVATE_KEY=COLE_A_PRIVATE_KEY VAPID_SUBJECT=mailto:seu@email.com
```

(ou em Supabase → Edge Functions → Secrets)

## 3. Publicar a função

```bash
supabase functions deploy notify-admin-push
```

## 4. Criar a tabela e o gatilho

No Supabase → SQL Editor, rode `supabase/push-notificacoes.sql`.
Se você usa `WEBHOOK_SECRET`, troque `COLOQUE_AQUI_O_WEBHOOK_SECRET` pelo mesmo valor antes de rodar.

## 5. Ativar em cada aparelho do admin

1. Abra o painel admin (no site publicado, não no localhost).
2. Clique em **Ativar notificações** no topo e permita quando o navegador perguntar.
3. Chega uma notificação de teste "✅ Notificações funcionando".

Faça isso em cada computador/celular que deve receber os avisos.

- **iPhone:** abra o site no Safari → botão Compartilhar → **Adicionar à Tela de Início**. Abra o app "Azero Admin" pela tela de início, entre no painel e ative as notificações.
- **Windows:** para receber com o Chrome fechado, deixe ligado Chrome → Configurações → Sistema → **"Continuar executando apps em segundo plano quando o Google Chrome estiver fechado"**. Confira também se o Windows não está em modo "Não incomodar".

## Se não chegar

- Clique de novo no botão (agora "Notificações ativas"): ele manda um teste e mostra o erro, se houver.
- Veja Supabase → Edge Functions → notify-admin-push → Logs.
- No SQL Editor: `select created, status_code, content from net._http_response order by created desc limit 5;`
