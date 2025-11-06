export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ message: 'API çalışıyor! POST request gönderin.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { garmentImage, personImage, prompt } = req.body;

    // FAL.AI API KEY
    const FAL_KEY = process.env.FAL_KEY;
    
    if (!FAL_KEY) {
      throw new Error('FAL_KEY environment variable not set');
    }

    console.log('🚀 Fal.ai API çağrılıyor...');

    // 2 alternatif oluştur
    const results = await Promise.all([
      generateWithFal(FAL_KEY, garmentImage, personImage, prompt, 1),
      generateWithFal(FAL_KEY, garmentImage, personImage, prompt, 2)
    ]);

    console.log('✅ Görseller oluşturuldu:', results);

    return res.status(200).json({
      success: true,
      image1: results[0],
      image2: results[1]
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Fal.ai ile görsel oluştur
async function generateWithFal(falKey, garmentImage, personImage, prompt, variant) {
  try {
    // Fal.ai endpoint
    const endpoint = 'https://fal.run/fal-ai/flux/dev';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        image_size: 'portrait_4_3',
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: true,
        seed: Math.floor(Math.random() * 100000) + variant * 10000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fal.ai Error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('Fal.ai response:', result);
    
    // Fal.ai'ın döndürdüğü görsel URL'i
    if (result.images && result.images.length > 0) {
      return result.images[0].url;
    }
    
    throw new Error('No image URL in response');
    
  } catch (error) {
    console.error(`Variant ${variant} error:`, error);
    throw error;
  }
}
