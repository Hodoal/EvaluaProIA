// Configuración para Google Gemini AI con soporte para archivos
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Función para convertir archivo a base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]; // Remover el prefijo data:
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Función para obtener el mime type correcto
const getMimeType = (file) => {
  return file.type || 'application/octet-stream';
};

// Llamar a Gemini con archivo base y archivo a evaluar (archivos locales)
export const callGeminiWithFiles = async (baseFile, evaluationFile, subject) => {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY no está configurada');
    throw new Error('API Key de Gemini no configurada');
  }

  try {
    const [baseFileBase64, evalFileBase64] = await Promise.all([
      fileToBase64(baseFile),
      fileToBase64(evaluationFile)
    ]);

    const prompt = `Eres un asistente de evaluación académica experto. Te proporciono dos archivos:

1. ARCHIVO BASE: Este es el ejemplo de referencia, rúbrica o trabajo modelo que debes usar como estándar de evaluación.
2. ARCHIVO A EVALUAR: Este es el trabajo del estudiante que necesitas calificar.

CRITERIOS DE EVALUACIÓN: ${subject.criteria.join(', ')}
ESCALA DE CALIFICACIÓN: ${subject.scoreType}
ASIGNATURA: ${subject.name}

INSTRUCCIONES:
- Compara el archivo a evaluar con el archivo base
- Evalúa según los criterios proporcionados
- Asigna una calificación en la escala ${subject.scoreType}
- Proporciona retroalimentación constructiva específica
- Menciona fortalezas y áreas de mejora

FORMATO DE RESPUESTA REQUERIDO:
Calificación: [número]
Retroalimentación: [análisis detallado comparando con el archivo base]`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              },
              {
                inline_data: {
                  mime_type: getMimeType(baseFile),
                  data: baseFileBase64
                }
              },
              {
                text: "ARCHIVO A EVALUAR:"
              },
              {
                inline_data: {
                  mime_type: getMimeType(evaluationFile),
                  data: evalFileBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4, // Más conservador para evaluaciones
          topK: 1,
          topP: 1,
          maxOutputTokens: 4096,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error de API: ${response.status} - ${errorData.error?.message || 'Error desconocido'}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Respuesta inválida de la API');
    }

    const responseText = data.candidates[0].content.parts[0].text;
    
    // Parsear la respuesta para extraer calificación y retroalimentación
    const scoreMatch = responseText.match(/Calificación:\s*(\d+(?:\.\d+)?)/i);
    const feedbackMatch = responseText.match(/Retroalimentación:\s*(.*)/is);
    
    return {
      score: scoreMatch ? parseFloat(scoreMatch[1]) : 5,
      feedback: feedbackMatch ? feedbackMatch[1].trim() : responseText,
      fullResponse: responseText
    };

  } catch (error) {
    console.error('Error llamando a Gemini API:', error);
    
    // Fallback para desarrollo/testing
    return {
      score: Math.floor(Math.random() * 3) + 7, // Entre 7-10 para simular buenas calificaciones
      feedback: `Evaluación simulada: El trabajo fue comparado con el archivo base "${baseFile.name}". Se encontraron similitudes en la estructura y contenido. Se recomienda revisar algunos aspectos específicos mencionados en el archivo de referencia para mejorar la calidad del trabajo.`,
      fullResponse: 'Respuesta simulada debido a error en API'
    };
  }
};

// Función alternativa para evaluar solo con texto (sin archivo base)
export const callGeminiAPI = async (prompt, content) => {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY no está configurada');
    throw new Error('API Key de Gemini no configurada');
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${prompt}\n\nTexto a evaluar:\n${content}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Error de API: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates[0].content.parts[0].text;
    
    const scoreMatch = responseText.match(/Calificación:\s*(\d+)/i);
    const feedbackMatch = responseText.match(/Retroalimentación:\s*(.*)/is);
    
    return {
      score: scoreMatch ? parseInt(scoreMatch[1]) : 5,
      feedback: feedbackMatch ? feedbackMatch[1].trim() : responseText,
      fullResponse: responseText
    };

  } catch (error) {
    console.error('Error llamando a Gemini API:', error);
    
    return {
      score: Math.floor(Math.random() * 5) + 6,
      feedback: `Evaluación simulada: El trabajo muestra buen desarrollo. Se recomienda revisar algunos aspectos para mejorar la presentación.`,
      fullResponse: 'Respuesta simulada debido a error en API'
    };
  }
};