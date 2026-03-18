const express = require('express');
const { asyncHandler } = require('../../utils/async-handler');
const authController = require('./auth.controller');

const authRoutes = express.Router();

authRoutes.get('/bootstrap-status', asyncHandler(authController.getBootstrapStatus));
authRoutes.post('/login', asyncHandler(authController.login));

module.exports = { authRoutes };
