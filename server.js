require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload setup using multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

mongoose.connect(process.env.MONGO_URI, {
  socketTimeoutMS: 40000, // 30 seconds timeout
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));


// Ticket Schema
const ticketSchema = new mongoose.Schema({
  name: String,
  issue: String,
  department: String,
  deskId: String,
  subject: String,
  email: String,
  description: String,
  media: String,
  status: { type: String, default: 'Open' },
  createdAt: { type: Date, default: Date.now }
});

const Ticket = mongoose.model('Ticket', ticketSchema);

// Check if Ticket exists
app.post('/api/check-ticket', async (req, res) => {
  const { name, issue, department, deskId } = req.body;
  try {
    const existingTicket = await Ticket.findOne({ name, issue, department, deskId });
    if (existingTicket) {
      return res.json({ exists: true, status: existingTicket.status });
    }
    return res.json({ exists: false });
  } catch (err) {
    res.status(500).json({ message: 'Error checking ticket' });
  }
});

// Create Ticket
app.post('/api/tickets', upload.single('media'), async (req, res) => {
  const { name, issue, department, deskId, subject, email, description } = req.body;
  const media = req.file ? req.file.path : null;

  try {
    const existingTicket = await Ticket.findOne({ name, issue, department, deskId });

    if (existingTicket) {
      return res.status(400).json({
        message: `A ticket with similar details exists. Status: ${existingTicket.status}`,
        ticketId: existingTicket._id,
      });
    }

    const newTicket = new Ticket({
      name,
      issue,
      department,
      deskId,
      subject,
      email,
      description,
      media
    });

    await newTicket.save();

    // Send Email Notification for New Ticket
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER, // Use GMAIL_USER from .env file
        pass: process.env.GMAIL_PASS, // Use GMAIL_PASS from .env file
      },
    });

    const mailOptions = {
      from: process.env.MAIL_USER, // Admin email from .env file
      to: process.env.MAIL_USER, // Admin email
      subject: 'New Ticket Created',
      text: `A new ticket has been created by ${name} for issue: ${issue}. Ticket ID: ${newTicket._id}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return res.status(500).json({ message: 'Failed to send email' });
      }

      console.log('Email sent: ' + info.response);
      res.status(201).json({
        message: 'Ticket created successfully',
        ticketId: newTicket._id,
      });
    });

  } catch (err) {
    console.error('Error creating ticket:', err);
    res.status(500).json({ message: 'Error creating ticket' });
  }
});

// Update Ticket Status and Send Email
app.patch('/api/tickets/:ticketId', async (req, res) => {
  const { ticketId } = req.params;
  const { status } = req.body;

  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.status = status;
    await ticket.save();

    // Send Email Notification about the status change
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.MAIL_USER,
      to: ticket.email,
      subject: `Ticket Status Updated: ${status}`,
      text: `Your ticket with ID: ${ticket._id} has been updated to the status: ${status}.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return res.status(500).json({ message: 'Failed to send email' });
      }

      console.log('Email sent: ' + info.response);
      res.status(200).json({
        message: `Ticket status updated to ${status}`,
        ticketId: ticket._id,
      });
    });

  } catch (err) {
    console.error('Error updating ticket status:', err);
    res.status(500).json({ message: 'Error updating ticket status' });
  }
});

// Send Email to Admin for General Inquiries
app.post('/api/send-email', async (req, res) => {
  const { email, subject, message } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const mailOptions = {
    from: email, // Sender's email address
    to: process.env.MAIL_USER, // Admin email
    subject: subject,
    text: message,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Failed to send email' });
  }
});

// Clear all tickets (Delete route)
app.delete('/api/clear-tickets', async (req, res) => {
  try {
    await Ticket.deleteMany({});
    res.status(200).json({ message: 'All tickets have been cleared' });
  } catch (err) {
    console.error('Error clearing tickets:', err);
    res.status(500).json({ message: 'Error clearing tickets' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


// Fetch tickets by status
app.get('/api/tickets/:status', async (req, res) => {
  const { status } = req.params;
  try {
    const tickets = await Ticket.find({ status });
    res.status(200).json(tickets);
  } catch (err) {
    console.error('Error fetching tickets:', err);
    res.status(500).json({ message: 'Error fetching tickets' });
  }
});


