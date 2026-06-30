require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

transporter.verify(function(error, success) {
  if (error) {
    console.log("Error verifying connection:");
    console.log(error);
  } else {
    console.log("Success! Server is ready to take our messages");
  }
});
