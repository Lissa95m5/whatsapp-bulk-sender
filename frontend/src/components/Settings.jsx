import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, Key, MessageSquare } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export function Settings() {
  const [twilioConfig, setTwilioConfig] = useState({
    account_sid: '',
    auth_token: '',
    whatsapp_number: '',
    is_active: false
  });
  const [baileysConfig, setBaileysConfig] = useState({
    phone_number: '',
    session_name: '',
    is_active: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('twilio');

  const handleSaveTwilio = async () => {
    setIsSaving(true);
    try {
      await axios.post(`${API}/settings/provider`, {
        provider: 'twilio',
        ...twilioConfig
      });
      toast.success('Twilio settings saved successfully');
    } catch (error) {
      toast.error(`Failed to save settings: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBaileys = async () => {
    setIsSaving(true);
    try {
      await axios.post(`${API}/settings/provider`, {
        provider: 'baileys',
        ...baileysConfig
      });
      toast.success('WhatsApp Business API settings saved successfully');
    } catch (error) {
      toast.error(`Failed to save settings: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <h1 className="text-4xl font-bold tracking-tight font-['Plus_Jakarta_Sans'] mb-2">
          Settings
        </h1>
        <p className="text-zinc-600 font-['Inter']">
          Configure your WhatsApp provider credentials
        </p>
      </div>

      <Card className="p-6">
        <Tabs value={selectedProvider} onValueChange={setSelectedProvider} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="twilio" data-testid="twilio-tab">
              <Key className="w-4 h-4 mr-2" />
              Twilio WhatsApp API
            </TabsTrigger>
            <TabsTrigger value="baileys" data-testid="baileys-tab">
              <MessageSquare className="w-4 h-4 mr-2" />
              WhatsApp Business API
            </TabsTrigger>
          </TabsList>

          <TabsContent value="twilio" className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <Key className="w-5 h-5 text-emerald-600" />
              <h2 className="text-2xl font-bold tracking-tight font-['Plus_Jakarta_Sans']">
                Twilio Configuration
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="account-sid">Account SID</Label>
                <Input
                  id="account-sid"
                  type="password"
                  value={twilioConfig.account_sid}
                  onChange={(e) => setTwilioConfig({ ...twilioConfig, account_sid: e.target.value })}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="mt-1 font-mono"
                  data-testid="account-sid-input"
                />
              </div>

              <div>
                <Label htmlFor="auth-token">Auth Token</Label>
                <Input
                  id="auth-token"
                  type="password"
                  value={twilioConfig.auth_token}
                  onChange={(e) => setTwilioConfig({ ...twilioConfig, auth_token: e.target.value })}
                  placeholder="********************************"
                  className="mt-1 font-mono"
                  data-testid="auth-token-input"
                />
              </div>

              <div>
                <Label htmlFor="whatsapp-number">WhatsApp Number</Label>
                <Input
                  id="whatsapp-number"
                  value={twilioConfig.whatsapp_number}
                  onChange={(e) => setTwilioConfig({ ...twilioConfig, whatsapp_number: e.target.value })}
                  placeholder="whatsapp:+14155238886"
                  className="mt-1 font-mono"
                  data-testid="whatsapp-number-input"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Twilio</Label>
                  <p className="text-sm text-zinc-500">Activate Twilio as your WhatsApp provider</p>
                </div>
                <Switch
                  checked={twilioConfig.is_active}
                  onCheckedChange={(checked) => setTwilioConfig({ ...twilioConfig, is_active: checked })}
                  data-testid="twilio-active-switch"
                />
              </div>

              <Button
                onClick={handleSaveTwilio}
                disabled={isSaving}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                data-testid="save-twilio-btn"
              >
                {isSaving ? 'Saving...' : 'Save Twilio Settings'}
              </Button>
            </div>

            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> To get your Twilio credentials:
                <ol className="list-decimal ml-5 mt-2 space-y-1">
                  <li>Sign up at <a href="https://www.twilio.com" target="_blank" rel="noopener noreferrer" className="underline">twilio.com</a></li>
                  <li>Go to Console → Account Info</li>
                  <li>Copy your Account SID and Auth Token</li>
                  <li>Enable WhatsApp in Messaging → Try it out</li>
                </ol>
              </p>
            </div>
          </TabsContent>

          <TabsContent value="baileys" className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              <h2 className="text-2xl font-bold tracking-tight font-['Plus_Jakarta_Sans']">
                WhatsApp Business API (Baileys)
              </h2>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> WhatsApp Business API uses your personal WhatsApp account. 
                  You'll need to scan a QR code to authenticate.
                </p>
              </div>

              <div>
                <Label htmlFor="baileys-phone">Your Phone Number</Label>
                <Input
                  id="baileys-phone"
                  value={baileysConfig.phone_number}
                  onChange={(e) => setBaileysConfig({ ...baileysConfig, phone_number: e.target.value })}
                  placeholder="+1234567890"
                  className="mt-1 font-mono"
                  data-testid="baileys-phone-input"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  The phone number associated with your WhatsApp account
                </p>
              </div>

              <div>
                <Label htmlFor="session-name">Session Name</Label>
                <Input
                  id="session-name"
                  value={baileysConfig.session_name}
                  onChange={(e) => setBaileysConfig({ ...baileysConfig, session_name: e.target.value })}
                  placeholder="my-whatsapp-session"
                  className="mt-1 font-mono"
                  data-testid="session-name-input"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Unique identifier for this WhatsApp session
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable WhatsApp Business API</Label>
                  <p className="text-sm text-zinc-500">Activate Baileys as your WhatsApp provider</p>
                </div>
                <Switch
                  checked={baileysConfig.is_active}
                  onCheckedChange={(checked) => setBaileysConfig({ ...baileysConfig, is_active: checked })}
                  data-testid="baileys-active-switch"
                />
              </div>

              <Button
                onClick={handleSaveBaileys}
                disabled={isSaving}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                data-testid="save-baileys-btn"
              >
                {isSaving ? 'Saving...' : 'Save WhatsApp Business API Settings'}
              </Button>
            </div>

            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Setup Instructions:</strong>
                <ol className="list-decimal ml-5 mt-2 space-y-1">
                  <li>Enter your phone number and create a session name</li>
                  <li>Click "Enable WhatsApp Business API" and save</li>
                  <li>A QR code will appear - scan it with your WhatsApp mobile app</li>
                  <li>Go to WhatsApp → Settings → Linked Devices → Link a Device</li>
                  <li>Once connected, you can start sending messages</li>
                </ol>
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
          <h3 className="font-semibold text-sm mb-2">Provider Comparison</h3>
          <div className="text-xs text-zinc-600 space-y-1">
            <p><strong>Twilio:</strong> Official API, reliable, requires Meta verification (5-20 days), paid service</p>
            <p><strong>WhatsApp Business API (Baileys):</strong> Uses personal account, no verification needed, free, may have rate limits</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
