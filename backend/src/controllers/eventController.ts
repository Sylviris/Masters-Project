import { Request, Response } from "express";
import pool from "../config/db";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

export const createEvent = async (
  req: Request,
  res: Response
): Promise<void> => {
  const {
    event_name,
    event_start,
    event_end,
    description,
    event_type,
    venue_id,
    tickets,
  } = req.body;

  if (
    !event_name ||
    !event_start ||
    !event_end ||
    !description ||
    !venue_id ||
    !tickets ||
    tickets.length === 0
  ) {
    res
      .status(400)
      .json({
        message: "All fields are required, including at least one ticket.",
      });
    return;
  }

  try {
    const checkOverlap = await pool.query(
      `SELECT * FROM EVENTS WHERE venue_id = $1 AND ($2::timestamp < event_end AND $3::timestamp > event_start)`,
      [venue_id, event_start, event_end]
    );

    if (checkOverlap.rows.length > 0) {
      res.status(409).json({
        message: "The venue is already booked for the specified time range.",
        conflictingEvent: checkOverlap.rows[0],
      });
      return;
    }

    const eventResult = await pool.query(
      `
      INSERT INTO Events (event_name, event_start, event_end, description, event_type, venue_id, organizer_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
      `,
      [
        event_name,
        event_start,
        event_end,
        description,
        event_type,
        venue_id,
        (req as AuthenticatedRequest).user?.id,
      ]
    );

    const event = eventResult.rows[0];

    for (const ticket of tickets) {
      const { ticket_type, price, availability } = ticket;
      await pool.query(
        `
          INSERT INTO Tickets (event_id, ticket_type, price, availability)
                  VALUES ($1, $2, $3, $4);
              `,
        [event.event_id, ticket_type, price, availability]
      );
    }

    res.status(201).json({
      message: "Event created successfully.",
      event: eventResult.rows[0],
    });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const editEvent = async (req: Request, res: Response): Promise<void> => {
  const { event_id } = req.params;
  const {
    event_name,
    event_start,
    event_end,
    description,
    event_type,
    venue_id,
  } = req.body;

  if (
    !event_name ||
    !event_start ||
    !event_end ||
    !description ||
    !event_type ||
    !venue_id
  ) {
    res
      .status(400)
      .json({
        message:
          "All fields (event_name, event_start, event_end, description, event_type, venue_id) are required.",
      });
    return;
  }

  try {
    var checkValid;

    if ((req as AuthenticatedRequest).user?.role === "Admin") {
      checkValid = await pool.query(
        `
        SELECT * FROM Events WHERE event_id = $1
        `,
        [event_id]
      );
    } else if ((req as AuthenticatedRequest).user?.role !== "Organizer") {
      checkValid = await pool.query(
        `
        SELECT * FROM Events WHERE event_id = $1 AND organizer_id = $2
        `,
        [event_id, (req as AuthenticatedRequest).user?.id]
      );
    } else {
      res
        .status(403)
        .json({
          message:
            "You are not authorized to delete this event or it does not exist",
        });
      return;
    }

    const checkOverlap = await pool.query(
      `SELECT * FROM EVENTS WHERE venue_id = $1 AND ($2::timestamp < event_end AND $3::timestamp > event_start) AND event_id != $4`,
      [venue_id, event_start, event_end, event_id]
    );

    if (checkOverlap.rows.length > 0) {
      res.status(409).json({
        message: "The venue is already booked for the specified time range.",
        conflictingEvent: checkOverlap.rows[0],
      });
      return;
    }

    const updateResult = await pool.query(
      `
      UPDATE Events 
            SET 
                event_name = COALESCE($1, event_name),
                event_start = COALESCE($2, event_start),
                event_end = COALESCE($3, event_end),
                description = COALESCE($4, description),
                event_type = COALESCE($5, event_type),
                venue_id = COALESCE($6, venue_id)
            WHERE event_id = $7
            RETURNING *;
        `,
      [
        event_name,
        event_start,
        event_end,
        description,
        event_type,
        venue_id,
        event_id,
      ]
    );

    res.status(200).json({
      message: "Event updated successfully.",
      event: updateResult.rows[0],
    });
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const deleteEvent = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { event_id } = req.params;

  try {
    var checkValid;

    if ((req as AuthenticatedRequest).user?.role === "Admin") {
      checkValid = await pool.query(
        `
        SELECT * FROM Events WHERE event_id = $1
        `,
        [event_id]
      );
    } else if ((req as AuthenticatedRequest).user?.role !== "Organizer") {
      checkValid = await pool.query(
        `
        SELECT * FROM Events WHERE event_id = $1 AND organizer_id = $2
        `,
        [event_id, (req as AuthenticatedRequest).user?.id]
      );
    } else {
      res
        .status(403)
        .json({
          message:
            "You are not authorized to delete this event or it does not exist",
        });
      return;
    }

    const deleteResult = await pool.query(
      `
      DELETE FROM Events WHERE event_id = $1 RETURNING *
      `,
      [event_id]
    );

    res.status(200).json({
      message: "Event and related bookings deleted successfully.",
      deletedEvent: deleteResult.rows[0],
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const getAllEvents = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await pool.query(`SELECT 
      e.event_id, 
      e.event_name, 
      e.event_start, 
      e.event_end, 
      e.description, 
      e.venue_id, 
      v.venue_name AS venue_name, 
      v.location AS venue_location,
      JSON_AGG(
          JSON_BUILD_OBJECT(
              'ticket_type', t.ticket_type,
              'price', t.price,
              'availability', t.availability
          )
      ) AS tickets
  FROM Events e
  LEFT JOIN Venues v ON e.venue_id = v.venue_id
  LEFT JOIN Tickets t ON e.event_id = t.event_id
  GROUP BY e.event_id, v.venue_id;
`);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};
