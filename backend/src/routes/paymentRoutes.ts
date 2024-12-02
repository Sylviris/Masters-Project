import { Router } from 'express';
import { getAllReceipts, getPaymentReceipt, makePayment } from '../controllers/paymentController';
import { authorizeRoles, verifyToken } from '../middleware/auth';

const paymentRoutes = Router();

paymentRoutes.post("/:booking_id", verifyToken, authorizeRoles(['Customer']), makePayment);
paymentRoutes.get("/receipt/:payment_id", verifyToken, getPaymentReceipt);
paymentRoutes.get('/receipts', verifyToken, authorizeRoles(['Customer']), getAllReceipts);
paymentRoutes.get("/receipts/:customer_id", verifyToken, authorizeRoles(['Admin']), getAllReceipts);

export default paymentRoutes;