export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { garmentImage, personImage, prompt } = req.body;

    // FAL.AI API KEY (Environment Variable'dan al)
    const FAL_KEY = process.env.FAL_KEY || 'YOUR_FAL_KEY_HERE';
    
    // 2 alternatif oluştur
    const results = await Promise.all([
      generateWithFal(FAL_KEY, garmentImage, personImage, prompt, 1),
      generateWithFal(FAL_KEY, garmentImage, personImage, prompt, 2)
    ]);

    return res.status(200).json({
      success: true,
      image1: results[0],
      image2: results[1]
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Fal.ai ile görsel oluştur
async function generateWithFal(falKey, garmentImage, personImage, prompt, variant) {
  // Fal.ai submit endpoint
  const submitUrl = 'https://queue.fal.run/fal-ai/nano-banana/edit';
  
  // İstek gönder
  const submitResponse = await fetch(submitUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: prompt,
      image_urls: [personImage, garmentImage],
      seed: Math.floor(Math.random() * 10000) + variant * 1000
    })
  });

  if (!submitResponse.ok) {
    throw new Error(`Fal.ai Error: ${submitResponse.status}`);
  }

  const submitData = await submitResponse.json();
  const requestId = submitData.request_id;

  // Sonuç için polling yap (max 30 saniye)
  const statusUrl = `https://queue.fal.run/fal-ai/nano-banana/edit/requests/${requestId}/status`;
  
  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 saniye bekle
    
    const statusResponse = await fetch(statusUrl, {
      headers: { 'Authorization': `Key ${falKey}` }
    });
    
    const statusData = await statusResponse.json();
    
    if (statusData.status === 'COMPLETED') {
      return statusData.images[0].url;
    }
    
    if (statusData.status === 'FAILED') {
      throw new Error('Image generation failed');
    }
  }
  
  throw new Error('Timeout waiting for image');
}
