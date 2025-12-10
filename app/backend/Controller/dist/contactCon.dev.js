"use strict";

var ContactModel = require("../models/contactModel");

var catchAsync = require('../utils/catchAsync');

module.exports = {
  // Submit contact form
  submitContactForm: catchAsync(function _callee(req, res) {
    var _req$body, name, email, message, contact;

    return regeneratorRuntime.async(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _req$body = req.body, name = _req$body.name, email = _req$body.email, message = _req$body.message; // Create new contact entry

            contact = new ContactModel({
              name: name,
              email: email,
              message: message,
              ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
              userAgent: req.headers['user-agent']
            });
            _context.next = 4;
            return regeneratorRuntime.awrap(contact.save());

          case 4:
            return _context.abrupt("return", res.status(201).json({
              status: 'success',
              message: 'Thank you for contacting us! We will get back to you soon.',
              data: {
                id: contact._id,
                name: contact.name,
                email: contact.email
              }
            }));

          case 5:
          case "end":
            return _context.stop();
        }
      }
    });
  }),
  // Get all contact submissions (admin only)
  getAllContacts: catchAsync(function _callee2(req, res) {
    var _req$query, _req$query$page, page, _req$query$limit, limit, status, skip, query, contacts, total;

    return regeneratorRuntime.async(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _req$query = req.query, _req$query$page = _req$query.page, page = _req$query$page === void 0 ? 1 : _req$query$page, _req$query$limit = _req$query.limit, limit = _req$query$limit === void 0 ? 10 : _req$query$limit, status = _req$query.status;
            skip = (page - 1) * limit;
            query = {};

            if (status) {
              query.status = status;
            }

            _context2.next = 6;
            return regeneratorRuntime.awrap(ContactModel.find(query).sort({
              createdAt: -1
            }).skip(skip).limit(parseInt(limit)).select('-__v'));

          case 6:
            contacts = _context2.sent;
            _context2.next = 9;
            return regeneratorRuntime.awrap(ContactModel.countDocuments(query));

          case 9:
            total = _context2.sent;
            return _context2.abrupt("return", res.status(200).json({
              status: 'success',
              data: {
                contacts: contacts,
                pagination: {
                  current: parseInt(page),
                  pages: Math.ceil(total / limit),
                  total: total
                }
              }
            }));

          case 11:
          case "end":
            return _context2.stop();
        }
      }
    });
  }),
  // Get single contact by ID
  getContactById: catchAsync(function _callee3(req, res) {
    var contact;
    return regeneratorRuntime.async(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return regeneratorRuntime.awrap(ContactModel.findById(req.params.id));

          case 2:
            contact = _context3.sent;

            if (contact) {
              _context3.next = 5;
              break;
            }

            return _context3.abrupt("return", res.status(404).json({
              status: 'error',
              message: 'Contact not found'
            }));

          case 5:
            return _context3.abrupt("return", res.status(200).json({
              status: 'success',
              data: contact
            }));

          case 6:
          case "end":
            return _context3.stop();
        }
      }
    });
  }),
  // Update contact status
  updateContactStatus: catchAsync(function _callee4(req, res) {
    var status, contact;
    return regeneratorRuntime.async(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            status = req.body.status;
            _context4.next = 3;
            return regeneratorRuntime.awrap(ContactModel.findByIdAndUpdate(req.params.id, {
              status: status
            }, {
              "new": true,
              runValidators: true
            }));

          case 3:
            contact = _context4.sent;

            if (contact) {
              _context4.next = 6;
              break;
            }

            return _context4.abrupt("return", res.status(404).json({
              status: 'error',
              message: 'Contact not found'
            }));

          case 6:
            return _context4.abrupt("return", res.status(200).json({
              status: 'success',
              data: contact
            }));

          case 7:
          case "end":
            return _context4.stop();
        }
      }
    });
  }),
  // Delete contact
  deleteContact: catchAsync(function _callee5(req, res) {
    var contact;
    return regeneratorRuntime.async(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return regeneratorRuntime.awrap(ContactModel.findByIdAndDelete(req.params.id));

          case 2:
            contact = _context5.sent;

            if (contact) {
              _context5.next = 5;
              break;
            }

            return _context5.abrupt("return", res.status(404).json({
              status: 'error',
              message: 'Contact not found'
            }));

          case 5:
            return _context5.abrupt("return", res.status(200).json({
              status: 'success',
              message: 'Contact deleted successfully'
            }));

          case 6:
          case "end":
            return _context5.stop();
        }
      }
    });
  })
};