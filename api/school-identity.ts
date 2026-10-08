export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    return res.status(200).json({ success: true, data: null });
  }
  if (req.method === 'POST') {
    return res.status(200).json({ success: true, data: req.body });
  }
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
