const serverless = require("serverless-http");
const express = require("express");
const app = require("./index"); // Assuming your Express app is exported from index.js

module.exports.handler = serverless(app);
