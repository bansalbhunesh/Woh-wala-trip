import type { LoreJson } from './types';

export const DEMO_LORE: LoreJson = {
  trip_title: 'Manali or: How We Lost Our Collective Minds in the Snow',
  tagline:
    '5 people, 3 functioning brain cells, 1 car that maybe should not have gone to Rohtang Pass',
  opening_line:
    'Some trips are planned. This one was agreed upon in a group chat at 1am, which explains everything.',
  closing_line:
    'The mountains kept all our secrets. We kept the car sound between us. Some things stay in Manali.',
  cooked_level: 87,
  cooked_verdict: 'Historically Cooked',
  cooked_explanation: 'The evidence is overwhelming. The mountains have seen things.',
  season_recap: {
    act_1:
      'The drive up was fine. Everyone was reasonable. This was a lie the mountains had agreed to maintain for exactly 4 hours.',
    act_2:
      'Day 2: Priya suggested Rohtang Pass. Everyone agreed. The car disagreed. The road disagreed. Physics disagreed. We went anyway.',
    act_3:
      'The descent from chaos happened over maggi at 2am at a dhaba that had no business being open but absolutely was. Some bonds are forged in instant noodles.',
    full_narrative:
      'Five people entered the Himalayas thinking they were going on a normal trip. They were wrong, but in the specific way that is deeply correct — the kind where you come back with inside jokes that make no sense to anyone else and a shared trauma that reads as nostalgia. Rahul planned everything. Priya ignored the plan immediately. Dev documented the plan being ignored with suspicious joy. Ananya pretended not to know any of them when things got cooked. Karan was the one who said yes to everything, which is why we went to Rohtang Pass, which is why the car made that sound, which is why nobody speaks about Day 2 in polite company.',
  },
  trip_eras: [
    {
      era_name: 'The Honeymoon Phase',
      timeframe: 'Day 1',
      description: 'Everyone was normal. This was suspicious in retrospect.',
      defining_moment: "Rahul printed a colour-coded itinerary. We all pretended we'd follow it.",
    },
    {
      era_name: 'The Great Rohtang Delusion',
      timeframe: 'Day 2 morning',
      description:
        'Priya had an idea. The idea was Rohtang Pass. The idea was wrong. We went anyway.',
      defining_moment:
        "Karan said 'I think the road looks fine' while looking at a road that was not fine.",
    },
    {
      era_name: 'The 2AM Maggi Redemption',
      timeframe: 'Day 2–3 midnight',
      description:
        'Everything wrong about the trip was fixed by maggi at a dhaba that had no reason to exist but absolutely did.',
      defining_moment: 'Nobody spoke for ten minutes. The silence was the healing.',
    },
  ],
  friendship_dynamics: {
    group_structure:
      'One reluctant planner, one chaos agent, one documentarian, one dissociator, one yes-man who caused everything',
    chaos_source:
      "Karan's inability to say no to anything that sounds like an adventure, combined with Priya's ability to make bad ideas sound amazing",
    emotional_center:
      "Dev's running commentary that turned every disaster into content, and Rahul's quiet refusal to abandon anyone",
    collective_energy:
      'Chaotic loyal. These people will get you into a situation and also get you out of it.',
  },
  trip_lore_awards: {
    trip_mvp: 'Rahul, who somehow kept us alive while visibly questioning every life choice',
    trip_villain: 'Priya',
    core_memory:
      'The 2am dhaba maggi, eaten in silence, where everyone accepted that this was their life now',
    movie_genre: 'A24 Survival Comedy with Strong Ensemble Energy',
  },
  superlatives: [
    {
      winner_name: 'Priya',
      question: 'Start the next trip the same exact way',
      reason: "She's already planning Spiti. Nobody has said yes yet. She says that's temporary.",
      archetype: 'Chaos Source',
    },
    {
      winner_name: 'Ananya',
      question: 'Survive anything by simply not engaging with it',
      reason:
        'Dissociated from the Rohtang situation early and was genuinely fine. Impressive technique.',
      archetype: 'dissociated from chaos early',
    },
    {
      winner_name: 'Karan',
      question: 'Cause the problem and also solve the problem',
      reason: 'Suggested Rohtang. Bought everyone chai after. Balanced, in a way.',
      archetype: 'started it, fixed it, no notes',
    },
  ],
  receipt_stats: [
    { label: "Times someone said 'it's fine'", value: '23', unit: 'verified lies' },
    { label: 'Dhabas visited at unreasonable hours', value: '4', unit: '' },
    { label: 'Photos taken before anyone ate', value: '100%', unit: 'of all meals' },
    { label: 'Minutes the car sound lasted', value: '47', unit: 'of concern' },
    { label: 'Group chats created during the trip', value: '3', unit: '(all still active)' },
  ],
  receipt_rating: '★★★★★',
  receipt_review: 'Would not change a single terrible decision. 5 stars.',
};

export const DEMO_MEMBERS = [
  {
    user_id: 'demo-1',
    role_title: 'The Reluctant Planner',
    role_description:
      'Made the itinerary. Watched it die in real time. Made a new one. It also died. Still made a third one.',
    role_chaos_rating: 4,
    display_name: 'Rahul',
  },
  {
    user_id: 'demo-2',
    role_title: 'The Chaos Agent',
    role_description:
      'Suggested Rohtang Pass. Has no regrets. Should statistically have more regrets. Does not.',
    role_chaos_rating: 9,
    display_name: 'Priya',
  },
  {
    user_id: 'demo-3',
    role_title: 'The Documentarian',
    role_description:
      'Filmed every disaster in real time. Called it "content". It is content. Very good content.',
    role_chaos_rating: 6,
    display_name: 'Dev',
  },
  {
    user_id: 'demo-4',
    role_title: 'The Strategic Dissociator',
    role_description:
      'Was mentally in Goa the whole time. Showed up for the good parts. Denied being present for the bad ones.',
    role_chaos_rating: 3,
    display_name: 'Ananya',
  },
  {
    user_id: 'demo-5',
    role_title: 'The Yes Man Who Started Everything',
    role_description:
      'Said yes to everything. Is why we went to Rohtang. Is also why we survived it. Complex legacy.',
    role_chaos_rating: 8,
    display_name: 'Karan',
  },
];

export const DEMO_TRIP_CODE = 'DEMO2024';
