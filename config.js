/* Configuração do painel. Nada aqui é segredo: clientId e tenantId são públicos por natureza. */
window.DASH_CONFIG = {
  // Registro do app no Microsoft Entra ID (Visão geral do app registrado)
  clientId: 'df92495d-0e8f-452f-b13d-6f1d6b045001',
  tenantId: '397a0228-9fe3-4b69-a1d7-76c73685b8fa',

  // Deixe null para usar o próprio endereço do site como Redirect URI
  redirectUri: null,

  // Link de compartilhamento da pasta onde ficam os Excel
  folderUrl: 'https://dahuabrasil-my.sharepoint.com/:f:/g/personal/angelo_castro_dahuabrasil_onmicrosoft_com/IgDRWBm6KY9-Q7OGG95HYHuoAbe5Bem_UXlE6ufTnyKQc0I?e=GXNdwu',

  // Como achar cada arquivo na pasta (trecho do nome, aceita expressão regular).
  // Se houver mais de um, o painel usa o alterado mais recentemente.
  files: {
    projetos: 'main.?control.?table',        // abas ProjectList, Technical Support, Call Center, ITR database
    rma: 'RMA.?consolidado',               // aba Database
    riscos: 'Project.?Database'            // aba que começa com "RAT"
  },

  // Chave dos mapas de fundo da CARTO (carto.com/basemaps/apikey). Vai na URL de cada imagem do mapa,
  // então é pública por natureza; o limite de uso fica atrelado a ela.
  cartoKey: 'cb1_4jc3_1_a04365c9525a22a24b91dee0',

  // Recarrega os dados sozinho a cada N minutos (0 desliga)
  refreshMinutes: 10
};
