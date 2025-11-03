// api/try-on.js
// Bu dosyayı Vercel projenizde /api/try-on.js olarak kaydedin

export default async function handler(req, res) {
  // CORS ayarları
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { garmentImage, personImage, prompt, category } = req.body;

    // Nano Banana API Key (Environment Variable'dan alın)
    const API_KEY = process.env.NANO_BANANA_API_KEY || 'AIzaSyDCVK7A517fUIfXoQpyqkzu3gXbk2JWxEk';
    
    // Nano Banana API endpoint - Gerçek endpoint'i buraya yazın
    const API_ENDPOINT = 'https://api.nanobanana.com/v1/virtual-tryon';

    // 2 farklı varyasyon oluştur
    const results = await Promise.all([
      generateImage(API_ENDPOINT, API_KEY, garmentImage, personImage, prompt, 1),
      generateImage(API_ENDPOINT, API_KEY, garmentImage, personImage, prompt, 2)
    ]);

    // Sonuçları döndür
    res.status(200).json({
      success: true,
      image1: results[0],
      image2: results[1]
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Nano Banana API bağlantısı başarısız. Lütfen API ayarlarını kontrol edin.'
    });
  }
}

// Tek görsel oluşturma fonksiyonu
async function generateImage(endpoint, apiKey, garmentImage, personImage, prompt, variant) {
  try {
    // Base64 görsellerini hazırla
    const formData = {
      garment_image: garmentImage,
      person_image: personImage,
      prompt: prompt,
      seed: Math.floor(Math.random() * 10000) + variant * 1000,
      num_inference_steps: 30,
      guidance_scale: 7.5
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const result = await response.json();
    
    // Nano Banana'nın döndürdüğü görsel URL'i
    return result.output_url || result.image_url || result.url;
    
  } catch (error) {
    console.error(`Variant ${variant} error:`, error);
    throw error;
  }
}
