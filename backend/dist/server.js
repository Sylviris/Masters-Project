"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const eventRoutes_1 = __importDefault(require("./routes/eventRoutes"));
const bookingRoutes_1 = __importDefault(require("./routes/bookingRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
app.use(express_1.default.json());
app.use('/api/events', eventRoutes_1.default);
app.use('/api/bookings', bookingRoutes_1.default);
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
