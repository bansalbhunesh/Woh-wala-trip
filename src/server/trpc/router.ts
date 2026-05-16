import { router } from './init';
import { tripsRouter } from './routers/trips';
import { photosRouter } from './routers/photos';
import { battlesRouter } from './routers/battles';
import { cardsRouter } from './routers/cards';
import { reactionsRouter } from './routers/reactions';
import { archetypesRouter } from './routers/archetypes';

export const appRouter = router({
  trips: tripsRouter,
  photos: photosRouter,
  battles: battlesRouter,
  cards: cardsRouter,
  reactions: reactionsRouter,
  archetypes: archetypesRouter,
});

export type AppRouter = typeof appRouter;
