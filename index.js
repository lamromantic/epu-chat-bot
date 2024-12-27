import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

if (!PAGE_ACCESS_TOKEN) {
  console.error('Error: PAGE_ACCESS_TOKEN is not defined in the environment variables.');
  process.exit(1);
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Routes
app.get('/', (req, res) => {
  res.send('Hello! I am your Messenger bot.');
});

// Facebook Webhook Verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Verification failed.');
  }
});

// Webhook to receive messages and events
app.post('/webhook', (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    body.entry.forEach((entry) => {
      const webhookEvents = entry.messaging;

      webhookEvents.forEach((event) => {
        const senderId = event.sender.id;

        if (event.message && event.message.text) {
          handleMessage(senderId, event.message.text);
        } else if (event.postback) {
          handlePostback(senderId, event.postback);
        }
      });
    });

    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// Handle incoming text messages
const handleMessage = async (senderId, text) => {
  console.log(`Received message: "${text}" from sender: ${senderId}`);

  if (text.toLowerCase() === 'generic') {
    console.log('Sending generic template...');
    await sendGenericMessage(senderId);
  } else {
    await sendTextMessage(senderId, `You sent: "${text}"`);
  }
};

// Handle postback events
const handlePostback = async (senderId, postback) => {
  const payload = postback.payload;
  console.log(`Postback received: ${payload}`);
  await sendTextMessage(senderId, `Postback received: ${payload}`);
};

// Send a text message
const sendTextMessage = async (senderId, text) => {
  const messageData = {
    recipient: { id: senderId },
    message: { text },
  };

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      messageData,
      { params: { access_token: PAGE_ACCESS_TOKEN } }
    );
    console.log(`Message sent to ${senderId}: ${text}`);
  } catch (error) {
    console.error(`Error sending message: ${error.response?.data?.error || error.message}`);
  }
};

// Send a generic template message
const sendGenericMessage = async (senderId) => {
  const messageData = {
    recipient: { id: senderId },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: [
            {
              title: 'First Card',
              subtitle: 'Element #1 of an hscroll',
              image_url: 'http://messengerdemo.parseapp.com/img/rift.png',
              buttons: [
                {
                  type: 'web_url',
                  url: 'https://www.messenger.com',
                  title: 'Web URL',
                },
                {
                  type: 'postback',
                  title: 'Postback',
                  payload: 'First Element Postback',
                },
              ],
            },
            {
              title: 'Second Card',
              subtitle: 'Element #2 of an hscroll',
              image_url: 'http://messengerdemo.parseapp.com/img/gearvr.png',
              buttons: [
                {
                  type: 'postback',
                  title: 'Postback',
                  payload: 'Second Element Postback',
                },
              ],
            },
          ],
        },
      },
    },
  };

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      messageData,
      { params: { access_token: PAGE_ACCESS_TOKEN } }
    );
    console.log('Generic template sent successfully.');
  } catch (error) {
    console.error(`Error sending generic message: ${error.response?.data?.error || error.message}`);
  }
};

// Start the server
app.listen(PORT, () => {
  console.log(`Bot is running on port ${PORT}`);
});
