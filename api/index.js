export default async function handler(req, res) {
  // CORS - Tüm headerları ekle
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // OPTIONS request için hemen dön
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // GET request için test mesajı
  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'API çalışıyor! POST request gönderin.',
      status: 'ok'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ŞİMDİLİK TEST: Direkt mock data döndür
  console.log('POST request alındı!');
  
  try {
    const body = req.body;
    console.log('Request body:', body);

    // Mock response - Fal.ai yerine test için
    return res.status(200).json({
      success: true,
      image1: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=800&fit=crop',
      image2: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&h=800&fit=crop',
      message: '✅ Backend çalışıyor! (Test mode - Fal.ai entegrasyonu sonra eklenecek)'
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
