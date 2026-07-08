# Front-end

Aplicativo mobile-first em React + Vite, com empacotamento Android via Capacitor e foco nos fluxos operacionais do marketplace.

## Rodar localmente

```bash
npm install
npm run dev
```

O Vite abre em `http://127.0.0.1:5173`.

## Variaveis de ambiente

Crie `.env` a partir de `.env.example`.

- `VITE_API_URL`: URL publica da API
- `VITE_APP_VERSION`: versao visual exibida no app
- `VITE_LEGAL_VERSION`: versao juridica usada no aceite
- `VITE_ENABLE_OFFLINE_FALLBACK`: permite fallback local apenas em ambiente de teste
- `VITE_DEMO_LOGIN_EMAIL`: e-mail demo sugerido na tela de login, quando existir

Para publicacao, o ideal e usar:

```bash
VITE_ENABLE_OFFLINE_FALLBACK=false
```

Assim, uma falha da API nao vira uma conversa de teste no aparelho sem persistencia real.

## Fluxos ja implementados

- Home com busca, categorias e explicacao dos meios de pagamento
- Cadastro com aceite juridico, OTP de duplo canal e status cadastral
- Pedido aberto a orcamentos
- Aceite de proposta
- Negociacao protegida antes da liberacao do endereco completo
- Confirmacao mutua do atendimento
- Checkout com geolocalizacao operacional
- Conclusao por token ou foto
- Avaliacoes cegas
- Carteira do prestador
- Perfil com foto compactada, descricao e configuracoes
- Aviso de versao ao abrir o app

No onboarding, o app ja trata dois cenarios:

- `sandbox`: os codigos OTP podem voltar na resposta para teste
- `provider-ready`: o usuario digita manualmente os codigos recebidos nos canais mascarados

## Conta demo

Se o ambiente expuser uma conta demo controlada, a tela de login pode vir pre-preenchida via:

- `VITE_DEMO_LOGIN_EMAIL`

Nao deixe senha demo ou credenciais completas hardcoded no front para producao.

## Teste web

```bash
npm run build
npm run preview
```

## Testar como app no celular

```bash
npm run mobile:sync
npm run mobile:android
```

- `mobile:sync` gera o build web e sincroniza com a pasta Android
- `mobile:android` abre o projeto no Android Studio

### Camera e imagem

O app usa `@capacitor/camera`.

- no celular, tenta `Camera` ou `Galeria`
- na web, usa seletor de arquivo
- a foto de perfil e compactada antes de salvar em memoria local para evitar arquivos pesados

## Erro ao abrir o Android Studio

Se `npm run mobile:android` mostrar `Unable to launch Android Studio`:

1. Instale o Android Studio.
2. Abra o Android Studio pelo menos uma vez.
3. Se necessario, configure:

```powershell
$env:CAPACITOR_ANDROID_STUDIO_PATH="C:\Program Files\Android\Android Studio\bin\studio64.exe"
```

Depois rode novamente:

```bash
npm run mobile:android
```
