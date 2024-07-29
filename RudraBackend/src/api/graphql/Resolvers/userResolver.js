const db = require('../../../../config/db');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendMail } = require('../../../../utlility/mail');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const SALT_ROUNDS = 12;
const OTP_EXPIRY = 300000; // 5 minutes in milliseconds

function generateOTP() {
  return crypto.randomInt(100000, 999999);
}

async function findUserByEmail(email) {
  const query = 'SELECT * FROM USERS_TABLE WHERE email = $1';
  const { rows } = await db.query(query, [email]);
  return rows[0];
}

async function deleteUserByEmail(email) {
  const query = 'DELETE FROM USERS_TABLE WHERE email = $1';
  await db.query(query, [email]);
}

async function insertUser(username, password, email, verification_code) {
  const query = `
    INSERT INTO USERS_TABLE(username, password, email, createdat, updatedat, verification_code) 
    VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $4)
  `;
  await db.query(query, [username, password, email, verification_code]);
}

const userOperations = {
  loginUser: async ({ email, password }) => {
    try {
      const user = await findUserByEmail(email);
      if (!user) {
        return { success: false, message: "User Not Found!" };
      }
      if (!user.is_verified) {
        return { success: false, message: "User is not Verified!" };
      }
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return { success: false, message: "Invalid Password!" };
      }
      const token = jwt.sign({ userobj: user }, process.env.SECRET_KEY, { expiresIn: '24h' });
      return { success: true, message: "User Login Successfully!", token };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: "Something Went Wrong!" };
    }
  },

  registerUser: async ({ username, password, email }) => {
    try {
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        return { success: false, message: "Email Already Exists!" };
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const query = `
        INSERT INTO USERS_TABLE(username, password, email, createdat, updatedat, is_verified) 
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, true)
      `;
      await db.query(query, [username, hashedPassword, email]);

      return { success: true, message: "User Registered Successfully!" };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: "Something Went Wrong!" };
    }
  },

  verifyUser: async ({ verifytoken }) => {
    try {
      const query = 'SELECT id, email, is_verified FROM USERS_TABLE WHERE verification_code = $1';
      const { rows } = await db.query(query, [verifytoken]);

      if (!rows.length) {
        return "Token Expired!";
      }
      await db.query('UPDATE USERS_TABLE SET is_verified = true, verification_code = NULL WHERE verification_code = $1', [verifytoken]);
      return "Verification Successful!";
    } catch (error) {
      console.error('Verification error:', error);
      return "Something Went Wrong!";
    }
  },

  fetchUsers: async (args, req) => {
    if (!req.isAuth) {
      return { message: "UnAuthorized!" };
    }
    try {
      const { rows } = await db.query('SELECT * FROM USERS_TABLE');
      return { message: "Success", UserResponse: rows };
    } catch (error) {
      console.error('Fetch users error:', error);
      return { success: false, message: "Something Went Wrong!" };
    }
  },

  forgetPassword: async ({ email }) => {
    try {
      const user = await findUserByEmail(email);
      if (!user) {
        return "User Not Found!";
      }
      if (!user.is_verified) {
        return "User is not Verified!";
      }
      const otp = generateOTP();
      await db.query('UPDATE USERS_TABLE SET otp = $1 WHERE email = $2', [otp, email]);

      setTimeout(async () => {
        await db.query('UPDATE USERS_TABLE SET otp = NULL WHERE email = $1', [email]);
      }, OTP_EXPIRY);

      await sendMail(email, `OTP For Password Reset - ${user.username}`, `<div>Your OTP for Password Reset is ${otp}</div>`);
      return "OTP Generated Successfully!";
    } catch (error) {
      console.error('Forget password error:', error);
      return "Something Went Wrong!";
    }
  },

  resetPassword: async ({ email, otp, password }) => {
    try {
      const query = 'SELECT * FROM USERS_TABLE WHERE email = $1 AND otp = $2';
      const { rows } = await db.query(query, [email, otp]);

      if (!rows.length) {
        return "Invalid OTP!";
      }
      const user = rows[0];
      if (!user.is_verified) {
        return "User is not Verified!";
      }
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      await db.query('UPDATE USERS_TABLE SET password = $1, otp = NULL WHERE email = $2', [hashedPassword, email]);
      return "Password Reset Successfully!";
    } catch (error) {
      console.error('Reset password error:', error);
      return "Something Went Wrong!";
    }
  }
};

module.exports = userOperations;