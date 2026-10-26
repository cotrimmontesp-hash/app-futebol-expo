# Futebol

Tabelas, resultados, próximos jogos e artilheiros das principais competições, jogos de hoje e a escalação oficial no campo. Os dados vêm da API que já está no ar em https://app-futebol-1ric.onrender.com. O PWA antigo não é alterado. A estrela marca um time favorito neste aparelho.

## Rodar

Precisa do Node.js 22.

```bash
npm install
npx expo start
```

A URL da API fica em `EXPO_PUBLIC_API_URL`. O padrão está no `.env.example`: `https://app-futebol-1ric.onrender.com`. No celular e no emulador o app chama essa URL. Na web, o app chama `/api` no mesmo endereço. O `vercel.json` encaminha isso para o servidor do Render, então o repositório antigo não precisa liberar CORS.

## Web

```bash
npx expo export -p web
npm run preview:web
```

Abre http://localhost:4173. A Vercel usa o mesmo comando de build e a pasta `dist`.

## Notificações

No navegador, em Favoritos, **Ativar notificações** usa Web Push nas rotas `/api/push/status`, `/api/push/registrar` e `/api/push/remover`. A chave pública VAPID vem do servidor. Se o Render estiver sem as variáveis VAPID, o botão não aparece.

No aplicativo Android/iOS o aviso push ainda não funciona. Falta:

- `google-services.json` do Firebase e a chave FCM no EAS (Android), e a chave APNs no EAS (iOS). Nada disso está no repositório e o app não inventa credencial.
- `EXPO_PUBLIC_NATIVE_PUSH_ENABLED=true` e o `projectId` do EAS (`eas init`), só depois das credenciais. No `app.json`, `expo-notifications` está com `enableRemoteNotifications: false` até existir a chave da Apple.
- O servidor atual só guarda inscrição Web Push. Ele recusa um token do Expo, e este app não envia esse token para lá.
