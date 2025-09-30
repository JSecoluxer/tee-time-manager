import { kv } from '@vercel/kv';
import { TeeTimeService } from '@/services/teeTimeService';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { groupId } = req.body;
      if (!groupId) return res.status(400).json({ error: 'groupId is required.' });

      const stateJSON = await kv.get('tee_time_state');
      if (!stateJSON) return res.status(400).json({ error: 'State not initialized.' });

      let currentState = JSON.parse(stateJSON);
      const { newState, logs } = TeeTimeService.finishHole(currentState, groupId);

      await kv.set('tee_time_state', JSON.stringify(newState));
      res.status(200).json({ message: 'Group finished hole.', state: newState, logs });
    } catch (error) {
      res.status(500).json({ error: 'Failed to process finishing hole.', details: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
