import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { StreamChat } from 'stream-chat';
import sendOtp from './sendOtpEmail.js';
import sendNotification from './sendNotification.js';
import sendPassword from './sendPassword.js';
import sendVehicleNotification from './vehicleNotification.js';
import serviceStatusUpdate from './serviceStatusUpdate.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// the mailer routes
app.use('/sendOtpEmail', sendOtp);
app.use('/sendNotification', sendNotification);
app.use('/sendPasswordEmail', sendPassword);
app.use('/sendVehicleNotification', sendVehicleNotification);
app.use('/serviceStatusUpdate', serviceStatusUpdate);

const PORT = process.env.PORT || 3000;
const STREAM_API_KEY = process.env.STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_API_SECRET;

if (!STREAM_API_KEY || !STREAM_API_SECRET) {
  console.error('STREAM_API_KEY and STREAM_API_SECRET must be set in .env');
  process.exit(1);
}

const serverClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET);

const generateAvatarUrl = (name, type = 'user') => {
  const colors = {
    admin: '4A90E2',
    service_center: 'FF6B00',
    user: '8E44AD' 
  };
  
  const color = colors[type] || colors.user;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff&size=128&bold=true&length=2`;
};

// generate token for users
app.post('/token', async (req, res) => {
  try {
    const { userId, name, role, email, avatar } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // create user data based on role
    const userData = {
      id: userId,
      name: name || userId,
      role: role || 'user',
      email: email || '',
      image: avatar || generateAvatarUrl(name || userId, role)
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
      role: role || 'admin',
      image: generateAvatarUrl(name || 'Admin Support', 'admin')
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
    const { userId, name, role, centerId, avatar } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Create service center user
    const userData = {
      id: userId,
      name: name || 'Service Center',
      role: role,
      center_id: centerId,
      image: avatar || generateAvatarUrl(name || 'Service Center', 'service_center')
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
    const { customerId, customerName, customerEmail, customerAvatar } = req.body;

    try {
      await serverClient.upsertUser({
        id: 'admin-support',
        name: 'AutoMate Support',
        role: 'admin',
        image: generateAvatarUrl('AutoMate Support', 'admin')
      });
    } catch (userError) {
      console.log(`Admin user setup: ${userError.message}`);
    }

    try {
      await serverClient.upsertUser({
        id: customerId,
        name: customerName,
        role: 'user',
        email: customerEmail,
        image: customerAvatar || generateAvatarUrl(customerName, 'user')
      });
    } catch (userError) {
      console.log(`Customer user setup: ${userError.message}`);
    }

    const channelId = `admin_support_${customerId}`;
    const channel = serverClient.channel('messaging', channelId, {
      name: 'AutoMate Customer Support',
      members: [customerId, 'admin-support'],
      custom_type: 'admin-support',
      host_by: 'user',
      created_by_id: customerId,
      image: generateAvatarUrl('AutoMate Support', 'admin'),
      customer_info: {
        id: customerId,
        name: customerName,
        email: customerEmail,
        avatar: customerAvatar || generateAvatarUrl(customerName, 'user')
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
    const { customerId, centerId, customerName, centerName, customerAvatar, centerAvatar } = req.body;

    // Ensure service center user exists
    try {
      await serverClient.upsertUser({
        id: centerId,
        name: centerName,
        role: 'service_center',
        center_id: centerId,
        image: centerAvatar || generateAvatarUrl(centerName, 'service_center') 
      });
      console.log(`Service center user created/updated: ${centerId}`);
    } catch (userError) {
      console.log(`Service center user setup: ${userError.message}`);
    }

    // Ensure customer user exists
    try {
      await serverClient.upsertUser({
        id: customerId,
        name: customerName,
        role: 'user',
         image: customerAvatar || generateAvatarUrl(customerName, 'user')
      });
    } catch (userError) {
      console.log(`Customer user setup: ${userError.message}`);
    }
    
    const channelId = `service_center_${centerId}_${customerId}`;
    
    // Check if channel already exists
    let channel;
    try {
      channel = serverClient.channel('messaging', channelId);
      await channel.query({ watch: false, state: true });
      console.log(`Channel already exists: ${channelId}`);
    } catch (error) {
      // Channel doesn't exist, create it
      channel = serverClient.channel('messaging', channelId, {
        name: centerName,
        members: [customerId, centerId],
        custom_type: 'service-center',
        created_by_id: customerId,
        image: centerAvatar || generateAvatarUrl(centerName, 'service_center'),
        customer_info: {
          id: customerId,
          name: customerName,
          avatar: customerAvatar || generateAvatarUrl(customerName, 'user')
        },
        center_info: {
          id: centerId,
          name: centerName,
          avatar: centerAvatar || generateAvatarUrl(centerName, 'service_center')
        },
      });

      await channel.create();
      await channel.addMembers([customerId, centerId]);
      console.log(`New channel created: ${channelId}`);
    }

    res.json({
      channel_id: channelId,
      channel_type: 'messaging',
      success: true
    });
  } catch (error) {
    console.error('Service center channel error:', error);
    res.status(500).json({ error: error.message });
  }
});

// admin channels endpoint
app.get('/admin/channels', async (req, res) => {
  try {
    const { type } = req.query;
    let filter = { type: 'messaging', members: { $in: ['admin-support'] } };

    if (type && type !== 'all' && type !== 'messaging') {
      filter = {
        custom_type: type,
        members: { $in: ['admin-support'] }
      };
    }

    const channels = await serverClient.queryChannels(filter,
      { last_message_at: -1 },
      { watch: false, state: true }
    );

    const channelData = channels.map(channel => ({
      id: channel.id,
      type: channel.data.type || 'messaging',
      custom_type: channel.data.custom_type,
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
        custom_type: 'service-center'
      },
      { last_message_at: -1 },
      { limit: parseInt(limit), offset: parseInt(offset) }
    );

    const channelData = channels.map(channel => ({
      id: channel.id,
      custom_type: channel.data.custom_type,
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Stream Token Server running on http://0.0.0.0:${PORT}`);
  console.log(`Accessible from: http://localhost:${PORT} or http://YOUR_IP:${PORT}`);
  console.log(`Mobile clients can get tokens from /token`);
  console.log(`Web clients can use admin endpoints`);
});