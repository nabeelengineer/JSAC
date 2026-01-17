const axios = require("axios");
require('dotenv').config();

const LOGIN_URL = process.env.LOGIN_URL;
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

async function login() {
  const res = await axios.post(LOGIN_URL, { email: EMAIL, password: PASSWORD }, { timeout: 15000 });
  if (res.data && res.data.token) {
    return { token: res.data.token, productsList: res.data.productsList || [] };
  }
  throw new Error("Login failed or token missing");
}

module.exports = { login };
