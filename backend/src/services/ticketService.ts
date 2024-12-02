import pool from '../config/db';

export const calculatePrice = async (event_id: number, ticket_type: string): Promise<number> => {
  const result = await pool.query(
    `SELECT price FROM Tickets WHERE event_id = $1 AND ticket_type = $2`,
    [event_id, ticket_type]
  );
  if (result.rows.length === 0) {
    throw new Error('Ticket type not found.');
  }
  return result.rows[0].price;
};

export const applyGroupDiscount = (price: number, number_of_tickets: number): number => {
  if (number_of_tickets >= 10) {
    return price * 0.9;
  }
  return price;
};
