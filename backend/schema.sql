CREATE TABLE Customers (
    customer_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Customer', 'Organizer', 'Admin')),
);

CREATE TABLE Events (
    event_id SERIAL PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    event_start TIMESTAMP NOT NULL,
    event_end TIMESTAMP NOT NULL,
    description TEXT,
    event_type VARCHAR(50),
    venue_id INT,
    organizer_id INT NOT NULL,
    FOREIGN KEY (venue_id) REFERENCES Venues(venue_id),
    FOREIGN KEY (organizer_id) REFERENCES Customers(customer_id)
);

CREATE TABLE Bookings (
    booking_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    event_id INT NOT NULL,
    number_of_tickets INT NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    booking_status VARCHAR(50) DEFAULT 'Pending',
    payment_status VARCHAR(50) DEFAULT 'Unpaid',
    booking_date TIMESTAMP DEFAULT NOW(),
    ticket_type VARCHAR(50),
    payment_method VARCHAR(50),
    payment_date TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES Customers(customer_id),
    FOREIGN KEY (event_id) REFERENCES Events(event_id)
);

CREATE TABLE Payments (
    payment_id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL,
    payment_method VARCHAR(50),
    amount NUMERIC(10, 2) NOT NULL,
    payment_date TIMESTAMP DEFAULT NOW(),
    payment_status VARCHAR(50) DEFAULT 'Paid',
    FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id)
);

CREATE TABLE Venues (
    venue_id SERIAL PRIMARY KEY,
    venue_name VARCHAR(255) NOT NULL,
    capacity INT NOT NULL,
    location VARCHAR(255),
    facilities TEXT
);

CREATE TABLE Tickets (
  ticket_id SERIAL PRIMARY KEY,
  event_id INT NOT NULL,
  ticket_type VARCHAR(50),
  price NUMERIC(10, 2),
  availability INT,
  FOREIGN KEY (event_id_ REFERENCES Events(event_id))  
);




