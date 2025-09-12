import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { StreamChat } from 'stream-chat';

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const STREAM_API_KEY = process.env.STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_API_SECRET;

if (!STREAM_API_KEY || !STREAM_API_SECRET) {
  console.error('STREAM_API_KEY and STREAM_API_SECRET must be set in .env');
  process.exit(1);
}

const serverClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET);

// generate token for users
app.post('/token', async (req, res) => {
  try {
    const { userId, name, role, email, centerInfo } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // create user data based on role
    const userData = {
      id: userId,
      name: name || userId,
      role: role || 'user',
      email: email || '',
    };

    await serverClient.upsertUser(userData);
    const token = serverClient.createToken(userId);

    return res.json({
      token,
      apiKey: STREAM_API_KEY,
      user: userData
    });
  } catch (err) {
    console.error('Token generation error:', err);
    return res.status(500).json({ error: err.message || 'server error' });
  }
});

// generate token for admin
app.post('/admin/token', async (req, res) => {
  try {
    const { userId, name, role } = req.body;

    // create admin user
    const userData = {
      id: userId,
      name: name || 'Admin Support',
      role: role || 'admin'
    };

    await serverClient.upsertUser(userData);
    const token = serverClient.createToken(userId);

    res.json({
      token,
      apiKey: STREAM_API_KEY,
      user: userData
    });
  } catch (error) {
    console.error('Admin token error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate admin token' });
  }
});

// generate token for service center
app.post('/service-center/token', async (req, res) => {
  try {
    const { userId, name, role, centerId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Create service center user
    const userData = {
      id: userId,
      name: name || 'Service Center',
      role: role,
      center_id: centerId
    };

    await serverClient.upsertUser(userData);
    const token = serverClient.createToken(userId);

    res.json({
      token,
      apiKey: STREAM_API_KEY,
      user: userData
    });
  } catch (error) {
    console.error('Service center token error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate service center token' });
  }
});


// endpoint for the android app support channel between customer and system admin
app.post('/channels/admin-support', async (req, res) => {
  try {
    const { customerId, customerName, customerEmail } = req.body;

    const channelId = `admin_support_${customerId}`;
    const channel = serverClient.channel('messaging', channelId, {
      name: 'Customer Support',
      members: [customerId, 'admin-support'],
      custom_type: 'admin-support',
      host_by: 'user',
      created_by_id: customerId,
      customer_info: {
        id: customerId,
        name: customerName,
        email: customerEmail
      }
    });

    await channel.create();
    await channel.addMembers([customerId, 'admin-support']);

    res.json({
      channel_id: channelId,
      channel_type: 'messaging',
      success: true
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// endpoint for the android app service channel between customer and service center
app.post('/channels/service-center', async (req, res) => {
  try {
    const { customerId, centerId, customerName, centerName } = req.body;

     try {
      await serverClient.upsertUser({
        id: centerId,
        name: centerName,
        role: 'service_center',
        center_id: centerId,
      });
      console.log(`Created service center user: ${centerId}`);
    } catch (userError) {
      console.log(`Service center user already exists or error: ${userError.message}`);
    }
    
    const channelId = `service_center_${centerId}_${customerId}`;
    const channel = serverClient.channel('messaging', channelId, {
      name: centerName,
      members: [customerId, centerId],
      custom_type: 'service-center',
      host_by: 'user',
      created_by_id: customerId,
      customer_info: {
        id: customerId,
        name: customerName,
      },
      center_info: {
        id: centerId,
        name: centerName
      },
    });

    await channel.create();
    await channel.addMembers([customerId, centerId]);

    res.json({
      channel_id: channelId,
      channel_type: 'messaging',
      success: true
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// admin channels endpoint
app.get('/admin/channels', async (req, res) => {
  try {
    const { type } = req.query;
    let filter = { type: 'messaging', members: { $in: ['admin-support'] } };

    if (type && type !== 'all') {
      filter['type'] = type;
    }

    const channels = await serverClient.queryChannels(filter,
      { last_message_at: -1 },
      { watch: false, state: true }
    );

    const channelData = channels.map(channel => ({
      id: channel.id,
      type: channel.data.type || 'messaging',
      name: channel.data.name || 'Chat',
      member_count: Object.keys(channel.state.members).length,
      last_message_at: channel.state.lastMessageAt,
      customer_info: channel.data.customer_info,
      center_info: channel.data.center_info,
      service_type: channel.data.service_type,
      emergency_info: channel.data.emergency_info
    }));

    res.json({ channels: channelData, total: channelData.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// get channels for service center
app.get('/service-center/:centerId/channels', async (req, res) => {
  try {
    const { centerId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const channels = await serverClient.queryChannels(
      {
        members: { $in: [centerId] },
        type: 'service-center'
      },
      { last_message_at: -1 },
      { limit: parseInt(limit), offset: parseInt(offset) }
    );

    const channelData = channels.map(channel => ({
      id: channel.id,
      type: channel.data.type,
      name: channel.data.name,
      member_count: channel.data.member_count,
      last_message_at: channel.data.last_message_at,
      customer_info: channel.data.customer_info,
      service_type: channel.data.service_type,
    }));

    return res.json({
      channels: channelData,
      total: channels.length
    });
  } catch (err) {
    console.error('Service center channels query error:', err);
    return res.status(500).json({ error: err.message || 'query failed' });
  }
});

app.post('/channels/delete', async (req, res) => {
  try {
    const { channelId } = req.body;

    if (!channelId) {
      return res.status(400).json({ error: 'channelId is required' });
    }

    // get the channel
    const channel = serverClient.channel('messaging', channelId);
    
    // delete the channel
    await channel.delete();

    res.json({
      success: true,
      message: 'Channel deleted successfully'
    });
  } catch (error) {
    console.error('Channel deletion error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to delete channel' 
    });
  }
});

// for checking server status purpose
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Stream Token Server running on http://localhost:${PORT}`);
  console.log(`Mobile clients can get tokens from /token`);
  console.log(`Web clients can use admin endpoints`);
});