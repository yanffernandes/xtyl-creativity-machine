export type ImportPhase = "seu_blog_no_ar" | "mineracao" | "escala";

export interface TaskTemplate {
  name: string;
  description?: string;
  estimated_time?: number; // in minutes
  tags?: string[];
}

export const TASK_TEMPLATES: Record<ImportPhase, TaskTemplate[]> = {
  seu_blog_no_ar: [
    {
      name: "Verificar configuração do WordPress",
      description:
        "Confirmar que o WordPress está instalado e funcionando corretamente",
      estimated_time: 30,
      tags: ["setup", "wordpress"],
    },
    {
      name: "Instalar plugins essenciais",
      description:
        "Instalar e configurar plugins necessários: SEO, segurança, cache",
      estimated_time: 60,
      tags: ["setup", "plugins"],
    },
    {
      name: "Configurar tema",
      description: "Personalizar o tema com cores e identidade visual do blog",
      estimated_time: 45,
      tags: ["setup", "design"],
    },
    {
      name: "Configurar SEO básico",
      description: "Configurar títulos, meta descrições e sitemap",
      estimated_time: 30,
      tags: ["seo", "setup"],
    },
    {
      name: "Verificar velocidade do site",
      description: "Testar performance e otimizar se necessário",
      estimated_time: 30,
      tags: ["performance", "setup"],
    },
    {
      name: "Criar página Sobre",
      description: "Criar página com informações sobre o blog/autor",
      estimated_time: 30,
      tags: ["conteudo", "setup"],
    },
    {
      name: "Configurar Google Analytics",
      description: "Instalar e configurar rastreamento de visitantes",
      estimated_time: 20,
      tags: ["analytics", "setup"],
    },
    {
      name: "Verificar responsividade",
      description: "Testar o site em dispositivos móveis",
      estimated_time: 20,
      tags: ["design", "mobile"],
    },
  ],
  mineracao: [
    {
      name: "Selecionar nicho de palavras-chave",
      description: "Definir o nicho principal para pesquisa de keywords",
      estimated_time: 45,
      tags: ["seo", "pesquisa"],
    },
    {
      name: "Pesquisar 10 palavras-chave principais",
      description: "Usar ferramentas para encontrar keywords com bom volume",
      estimated_time: 60,
      tags: ["seo", "keywords"],
    },
    {
      name: "Analisar concorrência",
      description: "Estudar os principais concorrentes no nicho",
      estimated_time: 45,
      tags: ["pesquisa", "competidores"],
    },
    {
      name: "Criar plano de conteúdo",
      description: "Organizar calendário de publicações baseado nas keywords",
      estimated_time: 60,
      tags: ["planejamento", "conteudo"],
    },
    {
      name: "Definir categorias do blog",
      description: "Criar estrutura de categorias alinhada com keywords",
      estimated_time: 30,
      tags: ["estrutura", "seo"],
    },
    {
      name: "Mapear intenção de busca",
      description:
        "Classificar keywords por intenção (informacional, transacional)",
      estimated_time: 30,
      tags: ["seo", "estrategia"],
    },
    {
      name: "Identificar palavras-chave de cauda longa",
      description: "Encontrar variações específicas com menor competição",
      estimated_time: 45,
      tags: ["seo", "keywords"],
    },
    {
      name: "Criar primeiro artigo otimizado",
      description: "Escrever artigo usando a keyword principal",
      estimated_time: 120,
      tags: ["conteudo", "seo"],
    },
  ],
  escala: [
    {
      name: "Conectar conta Meta Ads",
      description: "Vincular conta do Facebook/Instagram Ads",
      estimated_time: 30,
      tags: ["ads", "meta"],
    },
    {
      name: "Configurar pixel do Facebook",
      description: "Instalar e configurar pixel para rastreamento",
      estimated_time: 20,
      tags: ["ads", "tracking"],
    },
    {
      name: "Criar primeira campanha",
      description: "Configurar campanha de teste com orçamento inicial",
      estimated_time: 60,
      tags: ["ads", "campanha"],
    },
    {
      name: "Configurar automação de disparos",
      description: "Criar fluxos automáticos para publicação de conteúdo",
      estimated_time: 45,
      tags: ["automacao", "fluxos"],
    },
    {
      name: "Analisar métricas iniciais",
      description: "Revisar dados de tráfego e engajamento",
      estimated_time: 30,
      tags: ["analytics", "metricas"],
    },
    {
      name: "Criar público personalizado",
      description: "Definir segmentação baseada em visitantes do site",
      estimated_time: 30,
      tags: ["ads", "segmentacao"],
    },
    {
      name: "Configurar remarketing",
      description: "Criar campanha para reconquistar visitantes",
      estimated_time: 45,
      tags: ["ads", "remarketing"],
    },
    {
      name: "Otimizar para conversões",
      description: "Ajustar campanhas baseado nos dados coletados",
      estimated_time: 60,
      tags: ["ads", "otimizacao"],
    },
  ],
};
