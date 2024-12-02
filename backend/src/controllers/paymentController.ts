import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import pool from "../config/db";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

export const makePayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { booking_id } = req.params;
  const { payment_method, amount_paid } = req.body;

  if (!payment_method || !amount_paid) {
    res
      .status(400)
      .json({ message: "Both payment_method and amount_paid are required." });
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

    if (booking.payment_status === "Paid") {
      res
        .status(400)
        .json({ message: "This booking has already been paid for." });
      return;
    }

    if (booking.total_price > amount_paid) {
      res
        .status(400)
        .json({
          message: `Insufficient payment. Total price is ${booking.total_price}.`,
        });
      return;
    }

    const paymentResult = await pool.query(
      `
            INSERT INTO Payments (booking_id, payment_method, amount, payment_status)
            VALUES ($1, $2, $3, 'Paid')
            RETURNING *;
        `,
      [booking_id, payment_method, amount_paid]
    );

    const updatedBooking = await pool.query(
      `
            UPDATE Bookings
            SET booking_status = 'Booked',
                payment_status = 'Paid', 
                payment_date = CURRENT_TIMESTAMP, 
                payment_method = $1
            WHERE booking_id = $2
            RETURNING *;
        `,
      [payment_method, booking_id]
    );

    res.status(200).json({
      message: "Payment successful",
      payment: paymentResult.rows[0],
      booking: updatedBooking.rows[0],
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getPaymentReceipt = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { payment_id } = req.params;

  try {
    const paymentResult = await pool.query(
      `
            SELECT p.payment_id, p.amount, p.payment_date, p.payment_method, 
                   b.booking_id, b.number_of_tickets, b.booking_status, b.customer_id, 
                   e.event_name, e.event_start, e.event_end, v.venue_name
            FROM Payments p
            JOIN Bookings b ON p.booking_id = b.booking_id
            JOIN Events e ON b.event_id = e.event_id
            JOIN Venues v ON e.venue_id = v.venue_id
            WHERE p.payment_id = $1;
        `,
      [payment_id]
    );

    const payment = paymentResult.rows[0];

    if (
      paymentResult.rows.length === 0 ||
      payment.customer_id !== (req as AuthenticatedRequest).user?.id
    ) {
      res
        .status(404)
        .json({
          message: "Payment not found or payment does not belong to you",
        });
      return;
    }

    const receipt = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=receipt_${payment_id}.pdf`
    );
    receipt.pipe(res);

    receipt.fontSize(20).text("Payment Receipt", { align: "center" });
    receipt.moveDown();
    receipt.text(`Receipt ID: ${payment.payment_id}`);
    receipt.text(`Booking ID: ${payment.booking_id}`);
    receipt.text(`Event: ${payment.event_name}`);
    receipt.text(`Venue: ${payment.venue_name}`);
    receipt.text(`Event Start: ${payment.event_start}`);
    receipt.text(`Event End: ${payment.event_end}`);
    receipt.text(`Number of Tickets: ${payment.number_of_tickets}`);
    receipt.text(`Amount Paid: $${payment.amount}`);
    receipt.text(`Payment Method: ${payment.payment_method}`);
    receipt.text(`Payment Date: ${payment.payment_date}`);
    receipt.end();
  } catch (error) {
    console.error("Error generating receipt:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllReceipts = async (
  req: Request,
  res: Response
): Promise<void> => {
  const customer_id =
    req.params.customer_id || (req as AuthenticatedRequest).user?.id;

  try {
    if (
      (req as AuthenticatedRequest).user?.role !== "Admin" &&
      customer_id !== (req as AuthenticatedRequest).user?.id
    ) {
      res
        .status(403)
        .json({ message: "You are not authorized to view these receipts." });
      return;
    }

    const receiptsResult = await pool.query(
      `
            SELECT p.payment_id, p.amount, p.payment_date, p.payment_method, 
                   b.booking_id, b.number_of_tickets, b.booking_status, 
                   e.event_name, e.event_start, e.event_end, v.venue_name
            FROM Payments p
            JOIN Bookings b ON p.booking_id = b.booking_id
            JOIN Events e ON b.event_id = e.event_id
            JOIN Venues v ON e.venue_id = v.venue_id
            WHERE b.customer_id = $1
            ORDER BY p.payment_date DESC;
        `,
      [customer_id]
    );

    if (receiptsResult.rows.length === 0) {
      res.status(404).json({ message: "No receipts found for this customer." });
      return;
    }

    res.status(200).json(receiptsResult.rows);
  } catch (error) {
    console.error("Error fetching receipts:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
