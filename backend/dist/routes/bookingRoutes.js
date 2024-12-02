"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const bookingController_1 = require("../controllers/bookingController");
const bookingRoutes = (0, express_1.Router)();
bookingRoutes.post('/bookings', auth_1.verifyToken, bookingController_1.createBooking);
bookingRoutes.get('/bookings/me', auth_1.verifyToken, (0, auth_1.authorizeRoles)(['Customer']));
exports.default = bookingRoutes;
