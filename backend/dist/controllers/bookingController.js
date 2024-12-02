"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBookingPDF = exports.getUserBookings = exports.createBooking = void 0;
const db_1 = __importDefault(require("../config/db"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const ticketService_1 = require("../services/ticketService");
const createBooking = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { customer_id, event_id, number_of_tickets, ticket_type } = req.body;
    try {
        // Step 1: Check for Venue Double-Booking
        const venueQuery = yield db_1.default.query(`SELECT venue_id, event_date, event_time FROM Events WHERE event_id = $1`, [event_id]);
        if (venueQuery.rows.length === 0) {
            res.status(404).json({ message: 'Event not found.' });
            return;
        }
        const { venue_id, event_date, event_time } = venueQuery.rows[0];
        const venueAvailabilityQuery = yield db_1.default.query(`SELECT * FROM Event_Schedules 
             WHERE venue_id = $1 
               AND start_time < $2 
               AND end_time > $3`, [venue_id, event_time, event_time]);
        if (venueAvailabilityQuery.rows.length > 0) {
            res.status(400).json({ message: 'Venue is already booked for this time.' });
            return;
        }
        // Step 2: Check Ticket Availability
        const ticketQuery = yield db_1.default.query(`SELECT availability, price FROM Tickets WHERE event_id = $1 AND ticket_type = $2`, [event_id, ticket_type]);
        if (ticketQuery.rows.length === 0) {
            res.status(404).json({ message: 'Ticket type not found for this event.' });
            return;
        }
        const { availability, price } = ticketQuery.rows[0];
        if (availability < number_of_tickets) {
            res.status(400).json({ message: 'Not enough tickets available.' });
            return;
        }
        // Step 3: Calculate Final Ticket Price
        const basePrice = price;
        const discountedPrice = (0, ticketService_1.applyGroupDiscount)(yield (0, ticketService_1.calculatePrice)(event_date, basePrice), number_of_tickets);
        const totalPrice = discountedPrice * number_of_tickets;
        // Step 4: Create Booking
        const bookingResult = yield db_1.default.query(`INSERT INTO Bookings (customer_id, event_id, number_of_tickets, total_price, booking_status, payment_status) 
             VALUES ($1, $2, $3, $4, 'Pending', 'Unpaid') RETURNING *`, [customer_id, event_id, number_of_tickets, totalPrice]);
        // Step 5: Update Ticket Availability
        yield db_1.default.query(`UPDATE Tickets SET availability = availability - $1 WHERE event_id = $2 AND ticket_type = $3`, [number_of_tickets, event_id, ticket_type]);
        const bookingDetails = bookingResult.rows[0];
        res.status(201).json({ message: 'Booking successful.', booking: bookingDetails });
    }
    catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});
exports.createBooking = createBooking;
const getUserBookings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const customer_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    try {
        const bookings = yield db_1.default.query(`SELECT b.booking_id, b.event_id, e.event_name, b.number_of_tickets, b.total_price, 
                    b.booking_status, b.payment_status, b.ticket_type, b.confirmation_code, b.booking_date
             FROM Bookings b
             JOIN Events e ON b.event_id = e.event_id
             WHERE b.customer_id = $1`, [customer_id]);
        res.status(200).json(bookings.rows);
    }
    catch (error) {
        console.error('Error fetching user bookings:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});
exports.getUserBookings = getUserBookings;
/**
 * Generates a PDF for a specific booking.
 */
const generateBookingPDF = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { booking_id } = req.params;
    try {
        const bookingResult = yield db_1.default.query(`SELECT * FROM Bookings WHERE booking_id = $1`, [booking_id]);
        if (bookingResult.rows.length === 0) {
            res.status(404).json({ message: 'Booking not found.' });
            return;
        }
        const booking = bookingResult.rows[0];
        const doc = new pdfkit_1.default();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=booking-${booking_id}.pdf`);
        doc.text(`Booking Confirmation`);
        doc.text(`Booking ID: ${booking.booking_id}`);
        doc.text(`Event: ${booking.event_id}`);
        doc.text(`Tickets: ${booking.number_of_tickets}`);
        doc.text(`Total Price: $${booking.total_price}`);
        doc.text(`Confirmation Code: ${booking.confirmation_code}`);
        doc.text(`Booking Date: ${booking.booking_date}`);
        doc.end();
        doc.pipe(res);
    }
    catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});
exports.generateBookingPDF = generateBookingPDF;
