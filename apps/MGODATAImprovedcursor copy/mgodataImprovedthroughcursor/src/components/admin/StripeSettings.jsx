import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Save,
  Plus,
  Trash2,
  Info,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

export default function StripeSettings() {
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState({ test: null, live: null });
  const [activeMode, setActiveMode] = useState('test');
  const [showSecrets, setShowSecrets] = useState({});
  const [testConnection, setTestConnection] = useState({});
  const [planMappings, setPlanMappings] = useState([]);

  // Form state for each mode
  const [testForm, setTestForm] = useState({
    secret_key: '',
    publishable_key: '',
    webhook_secret: '',
    connected_account_id: '',
  });

  const [liveForm, setLiveForm] = useState({
    secret_key: '',
    publishable_key: '',
    webhook_secret: '',
    connected_account_id: '',
  });

  const [newPlan, setNewPlan] = useState({
    plan_key: '',
    plan_name: '',
    stripe_price_id_test: '',
    stripe_price_id_live: '',
  });

  // Load configs on mount
  useEffect(() => {
    loadConfigs();
    loadPlanMappings();
  }, []);

  const loadConfigs = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/stripe/config?tenant_id=default`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (data.configs) {
        const testConfig = data.configs.find((c) => c.mode === 'test');
        const liveConfig = data.configs.find((c) => c.mode === 'live');

        setConfigs({ test: testConfig, live: liveConfig });
        setActiveMode(testConfig?.active_mode || liveConfig?.active_mode || 'test');
      }
    } catch (error) {
      console.error('Failed to load configs:', error);
      toast.error('Failed to load Stripe configuration');
    }
  };

  const loadPlanMappings = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/stripe/plan-mappings?tenant_id=default`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (data.mappings) {
        setPlanMappings(data.mappings);
      }
    } catch (error) {
      console.error('Failed to load plan mappings:', error);
    }
  };

  const handleTestConnection = async (mode) => {
    const form = mode === 'test' ? testForm : liveForm;

    if (!form.secret_key || !form.publishable_key) {
      toast.error('Please enter both secret key and publishable key');
      return;
    }

    setTestConnection({ ...testConnection, [mode]: 'testing' });

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/stripe/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret_key: form.secret_key,
          publishable_key: form.publishable_key,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setTestConnection({ ...testConnection, [mode]: 'success' });
        toast.success(`Connection successful! Account ID: ${data.account_id}`);
      } else {
        setTestConnection({ ...testConnection, [mode]: 'error' });
        toast.error(`Connection failed: ${data.message || data.error}`);
      }
    } catch (error) {
      setTestConnection({ ...testConnection, [mode]: 'error' });
      toast.error('Failed to test connection');
    }
  };

  const handleSaveConfig = async (mode) => {
    const form = mode === 'test' ? testForm : liveForm;

    if (!form.secret_key || !form.publishable_key) {
      toast.error('Secret key and publishable key are required');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/stripe/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: 'default',
          mode,
          active_mode: activeMode,
          secret_key: form.secret_key,
          publishable_key: form.publishable_key,
          webhook_secret: form.webhook_secret || undefined,
          connected_account_id: form.connected_account_id || undefined,
          updated_by: 'admin',
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Stripe configuration saved successfully');
        loadConfigs();

        // Clear form
        if (mode === 'test') {
          setTestForm({ secret_key: '', publishable_key: '', webhook_secret: '', connected_account_id: '' });
        } else {
          setLiveForm({ secret_key: '', publishable_key: '', webhook_secret: '', connected_account_id: '' });
        }
      } else {
        toast.error(data.message || 'Failed to save configuration');
      }
    } catch (error) {
      toast.error('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSetActiveMode = async (mode) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/stripe/active-mode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: 'default', mode }),
      });

      const data = await res.json();

      if (data.success) {
        setActiveMode(mode);
        toast.success(`Switched to ${mode} mode`);
        loadConfigs();
      } else {
        toast.error(data.message || 'Failed to switch mode');
      }
    } catch (error) {
      toast.error('Failed to switch mode');
    }
  };

  const handleSavePlan = async () => {
    if (!newPlan.plan_key || !newPlan.plan_name) {
      toast.error('Plan key and name are required');
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/stripe/plan-mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: 'default', ...newPlan }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Plan mapping saved');
        setNewPlan({ plan_key: '', plan_name: '', stripe_price_id_test: '', stripe_price_id_live: '' });
        loadPlanMappings();
      } else {
        toast.error(data.message || 'Failed to save plan mapping');
      }
    } catch (error) {
      toast.error('Failed to save plan mapping');
    }
  };

  const renderConfigForm = (mode, form, setForm) => {
    const config = configs[mode];
    const hasConfig = !!config;
    const connectionStatus = testConnection[mode];

    return (
      <div className="space-y-4">
        {hasConfig && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>
                  Configuration exists. Last updated: {new Date(config.updated_at).toLocaleString()}
                </span>
                <Badge variant={config.active_mode === mode ? 'default' : 'secondary'}>
                  {config.active_mode === mode ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor={`${mode}-secret-key`}>
            Secret Key <span className="text-red-500">*</span>
          </Label>
          <div className="flex gap-2">
            <Input
              id={`${mode}-secret-key`}
              type={showSecrets[`${mode}-secret`] ? 'text' : 'password'}
              placeholder={`sk_${mode}_...`}
              value={form.secret_key}
              onChange={(e) => setForm({ ...form, secret_key: e.target.value })}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowSecrets({ ...showSecrets, [`${mode}-secret`]: !showSecrets[`${mode}-secret`] })}
            >
              {showSecrets[`${mode}-secret`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {hasConfig && (
            <p className="text-sm text-muted-foreground">
              Current: {config.secret_key_preview}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${mode}-publishable-key`}>
            Publishable Key <span className="text-red-500">*</span>
          </Label>
          <Input
            id={`${mode}-publishable-key`}
            placeholder={`pk_${mode}_...`}
            value={form.publishable_key}
            onChange={(e) => setForm({ ...form, publishable_key: e.target.value })}
          />
          {hasConfig && (
            <p className="text-sm text-muted-foreground">
              Current: {config.publishable_key}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${mode}-webhook-secret`}>Webhook Signing Secret</Label>
          <div className="flex gap-2">
            <Input
              id={`${mode}-webhook-secret`}
              type={showSecrets[`${mode}-webhook`] ? 'text' : 'password'}
              placeholder="whsec_..."
              value={form.webhook_secret}
              onChange={(e) => setForm({ ...form, webhook_secret: e.target.value })}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowSecrets({ ...showSecrets, [`${mode}-webhook`]: !showSecrets[`${mode}-webhook`] })}
            >
              {showSecrets[`${mode}-webhook`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {hasConfig && config.has_webhook_secret && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Check className="h-4 w-4" /> Webhook secret configured
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${mode}-connected-account`}>Connected Account ID (Optional)</Label>
          <Input
            id={`${mode}-connected-account`}
            placeholder="acct_..."
            value={form.connected_account_id}
            onChange={(e) => setForm({ ...form, connected_account_id: e.target.value })}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={() => handleTestConnection(mode)} variant="outline" disabled={loading}>
            {connectionStatus === 'testing' ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : connectionStatus === 'success' ? (
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
            ) : connectionStatus === 'error' ? (
              <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Test Connection
          </Button>

          <Button onClick={() => handleSaveConfig(mode)} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            Save Configuration
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Stripe Billing Configuration</CardTitle>
          <CardDescription>
            Configure Stripe API keys and webhook settings. All sensitive data is encrypted at rest.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <Label htmlFor="active-mode">Active Mode</Label>
              <div className="flex items-center gap-4">
                <Badge variant={activeMode === 'test' ? 'default' : 'outline'}>Test</Badge>
                <Switch
                  id="active-mode"
                  checked={activeMode === 'live'}
                  onCheckedChange={(checked) => handleSetActiveMode(checked ? 'live' : 'test')}
                />
                <Badge variant={activeMode === 'live' ? 'default' : 'outline'}>Live</Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Toggle between test and live modes. All API calls will use the active mode.
            </p>
          </div>

          <Tabs defaultValue="test" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="test">Test Mode</TabsTrigger>
              <TabsTrigger value="live">Live Mode</TabsTrigger>
            </TabsList>

            <TabsContent value="test" className="pt-4">
              {renderConfigForm('test', testForm, setTestForm)}
            </TabsContent>

            <TabsContent value="live" className="pt-4">
              {renderConfigForm('live', liveForm, setLiveForm)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan Mappings</CardTitle>
          <CardDescription>
            Map AGS subscription plans to Stripe Price IDs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Plan Key</Label>
                <Input
                  placeholder="basic"
                  value={newPlan.plan_key}
                  onChange={(e) => setNewPlan({ ...newPlan, plan_key: e.target.value })}
                />
              </div>
              <div>
                <Label>Plan Name</Label>
                <Input
                  placeholder="Basic Plan"
                  value={newPlan.plan_name}
                  onChange={(e) => setNewPlan({ ...newPlan, plan_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Test Price ID</Label>
                <Input
                  placeholder="price_test_..."
                  value={newPlan.stripe_price_id_test}
                  onChange={(e) => setNewPlan({ ...newPlan, stripe_price_id_test: e.target.value })}
                />
              </div>
              <div>
                <Label>Live Price ID</Label>
                <Input
                  placeholder="price_live_..."
                  value={newPlan.stripe_price_id_live}
                  onChange={(e) => setNewPlan({ ...newPlan, stripe_price_id_live: e.target.value })}
                />
              </div>
            </div>

            <Button onClick={handleSavePlan}>
              <Plus className="h-4 w-4 mr-2" />
              Add/Update Plan Mapping
            </Button>

            {planMappings.length > 0 && (
              <div className="border rounded-lg overflow-hidden mt-4">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Plan</th>
                      <th className="text-left p-2">Test Price ID</th>
                      <th className="text-left p-2">Live Price ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planMappings.map((plan) => (
                      <tr key={plan.id} className="border-t">
                        <td className="p-2">
                          <div>
                            <div className="font-medium">{plan.plan_name}</div>
                            <div className="text-sm text-muted-foreground">{plan.plan_key}</div>
                          </div>
                        </td>
                        <td className="p-2 text-sm">{plan.stripe_price_id_test || '—'}</td>
                        <td className="p-2 text-sm">{plan.stripe_price_id_live || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Note:</strong> All secret keys and webhook secrets are encrypted using AES-256-GCM
          before being stored in the database. Never commit API keys to version control.
        </AlertDescription>
      </Alert>
    </div>
  );
}



