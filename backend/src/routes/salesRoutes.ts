import { Router } from 'express';
import { getSalesData } from '../controllers/salesController';
import { verifyToken, authorizeRoles } from '../middleware/auth';

const salesRoutes = Router();

salesRoutes.get('/organizer/sales', verifyToken, authorizeRoles(['Organizer']), getSalesData);

export default salesRoutes;