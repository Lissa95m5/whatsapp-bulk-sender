import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MediaUploader } from './MediaUploader';
import { Send, Users, FileText } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { CSVLink } from 'react-csv';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export function MessageComposer() {
  const [messageBody, setMessageBody] = useState('');
  const [mediaAttachments, setMediaAttachments] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [manualPhone, setManualPhone] = useState('');
  const [contacts, setContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [provider, setProvider] = useState('twilio');

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await axios.get(`${API}/contacts`);
      setContacts(response.data.contacts);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    }
  };

  const handleAddManualPhone = () => {
    if (manualPhone.trim()) {
      if (!recipients.includes(manualPhone)) {
        setRecipients([...recipients, manualPhone]);
        setManualPhone('');
        toast.success('Contact added');
      } else {
        toast.error('Contact already added');
      }
    }
  };

  const handleRemoveRecipient = (phone) => {
    setRecipients(recipients.filter(r => r !== phone));
  };

  const handleSelectContact = (contact) => {
    if (!recipients.includes(contact.phone_number)) {
      setRecipients([...recipients, contact.phone_number]);
      toast.success('Contact selected');
    }
  };

  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split('\n');
        const phones = [];
        
        lines.forEach((line, index) => {
          if (index === 0) return; // Skip header
          const columns = line.split(',');
          if (columns[0] && columns[0].trim()) {
            phones.push(columns[0].trim());
          }
        });
        
        setRecipients([...new Set([...recipients, ...phones])]);
        toast.success(`${phones.length} contacts imported`);
      };
      reader.readAsText(file);
    }
  };

  const handleSendBulk = async () => {
    if (!messageBody.trim()) {
      toast.error('Please enter a message');
      return;
    }
    
    if (recipients.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }

    setIsSending(true);

    try {
      const response = await axios.post(`${API}/messages/bulk`, {
        recipients,
        message_body: messageBody,
        media_attachments: mediaAttachments,
        campaign_name: campaignName || undefined,
        provider: 'twilio'
      });

      toast.success(`Messages sent! ${response.data.successful} successful, ${response.data.failed} failed`);
      
      // Reset form
      setMessageBody('');
      setMediaAttachments([]);
      setRecipients([]);
      setCampaignName('');
    } catch (error) {
      toast.error(`Failed to send messages: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="message-composer">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-emerald-600" />
          <h2 className="text-2xl font-bold tracking-tight font-['Plus_Jakarta_Sans']">
            Compose Message
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="campaign-name">Campaign Name (Optional)</Label>
            <Input
              id="campaign-name"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g., Summer Sale 2024"
              className="mt-1"
              data-testid="campaign-name-input"
            />
          </div>

          <div>
            <Label htmlFor="message-body">Message</Label>
            <Textarea
              id="message-body"
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder="Enter your WhatsApp message..."
              className="mt-1 min-h-32 font-['Inter']"
              maxLength={4096}
              data-testid="message-body-input"
            />
            <div className="text-xs text-zinc-500 mt-1 font-mono">
              {messageBody.length} / 4096 characters
            </div>
          </div>

          <div>
            <Label>Media Attachments</Label>
            <MediaUploader
              attachments={mediaAttachments}
              onMediaAdded={(media) => setMediaAttachments([...mediaAttachments, media])}
              onMediaRemoved={(index) => setMediaAttachments(mediaAttachments.filter((_, i) => i !== index))}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-emerald-600" />
          <h3 className="text-xl font-semibold tracking-tight font-['Plus_Jakarta_Sans']">
            Recipients ({recipients.length})
          </h3>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value)}
              placeholder="+1234567890"
              onKeyPress={(e) => e.key === 'Enter' && handleAddManualPhone()}
              data-testid="manual-phone-input"
            />
            <Button onClick={handleAddManualPhone} data-testid="add-phone-btn">
              Add
            </Button>
          </div>

          <div className="flex gap-2">
            <Input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="flex-1"
              data-testid="csv-upload-input"
            />
            <Button variant="outline" asChild>
              <CSVLink
                data={[["phone_number", "name"], ["+1234567890", "John Doe"]]}
                filename="contacts_template.csv"
                className="inline-flex items-center"
                data-testid="download-template-btn"
              >
                Template
              </CSVLink>
            </Button>
          </div>

          {contacts.length > 0 && (
            <div>
              <Label>Select from Contacts</Label>
              <div className="mt-2 max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                {contacts.map((contact) => (
                  <div
                    key={contact.phone_number}
                    onClick={() => handleSelectContact(contact)}
                    className="p-2 hover:bg-zinc-50 cursor-pointer rounded text-sm"
                    data-testid={`contact-${contact.phone_number}`}
                  >
                    {contact.name || contact.phone_number}
                  </div>
                ))}
              </div>
            </div>
          )}

          {recipients.length > 0 && (
            <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {recipients.map((phone) => (
                  <div
                    key={phone}
                    className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 rounded-full text-sm font-mono"
                    data-testid={`recipient-${phone}`}
                  >
                    {phone}
                    <button
                      onClick={() => handleRemoveRecipient(phone)}
                      className="ml-1 hover:text-emerald-900"
                      data-testid={`remove-recipient-${phone}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Button
        onClick={handleSendBulk}
        disabled={isSending || recipients.length === 0 || !messageBody.trim()}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-6 text-lg"
        data-testid="send-bulk-btn"
      >
        <Send className="w-5 h-5 mr-2" />
        {isSending ? 'Sending...' : `Send to ${recipients.length} Recipients`}
      </Button>
    </div>
  );
}
