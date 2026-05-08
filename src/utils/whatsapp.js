import axios from 'axios';

/**
 * Sends a WhatsApp message using AiSensy API.
 * @param {string} phone - Recipient's phone number
 * @param {string} campaignName - API Campaign name from AiSensy dashboard
 * @param {string} userName - Name of the customer
 * @param {Array} templateParams - Array of strings for template variables {{1}}, {{2}}, etc.
 */
export const sendWhatsAppTemplate = async (phone, campaignName, userName = "Customer", templateParams = []) => {
  const apiKey = process.env.WHATSAPP_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ WHATSAPP_API_KEY missing in .env. Skipping WhatsApp message.");
    return null;
  }

  // Sanitize phone: ensure it has '+' and country code
  let cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length === 10) {
    cleanPhone = "91" + cleanPhone; 
  }
  if (!cleanPhone.startsWith("+")) {
    cleanPhone = "+" + cleanPhone;
  }

  try {
    const response = await axios.post(
      'https://backend.aisensy.com/campaign/t1/api/v2',
      {
        apiKey: apiKey,
        campaignName: campaignName,
        destination: cleanPhone,
        userName: userName,
        templateParams: templateParams,
        source: "MagicScale Dashboard"
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ AiSensy WhatsApp campaign "${campaignName}" sent to ${cleanPhone}`);
    return response.data;
  } catch (error) {
    console.error(`❌ AiSensy WhatsApp failed:`, error.response?.data || error.message);
    return null;
  }
};
