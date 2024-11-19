const express = require('express');
const Ticket = require('../models/Ticket');
const router = express.Router();

// Check if a similar ticket exists
router.post('/check-ticket', async (req, res) => {
  const { name, issue, department, deskId } = req.body;

  try {
    const existingTicket = await Ticket.findOne({ name, issue, department, deskId });
    if (existingTicket) {
      return res.json({ exists: true, status: existingTicket.status });
    }
    return res.json({ exists: false });
  } catch (error) {
    console.error(error);
    return res.status(500).send("Error checking ticket.");
  }
});

// Create a new ticket
router.post('/', async (req, res) => {
  const { name, issue, department, deskId, subject, email, description, media, status, createdAt } = req.body;

  const newTicket = new Ticket({
    name,
    issue,
    department,
    deskId,
    subject,
    email,
    description,
    media, // For file uploads, you need to handle file storage and provide the URL
    status,
    createdAt
  });

  try {
    await newTicket.save();
    res.json({ ticketId: newTicket._id });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating ticket.");
  }
});

module.exports = router;
