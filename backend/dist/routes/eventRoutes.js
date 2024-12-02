"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const eventController_1 = __importDefault(require("../controllers/eventController"));
const eventRoutes = (0, express_1.Router)();
eventRoutes.get('/events', eventController_1.default);
exports.default = eventRoutes;
