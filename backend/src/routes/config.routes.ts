import { Router } from 'express';
import {
  getSchedulerConfigHandler,
  updateSchedulerConfigHandler,
} from '../controllers/config.controller';

const router = Router();

router.get('/config', getSchedulerConfigHandler);
router.put('/config', updateSchedulerConfigHandler);

export default router;
