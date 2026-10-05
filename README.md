# Painel de projetos Brasil D&S

Painel web estático que lê os Excel direto da pasta do SharePoint/OneDrive, com login Microsoft da empresa. Cada pessoa vê os dados com a própria permissão: quem não tem acesso à pasta entra no painel, mas não vê nada.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | O painel (layout, gráficos, login e leitura dos Excel) |
| `config.js` | IDs do app na Microsoft, link da pasta e nomes dos arquivos |
| `report.json` | Textos da semana: resumo, destaques, alertas, próximos passos e hot risks |
| `render.yaml` | Configuração opcional para o Render (Blueprint) |

## Passo 1. Registrar o app no Microsoft Entra ID (TI, uns 15 minutos)

1. Acesse https://entra.microsoft.com com uma conta de administrador.
2. Vá em **Identidade > Aplicativos > Registros de aplicativo > Novo registro**.
3. Preencha:
   - **Nome:** `Painel D&S`
   - **Tipos de conta:** *Contas somente neste diretório organizacional* (single tenant)
   - **URI de redirecionamento:** plataforma **Aplicativo de página única (SPA)**, endereço `http://localhost:8080/` (o endereço do Render entra no passo 4)
4. Clique em **Registrar** e anote, na tela **Visão geral**:
   - **ID do aplicativo (cliente)**
   - **ID do diretório (locatário)**
5. Em **Permissões de API > Adicionar permissão > Microsoft Graph > Permissões delegadas**, adicione:
   - `User.Read`
   - `Files.Read.All`
6. Clique em **Conceder consentimento do administrador para Dahua Brasil**. Isso evita que cada usuário tenha que aprovar sozinho, o que algumas políticas da empresa bloqueiam.

Não é preciso criar segredo nem certificado. O app é público (SPA) e só lê arquivos que o próprio usuário já pode abrir.

## Passo 2. Preencher o `config.js`

Troque `COLE_AQUI_O_APPLICATION_CLIENT_ID` e `COLE_AQUI_O_DIRECTORY_TENANT_ID` pelos IDs do passo 1. O link da pasta já está preenchido.

Os arquivos são encontrados por **trecho do nome**. Se tiver mais de um arquivo que bate com o trecho, o painel usa o alterado mais recentemente. Então pode continuar subindo versões com data no nome, desde que o trecho continue presente:

- `全部项目` ou `ProjectList`: abas `ProjectList`, `Technical Support` e `Call Center`
- `RMA consolidado`: aba `Database`
- `Project Database`: aba cujo nome começa com `RAT` (ex.: `RAT _ Week 39`)

## Passo 3. Publicar no Render

1. Crie um repositório no GitHub (pode ser privado) e suba estes 4 arquivos na raiz.
2. No Render: **New > Static Site**, conecte o repositório.
3. Configure:
   - **Build Command:** deixe vazio
   - **Publish Directory:** `.`
4. Clique em **Create Static Site** e anote o endereço gerado, tipo `https://dashboard-ds.onrender.com`.

Alternativa: **New > Blueprint** usando o `render.yaml`, que já define os cabeçalhos de segurança.

A cada commit no GitHub, o Render publica de novo sozinho.

## Passo 4. Cadastrar o endereço do Render no Entra ID

No registro do app: **Autenticação > Aplicativo de página única > Adicionar URI** e cole o endereço do Render **com a barra no final**: `https://dashboard-ds.onrender.com/`

O endereço precisa ser idêntico ao que aparece no navegador, senão o login dá erro `AADSTS50011`.

## Passo 5. Testar

1. Abra o endereço do Render e clique em **Entrar com a conta Microsoft**.
2. Depois do login, o painel lê a pasta e mostra os dados. No topo aparecem a hora da leitura, o usuário e os botões **Atualizar dados** e **Sair**.
3. O rodapé mostra quais arquivos foram lidos e quando foram alterados.

Para testar no computador antes de publicar, rode na pasta do projeto `python -m http.server 8080` e abra `http://localhost:8080/`.

## Controle de acesso

Quem pode ver os dados é definido pelo **compartilhamento da pasta** no SharePoint/OneDrive. Para liberar alguém, compartilhe a pasta com a pessoa (somente leitura basta). Para restringir também quem consegue fazer login, use no Entra ID: **Aplicativos empresariais > Painel D&S > Propriedades > Atribuição obrigatória = Sim**, e adicione os usuários ou grupos em **Usuários e grupos**.

## Atualização

- **Planilhas:** basta salvar os arquivos na pasta. O painel recarrega sozinho a cada 10 minutos (`refreshMinutes` no `config.js`) ou na hora pelo botão **Atualizar dados**.
- **Textos da semana:** por enquanto ficam no `report.json`. Edite direto no GitHub e o Render republica. O próximo passo é mover isso para uma aba `Report_Semanal` no Excel.

## Problemas comuns

| Mensagem | Causa e solução |
|---|---|
| `AADSTS50011` (redirect URI) | O endereço do site não está cadastrado no passo 4, ou falta a barra final |
| `AADSTS65001` ou pedido de consentimento | Falta o consentimento de administrador (passo 1, item 6) |
| "Sua conta não tem acesso à pasta de dados" | A pasta não está compartilhada com essa pessoa, ou o link da pasta mudou |
| "Não encontrei na pasta um arquivo Excel com..." | O arquivo foi renomeado e perdeu o trecho do nome configurado em `config.js` |
| "A aba ... não existe no arquivo" | Uma aba foi renomeada. Volte o nome ou ajuste o código |
| "Configuração incompleta" | `clientId` e `tenantId` ainda não foram preenchidos no `config.js` |

## Ponto de atenção

A pasta está hoje no OneDrive pessoal do Ângelo. Se a conta dele for desativada, o painel perde os dados. Quando possível, mova a pasta para um site do SharePoint ou um canal do Teams da equipe e troque o `folderUrl` no `config.js`.
