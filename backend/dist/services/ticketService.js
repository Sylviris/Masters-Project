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
exports.applyGroupDiscount = exports.calculatePrice = void 0;
const db_1 = __importDefault(require("../config/db"));
const calculatePrice = (event_id, ticket_type) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield db_1.default.query(`SELECT price FROM Tickets WHERE event_id = $1 AND ticket_type = $2`, [event_id, ticket_type]);
    if (result.rows.length === 0) {
        throw new Error('Ticket type not found.');
    }
    return result.rows[0].price;
});
exports.calculatePrice = calculatePrice;
const applyGroupDiscount = (price, number_of_tickets) => {
    if (number_of_tickets >= 10) {
        return price * 0.9; // 10% discount
    }
    return price;
};
exports.applyGroupDiscount = applyGroupDiscount;
