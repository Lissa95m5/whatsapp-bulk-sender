import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings as SettingsIcon, Key } from 'lucide-react';
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
  const [isSaving, setIsSaving] = useState(false);

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
            data-testid="save-settings-btn"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
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
      </Card>
    </div>
  );
}
