import { Router } from 'express';
import { verifyToken, authorizeRoles } from '../middleware/auth';
import { cancelBooking, createBooking, editBooking, generateBookingPDF, getAllBookings, getOrganizerBookings, getUserBookings } from '../controllers/bookingController';

const bookingRoutes = Router();

bookingRoutes.post('/create', verifyToken, authorizeRoles(['Customer']), createBooking);
bookingRoutes.post('/edit/:booking_id', verifyToken, authorizeRoles(['Customer']), editBooking);
bookingRoutes.delete('/cancel/:booking_id', verifyToken, authorizeRoles(['Customer', 'Admin']), cancelBooking);
bookingRoutes.get('/me/allBookings', verifyToken, authorizeRoles(['Customer']), getUserBookings);
bookingRoutes.get('/organizer/allBookings', verifyToken, authorizeRoles(['Organizer']), getOrganizerBookings);
bookingRoutes.get('/admin/allBookings', verifyToken, authorizeRoles(['Admin']), getAllBookings);
bookingRoutes.get('/me/:booking_id/pdf', verifyToken, authorizeRoles(['Customer']), generateBookingPDF);

export default bookingRoutes;