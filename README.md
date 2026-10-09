# Brazil Delivery Management System

Painel web estático que lê os Excel direto da pasta do SharePoint/OneDrive, com login Microsoft da empresa. Cada pessoa vê os dados com a própria permissão: quem não tem acesso à pasta entra no painel, mas não vê nada.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | O painel (layout, gráficos, login e leitura dos Excel) |
| `config.js` | IDs do app na Microsoft, link da pasta e nomes dos arquivos |
| `report.json` | Textos da semana: resumo, destaques, alertas, próximos passos e hot risks |
| `render.yaml` | Configuração opcional para o Render (Blueprint) |
| `brazil-states.geojson` | Contornos dos estados para o mapa de RMAs (Code for America, licença MIT) |

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

- `main control table` (ex.: `DS_main_control_table.xlsx`): abas `ProjectList`, `Technical Support`, `Call Center` e `ITR database`
- `RMA consolidado` (ex.: `RMA_consolidado.xlsx`): aba `Database`
- `Project Database` (ex.: `Project_Database.xlsx`): aba cujo nome começa com `RAT` (ex.: `RAT _ Week 39`)

A aba `ITR database` é opcional: se não existir, o bloco de ITRs some da aba Suporte técnico e o resto funciona normalmente.

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

## Ano dos projetos e tabelas

- **Visão executiva:** o seletor **Ano** usa a coluna `Import Year` da aba `ProjectList`. No ano mais recente, a barra mostra a carteira do escritório (execução, backlog, operação, estoque e garantia). Nos anos anteriores, mostra a fase atual dos projetos importados naquele ano. Os KPIs de call center e RMA seguem o ano escolhido; os riscos do RAT são sempre os atuais.
- **Aba Projetos:** filtro **Mostrar** (projetos ativos ou todos os projetos), filtro **Ano** e coluna **Ano** na tabela.
- **Todas as tabelas:** 10 linhas por página, com botões Anterior/Próxima e altura fixa. Trocar um filtro ou a ordenação volta pra página 1.

## Filtros da aba Suporte técnico

- **Ano:** o call center usa o mês da planilha, a base de ITR usa a coluna `Year` e os tickets da aba `Technical Support` usam o ano da `Start Time` (sem data, o ticket entra no ano mais recente da planilha).
- **Responsável:** usa a coluna `Dahua Brasil Responsible`. Nos ITRs, a pessoa é encontrada pelo primeiro nome do `Case Owner` (ex.: "Octávio" = "Octavio Jose Spirandeli"). O call center não tem responsável na planilha, então continua mostrando a equipe toda.
- **Issues por produto:** períodos de 4 semanas, 8 semanas (padrão) ou ano todo.

## Mapa de RMAs (aba RMA)

- Usa a coluna `State` (UF) da aba `Database` e segue os filtros da aba (ano, service center, garantia). O botão "Em aberto" mostra só os RMAs abertos.
- Biblioteca: **Leaflet** (gratuita, código aberto). Fundo do mapa: **CARTO** sobre dados do OpenStreetMap, gratuito para uso não comercial e com atribuição, que já aparece no canto do mapa. Para uso interno de baixo volume não há custo nem cadastro.
- O arquivo `brazil-states.geojson` precisa estar no repositório junto com o `index.html`.

## Tickets e ITRs (aba Suporte técnico)

- **Tickets de engenharia:** todas as linhas da aba `Technical Support`.
- **Com ITR:** só as linhas em que a coluna `ITR Number` tem um número de caso da HQ (ex.: `F202607080033` ou `ERR250925005`). Texto solto nessa coluna não conta.
- **ITRs abertos na HQ:** casos da aba `ITR database`, no ano mais recente da base. O gráfico separa "Suporte técnico de produto" (o mesmo número do slide "Open ITRs by month") dos outros tipos de caso.
- **ITRs em andamento:** casos da `ITR database` com status diferente de `Closed`, do mais antigo para o mais novo.

## Idiomas (PT / EN)

O painel tem português e inglês. O seletor **PT | EN** fica no canto superior direito, inclusive na tela de login.

- **Idioma inicial:** segue o idioma do navegador (português abre em PT, o resto em EN). Depois que a pessoa escolhe, o painel lembra a escolha naquele navegador.
- **Link direto em inglês:** acrescente `?lang=en` ao endereço, por exemplo `https://dashboard-ds.onrender.com/?lang=en`. Útil pra mandar pra HQ. `?lang=pt` força português.
- **Textos da interface:** ficam no início do script do `index.html`, no objeto `I18N`, com um bloco `pt` e um `en`.
- **Textos da semana:** no `report.json`, a versão em português fica na raiz e a inglesa dentro do bloco `"en"`. Ao atualizar o report, atualize os dois. Se faltar algum campo no bloco `"en"`, o painel mostra a versão em português daquele campo.
- **Dados das planilhas** (nomes de projetos, clientes, títulos do RAT, modelos) aparecem como estão no Excel, nas duas línguas.

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
