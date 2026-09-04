import { Router } from 'express';
import {
  handleScheduleEmail,
  handleGetEmails,
  handleGetEmailById,
  handleBulkScheduleEmail,
} from '../controllers/email.controller';

const router = Router();

router.post('/emails/schedule', handleScheduleEmail);
router.post('/emails/schedule/bulk', handleBulkScheduleEmail);
router.get('/emails', handleGetEmails);
router.get('/emails/:id', handleGetEmailById);

export default router;


