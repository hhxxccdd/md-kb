import { Router } from "express";
import { handleAIStream } from "./service";
import aiRateLimiter from "../../middleware/rateLimit";

const aiRouter = Router()


// 1. Ai润色
aiRouter.post('/polish', aiRateLimiter,(req,res) => handleAIStream(req,res,"polish"))

// 2. AI翻译
aiRouter.post("/translate", aiRateLimiter, (req, res) => handleAIStream(req, res, "translate"));

// 3. 文档问答
aiRouter.post("/answer-doc",  aiRateLimiter,(req, res) => handleAIStream(req, res, "answerDocWithContext"));


export default aiRouter