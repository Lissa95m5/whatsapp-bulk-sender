# n8n Integration Guide for WhatsApp Bulk Sender

This guide explains how to integrate n8n workflow automation with your WhatsApp Bulk Sender application.

## Table of Contents
1. [Setup n8n](#setup-n8n)
2. [API Endpoints](#api-endpoints)
3. [Example Workflows](#example-workflows)
4. [Use Cases](#use-cases)

---

## Setup n8n

### Option 1: Install n8n Locally
```bash
npm install -g n8n
n8n
```
n8n will be available at: `http://localhost:5678`

### Option 2: Run with Docker
```bash
docker run -it --rm --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
```

### Option 3: Use n8n Cloud
Sign up at: https://n8n.io/cloud

---

## API Endpoints

Your WhatsApp Bulk Sender now has n8n-compatible endpoints:

### 1. Send Single Message
**Endpoint:** `POST /api/n8n/send-message`

**Request Body:**
```json
{
  "phone_number": "+1234567890",
  "message": "Hello from n8n!",
  "media_urls": ["https://example.com/image.jpg"],
  "provider": "twilio"
}
```

**Response:**
```json
{
  "success": true,
  "message_id": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "sent",
  "timestamp": "2024-01-29T12:34:56.789Z"
}
```

### 2. Send Bulk Messages
**Endpoint:** `POST /api/n8n/send-bulk`

**Request Body:**
```json
{
  "recipients": ["+1234567890", "+0987654321"],
  "message": "Bulk message from n8n",
  "media_urls": ["https://example.com/image.jpg"],
  "campaign_name": "My Campaign",
  "provider": "twilio"
}
```

**Response:**
```json
{
  "success": true,
  "campaign_id": "uuid-here",
  "total_recipients": 2,
  "successful": 2,
  "failed": 0,
  "timestamp": "2024-01-29T12:34:56.789Z"
}
```

### 3. Get Campaign Status
**Endpoint:** `GET /api/n8n/campaign-status/{campaign_id}`

**Response:**
```json
{
  "id": "campaign-id",
  "name": "My Campaign",
  "status": "completed",
  "total_recipients": 10,
  "successful_sends": 9,
  "failed_sends": 1
}
```

### 4. Register Webhook (for receiving notifications)
**Endpoint:** `POST /api/n8n/webhook-register`

**Request Body:**
```json
{
  "webhook_url": "https://your-n8n.com/webhook/abc123",
  "events": ["message_sent", "message_delivered", "message_failed"]
}
```

---

## Example Workflows

### Workflow 1: Send WhatsApp on Google Form Submission

**Steps in n8n:**

1. **Trigger:** Google Forms Trigger
   - Select your form
   - Event: "On Form Submit"

2. **HTTP Request Node:**
   - Method: POST
   - URL: `http://your-backend-url/api/n8n/send-message`
   - Body:
   ```json
   {
     "phone_number": "{{$json.phone_number}}",
     "message": "Hi {{$json.name}}, thank you for your submission!",
     "provider": "twilio"
   }
   ```

3. **Set Headers:**
   - Content-Type: `application/json`

### Workflow 2: Send Bulk WhatsApp from Google Sheets

**Steps in n8n:**

1. **Trigger:** Schedule Trigger (or Manual)
   - Set schedule (e.g., every day at 9 AM)

2. **Google Sheets Node:**
   - Operation: Read
   - Select your spreadsheet
   - Range: A2:B100 (phone numbers in column A, names in column B)

3. **Function Node:** Format data
   ```javascript
   const recipients = items.map(item => item.json.phone_number);
   
   return [{
     json: {
       recipients: recipients,
       message: "Hello! This is a scheduled message from our system.",
       campaign_name: "Daily Notification",
       provider: "twilio"
     }
   }];
   ```

4. **HTTP Request Node:**
   - Method: POST
   - URL: `http://your-backend-url/api/n8n/send-bulk`
   - Body: `{{$json}}`

### Workflow 3: Send WhatsApp on New CRM Lead

**Steps in n8n:**

1. **Trigger:** Webhook (or CRM trigger like HubSpot, Salesforce)
   - Create webhook URL

2. **HTTP Request Node:**
   - Method: POST
   - URL: `http://your-backend-url/api/n8n/send-message`
   - Body:
   ```json
   {
     "phone_number": "{{$json.lead_phone}}",
     "message": "Hi {{$json.lead_name}}, welcome! Our team will contact you soon.",
     "provider": "twilio"
   }
   ```

3. **Send Email Node (optional):**
   - Notify your sales team

### Workflow 4: Send WhatsApp with Image on E-commerce Order

**Steps in n8n:**

1. **Trigger:** Webhook from Shopify/WooCommerce

2. **HTTP Request Node:**
   - Method: POST
   - URL: `http://your-backend-url/api/n8n/send-message`
   - Body:
   ```json
   {
     "phone_number": "{{$json.customer_phone}}",
     "message": "Thank you for your order #{{$json.order_id}}! We're processing it now.",
     "media_urls": ["{{$json.product_image}}"],
     "provider": "twilio"
   }
   ```

---

## Use Cases

### 1. **Customer Support Automation**
- Trigger: Customer submits support ticket
- Action: Send WhatsApp confirmation with ticket number

### 2. **Appointment Reminders**
- Trigger: Scheduled (daily at 8 AM)
- Action: Fetch today's appointments from database
- Action: Send WhatsApp reminder to each customer

### 3. **Order Status Updates**
- Trigger: Order status changes in e-commerce system
- Action: Send WhatsApp with order status

### 4. **Lead Nurturing**
- Trigger: New lead in CRM
- Action: Send welcome WhatsApp
- Wait: 2 days
- Action: Send follow-up WhatsApp

### 5. **Event Invitations**
- Trigger: Manual or scheduled
- Action: Read guest list from Google Sheets
- Action: Send bulk WhatsApp invitations

### 6. **Payment Reminders**
- Trigger: Scheduled (check for overdue invoices)
- Action: Send WhatsApp payment reminder with invoice link

### 7. **Survey Distribution**
- Trigger: After product delivery (webhook from shipping system)
- Wait: 3 days
- Action: Send WhatsApp with survey link

---

## Testing Your Integration

### Step 1: Start Your Backend
```bash
cd backend
uvicorn server:app --reload --port 8001
```

### Step 2: Start n8n
```bash
n8n
```

### Step 3: Create a Test Workflow in n8n

1. Open n8n at `http://localhost:5678`
2. Create new workflow
3. Add "HTTP Request" node
4. Configure:
   - Method: POST
   - URL: `http://localhost:8001/api/n8n/send-message`
   - Body:
   ```json
   {
     "phone_number": "+1234567890",
     "message": "Test from n8n!",
     "provider": "twilio"
   }
   ```
5. Execute the node

### Step 4: Check Results
- Check your WhatsApp for the message
- Check your app's Dashboard for delivery status

---

## Advanced: Receive Webhooks from WhatsApp App

### Setup Webhook in n8n

1. In n8n, add a "Webhook" trigger node
2. Copy the webhook URL (e.g., `http://localhost:5678/webhook/abc123`)
3. Register it with your app:

**Using HTTP Request:**
```bash
curl -X POST http://localhost:8001/api/n8n/webhook-register \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_url": "http://localhost:5678/webhook/abc123",
    "events": ["message_sent", "message_delivered", "message_failed"]
  }'
```

Now your n8n workflow will receive notifications when:
- Messages are sent
- Messages are delivered
- Messages fail

---

## Troubleshooting

### Issue: n8n can't reach localhost backend
**Solution:** Use your machine's IP address instead of localhost
```
http://192.168.1.100:8001/api/n8n/send-message
```

### Issue: CORS errors
**Solution:** Your backend already has CORS enabled for all origins

### Issue: Authentication errors
**Solution:** Make sure Twilio credentials are configured in Settings

### Issue: Rate limiting
**Solution:** Add "Wait" nodes between bulk sends in n8n

---

## Production Deployment

### Using n8n Cloud + Your Deployed App
1. Deploy your WhatsApp app to a server (e.g., AWS, DigitalOcean)
2. Use n8n Cloud (https://n8n.io/cloud)
3. Update n8n workflows with your production API URL

### Using Docker Compose (Backend + n8n)
Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://mongo:27017
      - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
      - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"

  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n

  mongo:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  n8n_data:
  mongo_data:
```

Run:
```bash
docker-compose up -d
```

---

## Support

For issues or questions:
1. Check n8n documentation: https://docs.n8n.io
2. Check your app's backend logs
3. Test endpoints with Postman/cURL first

Happy Automating! 🚀
