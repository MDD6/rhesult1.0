import type { LeadershipTab, ServiceTab, TeamMember } from "./types";

export const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "Janine Feitosa",
    role: "Head de Estratégia",
    image: "/assets/images/janine.png",
    quote: "Conectar objetivos de negócio com gestão de pessoas é o que impulsiona resultados reais.",
    linkedin: "https://www.linkedin.com/in/janine-machado-monte-feitosa-bezerra-692a8942/",
  },
  {
    name: "Matheus Dresch",
    role: "Tech Recruiter Lead",
    image: "/assets/images/Matheus.jpg",
    quote: "Encontrar o talento certo é sobre entender cultura, não apenas requisitos técnicos.",
    linkedin: "https://www.linkedin.com/in/matheusddresch/",
  },
  {
    name: "George Feitosa",
    role: "Consultor Sênior",
    image: "/assets/images/george.jpg",
    quote: "Desenvolver liderança é criar um legado de sucessão e autonomia para a empresa.",
    linkedin: "https://www.linkedin.com/in/george-feitosa-37b831209/",
  },
  {
    name: "Tatiane Vasconcelos",
    role: "Psicóloga Organizacional",
    image: "/assets/images/tatiane.jpeg",
    quote: "Análise comportamental fornece os dados necessários para decisões assertivas.",
    linkedin: "https://www.linkedin.com/in/-tatianevasconcelos/",
  },
  {
    name: "Deyse Maia",
    role: "Customer Success",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    quote: "Meu foco é conectar pessoas com oportunidades reais de crescimento.",
    linkedin: "https://www.linkedin.com/in/deyse-maia-7301021a3/",
  },
];

export const SERVICE_TABS: ServiceTab[] = [
  {
    tag: "seleção",
    title: "Contrate melhor com seleção estruturada",
    desc: "Definimos perfil, critérios e etapas. Avaliamos aderência cultural e reduzimos decisões no feeling.",
    list: [
      "Alinhamento de perfil e cultura",
      "Entrevistas com roteiro e critérios",
      "Parecer final objetivo e documentado",
    ],
    bg: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=2000&q=70",
  },
  {
    tag: "t&d",
    title: "Desenvolva líderes e equipes com foco no dia a dia",
    desc: "Treinamentos aplicáveis: liderança, comunicação, rotina de gestão e performance.",
    list: ["Programas sob medida", "Acompanhamento e reforço", "Evolução com indicadores"],
    bg: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=2000&q=70",
  },
  {
    tag: "clima",
    title: "Entenda o clima e transforme diagnóstico em ação",
    desc: "Pesquisa, leitura do cenário e plano prático para engajamento e produtividade.",
    list: ["Diagnóstico por áreas", "Prioridades e responsáveis", "Ações e acompanhamento"],
    bg: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2000&q=70",
  },
  {
    tag: "consultoria",
    title: "Estruture processos e indicadores de RH",
    desc: "Políticas, rotinas, cadência e métricas para sustentar o crescimento da empresa.",
    list: ["Processos claros", "Indicadores e cadência", "Gestão com previsibilidade"],
    bg: "https://images.unsplash.com/photo-1554774853-b414d2a2ad38?auto=format&fit=crop&w=2000&q=70",
  },
];

export const LEADERSHIP_TABS: LeadershipTab[] = [
  {
    tag: "Liderança",
    title: "Liderar com consciência, empatia e resultado",
    desc: "Liderar sem humanizar deixou de ser uma opção. Resultados sustentáveis caminham junto com relações saudáveis e engajamento genuíno.",
    list: [
      "Liderança relacional com responsabilidade",
      "Cultura de confiança e performance",
      "Desenvolvimento contínuo de gestores",
    ],
    bg: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80",
    content: `## Liderança Humanizada e Performance Sustentável

Liderar sem humanizar deixou de ser uma opção. As organizações que desejam crescer de forma sólida precisam compreender que resultados financeiros sustentáveis caminham junto com relações saudáveis, engajamento genuíno e desenvolvimento real das pessoas.

Hoje, líderes são avaliados não apenas por metas alcançadas, mas por indicadores como clima organizacional, escuta ativa, confiança e capacidade de desenvolver equipes. É nesse contexto que o RH assume um papel verdadeiramente estratégico.

Na RHESULT, vamos além dos processos. Formamos lideranças preparadas para conduzir pessoas, relações e decisões com consciência, empatia e responsabilidade. Acreditamos em um modelo de gestão mais relacional e menos hierárquico, capaz de gerar performance sem abrir mão da saúde emocional e do crescimento coletivo.

**Transformamos liderança em resultado humano e estratégico.**

### Práticas de liderança humanizada que impulsionam o engajamento da equipe

A liderança humanizada deixou de ser um conceito abstrato e passou a ser um fator direto de engajamento, produtividade e retenção de talentos. Organizações que desejam equipes comprometidas precisam estruturar práticas que coloquem as pessoas no centro das decisões.

Entre as principais práticas de liderança humanizada, destacam-se:
- **Escutar antes de agir**, compreendendo contextos, desafios e percepções da equipe.
- **Reconhecer esforços**, não apenas resultados, valorizando o processo e o desenvolvimento contínuo.
- **Comunicar-se de forma clara e empática**, fortalecendo relações de confiança.
- **Oferecer autonomia com responsabilidade**, estimulando protagonismo e senso de pertencimento.
- **Cuidar da saúde mental da equipe**, promovendo ambientes psicologicamente seguros e sustentáveis.

Liderar não é apenas conduzir pessoas rumo a metas. É criar ambientes onde as pessoas se sintam seguras, engajadas e motivadas a entregar o seu melhor de forma consistente e consciente.`,
  },
  {
    tag: "Desenvolvimento",
    title: "Capacitação contínua como estratégia",
    desc: "Investir em competências técnicas e comportamentais fortalece competitividade e inovação.",
    list: [
      "Jornadas práticas por contexto",
      "Aplicação no dia a dia das equipes",
      "Acompanhamento de evolução",
    ],
    bg: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1600&q=80",
    content: `## Desenvolvimento Contínuo como Estratégia de Negócio

Capacitação contínua não é mais um diferencial — é uma necessidade estratégica. Em um mercado onde funções, tecnologias e modelos de trabalho mudam em ritmo acelerado, investir apenas em habilidades técnicas já não sustenta resultados no médio e longo prazo.

O novo foco do RH está no desenvolvimento de competências comportamentais essenciais para o futuro, como adaptabilidade, colaboração, pensamento crítico e capacidade de aprender continuamente.

Mais do que promover treinamentos pontuais, o RH passa a orquestrar jornadas de desenvolvimento alinhadas à estratégia do negócio. Na RHESULT, acreditamos que desenvolver pessoas é desenvolver a própria empresa.

Capacitação não é custo. É investimento direto em competitividade, inovação e sustentabilidade dos resultados. O futuro pertence às organizações que aprendem mais rápido do que o mercado muda.

### Programa de desenvolvimento de lideranças

Desenvolver líderes é construir resultados sustentáveis. O Programa de Desenvolvimento de Lideranças da RHESULT atua diretamente dentro das empresas, levando conhecimento estratégico para perto de quem faz a gestão acontecer no dia a dia.

Mais do que teoria, o programa é estruturado para gerar impacto real no negócio, conectando pessoas, decisões e resultados.

#### Como funciona

Os encontros são conduzidos a partir da realidade da organização e marcados por:
- Aprendizado aplicado aos desafios reais do negócio
- Trocas qualificadas entre gestores e líderes
- Reflexões profundas sobre comportamento, postura e tomada de decisão
- Discussões práticas sobre desafios cotidianos da liderança
- Desenvolvimento de práticas voltadas para uma gestão mais humana, eficiente e estratégica

#### Resultados para a empresa

Quando uma empresa investe intencionalmente no desenvolvimento de seus líderes, ela fortalece toda a sua estrutura organizacional. Os impactos são percebidos em:
- Times mais engajados e comprometidos
- Comunicação mais clara e objetiva
- Redução de retrabalho e conflitos
- Tomadas de decisão mais seguras
- Entregas consistentes e alinhadas à estratégia do negócio

Desenvolver liderança não é tendência. É uma necessidade para organizações que desejam crescer com solidez, consciência e visão de futuro.`,
  },
  {
    tag: "RH do Futuro",
    title: "Diversidade e inclusão com consistência",
    desc: "Ambientes justos exigem processo, escuta ativa e métricas para sustentação no longo prazo.",
    list: [
      "Revisão de práticas e políticas",
      "Formação contínua de lideranças",
      "Ambiente seguro e produtivo",
    ],
    bg: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1600&q=80",
    content: `## EM 2026, O RH do futuro assume um papel ainda mais ativo

O RH do futuro assume um papel ainda mais ativo e responsável na construção de ambientes organizacionais justos, diversos e inclusivos. Isso envolve investir em formações contínuas, revisar políticas com um viés verdadeiramente inclusivo e criar canais consistentes de escuta ativa para os diferentes grupos internos.

Mais do que iniciativas isoladas, diversidade exige processos sustentáveis, acompanhamento de indicadores e decisões alinhadas à equidade no dia a dia da organização.

Na RHESULT, acreditamos que ambientes diversos só geram valor quando as pessoas se sentem seguras para ser quem são, reconhecidas por suas singularidades e valorizadas pelo que entregam.

**Diversidade com estratégia, consistência e resultado humano.**

### Pilares de ação

1. **Formação Contínua de Lideranças**
   - Programas de sensibilização sobre diversidade e inclusão
   - Desenvolvimento de competências comportamentais
   - Lideranças preparadas para ambientes diversos

2. **Revisão de Processos e Políticas**
   - Análise de vieses em recrutamento e seleção
   - Políticas de remuneração equitativas
   - Planos de carreira acessíveis e transparentes

3. **Escuta Ativa e Representatividade**
   - Canais de comunicação para grupos sub-representados
   - Grupos de afinidade e comitês de diversidade
   - Feedback contínuo sobre clima organizacional

4. **Métricas e Accountability**
   - Indicadores claros de diversidade e inclusão
   - Acompanhamento regular de progresso
   - Responsabilidade na gestão pelos resultados`,
  },
];

export const LOGOS = Array.from({ length: 22 }, (_, i) => `/assets/logos/${i + 1}.png`);
