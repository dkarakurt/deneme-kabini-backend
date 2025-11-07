export default async function handler(req, res) {
  // Basit CORS
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
    // Şimdilik mock data
    return res.status(200).json({
      success: true,
      image1: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600',
      image2: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600',
      message: 'Test başarılı!'
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
