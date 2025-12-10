const ContactModel = require("../models/contactModel");
const catchAsync = require('../utils/catchAsync');

module.exports = {
  // Submit contact form
  submitContactForm: catchAsync(async (req, res) => {
    const { name, email, message } = req.body;
    
    // Create new contact entry
    const contact = new ContactModel({
      name,
      email,
      message,
      ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    await contact.save();

    return res.status(201).json({
      status: 'success',
      message: 'Thank you for contacting us! We will get back to you soon.',
      data: {
        id: contact._id,
        name: contact.name,
        email: contact.email
      }
    });
  }),

  // Get all contact submissions (admin only)
  getAllContacts: catchAsync(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status) {
      query.status = status;
    }

    const contacts = await ContactModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await ContactModel.countDocuments(query);

    return res.status(200).json({
      status: 'success',
      data: {
        contacts,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  }),

  // Get single contact by ID
  getContactById: catchAsync(async (req, res) => {
    const contact = await ContactModel.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: contact
    });
  }),

  // Update contact status
  updateContactStatus: catchAsync(async (req, res) => {
    const { status } = req.body;
    
    const contact = await ContactModel.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: contact
    });
  }),

  // Delete contact
  deleteContact: catchAsync(async (req, res) => {
    const contact = await ContactModel.findByIdAndDelete(req.params.id);

    if (!contact) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Contact deleted successfully'
    });
  })
};
