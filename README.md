<div align="center">
  <p><h2>Fila de Mensagens WhatsApp</h2></p>
  <p><h3>Enviar mensagens em batches sem o Whatsapp Business.</h3></p>
  <img width="256" height="256" alt="icon" src="https://github.com/user-attachments/assets/79040927-57f1-48e8-94e8-f098080da56d" />
  <br><br>
</div> 

MAIS UM PROJETO CRIADO A PEDIDO DA MINHA MÃE!! [(incrível como isso ta virando rotina nesse github)](https://github.com/ahopness/Vellum)

Extensão Chrome Manifest V3 para preparar uma mensagem para até 50 números. Cada conversa abre no WhatsApp Web quando você solicita. O envio é manual.

## Instalação no Chrome

(Não to afim de pagar 5 dolares pra colocar isso na loja do chrome então vai assim mesmo...)

1. Baixe a extensão na aba Releases, [bem aqui](https://github.com/ahopness/WppMsgQueue/releases).
2. Em Chrome 116 ou mais recente, abra `chrome://extensions` e ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e selecione a pasta extraída do arquivo zip que você baixou.
4. Clique no ícone **Fila de Mensagens WhatsApp** para abrir a fila no painel lateral.

Se já tiver a extensão instalada, clique em **Recarregar** no cartão em `chrome://extensions` e autorize o acesso ao painel lateral se o Chrome solicitar.

## Uso

É tudo bem auto explicativo, você da conta 👍 no máximo fica o aviso que você tem que apertar ENTER nas mensagens ainda, caso contrario essa extensão seria uma ferramenta de spam e eu não quero o Sundar Pichai batendo na minha porta.

## Compilação

Para gerar `dist/` a partir do código-fonte, use Node.js 22.12 ou mais recente.

```sh
npm ci
npm run build
```

## Testes

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run build
npm run test:e2e
```

O Playwright carrega a extensão compilada e verifica a configuração do painel lateral, a navegação, o status persistido, a limpeza da lista e o texto dos links. As conversas são substituídas por abas locais durante os testes.
