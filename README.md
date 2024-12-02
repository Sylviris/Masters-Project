# **Event Management and Booking System**

## **Overview**

The Event Management and Booking System is a robust backend solution for managing events, ticket bookings, and reporting analytics. It supports role-based access control for **Admins**, **Organizers**, and **Customers**, providing secure and scalable operations.

---

## **Features**

- **Role-Based Access Control**:
  - Admins can manage events, bookings, and users, and access system-wide analytics.
  - Organizers can create/manage their events and view analytics for their events.
  - Customers can browse events, book tickets, and manage their bookings.
- **Booking and Ticketing**:
  - Secure booking system with real-time ticket availability checks.
  - Automatic payment tracking and receipt generation.
- **Reporting and Analytics**:
  - Generate insights like ticket sales, revenue trends, and booking patterns.
  - Organizers can analyze event-specific data; admins have access to system-wide analytics.

---

## **Technology Stack**

- **Backend**: Node.js with TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Libraries**:
  - Express.js (Routing)
  - Bcrypt (Password Encryption)
  - pg (PostgreSQL client for Node.js)
  - PDFKit (PDF Generation)

---

## **Installation**

### **Prerequisites**

- Node.js (v16 or higher)
- PostgreSQL (v13 or higher)

### **Setup Instructions**

2. Install dependencies: 
   ```bash
   npm install

3. Set up the database:
   
   - Create a PostgreSQL database named `event_management`.
   - Run the provided SQL script (`schema.sql`) to create tables and relationships.

4. Configure environment variables:
   Create a `.env` file in the root directory with the following keys:
   ```env
   PORT=3001
   DB_HOST=localhost
   DB_USER=your_db_username
   DB_PASSWORD=your_db_password
   DB_NAME=event_management
   JWT_SECRET=your_secret_key

## **API Endpoints**

### **Authentication**

| Endpoint                | Method | Description                              |
|-------------------------|--------|------------------------------------------|
| `/api/auth/login`       | POST   | Logs a user in and generates a JWT key   |
| `/api/auth/register`    | POST   | Registers a new user                     |

---

### **Event Management**

| Endpoint                           | Method   | Description                                   |
|------------------------------------|----------|-----------------------------------------------|
| `/api/events/getAll`               | GET      | Fetches all events                           |
| `/api/events/createEvent`          | POST     | Creates an event (Organizers)                |
| `/api/events/editEvent/:event_id`  | POST     | Edits/updates an event (Organizers, Admins)  |
| `/api/events/deleteEvent/:event_id`| DELETE   | Deletes an event (Organizers, Admins)        |

---

### **Booking Management**

| Endpoint                               | Method   | Description                                           |
|----------------------------------------|----------|-------------------------------------------------------|
| `/api/bookings/create`                 | POST     | Create a booking (Customer)                          |
| `/api/bookings/edit/:booking_id`       | POST     | Edit a booking (Customer)                            |
| `/api/bookings/cancel/:booking_id`     | DELETE   | Cancels a booking (Customer, Admin)                  |
| `/api/bookings/me/allBookings`         | GET      | Gets all bookings for a customer (Customer)          |
| `/api/bookings/organizer/allBookings`  | GET      | Gets all bookings for organizer’s events (Organizer) |
| `/api/bookings/admin/allBookings`      | GET      | Gets all bookings from every customer (Admins)       |
| `/api/bookings/me/:booking_id/pdf`     | GET      | Generates PDF of booking confirmation (Customer)     |

---

### **Payments**

| Endpoint                           | Method   | Description                                     |
|------------------------------------|----------|-------------------------------------------------|
| `/api/pay/:booking_id`             | POST     | Makes payment for a booking (Customer)         |
| `/api/pay/receipt/:payment_id`     | GET      | Gets receipt for a payment (Customer)          |
| `/api/pay/receipts`                | GET      | Gets all receipts for the current customer     |
| `/api/pay/receipts/:customer_id`   | GET      | Gets all receipts for a specific customer (Admin) |

---

### **Analytics**

| Endpoint                          | Method   | Description                                      |
|-----------------------------------|----------|--------------------------------------------------|
| `/api/analytics/getAnalytics`     | GET      | Gets analytics for admins (Admins)              |
| `/api/sales/organizer/sales`      | GET      | Gets sales data for organizer’s events (Organizer) |

## **Future Enhancements**

The system can be expanded and improved with the following
