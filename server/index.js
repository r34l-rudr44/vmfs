import express from "express";
import cors from "cors"
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { buildOnePagerPrompt } from "./onePagerPrompt.js";

