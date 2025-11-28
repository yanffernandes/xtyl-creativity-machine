# Estratégia de Naming e Internacionalização

## Parte 1: O Nome "XTYL" e Como Escolher

### Análise do Nome Atual: XTYL
*   **Prós**: Curto (4 letras), visualmente moderno, domínio `.com` provavelmente disponível ou barato (se for uma variação).
*   **Contras**:
    *   **Pronúncia Ambígua**: É "Écs-til"? "Z-til"? "Écs-tái-el"? Isso atrapalha o "boca a boca". Se o cliente não sabe falar, ele não sabe indicar.
    *   **Abstrato Demais**: Não remete a "Criatividade", "IA" ou "Marketing". Exige muito marketing para criar significado.

### Framework para Escolha de Nome (S.M.A.R.T.)
Se decidir mudar, use este filtro:
1.  **S**imple (Simples): Fácil de soletrar após ouvir uma vez. (Teste do Bar: Fale o nome num bar barulhento. A pessoa entendeu?)
2.  **M**emorable (Memorável): Gruda na cabeça? (Ex: "Velcro" vs "Fixador de Gancho").
3.  **A**vailable (Disponível): Tem `.com` ou `.ai`? Tem handle no Instagram/Twitter?
4.  **R**elevant (Relevante): Dá uma dica do que faz? (Ex: "Midjourney" sugere uma jornada; "Jasper" é um nome de mordomo/assistente).
5.  **T**imeless (Atemporal): Evite modinhas como terminar com "ly" ou "ify" se já estiver saturado.

### Sugestão Tática
*   **Mantenha XTYL?** Apenas se você já tiver apego à marca ou se "XTYL" for uma sigla com significado forte para você.
*   **Pivotar?** Se o foco é Agências, nomes que evoquem "Fluxo", "Mente", "Estúdio", "Sincronia" funcionam bem.
    *   *Ideias*: "Synapse", "FlowMind", "Draft.ai", "Briefly", "StudioOS".

---

## Parte 2: Internacionalização (i18n) - Vale a pena agora?

### Veredito: SIM, mas com escopo limitado.
Não tente abraçar o mundo (10 idiomas). Foque em **Inglês (Global)** e **Português (Brasil)**.

### Por que SIM? (Os Prós)
1.  **O Mercado de Tech é em Inglês**: Mesmo agências brasileiras usam softwares em inglês (Notion, Figma, Slack). Ter a interface em inglês passa credibilidade de "Software Global".
2.  **Dívida Técnica**: Implementar i18n (suporte a múltiplos idiomas) *depois* que o código está gigante é um pesadelo. Fazer agora, que o projeto está no início, é muito mais barato.
3.  **Expansão Imediata**: Com o app em inglês, você pode vender para qualquer país sem mudar uma linha de código, apenas o marketing.

### Por que NÃO? (Os Contras - e como mitigar)
1.  **Trabalho Dobrado**: Escrever cada texto duas vezes.
    *   *Mitigação*: Use a própria IA para traduzir os arquivos de tradução (JSONs).
2.  **Complexidade de Código**:
    *   *Mitigação*: O Next.js (seu framework) já tem suporte nativo excelente para isso. O custo técnico é baixo.

### Estratégia de Implementação "Code in English, Sell in Local"
1.  **Código**: Variáveis, comentários e commits sempre em Inglês.
2.  **Interface (UI)**: Padrão em Inglês (en-US). Opção de mudar para Português (pt-BR).
3.  **Vendas (GTM)**:
    *   Landing Page Brasileira -> Vende em Reais (R$), foca na dor local.
    *   Landing Page Global -> Vende em Dólar (USD), foca em dores universais.

### Resumo
Prepare o terreno (código) para ser global, mas foque a energia de vendas no Brasil primeiro (onde você entende a cultura e a dor profundamente). Não deixe o software "preso" ao português hardcoded.
