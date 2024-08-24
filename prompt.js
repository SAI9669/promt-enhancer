const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 3001; // Adjust if needed

const genAi = new GoogleGenerativeAI("AIzaSyDlnsaGVbVjvV0lccIpB2aXu94hm3PRTGc");
const model = genAi.getGenerativeModel({
    model: "gemini-1.5-pro",
});

app.use(bodyParser.json());

app.post('/enhance-prompt', async (req, res) => {
    const { corrected_text } = req.body;

    // Construct the formatted prompt
    const prompt = `
Convert the following prompt into a structured format:

Prompt Engineering basically consists of three structures:

*1. Initial Structure (Assume Expertise):* Assume that you are an expert in the context of the prompt.

*2. Second Structure (Context/Challenge):* Describe the specific challenge or confusion the user is facing related to the context of the prompt.

*3. Third Structure (Expectation from AI):* Clarify what you are expecting from the AI model based on the given prompt.

Your task is to enhance and convert the provided prompt into this structured format.

*User's Prompt:*
${corrected_text}

Please generate an enhanced prompt following the above three-structure format.
Combine all structures
`;

    try {
        const response = await model.generateContent(prompt);
        res.json({ enhanced_prompt: response.response.text() });
    } catch (error) {
        console.error('Error generating content:', error);
        res.status(500).json({ error: 'Error generating content.' });
    }
});

app.listen(port, () => {
    console.log(`Node.js server listening on port ${port}`);
});
