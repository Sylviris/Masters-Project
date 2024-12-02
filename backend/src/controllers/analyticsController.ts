import { Request, Response } from "express";
import pool from "../config/db";

export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {

        const revenueResult = await pool.query(`
            SELECT EXTRACT(MONTH FROM b.booking_date) AS month, 
            COALESCE(SUM(b.total_price), 0) AS total_revenue
            FROM Bookings b
            GROUP BY month
            ORDER BY month ASC;
        `);

        const bookingPatternsResult = await pool.query(`
            SELECT EXTRACT(HOUR FROM b.booking_date) AS booking_hour, 
            COUNT(b.booking_id) AS total_bookings
            FROM Bookings b
            GROUP BY booking_hour
            ORDER BY total_bookings DESC;
        `);

        res.status(200).json({
            revenueTrends: revenueResult.rows,
            bookingPatterns: bookingPatternsResult.rows,
        });
    } catch (error) {
        console.error('Error fetching analytics data:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};