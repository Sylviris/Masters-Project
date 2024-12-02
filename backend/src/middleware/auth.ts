import jwt from "jsonwebtoken";
import { Request as ExpressRequest, Response, NextFunction } from "express";

interface AuthenticatedRequest extends ExpressRequest {
  user?: {
    id: number;
    role: string;
  };
}

export const verifyToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Unauthorized. No token provided." });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded as { id: number; role: string };
    next();
  } catch (error) {
    res.status(403).json({ message: "Forbidden. Invalid or expired token." });
  }
};

export const authorizeRoles = (roles: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res
        .status(403)
        .json({ message: "Access denied. Insufficient permissions." });
      return;
    }
    next();
  };
};
