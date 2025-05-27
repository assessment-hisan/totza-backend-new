import express from 'express';
import { getDues, getDueById, getPayments, createPayment, updateDueStatus, deletePayment } from '../controllers/dueController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';



const router = express.Router();

router.get('/', authMiddleware, getDues);
router.get('/:id', authMiddleware, getDueById);
router.get('/:id/payments', authMiddleware, getPayments);
router.post('/:id/payments', authMiddleware, createPayment);
router.patch('/:id/status', authMiddleware, updateDueStatus);
router.delete('/:dueId/payments/:paymentId', deletePayment);
export default router;