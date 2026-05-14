import { router } from './init';
import { tripsRouter } from './routers/trips';
import { photosRouter } from './routers/photos';
import { battlesRouter } from './routers/battles';
import { cardsRouter } from './routers/cards';

export const appRouter = router({
  trips: tripsRouter,
  photos: photosRouter,
  battles: battlesRouter,
  cards: cardsRouter,
});

export type AppRouter = typeof appRouter;
