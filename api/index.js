export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  // CORS - HER DURUMDA
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // OPTIONS request için hemen dön
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
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

    if (!FAL_KEY) {
      throw new Error('FAL_KEY environment variable not set');
    }

    console.log('🚀 Starting virtual try-on...');

    // 1. Base64 görsellerini upload et
    console.log('📤 Uploading images to Fal.ai...');
    const garmentUrl = await uploadImageToFal(garmentImage, FAL_KEY);
    const personUrl = await uploadImageToFal(personImage, FAL_KEY);
    
    console.log('✅ Upload complete');
    console.log('Garment URL:', garmentUrl);
    console.log('Person URL:', personUrl);

    // 2. IDM-VTON API çağır (Queue API kullan)
    console.log('🎨 Submitting to IDM-VTON...');
    
    const submitResponse = await fetch('https://queue.fal.run/fal-ai/idm-vton', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        human_image_url: personUrl,
        garment_image_url: garmentUrl,
        description: description || 'garment',
        num_inference_steps: 30,
        seed: Math.floor(Math.random() * 100000)
      })
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('Submit error:', errorText);
      throw new Error(`Submit failed: ${submitResponse.status}`);
    }

    const submitData = await submitResponse.json();
    const requestId = submitData.request_id;
    
    console.log('⏳ Request ID:', requestId);

    // 3. Sonuç için polling yap
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
        throw new Error('Image generation failed');
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

// Base64 görselini Fal.ai storage'a upload et
async function uploadImageToFal(base64Image, falKey) {
  try {
    // Base64'ü temizle
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    
    // Buffer'a çevir
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Fal.ai storage endpoint
    const uploadUrl = 'https://fal.run/fal-ai/idm-vton/files';
    
    // Multipart form data oluştur
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const formDataParts = [];
    
    formDataParts.push(`--${boundary}`);
    formDataParts.push('Content-Disposition: form-data; name="file"; filename="image.jpg"');
    formDataParts.push('Content-Type: image/jpeg');
    formDataParts.push('');
    
    const formDataBuffer = Buffer.concat([
      Buffer.from(formDataParts.join('\r\n') + '\r\n'),
      buffer,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: formDataBuffer
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
    }
    
    const uploadData = await uploadResponse.json();
    return uploadData.url || uploadData.file_url;
    
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error(`Image upload failed: ${error.message}`);
  }
}
