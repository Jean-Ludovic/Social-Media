/**
 * Development seed script.
 *
 * Populates the database with a coherent, reproducible dataset for local
 * development, demos and manual testing. Safe to re-run: it wipes every
 * table it owns (children first) before re-inserting, so the result is
 * always the same regardless of how many times it runs.
 *
 * Run with:
 *   npx prisma db seed
 *
 * See README_DEV_SEED.md for test accounts and a summary of what gets created.
 */

import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import * as bcrypt from 'bcrypt';
import { PrismaClient, PostType, FriendshipStatus, NotificationType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

loadEnv({ path: resolve(__dirname, '../.env') });

const adapter = new PrismaPg(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

const DEV_PASSWORD = 'Passw0rd!';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000);
const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000);

// ─── 1. Users ────────────────────────────────────────────────────────────────

const USER_SEED = [
  { key: 'jean',   displayName: 'Jean-Ludovic', email: 'jean-ludovic@hablamos.dev', bio: 'Développeur full-stack passionné par l\'IA et les architectures cloud. Toujours en train de coder un side-project.' },
  { key: 'alice',  displayName: 'Alice Martin',  email: 'alice.martin@hablamos.dev', bio: 'Ingénieure logiciel chez une scale-up parisienne. Fan de TypeScript et de café filtre.' },
  { key: 'bob',    displayName: 'Bob Dupont',    email: 'bob.dupont@hablamos.dev',   bio: 'Voyageur dans l\'âme, j\'ai posé mon sac dans 23 pays. Photographe amateur à mes heures perdues.' },
  { key: 'charlie',displayName: 'Charlie Roy',   email: 'charlie.roy@hablamos.dev',  bio: 'Musicien et développeur backend. Je code le jour, je joue de la guitare le soir.' },
  { key: 'emma',   displayName: 'Emma Bernard',  email: 'emma.bernard@hablamos.dev', bio: 'Data scientist obsédée par le machine learning. Je carbure au thé vert et aux modèles de langage.' },
  { key: 'lucas',  displayName: 'Lucas Moreau',  email: 'lucas.moreau@hablamos.dev', bio: 'Coach sportif et développeur React le week-end. Marathon de Paris dans le viseur.' },
  { key: 'sarah',  displayName: 'Sarah Kim',     email: 'sarah.kim@hablamos.dev',    bio: 'UX designer qui a appris à coder pour mieux embêter les devs. Adepte du dark mode partout.' },
  { key: 'david',  displayName: 'David Johnson', email: 'david.johnson@hablamos.dev',bio: 'Ingénieur DevOps, Docker et Kubernetes au quotidien. Toujours prêt à débattre du meilleur éditeur de texte.' },
  { key: 'sofia',  displayName: 'Sofia Garcia',  email: 'sofia.garcia@hablamos.dev', bio: 'Développeuse mobile et grande fan de jeux vidéo rétro. Je débug mieux après un café.' },
  { key: 'noah',   displayName: 'Noah Wilson',   email: 'noah.wilson@hablamos.dev',  bio: 'Étudiant en informatique, passionné de musique électronique et de nouvelles technologies.' },
] as const;

type UserKey = (typeof USER_SEED)[number]['key'];

// ─── 2. Post content (themes: dev, tech, IA, voyages, musique, sport, humour) ─

const POST_CONTENTS = [
  'Je viens de migrer tout notre backend vers Prisma 7, et honnêtement... pourquoi je n\'ai pas fait ça plus tôt ?',
  'TypeScript strict mode activé sur tout le projet. Mes nerfs ne s\'en remettront pas mais le code si.',
  'Petit rappel : un bon README vaut mille commentaires de code.',
  'Angular Signals changent vraiment la donne pour la gestion d\'état. Adieu RxJS partout.',
  'GPT peut écrire du code, mais il ne sait toujours pas pourquoi le build casse en prod et pas en local.',
  'L\'IA générative va-t-elle remplacer les développeurs ? Je pense surtout qu\'elle va remplacer le copier-coller Stack Overflow.',
  'Entraîné un petit modèle de classification ce week-end, 94% d\'accuracy. Pas mal pour un dimanche pluvieux.',
  'Les LLM sont impressionnants mais halluciner avec assurance reste leur sport favori.',
  'De retour du Vietnam après 3 semaines incroyables. Hanoi, Hoi An, la baie d\'Halong... un pur bonheur.',
  'Conseil voyage : ne réservez jamais un vol avec moins d\'1h de correspondance. Jamais.',
  'Petit moment de travail sur la plage au Portugal. Le rêve du remote.',
  'Road trip en Islande terminé. Les paysages sont irréels, on dirait une autre planète.',
  'Nouveau riff composé ce soir, je sens qu\'il va finir sur l\'album.',
  'Concert de folie hier soir, les oreilles sifflent encore mais ça valait le coup.',
  'Playlist parfaite pour coder : lo-fi toute la journée, jazz le soir.',
  'J\'ai enfin réussi ce solo de guitare que je rate depuis 2 ans. Petite victoire personnelle.',
  '10km bouclés ce matin sous la pluie. La motivation, ça se construit.',
  'Inscription confirmée pour le marathon de Paris ! Plus que 4 mois d\'entraînement.',
  'Jour de repos aujourd\'hui... ou pas, j\'ai quand même fait du vélo.',
  'Le sport, c\'est 20% physique et 80% mental. Aujourd\'hui le mental a gagné, zéro sortie.',
  'Mon code fonctionne. Je ne sais pas pourquoi, et j\'ai peur d\'y toucher.',
  'Il y a deux types de devs : ceux qui testent en prod, et ceux qui mentent.',
  '« Ça va prendre 5 minutes » — moi, il y a 3 heures.',
  'J\'ai dit à mon manager que le bug était "une fonctionnalité non documentée". Ça a marché.',
  'Docker, c\'est magique jusqu\'au jour où "ça marchait sur ma machine" devient un mensonge collectif.',
  'Setup multi-écrans terminé. Productivité +200%, distraction +500%.',
  'Migration vers Kubernetes en cours. Prions pour nos pods.',
  'Nouveau clavier mécanique reçu. Le bureau entier sait maintenant que je tape du code.',
  'Rien de tel qu\'un bon café et une stack bien rodée pour démarrer la semaine.',
  'On a enfin supprimé toutes les données mockées du backend. Que d\'émotions.',
];

// ─── 3. Categories & tags ────────────────────────────────────────────────────

const CATEGORY_SEED = [
  { name: 'Technologie',    icon: '💻', color: 'blue',     description: 'Innovations, gadgets et tendances tech.' },
  { name: 'IA',             icon: '🤖', color: 'violet',   description: 'Intelligence artificielle, machine learning et LLM.' },
  { name: 'Politique',      icon: '🏛️', color: 'red',      description: 'Débats de société et actualité politique.' },
  { name: 'Football',       icon: '⚽', color: 'green',    description: 'Clubs, compétitions et stars du ballon rond.' },
  { name: 'Musique',        icon: '🎵', color: 'pink',     description: 'Genres musicaux, artistes et concerts.' },
  { name: 'Cinéma',         icon: '🎬', color: 'amber',    description: 'Films, séries et industrie du cinéma.' },
  { name: 'Religion',       icon: '🕊️', color: 'stone',    description: 'Spiritualité, croyances et débats religieux.' },
  { name: 'Philosophie',    icon: '🧠', color: 'indigo',   description: 'Questions existentielles et courants de pensée.' },
  { name: 'Science',        icon: '🔬', color: 'cyan',     description: 'Découvertes scientifiques et recherche.' },
  { name: 'Histoire',       icon: '📜', color: 'orange',   description: 'Événements marquants et grandes figures du passé.' },
  { name: 'Finance',        icon: '💰', color: 'yellow',   description: 'Marchés, investissement et économie.' },
  { name: 'Business',       icon: '💼', color: 'slate',    description: 'Entrepreneuriat, startups et stratégie d\'entreprise.' },
  { name: 'Voyage',         icon: '✈️', color: 'sky',      description: 'Destinations, road trips et découvertes culturelles.' },
  { name: 'Cuisine',        icon: '🍳', color: 'rose',     description: 'Recettes, gastronomie et cultures culinaires.' },
  { name: 'Gaming',         icon: '🎮', color: 'fuchsia',  description: 'Jeux vidéo, esport et culture gamer.' },
  { name: 'Sports',         icon: '🏆', color: 'emerald',  description: 'Tous les sports, compétitions et performances.' },
  { name: 'Santé',          icon: '🩺', color: 'teal',     description: 'Bien-être, médecine et santé publique.' },
  { name: 'Éducation',      icon: '🎓', color: 'lime',     description: 'Apprentissage, pédagogie et système scolaire.' },
  { name: 'Programmation',  icon: '👨‍💻', color: 'zinc',    description: 'Langages, frameworks et bonnes pratiques de code.' },
  { name: 'Actualités',     icon: '📰', color: 'gray',     description: 'Actualité générale et faits de société.' },
] as const;

const TAG_SEED = [
  'Angular', 'React', 'Vue', 'NestJS', 'Express', 'Django', 'Docker', 'Kubernetes', 'Linux', 'Windows',
  'macOS', 'TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'Java', 'PHP', 'SQL', 'NoSQL',
  'PostgreSQL', 'MongoDB', 'Redis', 'GraphQL', 'REST', 'AWS', 'Azure', 'GCP', 'OpenAI', 'Claude',
  'Gemini', 'Crypto', 'Bitcoin', 'Tesla', 'SpaceX', 'Messi', 'Ronaldo', 'Mbappé', 'NBA', 'Formule1',
  'Netflix', 'Marvel', 'PS5', 'Xbox', 'Nintendo', 'Climat', 'Vegan', 'RemoteWork', 'Startup', 'Productivité',
] as const;

function slugify(value: string): string {
  return value
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ─── 4. Debates ──────────────────────────────────────────────────────────────

const DEBATE_SEED = [
  { question: 'React ou Angular en 2026 ?', sides: ['React', 'Angular'], category: 'Programmation', tags: ['React', 'Angular', 'TypeScript'] },
  { question: 'NestJS vs Express : lequel pour vos APIs ?', sides: ['NestJS', 'Express'], category: 'Programmation', tags: ['NestJS', 'Express', 'TypeScript'] },
  { question: 'SQL ou NoSQL : quelle base de données pour 2026 ?', sides: ['SQL', 'NoSQL'], category: 'Programmation', tags: ['SQL', 'NoSQL', 'PostgreSQL', 'MongoDB'] },
  { question: 'Pourquoi Kubernetes est-il devenu incontournable ?', sides: ['Indispensable', 'Surestimé'], category: 'Technologie', tags: ['Kubernetes', 'Docker', 'AWS'] },
  { question: 'Linux est-il réellement supérieur à Windows ?', sides: ['Linux', 'Windows'], category: 'Technologie', tags: ['Linux', 'Windows'] },
  { question: 'L\'IA remplacera-t-elle les développeurs ?', sides: ['Oui', 'Non'], category: 'IA', tags: ['OpenAI', 'Claude', 'Gemini'] },
  { question: 'Claude ou ChatGPT : quel assistant IA préférez-vous ?', sides: ['Claude', 'ChatGPT'], category: 'IA', tags: ['Claude', 'OpenAI', 'Gemini'] },
  { question: 'Le remote est-il meilleur que le présentiel ?', sides: ['Remote', 'Présentiel'], category: 'Business', tags: ['RemoteWork', 'Productivité', 'Startup'] },
  { question: 'Messi est-il le GOAT ?', sides: ['Oui', 'Non'], category: 'Football', tags: ['Messi', 'Ronaldo', 'Mbappé'] },
  { question: 'Mbappé peut-il devenir le meilleur joueur du monde ?', sides: ['Oui', 'Non'], category: 'Football', tags: ['Mbappé', 'Messi', 'Ronaldo'] },
  { question: 'Le nucléaire est-il une solution écologique ?', sides: ['Oui', 'Non'], category: 'Politique', tags: ['Climat', 'Tesla'] },
  { question: 'Faut-il taxer davantage les cryptomonnaies ?', sides: ['Pour', 'Contre'], category: 'Finance', tags: ['Crypto', 'Bitcoin'] },
  { question: 'Bitcoin va-t-il remplacer l\'or comme valeur refuge ?', sides: ['Oui', 'Non'], category: 'Finance', tags: ['Bitcoin', 'Crypto'] },
  { question: 'PS5 ou Xbox : quelle console domine cette génération ?', sides: ['PS5', 'Xbox'], category: 'Gaming', tags: ['PS5', 'Xbox', 'Nintendo'] },
  { question: 'Le véganisme est-il vraiment la solution pour la planète ?', sides: ['Oui', 'Non'], category: 'Santé', tags: ['Vegan', 'Climat'] },
  { question: 'Marvel a-t-il perdu sa magie depuis Avengers Endgame ?', sides: ['Oui', 'Non'], category: 'Cinéma', tags: ['Marvel', 'Netflix'] },
] as const;

// ─── 4. Comment templates ────────────────────────────────────────────────────

const COMMENT_TEMPLATES = [
  'Totalement d\'accord avec toi !',
  'Haha exactement ce qu\'il me fallait entendre aujourd\'hui 😂',
  'Intéressant, je n\'avais pas vu ça sous cet angle.',
  'Merci du partage, ça va m\'aider !',
  'Je valide à 100%.',
  'Pas sûr d\'être d\'accord, mais bien vu.',
  'Ça me rappelle exactement la même situation la semaine dernière.',
  'Top, j\'avais besoin de lire ça.',
  'Super partage, merci !',
  'On en reparle au prochain meetup ?',
  'Carrément, bien résumé.',
  'Je garde ça en mémoire, utile !',
];

const REACTION_TYPES = ['like', 'love', 'laugh', 'wow', 'sad'] as const;

// ─── 5. Chat message templates ───────────────────────────────────────────────

const MESSAGE_TEMPLATES = [
  'Salut ! Comment tu vas ?',
  'Ça va super bien, et toi ?',
  'Tu as vu le dernier post sur le feed ?',
  'Pas encore, je regarde ce soir !',
  'On se voit toujours ce week-end ?',
  'Oui carrément, à quelle heure ?',
  'Je pensais vers 14h, ça te va ?',
  'Parfait pour moi !',
  'Au fait, tu as terminé le projet ?',
  'Presque, il me reste deux trois bugs à régler 😅',
  'Haha classique, bon courage !',
  'Merci, j\'en ai besoin',
  'Tu viens au débat de ce soir ?',
  'Je vais essayer d\'être là',
  'On commande quoi pour midi ?',
  'Un bon resto japonais, ça te dit ?',
  'Toujours ! Je connais un endroit parfait',
  'Génial, envoie-moi l\'adresse',
  'C\'est noté, à plus tard !',
  'À toute !',
];

// ─── 6. Status content ───────────────────────────────────────────────────────

const STATUS_CONTENTS = [
  'En route pour une nouvelle aventure ✈️',
  'Café du matin obligatoire avant de coder ☕',
  'Soirée jeux vidéo entre amis 🎮',
  'Nouveau sommet conquis aujourd\'hui 🏔️',
  'Session de code jusqu\'à pas d\'heure 💻',
  'Petit weekend détox des écrans (sauf celui-ci 😅)',
  'Concert ce soir, hâte !',
  'Footing matinal sous le soleil ☀️',
  'Nouvelle recette testée ce soir 🍝',
  'Brainstorm produit avec l\'équipe 🚀',
  'Lecture du soir avant de dormir 📖',
  'Petit tour en ville cet après-midi',
];

async function clearDatabase() {
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.live.deleteMany(),
    prisma.status.deleteMany(),
    prisma.message.deleteMany(),
    prisma.conversationParticipant.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.friendship.deleteMany(),
    prisma.follow.deleteMany(),
    prisma.reaction.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.debateVote.deleteMany(),
    prisma.debateSide.deleteMany(),
    prisma.postTag.deleteMany(),
    prisma.post.deleteMany(),
    prisma.category.deleteMany(),
    prisma.tag.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function seedCategories() {
  const rows = CATEGORY_SEED.map((c) => ({
    id: randomUUID(),
    name: c.name,
    slug: slugify(c.name),
    icon: c.icon,
    color: c.color,
    description: c.description,
    createdAt: daysAgo(90),
  }));

  await prisma.category.createMany({ data: rows });
  console.log(`  -> ${rows.length} categories created`);
  return rows;
}

async function seedTags() {
  const rows = TAG_SEED.map((name) => ({
    id: randomUUID(),
    name,
    slug: slugify(name),
    createdAt: daysAgo(90),
  }));

  await prisma.tag.createMany({ data: rows });
  console.log(`  -> ${rows.length} tags created`);
  return rows;
}

async function seedUsers(): Promise<Record<UserKey, { id: string; displayName: string }>> {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  const rows = USER_SEED.map((u, i) => ({
    id: randomUUID(),
    email: u.email,
    passwordHash,
    displayName: u.displayName,
    bio: u.bio,
    avatarUrl: null,
    // Spread join dates over the last ~120 days, oldest first.
    createdAt: daysAgo(120 - i * 11),
  }));

  await prisma.user.createMany({ data: rows });

  const byKey = {} as Record<UserKey, { id: string; displayName: string }>;
  USER_SEED.forEach((u, i) => {
    byKey[u.key] = { id: rows[i].id, displayName: u.displayName };
  });
  return byKey;
}

async function seedPosts(users: Record<UserKey, { id: string; displayName: string }>) {
  const keys = USER_SEED.map((u) => u.key);
  const rows = POST_CONTENTS.map((content, i) => ({
    id: randomUUID(),
    authorId: users[keys[i % keys.length]].id,
    content,
    imageUrl: null,
    type: PostType.post,
    createdAt: daysAgo(30 - Math.floor(i / 2)),
  }));

  await prisma.post.createMany({ data: rows });
  console.log(`  -> ${rows.length} posts created`);
  return rows;
}

async function seedDebates(
  users: Record<UserKey, { id: string; displayName: string }>,
  categories: { id: string; name: string }[],
  tags: { id: string; name: string }[],
) {
  const keys = USER_SEED.map((u) => u.key);
  const categoryIdByName = new Map(categories.map((c) => [c.name, c.id]));
  const tagIdByName = new Map(tags.map((t) => [t.name, t.id]));

  const debatePosts = DEBATE_SEED.map((d, i) => ({
    id: randomUUID(),
    authorId: users[keys[i % keys.length]].id,
    content: d.question,
    imageUrl: null,
    type: PostType.debate,
    categoryId: categoryIdByName.get(d.category)!,
    createdAt: daysAgo(25 - i * 2),
  }));
  await prisma.post.createMany({ data: debatePosts });

  const postTagRows = DEBATE_SEED.flatMap((d, i) =>
    d.tags.map((tagName) => ({
      id: randomUUID(),
      postId: debatePosts[i].id,
      tagId: tagIdByName.get(tagName)!,
    })),
  );
  await prisma.postTag.createMany({ data: postTagRows });

  const sidesByDebate: { postId: string; sideAId: string; sideBId: string }[] = [];
  const sideRows: { id: string; postId: string; label: string; votesCount: number }[] = [];

  DEBATE_SEED.forEach((d, i) => {
    const sideAId = randomUUID();
    const sideBId = randomUUID();
    sideRows.push({ id: sideAId, postId: debatePosts[i].id, label: d.sides[0], votesCount: 0 });
    sideRows.push({ id: sideBId, postId: debatePosts[i].id, label: d.sides[1], votesCount: 0 });
    sidesByDebate.push({ postId: debatePosts[i].id, sideAId, sideBId });
  });
  await prisma.debateSide.createMany({ data: sideRows.map(({ id, postId, label }) => ({ id, postId, label })) });

  // Deterministic, coherent votes: each debate gets 5-8 distinct voters, split across both sides.
  const voteRows: { id: string; postId: string; sideId: string; userId: string; createdAt: Date }[] = [];
  const tally = new Map<string, number>(); // sideId -> votes

  DEBATE_SEED.forEach((_, d) => {
    const voterCount = 5 + (d % 4);
    const used = new Set<number>();
    let v = 0;
    while (used.size < voterCount) {
      const candidate = (d * 7 + v * 3 + 1) % keys.length;
      v++;
      if (used.has(candidate)) continue;
      used.add(candidate);

      const userId = users[keys[candidate]].id;
      const onSideA = (candidate + d) % 2 === 0;
      const sideId = onSideA ? sidesByDebate[d].sideAId : sidesByDebate[d].sideBId;

      voteRows.push({
        id: randomUUID(),
        postId: sidesByDebate[d].postId,
        sideId,
        userId,
        createdAt: daysAgo(20 - d),
      });
      tally.set(sideId, (tally.get(sideId) ?? 0) + 1);
    }
  });

  await prisma.debateVote.createMany({ data: voteRows });

  // Keep the denormalized votesCount perfectly in sync with the real vote rows.
  await Promise.all(
    sideRows.map((s) =>
      prisma.debateSide.update({ where: { id: s.id }, data: { votesCount: tally.get(s.id) ?? 0 } }),
    ),
  );

  console.log(`  -> ${debatePosts.length} debates, ${sideRows.length} sides, ${voteRows.length} votes created`);
  return { debatePosts, voteRows };
}

async function seedComments(allPosts: { id: string }[], users: Record<UserKey, { id: string; displayName: string }>) {
  const keys = USER_SEED.map((u) => u.key);
  const rows = Array.from({ length: 40 }, (_, i) => ({
    id: randomUUID(),
    postId: allPosts[(i * 5 + 2) % allPosts.length].id,
    authorId: users[keys[(i * 7 + 3) % keys.length]].id,
    content: COMMENT_TEMPLATES[i % COMMENT_TEMPLATES.length],
    createdAt: daysAgo(15 - Math.floor(i / 3)),
  }));

  await prisma.comment.createMany({ data: rows });
  console.log(`  -> ${rows.length} comments created`);
  return rows;
}

async function seedReactions(allPosts: { id: string }[], users: Record<UserKey, { id: string; displayName: string }>) {
  const keys = USER_SEED.map((u) => u.key);
  const TARGET_COUNT = 80;

  // Build every possible (post, user) pair upfront instead of searching for
  // unique pairs in an open-ended loop — guarantees termination regardless
  // of TARGET_COUNT, as long as it's <= allPosts.length * keys.length.
  const candidates: { postIdx: number; userIdx: number }[] = [];
  for (let postIdx = 0; postIdx < allPosts.length; postIdx++) {
    for (let userIdx = 0; userIdx < keys.length; userIdx++) {
      candidates.push({ postIdx, userIdx });
    }
  }

  if (candidates.length < TARGET_COUNT) {
    throw new Error(
      `Not enough distinct (post, user) pairs to seed ${TARGET_COUNT} reactions (only ${candidates.length} available).`,
    );
  }

  // Deterministic shuffle (no Math.random — keeps the seed reproducible run to run).
  candidates.sort((a, b) => {
    const keyA = (a.postIdx * 977 + a.userIdx * 233) % 9973;
    const keyB = (b.postIdx * 977 + b.userIdx * 233) % 9973;
    return keyA - keyB;
  });

  const rows = candidates.slice(0, TARGET_COUNT).map(({ postIdx, userIdx }, i) => ({
    id: randomUUID(),
    postId: allPosts[postIdx].id,
    userId: users[keys[userIdx]].id,
    type: REACTION_TYPES[i % REACTION_TYPES.length],
    createdAt: daysAgo(10 - Math.floor(i / 10)),
  }));

  // Belt-and-suspenders: the unique([postId, userId]) constraint silently
  // drops any accidental duplicate instead of failing the whole batch.
  await prisma.reaction.createMany({ data: rows, skipDuplicates: true });
  console.log(`  -> ${rows.length} reactions created`);
  return rows;
}

async function seedFriendships(users: Record<UserKey, { id: string; displayName: string }>) {
  const accepted: [UserKey, UserKey][] = [
    ['jean', 'alice'], ['jean', 'bob'], ['jean', 'emma'],
    ['alice', 'sarah'], ['bob', 'lucas'], ['emma', 'sofia'],
    ['david', 'noah'], ['sarah', 'sofia'], ['lucas', 'noah'], ['alice', 'bob'],
  ];
  const pending: [UserKey, UserKey][] = [
    ['charlie', 'jean'],   // Charlie attend une réponse de Jean
    ['noah', 'alice'],
    ['sofia', 'david'],
  ];
  const rejected: [UserKey, UserKey][] = [
    ['charlie', 'bob'],
    ['david', 'emma'],
  ];

  const rows = [
    ...accepted.map(([a, b]) => ({ requesterId: a, receiverId: b, status: FriendshipStatus.accepted })),
    ...pending.map(([a, b]) => ({ requesterId: a, receiverId: b, status: FriendshipStatus.pending })),
    ...rejected.map(([a, b]) => ({ requesterId: a, receiverId: b, status: FriendshipStatus.rejected })),
  ].map((f, i) => ({
    id: randomUUID(),
    requesterId: users[f.requesterId].id,
    receiverId: users[f.receiverId].id,
    status: f.status,
    createdAt: daysAgo(40 - i * 2),
  }));

  await prisma.friendship.createMany({ data: rows });
  console.log(`  -> ${rows.length} friendships created (${accepted.length} accepted, ${pending.length} pending, ${rejected.length} rejected)`);
  return rows;
}

async function seedConversationsAndMessages(users: Record<UserKey, { id: string; displayName: string }>) {
  const pairs: [UserKey, UserKey, number][] = [
    ['jean', 'alice', 20],
    ['jean', 'bob', 15],
    ['jean', 'emma', 10],
    ['alice', 'sarah', 15],
    ['bob', 'lucas', 10],
    ['emma', 'sofia', 10],
    ['david', 'noah', 10],
    ['sarah', 'sofia', 10],
  ];

  const conversations: { id: string; participantIds: [string, string]; messageCount: number }[] = [];

  for (const [a, b, count] of pairs) {
    conversations.push({
      id: randomUUID(),
      participantIds: [users[a].id, users[b].id],
      messageCount: count,
    });
  }

  await prisma.conversation.createMany({
    data: conversations.map((c) => ({ id: c.id, createdAt: daysAgo(35) })),
  });

  await prisma.conversationParticipant.createMany({
    data: conversations.flatMap((c) =>
      c.participantIds.map((userId) => ({ id: randomUUID(), conversationId: c.id, userId })),
    ),
  });

  const messageRows: { id: string; conversationId: string; senderId: string; content: string; createdAt: Date; readAt: Date | null }[] = [];
  const lastMessageAtByConversation = new Map<string, Date>();

  conversations.forEach((conv, convIdx) => {
    let createdAt = daysAgo(20 - convIdx);
    for (let m = 0; m < conv.messageCount; m++) {
      const senderId = conv.participantIds[m % 2];
      createdAt = new Date(createdAt.getTime() + (15 + (m % 5) * 7) * 60_000); // a few minutes/hours apart
      // The last 2 messages of each conversation are left unread (simulates an active inbox).
      const isUnread = m >= conv.messageCount - 2;

      messageRows.push({
        id: randomUUID(),
        conversationId: conv.id,
        senderId,
        content: MESSAGE_TEMPLATES[(convIdx * 5 + m) % MESSAGE_TEMPLATES.length],
        createdAt,
        readAt: isUnread ? null : new Date(createdAt.getTime() + 5 * 60_000),
      });
      lastMessageAtByConversation.set(conv.id, createdAt);
    }
  });

  await prisma.message.createMany({ data: messageRows });

  await Promise.all(
    conversations.map((c) =>
      prisma.conversation.update({
        where: { id: c.id },
        data: { lastMessageAt: lastMessageAtByConversation.get(c.id) },
      }),
    ),
  );

  console.log(`  -> ${conversations.length} conversations, ${messageRows.length} messages created`);
  return { conversations, messageRows };
}

async function seedStatuses(users: Record<UserKey, { id: string; displayName: string }>) {
  const keys = USER_SEED.map((u) => u.key);
  const rows = STATUS_CONTENTS.map((content, i) => {
    const createdAt = minutesAgo(20 + i * 53); // within the last ~11h — always active
    return {
      id: randomUUID(),
      userId: users[keys[i % keys.length]].id,
      content,
      createdAt,
      expiresAt: new Date(createdAt.getTime() + 24 * 3_600_000),
    };
  });

  await prisma.status.createMany({ data: rows });
  console.log(`  -> ${rows.length} statuses created`);
  return rows;
}

async function seedLives(users: Record<UserKey, { id: string; displayName: string }>) {
  const rows = [
    {
      id: randomUUID(),
      hostId: users.emma.id,
      title: 'Live : démystifier les LLM et le Machine Learning',
      streamUrl: null,
      startedAt: hoursAgo(50),
      endedAt: hoursAgo(49),
      createdAt: hoursAgo(50),
    },
    {
      id: randomUUID(),
      hostId: users.charlie.id,
      title: 'Live coding : on refactor un vieux projet ensemble',
      streamUrl: null,
      startedAt: minutesAgo(20),
      endedAt: null,
      createdAt: minutesAgo(20),
    },
  ];

  await prisma.live.createMany({ data: rows });
  console.log(`  -> ${rows.length} lives created`);
  return rows;
}

async function seedNotifications(
  users: Record<UserKey, { id: string; displayName: string }>,
  allPosts: { id: string; authorId: string }[],
  friendships: { id: string; requesterId: string; receiverId: string; status: FriendshipStatus }[],
  comments: { id: string; postId: string; authorId: string }[],
  reactions: { id: string; postId: string; userId: string }[],
  debates: { debatePosts: { id: string; authorId: string; content: string }[]; voteRows: { id: string; postId: string; userId: string }[] },
  conversations: { id: string; participantIds: [string, string] }[],
  messages: { id: string; conversationId: string; senderId: string }[],
  lives: { id: string; hostId: string; title: string }[],
) {
  const nameById = new Map<string, string>();
  USER_SEED.forEach((u) => nameById.set(users[u.key].id, u.displayName));

  const postAuthorById = new Map(allPosts.map((p) => [p.id, p.authorId]));
  const participantsByConversation = new Map(conversations.map((c) => [c.id, c.participantIds]));

  const rows: { id: string; userId: string; type: NotificationType; message: string; relatedId: string; read: boolean; createdAt: Date }[] = [];

  // friend_request — one per pending request, sent to the receiver.
  friendships
    .filter((f) => f.status === FriendshipStatus.pending)
    .forEach((f, i) => {
      rows.push({
        id: randomUUID(),
        userId: f.receiverId,
        type: NotificationType.friend_request,
        message: `${nameById.get(f.requesterId)} vous a envoyé une demande d'ami.`,
        relatedId: f.id,
        read: i % 2 === 0,
        createdAt: daysAgo(5 - i),
      });
    });

  // comment — to the post author, for a sample of comments (skip self-comments).
  comments
    .filter((c) => postAuthorById.get(c.postId) !== c.authorId)
    .slice(0, 6)
    .forEach((c, i) => {
      rows.push({
        id: randomUUID(),
        userId: postAuthorById.get(c.postId)!,
        type: NotificationType.comment,
        message: `${nameById.get(c.authorId)} a commenté votre publication.`,
        relatedId: c.id,
        read: i % 3 !== 0,
        createdAt: daysAgo(4 - Math.floor(i / 2)),
      });
    });

  // like — to the post author, for a sample of reactions (skip self-reactions).
  reactions
    .filter((r) => postAuthorById.get(r.postId) !== r.userId)
    .slice(0, 6)
    .forEach((r, i) => {
      rows.push({
        id: randomUUID(),
        userId: postAuthorById.get(r.postId)!,
        type: NotificationType.like,
        message: `${nameById.get(r.userId)} a aimé votre publication.`,
        relatedId: r.id,
        read: i % 2 === 0,
        createdAt: daysAgo(3 - Math.floor(i / 3)),
      });
    });

  // debate — to the debate author, for a sample of votes.
  debates.voteRows.slice(0, 3).forEach((v, i) => {
    const debate = debates.debatePosts.find((d) => d.id === v.postId)!;
    rows.push({
      id: randomUUID(),
      userId: debate.authorId,
      type: NotificationType.debate,
      message: `${nameById.get(v.userId)} a voté sur votre débat « ${debate.content} ».`,
      relatedId: debate.id,
      read: i % 2 === 0,
      createdAt: daysAgo(2 - i),
    });
  });

  // message — to the other participant, for a sample of messages.
  messages.slice(0, 5).forEach((m, i) => {
    const participants = participantsByConversation.get(m.conversationId)!;
    const recipientId = participants.find((id) => id !== m.senderId)!;
    rows.push({
      id: randomUUID(),
      userId: recipientId,
      type: NotificationType.message,
      message: `${nameById.get(m.senderId)} vous a envoyé un message.`,
      relatedId: m.id,
      read: i % 2 !== 0,
      createdAt: daysAgo(1),
    });
  });

  // live — announce each live to one other user.
  const liveRecipients: UserKey[] = ['jean', 'alice'];
  lives.forEach((l, i) => {
    rows.push({
      id: randomUUID(),
      userId: users[liveRecipients[i]].id,
      type: NotificationType.live,
      message: `${nameById.get(l.hostId)} a démarré un live : ${l.title}`,
      relatedId: l.id,
      read: false,
      createdAt: minutesAgo(15),
    });
  });

  await prisma.notification.createMany({ data: rows });
  console.log(`  -> ${rows.length} notifications created`);
  return rows;
}

async function main() {
  console.log('Clearing existing data...');
  await clearDatabase();
  console.log('  -> all tables cleared');

  console.log('Seeding users...');
  const users = await seedUsers();
  console.log(`  -> ${USER_SEED.length} users created`);

  console.log('Seeding categories...');
  const categories = await seedCategories();

  console.log('Seeding tags...');
  const tags = await seedTags();

  console.log('Seeding posts...');
  const posts = await seedPosts(users);

  console.log('Seeding debates...');
  const debates = await seedDebates(users, categories, tags);

  const allPosts = [...posts, ...debates.debatePosts];

  console.log('Seeding comments...');
  const comments = await seedComments(allPosts, users);

  console.log('Seeding reactions...');
  const reactions = await seedReactions(allPosts, users);

  console.log('Seeding friendships...');
  const friendships = await seedFriendships(users);

  console.log('Seeding conversations and messages...');
  const { conversations, messageRows } = await seedConversationsAndMessages(users);

  console.log('Seeding statuses...');
  await seedStatuses(users);

  console.log('Seeding lives...');
  const lives = await seedLives(users);

  console.log('Seeding notifications...');
  await seedNotifications(
    users,
    allPosts,
    friendships,
    comments,
    reactions,
    debates,
    conversations,
    messageRows,
    lives,
  );

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
