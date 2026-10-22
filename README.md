# Brazil Delivery Management System

Painel web estático que lê os Excel direto da pasta do SharePoint/OneDrive, com login Microsoft da empresa. Cada pessoa vê os dados com a própria permissão: quem não tem acesso à pasta entra no painel, mas não vê nada.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | O painel (layout, gráficos, login e leitura dos Excel) |
| `config.js` | IDs do app na Microsoft, link da pasta e nomes dos arquivos |
| `insights.js` | Análise automática: gera resumo, destaques, alertas, próximos passos, carteira por PM e riscos dos Major Projects a partir das planilhas |
| `render.yaml` | Configuração opcional para o Render (Blueprint) |
| `logo-dahua-navy.png`, `logo-dahua-white.png` | Logo da Dahua (extraído do PPT semanal), versões para fundo claro e escuro |
| `sellout.js` | Aba Project SellOut: leitura do arquivo de sell-out, estado de cada oportunidade, gráficos, mapa e tabela |
| `report.js` | Gerador do relatório em PowerPoint (carregado só quando alguém clica em Exportar relatório) |
| `BDMS_Riscos_template.xlsx` | Modelo do arquivo de riscos do painel (usado só na primeira vez que alguém registra um risco) |
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
   - `Files.ReadWrite.All` (lê os Excel e grava as pastas semanais)
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

## Análise automática (insights.js)

- O resumo da semana, os destaques, os riscos e alertas, os próximos passos, a carteira por PM e a tabela de riscos dos Major Projects são **gerados pelo painel a partir das planilhas**, a cada leitura, no idioma escolhido. Nada vem do PPT; o `report.json` não é mais usado.
- São regras transparentes, cada frase tem uma conta por trás. Exemplos: RMAs do ano x mesmo período do ano anterior; RMAs abertos há mais de 30 dias e qual service center concentra; Major Projects sem atualização; itens do RAT de importância alta e sem follow-up; ITRs antigos na HQ; backlog antigo; tickets de engenharia das últimas 4 semanas x as 4 anteriores.
- Os limites (30 dias, 14 dias, 60 dias etc.) ficam no início do `insights.js`, em `INS_CFG`, e podem ser ajustados.
- Quando existe uma semana anterior salva em `BDMS_Semanas`, os destaques começam com a comparação ("Desde a semana 40: RMAs em aberto 186 → 179"). Para isso, cada semana salva também um `metrics.json` pequeno.

## Registro e atualização de riscos (aba Riscos e issues)

- O primeiro quadro, **Riscos em aberto nos Major Projects**, vem **só** da aba `Major Risks` do Project Database (colunas Customer, Risk / Issue e Risk/Issue Information). Linhas mescladas, em que a situação continua na linha de baixo, são juntadas ao item de cima. O slide de riscos dos Major Projects no relatório usa a mesma aba. Se a aba não existir, o quadro mostra que não há itens.

- **+ Novo risco:** abre um formulário com projeto, PM responsável, tipo (risco ou issue), classificação (alta, média, baixa), descrição e data estimada de resolução. Projeto e PM sugerem nomes já usados no RAT, nos Major Projects e nos projetos ativos, mas aceitam texto livre.
- **Atualizar risco:** clique numa linha do registro para abrir o histórico e use o botão **Atualizar risco**. Cada atualização tem data, texto e, se precisar, novo status (em aberto/fechado) e nova data estimada. Funciona para os riscos novos e para os que já estão no RAT do Project Database.
- **Histórico:** o painel expandido mostra, em ordem cronológica, o registro inicial (andamento do RAT ou descrição do risco novo) e depois cada atualização, com autor, data, mudança de status e nova previsão.
- **Onde fica gravado:** no arquivo `BDMS_Riscos.xlsx`, na pasta de dados do SharePoint, criado automaticamente no primeiro registro a partir do `BDMS_Riscos_template.xlsx`. Ele tem duas tabelas do Excel:
  - `Risks`: um risco novo por linha (ID, projeto, PM, tipo, descrição, classificação, status, previsão, data e autor do registro);
  - `RiskUpdates`: uma atualização por linha (ID do risco, data, autor, texto, status e previsão quando mudam).
- O painel só acrescenta linhas, nunca apaga nem reescreve. Status e previsão exibidos são os da última atualização que os informou. O Project Database não é alterado.
- Os riscos do RAT são ligados ao histórico por um ID calculado a partir do projeto e do título. Se o título de um item mudar no RAT, o histórico antigo deixa de aparecer nele (continua no arquivo).
- É preciso permissão de edição na pasta de dados. Sem ela, o formulário mostra a mensagem e nada é gravado.

## Pastas semanais

- Dentro da pasta de dados, o painel mantém `BDMS_Semanas/<ano>-W<semana>` (ex.: `2026-W41`), uma pasta por semana, com:
  - `snapshot.json`: os dados já processados pelo painel e os textos do report daquela semana (é o que a exportação e a futura comparação entre semanas usam);
  - uma cópia dos 3 Excel de origem, como registro.
- A semana é a da última alteração dos arquivos (a mesma do cabeçalho). Sempre que alguém com permissão de edição abre o painel e as planilhas mudaram, a pasta da semana é atualizada. Quando vira a semana, começa uma pasta nova e a anterior fica congelada.
- Quem só tem leitura usa o painel normalmente; o rodapé avisa que a semana não foi salva por essa conta.
- Configuração em `config.js` (`snapshots`): nome da pasta, salvar automático e cópia dos Excel.
- Permissão no Entra ID: `Files.ReadWrite.All` **delegada**, com consentimento de administrador.

## Exportar relatório (PowerPoint)

- O botão **Exportar relatório**, no topo, abre a escolha da semana (dados atuais ou uma semana salva em `BDMS_Semanas`) e gera um arquivo `.pptx` na hora, no navegador, com os dados que o painel acabou de ler e no idioma escolhido (PT ou EN). Nada é enviado para servidor.
- 7 slides no estilo do PPT semanal: resumo executivo, carteira de projetos, Major Projects ganhos, suporte técnico, RMA, principais riscos e issues, e riscos e issues em aberto de importância alta.
- Os gráficos são nativos do PowerPoint: dá pra editar valores, cores e títulos depois de abrir.
- Os textos de resumo, alertas, próximos passos e riscos vêm da análise automática da semana escolhida.
- Biblioteca usada: PptxGenJS (gratuita, código aberto), carregada do jsDelivr só no primeiro clique.

## Semana no cabeçalho

- A semana e a data do cabeçalho vêm da **última alteração** entre os arquivos de dados da pasta (main control table, RMA consolidado e Project Database). Ao salvar qualquer um deles, o painel passa a mostrar a nova semana na próxima leitura. Passando o mouse, aparece qual arquivo foi alterado por último.
- A numeração é a semana ISO (segunda a domingo), a mesma do report semanal e da coluna `Week Open`.
- O resumo da semana é gerado pela análise automática com os dados dessa mesma semana.

## Estilo visual

- O seletor **Painel | Relatório D&S** fica no topo, ao lado de PT | EN, e o painel lembra a escolha em cada navegador.
- **Painel:** o estilo original, que segue o tema claro ou escuro do computador.
- **Relatório D&S:** mesma identidade do PPT semanal (faixa azul-marinho com o logo, fundo azul-acinzentado, cartões brancos arredondados, caixas escuras no resumo da semana, títulos em maiúsculas, paleta de gráficos do Office e fonte Aptos). É sempre claro, como o relatório.
- Link direto num estilo: acrescente `?style=report` ou `?style=panel` ao endereço (dá pra combinar com `&lang=en`).

## Major Projects (aba Projetos)

- Vêm da aba `Major Projects` do arquivo main control table. Só entram as oportunidades com `Project Status` = **Win** (as que viraram projeto).
- No filtro **Mostrar**, a opção **Major Projects (Win)** lista uma linha por projeto: Delivery PM, nível, estágio, valor (`Project Amount (10K USD)` × 10.000), receita realizada (`Total Income (USD)`), contratos ligados e data da última atualização. Clicar na linha abre último andamento, próximo passo, risco e os contratos.
- A ligação com a ProjectList é pelo código: `Project Code` (Major Projects) = `Opportunity Num` (ProjectList). Nas outras visões, os contratos desses projetos aparecem com a etiqueta **Major**.
- A aba é opcional: se não existir, a opção some do filtro.

## Filtros da aba Suporte técnico

- **Ano:** o call center usa o mês da planilha, a base de ITR usa a coluna `Year` e os tickets da aba `Technical Support` usam o ano da `Start Time` (sem data, o ticket entra no ano mais recente da planilha).
- **Responsável:** usa a coluna `Dahua Brasil Responsible`. Nos ITRs, a pessoa é encontrada pelo primeiro nome do `Case Owner` (ex.: "Octávio" = "Octavio Jose Spirandeli"). O call center não tem responsável na planilha, então continua mostrando a equipe toda.
- **Issues por produto:** períodos de 4 semanas, 8 semanas (padrão) ou ano todo.

## Mapa de RMAs (aba RMA)

- Usa a coluna `State` (UF) da aba `Database` e segue os filtros da aba (ano, service center, garantia). O botão "Em aberto" mostra só os RMAs abertos.
- Biblioteca: **Leaflet** (gratuita, código aberto). Fundo do mapa: **CARTO** sobre dados do OpenStreetMap, com atribuição no canto do mapa.
- A CARTO exige chave desde setembro/2026: ela fica em `cartoKey` no `config.js`. Uso comercial é gratuito até 1 milhão de imagens de mapa por mês, muito acima do volume de um painel interno. Sem chave, o mapa mostra o aviso "API key required".
- O arquivo `brazil-states.geojson` precisa estar no repositório junto com o `index.html`.

## Project SellOut (aba Project SellOut)

- Fonte: o arquivo de sell-out de projetos na pasta de dados (nome com "sellout", configurável em `files.sellout` no `config.js`), aba `Order`. É opcional: sem o arquivo, a aba fica escondida e o resto do painel funciona normalmente. Se houver mais de um, vale o alterado mais recentemente.
- Valor = `Amount After Discount(USD)` somando todas as linhas, então os cancelamentos se anulam com as reversões (sell-out líquido).
- **Serviço** = pedidos do tipo `仅开票` (só faturamento); o resto é **projeto**. É a mesma regra do mapa HTML que veio junto com a planilha.
- Status das linhas: `已关闭` = fechado; `等待发运`, `已输入`, `已挑库` = **aguardando embarque**; `已取消` = cancelado.
- **Estado**: a planilha não tem coluna de UF, então ele é deduzido do nome da oportunidade (padrão `BR_<estado>_...`, nome do estado, cidade, órgão conhecido como CEDAE ou SABESP, ou sigla como "SES/DF" e "- RS"). Oportunidades nacionais, com vários estados ou sem local no nome ficam em **Sem estado** (hoje cerca de 1/3 do valor). Para melhorar a cobertura, acrescente cidades ou órgãos na lista `SO_PLACES` no início do `sellout.js`.
- Comparação com o ano anterior: meses fechados do ano (o mês corrente fica de fora por estar incompleto).
- **Major: % realizado**: para os Major Projects ganhos, compara o sell-out da oportunidade com o valor do projeto (mesmo código: `Opportunity No.` = `Project Code`).
- A análise automática ganha destaques e alertas de sell-out: comparação com o ano anterior, concentração nas maiores oportunidades, pedidos parados há mais de 60 dias e Major Projects com menos de 30% do valor em sell-out. O relatório em PowerPoint ganha um slide de Project SellOut.
- As pastas semanais guardam o resumo do sell-out (no `snapshot.json`) e a cópia do Excel, mas não as linhas, que são muitas.

## Tickets e ITRs (aba Suporte técnico)

- **Tickets de engenharia:** todas as linhas da aba `Technical Support`.
- **Com ITR:** só as linhas em que a coluna `ITR Number` tem um número de caso da HQ (ex.: `F202607080033` ou `ERR250925005`). Texto solto nessa coluna não conta.
- **ITRs por mês e card de ITRs:** casos da aba `ITR database` com `Year` (col. E) = ano escolhido, `Case Type` (col. C) = **Product Technical Support** e `Local / Others` (col. D) = **Local**.
- **ITRs em andamento:** todos os casos da `ITR database` com status diferente de `Closed`, de qualquer tipo, do mais antigo para o mais novo.

## Idiomas (PT / EN)

O painel tem português e inglês. O seletor **PT | EN** fica no canto superior direito, inclusive na tela de login.

- **Idioma inicial:** segue o idioma do navegador (português abre em PT, o resto em EN). Depois que a pessoa escolhe, o painel lembra a escolha naquele navegador.
- **Link direto em inglês:** acrescente `?lang=en` ao endereço, por exemplo `https://dashboard-ds.onrender.com/?lang=en`. Útil pra mandar pra HQ. `?lang=pt` força português.
- **Textos da interface:** ficam no início do script do `index.html`, no objeto `I18N`, com um bloco `pt` e um `en`.
- **Dados das planilhas** (nomes de projetos, clientes, títulos do RAT, modelos) aparecem como estão no Excel, nas duas línguas.

## Atualização

- **Planilhas:** basta salvar os arquivos na pasta. O painel recarrega sozinho a cada 10 minutos (`refreshMinutes` no `config.js`) ou na hora pelo botão **Atualizar dados**.

## Atualizar a versão publicada

- Ao subir arquivos novos no GitHub, suba **todos os que mudaram juntos** (ex.: `index.html`, `report.js`, `insights.js`, `sellout.js`). O `index.html` e os `.js` dependem uns dos outros.
- O `index.html` carrega os scripts com um número de versão (linha `window.APP_VERSION` no `index.html`). Quando o número muda, o navegador busca os arquivos novos em vez de usar a cópia guardada.
- Se aparecer alguma mensagem estranha logo depois de publicar, recarregue a página com **Ctrl+F5**.
- No Render, vale configurar em **Settings > Headers**: `Cache-Control: no-cache` para `/*.js` e `/index.html` (o `render.yaml` já traz isso para quem usa Blueprint).

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

Os arquivos ficam no site do SharePoint **Brazil D&S Management Platform** (site DahuaTechnologyBR), e não mais no OneDrive pessoal. Para trocar de pasta no futuro, basta mudar o `folderUrl` no `config.js`.
