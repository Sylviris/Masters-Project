import { Router } from "express";
import { getAnalytics } from "../controllers/analyticsController";
import { authorizeRoles, verifyToken } from "../middleware/auth";

const analyticsRoutes = Router();

analyticsRoutes.get('/getAnalytics', verifyToken, authorizeRoles(['Admin']), getAnalytics);

export default analyticsRoutes;