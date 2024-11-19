const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  name: { type: String, required: true },
  issue: { type: String, required: true },
  department: { type: String, required: true },
  deskId: { type: String, required: true },
  subject: { type: String, required: true },
  email: { type: String, required: true },
  description: { type: String, required: true },
  media: { type: String }, // URL to the uploaded file
  status: { type: String, default: 'Open' },
  createdAt: { type: Date, default: Date.now },
});

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
