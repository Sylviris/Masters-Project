import { Router } from 'express';
import { getAllEvents, createEvent, deleteEvent, editEvent } from '../controllers/eventController';
import { authorizeRoles, verifyToken } from '../middleware/auth';

const eventRoutes = Router();
eventRoutes.post('/createEvent', verifyToken, authorizeRoles(['Organizer']), createEvent);
eventRoutes.post('/editEvent/:event_id', verifyToken, authorizeRoles(['Organizer', 'Admin']), editEvent)
eventRoutes.delete('/deleteEvent/:event_id', verifyToken, authorizeRoles(['Organizer', 'Admin']), deleteEvent);
eventRoutes.get('/getAll', getAllEvents);

export default eventRoutes;
