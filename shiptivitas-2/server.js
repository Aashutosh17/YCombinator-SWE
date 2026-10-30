
import express from 'express';
import Database from 'better-sqlite3';

const app = express();
const PORT = 3001;

// Parse incoming JSON requests.
app.use(express.json());

// Allow the React frontend to access this API.
app.use((req, res, next) => {
  res.header(
    'Access-Control-Allow-Origin',
    'http://localhost:3002'
  );
  res.header(
    'Access-Control-Allow-Methods',
    'GET, PUT, OPTIONS'
  );
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type'
  );

  // Handle browser preflight requests.
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// Connect to the existing SQLite database.
const db = new Database('./clients.db');

const VALID_STATUSES = [
  'backlog',
  'in-progress',
  'complete'
];

// Close database connection when the server stops.
const closeDb = () => {
  if (db.open) {
    db.close();
  }
};

process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});

process.on('SIGINT', () => {
  closeDb();
  process.exit(0);
});

// Validate a client ID.
const validateId = (id) => {
  if (!Number.isSafeInteger(id) || id <= 0) {
    return {
      valid: false,
      messageObj: {
        message: 'Invalid id provided.',
        long_message: 'Id must be a positive integer.'
      }
    };
  }

  const client = db.prepare(
    'SELECT * FROM clients WHERE id = ?'
  ).get(id);

  if (!client) {
    return {
      valid: false,
      messageObj: {
        message: 'Invalid id provided.',
        long_message: 'Cannot find client with that id.'
      }
    };
  }

  return {
    valid: true,
    client
  };
};

// Validate client priority.
const validatePriority = (priority) => {
  if (!Number.isSafeInteger(priority) || priority <= 0) {
    return {
      valid: false,
      messageObj: {
        message: 'Invalid priority provided.',
        long_message: 'Priority must be a positive integer.'
      }
    };
  }

  return { valid: true };
};

// API home route.
app.get('/', (req, res) => {
  return res.status(200).send({
    message: 'SHIPTIVITY API. Read documentation to see API docs'
  });
});

/**
 * GET /api/v1/clients
 *
 * Retrieve all clients.
 * Optional filter: ?status=backlog
 */
app.get('/api/v1/clients', (req, res) => {
  const { status } = req.query;

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).send({
        message: 'Invalid status provided.',
        long_message:
          'Status must be backlog, in-progress, or complete.'
      });
    }

    const clients = db.prepare(
      'SELECT * FROM clients WHERE status = ? ORDER BY priority ASC'
    ).all(status);

    return res.status(200).send(clients);
  }

  const clients = db.prepare(
    'SELECT * FROM clients ORDER BY status, priority ASC'
  ).all();

  return res.status(200).send(clients);
});

/**
 * GET /api/v1/clients/:id
 *
 * Retrieve a single client.
 */
app.get('/api/v1/clients/:id', (req, res) => {
  const id = Number(req.params.id);

  const { valid, messageObj, client } = validateId(id);

  if (!valid) {
    return res.status(400).send(messageObj);
  }

  return res.status(200).send(client);
});

/**
 * PUT /api/v1/clients/:id
 *
 * Update a client's status and/or priority.
 *
 * Example:
 * {
 *   "status": "in-progress",
 *   "priority": 1
 * }
 *
 * Priority 1 means the first card in a swimlane.
 * Other cards are automatically reordered.
 */
app.put('/api/v1/clients/:id', (req, res) => {
  const id = Number(req.params.id);

  // Validate client.
  const { valid, messageObj, client } = validateId(id);

  if (!valid) {
    return res.status(400).send(messageObj);
  }

  // Read request body.
  const { status, priority } = req.body || {};

  if (status === undefined && priority === undefined) {
    return res.status(400).send({
      message: 'No update provided.',
      long_message: 'Provide status, priority, or both.'
    });
  }

  // Validate status.
  if (
    status !== undefined &&
    !VALID_STATUSES.includes(status)
  ) {
    return res.status(400).send({
      message: 'Invalid status provided.',
      long_message:
        'Status must be backlog, in-progress, or complete.'
    });
  }

  // Validate priority.
  if (priority !== undefined) {
    const result = validatePriority(priority);

    if (!result.valid) {
      return res.status(400).send(result.messageObj);
    }
  }

  const targetStatus =
    status === undefined ? client.status : status;

  try {
    // Use a transaction to keep all updates consistent.
    const updateClients = db.transaction(() => {
      const clients = db.prepare(
        'SELECT * FROM clients ORDER BY priority ASC, id ASC'
      ).all();

      // Group clients by swimlane.
      const lanes = {
        backlog: [],
        'in-progress': [],
        complete: []
      };

      // Exclude the client being moved.
      clients.forEach(item => {
        if (item.id !== id) {
          lanes[item.status].push(item);
        }
      });

      // Calculate destination position.
      let targetPosition;

      if (priority !== undefined) {
        targetPosition = Math.min(
          priority - 1,
          lanes[targetStatus].length
        );
      } else if (targetStatus === client.status) {
        targetPosition = Math.min(
          client.priority - 1,
          lanes[targetStatus].length
        );
      } else {
        targetPosition = lanes[targetStatus].length;
      }

      // Insert the client at its new position.
      lanes[targetStatus].splice(targetPosition, 0, {
        ...client,
        status: targetStatus
      });

      // Save the updated order in SQLite.
      const updateStatement = db.prepare(
        'UPDATE clients SET status = ?, priority = ? WHERE id = ?'
      );

      VALID_STATUSES.forEach(lane => {
        lanes[lane].forEach((item, index) => {
          updateStatement.run(
            lane,
            index + 1,
            item.id
          );
        });
      });
    });

    updateClients();

    // Return all clients with their saved positions.
    const updatedClients = db.prepare(
      'SELECT * FROM clients ORDER BY status, priority ASC'
    ).all();

    return res.status(200).send(updatedClients);

  } catch (error) {
    console.error('Error updating client:', error);

    return res.status(500).send({
      message: 'Failed to update client.',
      long_message: 'An internal database error occurred.'
    });
  }
});

// Start backend server.
app.listen(PORT, () => {
  console.log(`SHIPTIVITY API running on port ${PORT}`);
});
