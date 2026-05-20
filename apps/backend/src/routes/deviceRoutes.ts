import { Router } from 'express';
import {
  registerDevice,
  requestPairToken,
  verifyPairToken,
  listTrustedPairs,
  revokePair
} from '../controllers/deviceController.js';

const router = Router();

router.post('/register', registerDevice);
router.post('/pair/request', requestPairToken);
router.post('/pair/verify', verifyPairToken);
router.get('/list', listTrustedPairs);
router.delete('/:pairId', revokePair);

export default router;
