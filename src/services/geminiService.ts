import { GoogleGenAI, Type } from "@google/genai";

export interface Wholesaler {
  name: string;
  address?: string;
  website?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  description?: string;
  type?: 'inbound' | 'outbound' | 'logistics' | 'local_operator' | 'dried_fruits_nuts' | 'dates_supplier' | 'food_distributor' | 'fmcg_wholesaler';
}

export interface GroundingChunk {
  maps?: {
    uri: string;
    title: string;
  };
}

export async function findWholesalers(
  region: string, 
  leadType: 'inbound' | 'outbound' | 'both' | 'logistics' | 'local_operator' | 'dried_fruits_nuts' | 'dates_supplier' | 'food_distributor' | 'fmcg_wholesaler', 
  leadsCount: number = 5,
  specialization?: string
): Promise<{ wholesalers: Wholesaler[]; text: string; chunks: any[] }> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  let typeFilter = "";
  let categoryDescription = "";
  
  switch (leadType) {
    case 'both':
      categoryDescription = "tourism wholesalers (mayoristas de turismo)";
      typeFilter = "both inbound and outbound international group packages";
      break;
    case 'logistics':
      categoryDescription = "tourism logistics and transportation companies";
      typeFilter = "transportation services specifically for tourists and local tour operators (e.g., bus companies, private transfers, shuttle services)";
      break;
    case 'local_operator':
      categoryDescription = `local tour operators specialized in ${specialization || 'general tourism'}`;
      typeFilter = `local tourism operations and ground services specialized in ${specialization || 'general tourism experiences'}`;
      break;
    case 'dried_fruits_nuts':
      categoryDescription = "Dried Fruits & Nuts suppliers and wholesalers";
      typeFilter = "wholesale distribution of dried fruits, nuts, and related snacks";
      break;
    case 'dates_supplier':
      categoryDescription = "Dates (fruit) suppliers and wholesalers";
      typeFilter = "specialized wholesale distribution of fresh and dried dates";
      break;
    case 'food_distributor':
      categoryDescription = "Food distributors and wholesalers";
      typeFilter = "general food distribution, grocery wholesale, and food supply chain services";
      break;
    case 'fmcg_wholesaler':
      categoryDescription = "FMCG (Fast-Moving Consumer Goods) wholesalers";
      typeFilter = "wholesale distribution of fast-moving consumer goods, including household items, personal care, and packaged foods";
      break;
    default:
      categoryDescription = "tourism wholesalers (mayoristas de turismo)";
      typeFilter = leadType;
  }

  const prompt = `Find exactly ${leadsCount} major ${categoryDescription} in ${region}.
  
  CRITICAL REQUIREMENT: You MUST ONLY return companies that are of the type "${leadType === 'both' ? 'inbound or outbound' : leadType}". 
  DO NOT mix different types of companies. 
  If searching for ${leadType}, every single result must be a ${leadType}.
  
  For each company, provide:
  1. Company Name
  2. Website URL (if available)
  3. Contact Email (if available)
  4. Phone Number (if available)
  5. WhatsApp Number or Link (if available)
  6. Brief description of their specialty, specifically mentioning their expertise in ${categoryDescription}.
  7. The type MUST be exactly "${leadType === 'both' ? 'inbound' : leadType}" (or "outbound" if it fits the "both" criteria).

  IMPORTANT: Return ONLY a JSON array of objects with the following keys: "name", "website", "email", "phone", "whatsapp", "description", "address", "type" (where type is one of "inbound", "outbound", "logistics", "local_operator", "dried_fruits_nuts", "dates_supplier", "food_distributor", or "fmcg_wholesaler"). Do not include any other text or markdown formatting outside the JSON array.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        // responseMimeType and responseSchema are not allowed when using googleMaps tool
      },
    });

    let wholesalers: Wholesaler[] = [];
    const text = response.text || "";
    
    try {
      // Clean the text in case it's wrapped in markdown code blocks
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : text;
      wholesalers = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse JSON response:", e);
      console.log("Raw response text:", text);
    }

    return {
      wholesalers: Array.isArray(wholesalers) ? wholesalers : [],
      text: text,
      chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
    };
  } catch (error) {
    console.error("Error finding wholesalers:", error);
    throw error;
  }
}

export interface GeneratedEmail {
  subject: string;
  body: string;
}

export async function generatePersonalizedEmail(wholesaler: Wholesaler, senderName: string, customPoints?: string, language: string = 'English'): Promise<GeneratedEmail> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `Write a professional and personalized outreach email to a tourism wholesaler in ${language}.
  
  Target Wholesaler:
  - Name: ${wholesaler.name}
  - Description: ${wholesaler.description}
  - Type: ${wholesaler.type || 'tourism wholesaler'}
  
  Sender Name: ${senderName}
  ${customPoints ? `\nSpecific Points/Proposal to include:\n${customPoints}` : ''}
  
  The email should:
  1. Be written entirely in ${language}.
  2. Have a catchy, professional subject line.
  3. Be professional yet engaging and warm.
  4. Reference their specific specialty: "${wholesaler.description}".
  5. Propose a potential partnership for international group packages.
  ${customPoints ? `6. Integrate the following specific points naturally: "${customPoints}"` : ''}
  7. Include a clear call to action (e.g., a brief meeting or a call).
  8. Use the sender name "${senderName}" in the signature.
  
  Return the response as a JSON object with two fields: "subject" and "body".`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            body: { type: Type.STRING }
          },
          required: ["subject", "body"]
        }
      }
    });

    try {
      return JSON.parse(response.text || '{"subject": "Partnership Opportunity", "body": "Failed to generate email body."}');
    } catch (e) {
      return {
        subject: "Partnership Opportunity",
        body: response.text || "Failed to generate email body."
      };
    }
  } catch (error) {
    console.error("Error generating email:", error);
    throw error;
  }
}
