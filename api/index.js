export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ message: 'API ready' });
  }

  try {
    const { garmentImage, personImage, description } = req.body;
    const FAL_KEY = process.env.FAL_KEY;

    console.log('🚀 Fal.ai IDM-VTON çağrılıyor...');

    // Fal.ai sync endpoint
    const response = await fetch('https://fal.run/fal-ai/idm-vton', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        human_image_url: personImage,
        garment_image_url: garmentImage,
        description: description,
        num_inference_steps: 30,
        seed: Math.floor(Math.random() * 100000)
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fal.ai Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Result:', result);

    // Sonuç URL'i bul
    let imageUrl = null;
    if (result.image && result.image.url) {
      imageUrl = result.image.url;
    } else if (result.images && result.images.length > 0) {
      imageUrl = result.images[0].url;
    }

    if (!imageUrl) {
      throw new Error('Sonuçta görsel bulunamadı');
    }

    return res.status(200).json({
      success: true,
      imageUrl: imageUrl
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
