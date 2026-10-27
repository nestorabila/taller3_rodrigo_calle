const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const modelo = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
});

const preguntarGemini = async (systemPrompt, mensaje) => {

    try {

        const prompt = `
${systemPrompt}

Pregunta del usuario:

${mensaje}
`;

        const resultado = await modelo.generateContent(prompt);

        return resultado.response.text();

    } catch (error) {

        console.error("Error Gemini:", error);

        throw error;

    }

};

module.exports = {
    preguntarGemini
};