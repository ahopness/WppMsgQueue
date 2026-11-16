# Fila de Mensagens WhatsApp

Extensão Chrome Manifest V3 para preparar uma mensagem para até 50 números. Cada conversa abre no WhatsApp Web quando você solicita. O envio é manual.

## Instalação no Chrome

1. Em Chrome 116 ou mais recente, abra `chrome://extensions` e ative **Modo do desenvolvedor**.
2. Clique em **Carregar sem compactação** e selecione a pasta `dist/`.
3. Clique no ícone **Fila de Mensagens WhatsApp** para abrir a fila no painel lateral.

Se já tiver a extensão instalada, clique em **Recarregar** no cartão em `chrome://extensions` e autorize o acesso ao painel lateral se o Chrome solicitar.

Para gerar `dist/` a partir do código-fonte, use Node.js 22.12 ou mais recente.

```sh
npm ci
npm run build
```

## Uso

1. Cole um número por linha. Use DDD para números brasileiros e `+` com código de país para números internacionais.
2. Revise os erros e desmarque os números que devem sair da fila. A primeira ocorrência de cada número é mantida.
3. Digite a mensagem, confirme o consentimento e selecione **Criar fila**. Respeite pedidos de descadastramento.
4. Use **Voltar** e **Próximo** para navegar ou **Abrir conversa e avançar** para abrir o WhatsApp Web com a mensagem preenchida. Ao abrir a aba, a extensão marca o contato como **Aberta** e seleciona o próximo pendente.
5. Envie a mensagem no WhatsApp Web. A extensão limpa a lista automaticamente quando todas as abas de conversa tiverem sido abertas.

O painel fica visível ao trocar de aba na mesma janela. As aberturas são salvas no perfil local do Chrome. O status **Aberta** registra a abertura da aba. O WhatsApp Web determina se o número tem uma conta e recebe o envio manual.

O número e a mensagem são passados ao WhatsApp Web por uma URL direta, com o texto codificado em UTF-8. A extensão usa as permissões `storage` e `sidePanel`.

## Testes

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run build
npm run test:e2e
```

O Playwright carrega a extensão compilada e verifica a configuração do painel lateral, a navegação, o status persistido, a limpeza da lista e o texto dos links. As conversas são substituídas por abas locais durante os testes.
