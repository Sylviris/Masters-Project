import { Router } from "express";
import { login, registerUser } from "../controllers/authController";

const authRoutes = Router();

authRoutes.post("/login", login);
authRoutes.post("/register", registerUser);

export default authRoutes;
