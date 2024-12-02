import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import pool from "../config/db";

export const registerUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    res
      .status(400)
      .json({ message: "All fields (email, password, role) are required." });
    return;
  }

  try {
    const userExists = await pool.query(
      `SELECT customer_id FROM Customers WHERE email = $1`,
      [email]
    );

    if (userExists.rows.length > 0) {
      res.status(400).json({ message: "Email is already registered" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO Customers (email, password, role) VALUES ($1, $2, $3) RETURNING customer_id, email, role`,
      [email, hashedPassword, role]
    );

    res.status(201).json({
      message: "User successfully registered.",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: "An internal server error occurred" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res
      .status(400)
      .json({ message: "All fields (email, password) are required." });
    return;
  }

  try {
    const userQuery = await pool.query(
      `SELECT customer_id, email, password, role FROM Customers WHERE email = $1`,
      [email]
    );

    if (userQuery.rows.length === 0) {
      res.status(401).json({ message: "Invalid email" });
      return;
    }

    const user = userQuery.rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid password" });
      return;
    }

    const token = jwt.sign(
      { id: user.customer_id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "An internal server error occurred." });
  }
};
