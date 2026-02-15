import express from "express";
import { getChatbotResponse } from "../controllers/chatbot.controllers.js";

const app = express.Router();

// POST /api/v1/chat/new
app.post("/new", getChatbotResponse);

export default app;