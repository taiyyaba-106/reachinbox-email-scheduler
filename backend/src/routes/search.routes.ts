import { Router } from 'express';
import { searchEmailsHandler } from '../controllers/search.controller';

const router = Router();

router.get('/emails/search', searchEmailsHandler);

export default router;
