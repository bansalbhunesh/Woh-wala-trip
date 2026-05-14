import { router } from './init';
import { tripsRouter } from './routers/trips';
import { photosRouter } from './routers/photos';
import { battlesRouter } from './routers/battles';

export const appRouter = router({
  trips: tripsRouter,
  photos: photosRouter,
  battles: battlesRouter,
});

export type AppRouter = typeof appRouter;
