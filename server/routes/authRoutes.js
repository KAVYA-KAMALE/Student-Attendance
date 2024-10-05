const express = require('express');
const { loginAdmin, registerAdmin } = require('../controllers/authController'); // Ensure this import is correct
const router = express.Router();

// Register route (optional, if you want to register from API)
router.post('/register', registerAdmin); // Ensure registerAdmin is a valid function in authController

// Login route
router.post('/login', loginAdmin); // Ensure loginAdmin is a valid function in authController

module.exports = router;
