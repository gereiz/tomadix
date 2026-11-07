// Modelos de projeto inicial do onboarding (dados puros, sem lógica).

export interface StarterTemplate {
  key: string;
  title: string;
  genre: string;
  description: string;
  targetPlatform: string;
  aspectRatio: string;
  colorGrade: string;
  characters: Array<{
    name: string;
    role: string;
    description: string;
    physicalTraits: Record<string, any>;
  }>;
  environments: Array<{
    name: string;
    type: string;
    description: string;
    lighting: string;
  }>;
  scenes: Array<{
    title: string;
    order: number;
    description: string;
    framing: string;
    cameraMovement: string;
  }>;
}

const CORE_TEMPLATES: StarterTemplate[] = [
  {
    key: "cyberpunk_nordestino",
    title: "Neo-Sertão 2099",
    genre: "Cyberpunk",
    description: "Um sertão futurista pós-solar onde tecnologia neural e tradição do cangaço se fundem sob céus de poeira e néon.",
    targetPlatform: "Google Flow",
    aspectRatio: "2.39:1",
    colorGrade: "Amarelo desértico saturado com contrastes azul-néon ciberpunk",
    characters: [
      {
        name: "Valquíria do Sol",
        role: "Protagonista / Hackeira do Cangaço",
        description: "Pilota rebelde vestindo gibão de couro tecnológico com circuitos integrados e chapéu de vaqueiro reforçado com fibra de carbono.",
        physicalTraits: {
          age: "28 anos",
          eyes: "Implantes cibernéticos âmbar",
          wardrobe: "Gibão de couro sintetizado iluminado por LED fosco",
        },
      },
      {
        name: "Coronel Silício",
        role: "Antagonista / Magnata da Água Sintética",
        description: "Magnata corporativo frio e calculista, com terno de nanotecnologia e máscara respiratória dourada.",
        physicalTraits: {
          age: "55 anos",
          wardrobe: "Terno corporativo preto grafite com detalhes metálicos",
        },
      },
    ],
    environments: [
      {
        name: "Feira de Sucata Neural de Juazeiro",
        type: "EXTERIOR",
        description: "Mercado ao ar livre sob turbinas eólicas gigantes e letreiros holográficos em xilogravura futurista.",
        lighting: "Luz solar intensa filtrada por névoa de poeira e néons azuis",
      },
      {
        name: "Canyon dos Painéis Solares",
        type: "EXTERIOR",
        description: "Garganta rochosa árida cercada por milhares de placas solares espelhadas estalando ao calor.",
        lighting: "Pôr do sol incandescente, reflexos dourados ofuscantes",
      },
    ],
    scenes: [
      {
        title: "Chegada à Feira Neural",
        order: 1,
        description: "Valquíria atravessa os corredores da feira sob calor intenso, buscando peças de resfriamento para sua moto voadora.",
        framing: "Plano Médio / Travelling",
        cameraMovement: "Acompanhamento fluido na altura dos olhos",
      },
      {
        title: "Confronto no Canyon",
        order: 2,
        description: "Drones corporativos interceptam a heroína nas gargantas espelhadas dos coletores de energia.",
        framing: "Plano Geral / Panorâmica Anamórfica",
        cameraMovement: "Grua dinâmica descendente com corte rápido",
      },
    ],
  },
  {
    key: "suspense_noir",
    title: "Sombras da Guanabara",
    genre: "Suspense / Thriller",
    description: "Um mistério urbano nos anos 50 no Rio de Janeiro, misturando fumaça de gafieira, intriga política e chuva constante.",
    targetPlatform: "Midjourney v6",
    aspectRatio: "16:9",
    colorGrade: "Preto e branco de alto contraste, chiaroscuro clássico",
    characters: [
      {
        name: "Detetive Mauro Brandão",
        role: "Investigador Particular",
        description: "Ex-policial melancólico, sobretudo amassado, olhar cansado e cigarro fumegante.",
        physicalTraits: {
          age: "45 anos",
          wardrobe: "Sobretudo cinza escuro, chapéu fedora e gravata torta",
        },
      },
    ],
    environments: [
      {
        name: "Beco da Lapa Sob Chuva",
        type: "EXTERIOR",
        description: "Rua estreita de paralelepípedos refletindo os postes a gás e os arcos da Lapa ao fundo.",
        lighting: "Luz difusa de postes noturnos cortando poças d'água",
      },
    ],
    scenes: [
      {
        title: "O Encontro no Beco",
        order: 1,
        description: "Mauro aguarda sob o toldo de uma livraria fechada enquanto passos apressados ecoam na calçada molhada.",
        framing: "Plano Americano / Contra-Plongée",
        cameraMovement: "Câmera estática com lente 50mm f/1.4",
      },
    ],
  },
];

const MORE_TEMPLATES: StarterTemplate[] = [
  {
    key: "terror_casarao",
    title: "O Casarão do Vale",
    genre: "Terror",
    description: "Uma família herda um casarão colonial no interior onde as sombras parecem se mover quando ninguém olha.",
    targetPlatform: "Google Flow",
    aspectRatio: "2.39:1",
    colorGrade: "Verdes frios dessaturados com sombras profundas e luz de vela quente",
    characters: [
      {
        name: "Helena Duarte",
        role: "Protagonista / Herdeira",
        description: "Restauradora de arte pragmática, cética até o primeiro sinal do sobrenatural.",
        physicalTraits: { age: "34 anos", wardrobe: "Casaco de lã cru e botas de trabalho gastas" },
      },
    ],
    environments: [
      {
        name: "Corredor do Andar Superior",
        type: "INTERIOR",
        description: "Corredor longo de assoalho rangente, papel de parede descascado e portas entreabertas.",
        lighting: "Lanterna a pilha e luar azulado entrando por janelas altas",
      },
    ],
    scenes: [
      {
        title: "A Porta Entreaberta",
        order: 1,
        description: "Helena percorre o corredor escuro até uma porta que deveria estar trancada e vê luz por baixo dela.",
        framing: "Plano Médio / Over-the-shoulder",
        cameraMovement: "Dolly lento aproximando pelas costas da personagem",
      },
      {
        title: "O Reflexo",
        order: 2,
        description: "No espelho do hall, o reflexo de Helena demora meio segundo a acompanhar seu movimento.",
        framing: "Close-up / Foco raso",
        cameraMovement: "Câmera estática com rack focus do rosto para o reflexo",
      },
    ],
  },
  {
    key: "fantasia_reino",
    title: "A Coroa de Cinzas",
    genre: "Fantasia",
    description: "Uma jovem escudeira atravessa um reino em ruínas atrás da coroa que pode reacender a magia perdida.",
    targetPlatform: "Google Flow",
    aspectRatio: "2.39:1",
    colorGrade: "Dourados épicos com neblina azul-acinzentada e contraste de pintura a óleo",
    characters: [
      {
        name: "Iara Vento-Norte",
        role: "Protagonista / Escudeira",
        description: "Escudeira de cabelos trançados e armadura remendada, carrega a espada do mestre que perdeu.",
        physicalTraits: { age: "19 anos", wardrobe: "Armadura de couro remendada com capa verde-musgo" },
      },
    ],
    environments: [
      {
        name: "Ruínas da Cidadela",
        type: "EXTERIOR",
        description: "Torres partidas cobertas de hera sobre um vale coberto de névoa ao amanhecer.",
        lighting: "Raios de sol rasantes atravessando a névoa, tons dourados",
      },
    ],
    scenes: [
      {
        title: "O Vale das Torres Partidas",
        order: 1,
        description: "Iara chega ao topo da colina e contempla a cidadela em ruínas ao nascer do sol.",
        framing: "Plano Geral / Silhueta",
        cameraMovement: "Grua ascendente revelando o vale",
      },
      {
        title: "A Sombra do Dragão",
        order: 2,
        description: "Uma sombra gigantesca cobre a clareira e Iara empunha a espada, imóvel.",
        framing: "Contra-plongée / Plano Americano",
        cameraMovement: "Tilt-up lento do rosto até o céu",
      },
    ],
  },
  {
    key: "documentario_cidade",
    title: "Vozes da Feira",
    genre: "Documentário",
    description: "Retrato observacional de uma feira de rua ao amanhecer, seus feirantes e o ritmo humano do bairro.",
    targetPlatform: "Google Flow",
    aspectRatio: "16:9",
    colorGrade: "Cores naturais quentes, textura de câmera na mão, leve granulação",
    characters: [
      {
        name: "Dona Zefa",
        role: "Entrevistada / Feirante",
        description: "Vendedora de frutas há quarenta anos, voz firme e sorriso largo.",
        physicalTraits: { age: "68 anos", wardrobe: "Avental xadrez e lenço colorido" },
      },
    ],
    environments: [
      {
        name: "Feira de Rua ao Amanhecer",
        type: "EXTERIOR",
        description: "Barracas de lona, caixotes de frutas e fregueses sob a luz baixa da manhã.",
        lighting: "Luz natural suave e dourada, contraluz nas lonas",
      },
    ],
    scenes: [
      {
        title: "A Montagem das Barracas",
        order: 1,
        description: "Feirantes armam as barracas no escuro enquanto a rua desperta.",
        framing: "Plano Geral / Time-lapse",
        cameraMovement: "Câmera na mão com estabilização leve",
      },
      {
        title: "Entrevista com Dona Zefa",
        order: 2,
        description: "Dona Zefa conta como a feira mudou ao longo das décadas, entre uma venda e outra.",
        framing: "Plano Médio / Entrevista",
        cameraMovement: "Câmera fixa com pequenos reenquadramentos",
      },
    ],
  },
  {
    key: "comercial_produto",
    title: "Café da Manhã Perfeito",
    genre: "Comercial",
    description: "Filme publicitário de 30 segundos para uma marca de café, com foco em textura, vapor e sensação de aconchego.",
    targetPlatform: "Google Flow",
    aspectRatio: "16:9",
    colorGrade: "Tons quentes âmbar, alto brilho nos reflexos e fundo suavemente desfocado",
    characters: [
      {
        name: "Camila",
        role: "Protagonista / Consumidora",
        description: "Jovem profissional que desfruta de um momento de calma antes de sair para o trabalho.",
        physicalTraits: { age: "29 anos", wardrobe: "Suéter bege e cabelos soltos" },
      },
    ],
    environments: [
      {
        name: "Cozinha Ensolarada",
        type: "INTERIOR",
        description: "Cozinha clara com bancada de madeira, xícaras de cerâmica e janela grande.",
        lighting: "Luz de janela lateral suave com contraluz no vapor",
      },
    ],
    scenes: [
      {
        title: "O Café Sendo Servido",
        order: 1,
        description: "Close do café sendo despejado na xícara, com vapor subindo em câmera lenta.",
        framing: "Macro / Close-up",
        cameraMovement: "Slider lateral lento em câmera lenta",
      },
      {
        title: "O Primeiro Gole",
        order: 2,
        description: "Camila fecha os olhos e sorri ao provar o café, com a luz da manhã no rosto.",
        framing: "Plano Médio Fechado",
        cameraMovement: "Dolly-in suave",
      },
    ],
  },
  {
    key: "anime_guardia",
    title: "Guardiã de Neon",
    genre: "Anime",
    description: "Estilo anime de ação: uma estudante com poder de luz protege a cidade à noite sob letreiros de neon.",
    targetPlatform: "Google Flow",
    aspectRatio: "16:9",
    colorGrade: "Cores saturadas, contornos marcados, brilhos magenta e ciano",
    characters: [
      {
        name: "Mika Hoshino",
        role: "Protagonista / Guardiã",
        description: "Estudante de uniforme escolar que se transforma em guerreira com armadura de luz.",
        physicalTraits: { age: "16 anos", wardrobe: "Uniforme escolar azul-marinho com laço vermelho" },
      },
    ],
    environments: [
      {
        name: "Telhados da Cidade Neon",
        type: "EXTERIOR",
        description: "Telhados molhados de chuva sob letreiros de neon e uma lua enorme ao fundo.",
        lighting: "Neon magenta e ciano com lua cheia como contraluz",
      },
    ],
    scenes: [
      {
        title: "A Transformação",
        order: 1,
        description: "Mika salta entre prédios e se transforma em pleno ar, cercada por faixas de luz.",
        framing: "Plano Aberto / Ângulo baixo dinâmico",
        cameraMovement: "Câmera orbitando rápido com linhas de velocidade",
      },
      {
        title: "O Duelo no Telhado",
        order: 2,
        description: "Mika enfrenta uma criatura de sombras, trocando golpes sob a chuva.",
        framing: "Plano Médio / Ação",
        cameraMovement: "Whip pan acompanhando os golpes",
      },
    ],
  },
];

const BLANK_TEMPLATE: StarterTemplate = {
  key: "projeto_em_branco",
  title: "Meu Primeiro Projeto",
  genre: "Livre",
  description: "Projeto em branco com uma cena inicial para você contar a sua própria história.",
  targetPlatform: "Google Flow",
  aspectRatio: "16:9",
  colorGrade: "Natural",
  characters: [],
  environments: [],
  scenes: [
    {
      title: "Cena 1",
      order: 1,
      description: "Descreva aqui a primeira cena da sua história.",
      framing: "Plano Médio",
      cameraMovement: "Câmera estática",
    },
  ],
};

export const STARTER_TEMPLATES: StarterTemplate[] = [...CORE_TEMPLATES, ...MORE_TEMPLATES, BLANK_TEMPLATE];
