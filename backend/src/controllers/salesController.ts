import { Request, Response } from "express";
import pool from "../config/db";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

export const getSalesData = async (
  req: Request,
  res: Response
): Promise<void> => {
  const organizer_id = (req as AuthenticatedRequest).user?.id;
  const { event_id, start_date, end_date } = req.query;

  try {
    let salesQuery = `
            SELECT e.event_id, e.event_name, e.event_start, e.event_end, 
            COALESCE(SUM(b.number_of_tickets), 0) AS total_tickets_sold, 
            COALESCE(SUM(CASE WHEN b.payment_status = 'Paid' THEN b.number_of_tickets ELSE 0 END), 0) AS paid_tickets_sold,
            COALESCE(SUM(CASE WHEN b.payment_status = 'Paid' THEN b.total_price ELSE 0 END), 0) AS total_revenue
            FROM Events e
            LEFT JOIN Bookings b ON e.event_id = b.event_id
            LEFT JOIN Tickets t ON e.event_id = t.event_id AND b.ticket_type = t.ticket_type
            WHERE e.organizer_id = $1
        `;

    const queryParams: any[] = [organizer_id];

    if (event_id) {
      salesQuery += ` AND e.event_id = $${queryParams.length + 1}`;
      queryParams.push(event_id);
    }
    if (start_date) {
      salesQuery += ` AND b.booking_date >= $${queryParams.length + 1}`;
      queryParams.push(start_date);
    }
    if (end_date) {
      salesQuery += ` AND b.booking_date <= $${queryParams.length + 1}`;
      queryParams.push(end_date);
    }

    salesQuery += `
            GROUP BY e.event_id
            ORDER BY e.event_start ASC;
        `;

    const salesResult = await pool.query(salesQuery, queryParams);

    console.log(salesResult.rows);

    if (salesResult.rows.length === 0) {
      res.status(404).json({ message: "No sales data found for your events." });
      return;
    }

    res.status(200).json(salesResult.rows);
  } catch (error) {
    console.error("Error fetching sales data:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
