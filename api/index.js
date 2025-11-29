export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ message: 'API ready' });
  }

  try {
    const { garmentImage, personImage, description } = req.body;
    const FAL_KEY = process.env.FAL_KEY;

    if (!FAL_KEY) {
      throw new Error('FAL_KEY environment variable not set');
    }

    console.log('🚀 Starting virtual try-on...');
    console.log('📝 Description:', description);

    // IDM-VTON API çağır - Base64 direkt gönder!
    console.log('🎨 Submitting to IDM-VTON...');
    
    const submitResponse = await fetch('https://queue.fal.run/fal-ai/idm-vton', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        human_image_url: personImage,      // Base64 direkt kabul ediyor!
        garment_image_url: garmentImage,   // Base64 direkt kabul ediyor!
        description: description || 'garment',
        num_inference_steps: 30,
        seed: Math.floor(Math.random() * 100000)
      })
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('Submit error:', errorText);
      throw new Error(`Submit failed: ${submitResponse.status} - ${errorText}`);
    }

    const submitData = await submitResponse.json();
    const requestId = submitData.request_id;
    
    console.log('⏳ Request ID:', requestId);

    // Sonuç için polling yap
    const statusUrl = `https://queue.fal.run/fal-ai/idm-vton/requests/${requestId}/status`;
    
    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 saniye bekle
      
      const statusResponse = await fetch(statusUrl, {
        headers: { 'Authorization': `Key ${FAL_KEY}` }
      });
      
      if (!statusResponse.ok) {
        console.error('Status check failed:', statusResponse.status);
        continue;
      }
      
      const statusData = await statusResponse.json();
      console.log(`📊 Status (${i + 1}/60):`, statusData.status);
      
      if (statusData.status === 'COMPLETED') {
        console.log('✅ Generation complete!');
        
        // Sonuç URL'ini bul
        let imageUrl = null;
        if (statusData.image && statusData.image.url) {
          imageUrl = statusData.image.url;
        } else if (statusData.images && statusData.images.length > 0) {
          imageUrl = statusData.images[0].url;
        } else if (statusData.data && statusData.data.image) {
          imageUrl = statusData.data.image.url;
        }
        
        if (!imageUrl) {
          console.error('No image URL in response:', statusData);
          throw new Error('No image URL found in completed response');
        }
        
        return res.status(200).json({
          success: true,
          imageUrl: imageUrl
        });
      }
      
      if (statusData.status === 'FAILED') {
        console.error('Generation failed:', statusData);
        throw new Error('Image generation failed: ' + JSON.stringify(statusData));
      }
    }
    
    throw new Error('Timeout: No result after 2 minutes');

  } catch (error) {
    console.error('❌ Error:', error.message);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
