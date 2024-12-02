import { Request, Response } from "express";
import pool from "../config/db";
import PDFDocument from "pdfkit";
import { calculatePrice, applyGroupDiscount } from "../services/ticketService";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

export const createBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { event_id, number_of_tickets, ticket_type } = req.body;

  if (
    !(req as AuthenticatedRequest).user?.id ||
    !event_id ||
    !number_of_tickets ||
    !ticket_type
  ) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }

  try {
    const venueQuery = await pool.query(
      `SELECT venue_id, event_start, event_end FROM Events WHERE event_id = $1`,
      [event_id]
    );

    if (venueQuery.rows.length === 0) {
      res.status(404).json({ message: "Event not found." });
      return;
    }

    const { venue_id, event_start, event_end } = venueQuery.rows[0];
    const venueAvailabilityQuery = await pool.query(
      `SELECT * FROM Events 
             WHERE venue_id = $1 
               AND event_start < $2 
               AND event_end > $3`,
      [venue_id, event_start, event_end]
    );

    if (venueAvailabilityQuery.rows.length > 0) {
      res
        .status(400)
        .json({ message: "Venue is already booked for this time." });
      return;
    }

    const ticketQuery = await pool.query(
      `SELECT availability, price FROM Tickets WHERE event_id = $1 AND ticket_type = $2`,
      [event_id, ticket_type]
    );

    if (ticketQuery.rows.length === 0) {
      res
        .status(404)
        .json({ message: "Ticket type not found for this event." });
      return;
    }

    const { availability, price } = ticketQuery.rows[0];

    if (availability < number_of_tickets) {
      res.status(400).json({ message: "Not enough tickets available." });
      return;
    }

    const basePrice = price;
    const discountedPrice = applyGroupDiscount(
      await calculatePrice(event_id, ticket_type),
      number_of_tickets
    );
    const totalPrice = discountedPrice * number_of_tickets;

    const bookingResult = await pool.query(
      `INSERT INTO Bookings (customer_id, event_id, number_of_tickets, total_price, ticket_type, booking_status, payment_status) 
             VALUES ($1, $2, $3, $4, $5, 'Pending', 'Unpaid') RETURNING *`,
      [
        (req as AuthenticatedRequest).user?.id,
        event_id,
        number_of_tickets,
        totalPrice,
        ticket_type,
      ]
    );

    await pool.query(
      `UPDATE Tickets SET availability = availability - $1 WHERE event_id = $2 AND ticket_type = $3`,
      [number_of_tickets, event_id, ticket_type]
    );

    const bookingDetails = bookingResult.rows[0];

    res
      .status(201)
      .json({ message: "Booking successful.", booking: bookingDetails });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ message: "Server error." });
  }
};

export const getUserBookings = async (
  req: Request,
  res: Response
): Promise<void> => {
  const customer_id = (req as AuthenticatedRequest).user?.id;

  try {
    const bookings = await pool.query(
      `SELECT b.booking_id, b.event_id, e.event_name, b.number_of_tickets, b.total_price, 
                    b.booking_status, b.payment_status, b.ticket_type, b.confirmation_code, b.booking_date
             FROM Bookings b
             JOIN Events e ON b.event_id = e.event_id
             WHERE b.customer_id = $1`,
      [customer_id]
    );

    console.log(bookings.rows);
    res.status(200).json(bookings.rows);
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    res.status(500).json({ message: "Server error." });
  }
};

export const getOrganizerBookings = async (
  req: Request,
  res: Response
): Promise<void> => {
  const organizer_id = (req as AuthenticatedRequest).user?.id;

  try {
    const bookingsResult = await pool.query(
      `
            SELECT b.booking_id, b.customer_id, b.number_of_tickets, b.booking_status, 
                    b.payment_status, b.booking_date, 
                    c.email AS customer_email, 
                    e.event_id, e.event_name, e.event_start, e.event_end, 
                    v.venue_name
                FROM Bookings b
                JOIN Events e ON b.event_id = e.event_id
                JOIN Venues v ON e.venue_id = v.venue_id
                JOIN Customers c ON b.customer_id = c.customer_id
                WHERE e.organizer_id = $1
                ORDER BY e.event_start, b.booking_date;
            `,
      [organizer_id]
    );

    if (bookingsResult.rows.length === 0) {
      res.status(404).json({ message: "No bookings found for your events." });
      return;
    }

    res.status(200).json(bookingsResult.rows);
  } catch (error) {
    console.error("Error fetching organizer bookings:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const getAllBookings = async (req: Request, res: Response): Promise<void> => {
    try {
        const bookingsResult = await pool.query(`
                SELECT b.booking_id, b.number_of_tickets, b.total_price, b.booking_status, 
                   b.payment_status, b.booking_date, 
                   c.customer_id, c.email AS customer_email, c.role AS customer_role, 
                   e.event_id, e.event_name, e.event_start, e.event_end, 
                   v.venue_name
            FROM Bookings b
            JOIN Customers c ON b.customer_id = c.customer_id
            JOIN Events e ON b.event_id = e.event_id
            JOIN Venues v ON e.venue_id = v.venue_id
            ORDER BY b.booking_date DESC;
            `);

            if (bookingsResult.rows.length === 0) {
                res.status(404).json({ message: 'No bookings found.' });
                return;
            }

            res.status(200).json(bookingsResult.rows);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
}

export const generateBookingPDF = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { booking_id } = req.params;

  try {
    const bookingResult = await pool.query(
      `SELECT * FROM Bookings WHERE booking_id = $1 AND customer_id = $2`,
      [booking_id, (req as AuthenticatedRequest).user?.id]
    );

    if (bookingResult.rows.length === 0) {
      res.status(404).json({ message: "Booking not found." });
      return;
    }

    const booking = bookingResult.rows[0];
    const doc = new PDFDocument();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=booking-${booking_id}.pdf`
    );

    doc.text(`Booking Confirmation`);
    doc.text(`Booking ID: ${booking.booking_id}`);
    doc.text(`Event: ${booking.event_id}`);
    doc.text(`Tickets: ${booking.number_of_tickets}`);
    doc.text(`Total Price: $${booking.total_price}`);
    doc.text(`Confirmation Code: ${booking.confirmation_code}`);
    doc.text(`Booking Date: ${booking.booking_date}`);
    doc.end();

    doc.pipe(res);
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ message: "Server error." });
  }
};

export const editBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { booking_id } = req.params;
  const { number_of_tickets, ticket_type, booking_status } = req.body;

  if (!number_of_tickets || !ticket_type || !booking_status) {
    res
      .status(400)
      .json({
        message:
          "All fields (number_of_tickets, ticket_type, booking_status) are required.",
      });
    return;
  }

  try {
    const bookingQuery = await pool.query(
      `SELECT * FROM Bookings WHERE booking_id = $1 AND customer_id = $2`,
      [booking_id, (req as AuthenticatedRequest).user?.id]
    );

    if (bookingQuery.rows.length === 0) {
      res.status(404).json({ message: "Booking not found." });
      return;
    }

    const booking = bookingQuery.rows[0];

    let totalPrice = booking.total_price;
    if (number_of_tickets || ticket_type) {
      const ticketQuery = await pool.query(
        `SELECT price FROM Tickets WHERE event_id = $1 AND ticket_type = $2`,
        [booking.event_id, ticket_type || booking.ticket_type]
      );

      if (ticketQuery.rows.length === 0) {
        res
          .status(404)
          .json({ message: "Ticket type not found for this event." });
        return;
      }

      const discountedPrice = applyGroupDiscount(
        await calculatePrice(booking.event_id, ticket_type),
        number_of_tickets
      );
      totalPrice = discountedPrice * number_of_tickets;
    }

    const updateQuery = `
            UPDATE Bookings
            SET 
                number_of_tickets = COALESCE($1, number_of_tickets),
                ticket_type = COALESCE($2, ticket_type),
                booking_status = COALESCE($3, booking_status),
                total_price = $4
            WHERE booking_id = $5
            RETURNING *;
        `;

    const updatedBooking = await pool.query(updateQuery, [
      number_of_tickets,
      ticket_type,
      booking_status,
      totalPrice,
      booking_id,
    ]);

    res.status(200).json({
      message: "Booking updated successfully.",
      booking: updatedBooking.rows[0],
    });
  } catch (error) {
    console.error("Error editing booking:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const cancelBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { booking_id } = req.params;

  try {
    const bookingQuery = await pool.query(
      `SELECT * FROM Bookings WHERE booking_id = $1 AND customer_id = $2`,
      [booking_id, (req as AuthenticatedRequest).user?.id]
    );

    if (bookingQuery.rows.length === 0) {
      res.status(404).json({ message: "Booking not found." });
      return;
    }

    const booking = bookingQuery.rows[0];

    const deleteResult = await pool.query(
      `
            DELETE FROM Bookings WHERE booking_id = $1 RETURNING *;
            `,
      [booking_id]
    );

    res.status(200).json({
      message: "Booking deleted successfully",
      deletedBooking: deleteResult.rows[0],
    });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
