
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Mail, Save, TestTube2, Loader2, AlertTriangle, Edit, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import type { EmailServerSettings } from '@/types';

const WhiteSpaceLogoSvg = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 3a2 2 0 0 0-2 2"/>
    <path d="M19 3a2 2 0 0 1 2 2"/>
    <path d="M21 19a2 2 0 0 1-2 2"/>
    <path d="M5 21a2 2 0 0 1-2-2"/>
    <path d="M9 3h1"/>
    <path d="M9 21h1"/>
    <path d="M14 3h1"/>
    <path d="M14 21h1"/>
    <path d="M3 9v1"/>
    <path d="M21 9v1"/>
    <path d="M3 14v1"/>
    <path d="M21 14v1"/>
  </svg>
);


export default function EmailSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Partial<EmailServerSettings>>({
    smtpServer: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    smtpSecure: true, // Default to true (TLS)
    fromEmail: '',
  });
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
        setSettings(prev => ({ ...prev, [name]: e.target.checked }));
    } else if (type === 'number') {
        setSettings(prev => ({ ...prev, [name]: parseInt(value, 10) || undefined }));
    }
     else {
      setSettings(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSecureChange = (checked: boolean) => {
    setSettings(prev => ({ ...prev, smtpSecure: checked }));
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsTesting(false);
    toast({
      title: "Test Connection (Simulated)",
      description: "This is a UI placeholder. In a real app, this would test the SMTP connection.",
      variant: "default",
    });
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast({
      title: "Settings Saved (Simulated)",
      description: "Email server settings have been 'saved'. This is a UI placeholder.",
      variant: "default",
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Mail className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline text-foreground">Email Server Settings</h1>
      </div>
      <p className="text-muted-foreground">
        Configure the SMTP server settings for sending outgoing notifications from WhiteSpace.
        These settings are placeholders and are not functional in this prototype.
      </p>

      <Card className="shadow-lg bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-foreground">SMTP Configuration</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter the details of your SMTP server (e.g., G Suite, SendGrid, Mailgun).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="smtpServer">SMTP Server</Label>
              <Input id="smtpServer" name="smtpServer" placeholder="smtp.example.com" value={settings.smtpServer || ''} onChange={handleChange} className="bg-input border-input-border" />
            </div>
            <div>
              <Label htmlFor="smtpPort">SMTP Port</Label>
              <Input id="smtpPort" name="smtpPort" type="number" placeholder="587" value={settings.smtpPort || ''} onChange={handleChange} className="bg-input border-input-border" />
            </div>
          </div>
          
          <div>
            <Label htmlFor="fromEmail">Default "From" Email Address</Label>
            <Input id="fromEmail" name="fromEmail" type="email" placeholder="notifications@yourdomain.com" value={settings.fromEmail || ''} onChange={handleChange} className="bg-input border-input-border" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="smtpUsername">SMTP Username</Label>
              <Input id="smtpUsername" name="smtpUsername" placeholder="your-email@example.com" value={settings.smtpUsername || ''} onChange={handleChange} className="bg-input border-input-border" />
            </div>
            <div>
              <Label htmlFor="smtpPassword">SMTP Password/App Key</Label>
              <Input id="smtpPassword" name="smtpPassword" type="password" placeholder="••••••••••••••••" value={settings.smtpPassword || ''} onChange={handleChange} className="bg-input border-input-border" />
            </div>
          </div>
          
          <div className="flex items-center space-x-2 pt-2">
            <Switch id="smtpSecure" name="smtpSecure" checked={settings.smtpSecure} onCheckedChange={handleSecureChange} />
            <Label htmlFor="smtpSecure" className="text-foreground">Use SSL/TLS Encryption</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Enable this if your SMTP server uses SSL (e.g., port 465) or STARTTLS (e.g., port 587).
          </p>

        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleTestConnection} disabled={isTesting || isSaving}>
            {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube2 className="mr-2 h-4 w-4" />}
            Test Connection
          </Button>
          <Button onClick={handleSaveChanges} disabled={isTesting || isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Settings
          </Button>
        </CardFooter>
      </Card>

      <Card className="shadow-lg bg-card border-border">
        <CardHeader>
            <CardTitle className="text-xl font-headline text-foreground">Email Template Management</CardTitle>
            <CardDescription className="text-muted-foreground">
                Visually preview email templates. Editing and live sending are not implemented in this prototype.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {/* Template 1: Task Assignment */}
            <Card className="bg-secondary/30 border-border">
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle className="text-lg font-semibold text-foreground">Task Assignment Email</CardTitle>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => toast({ title: "Simulated Action", description: "This would show a full, rendered email preview."})}>
                            <Eye className="mr-2 h-4 w-4"/>Preview
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => toast({ title: "Simulated Action", description: "This would open an email template editor."})}>
                            <Edit className="mr-2 h-4 w-4"/>Edit
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border border-border rounded-md p-6 bg-background shadow-md max-w-2xl mx-auto">
                        <div className="flex flex-col items-center justify-center mb-6">
                            <WhiteSpaceLogoSvg className="text-primary h-10 w-10" />
                            <p className="mt-2 text-lg font-semibold text-foreground font-headline">WhiteSpace</p>
                        </div>
                        <div className="text-sm text-foreground font-body">
                            <p className="mb-4">Dear [User Name],</p>
                            <p className="mb-2">You have been assigned a new task:</p>
                            <p className="mb-4 font-semibold text-primary">"[Task Title Placeholder]"</p>
                            <p className="mb-2">Description: [Task Description Placeholder if provided, otherwise a generic sentence about checking the dashboard.]</p>
                            <p className="mb-4">Due Date: [Task Due Date Placeholder or "N/A"]</p>
                            <p className="mb-6">Please log in to your WhiteSpace dashboard to view the details and update your progress.</p>
                            <p>Best regards,</p>
                            <p>NeuralArc - Creator</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Template 2: Important Notification */}
             <Card className="bg-secondary/30 border-border">
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle className="text-lg font-semibold text-foreground">Important Notification Email</CardTitle>
                     <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => toast({ title: "Simulated Action", description: "This would show a full, rendered email preview."})}>
                            <Eye className="mr-2 h-4 w-4"/>Preview
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => toast({ title: "Simulated Action", description: "This would open an email template editor."})}>
                            <Edit className="mr-2 h-4 w-4"/>Edit
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border border-border rounded-md p-6 bg-background shadow-md max-w-2xl mx-auto">
                        <div className="flex flex-col items-center justify-center mb-6">
                            <WhiteSpaceLogoSvg className="text-primary h-10 w-10" />
                            <p className="mt-2 text-lg font-semibold text-foreground font-headline">WhiteSpace</p>
                        </div>
                        <div className="text-sm text-foreground font-body">
                            <p className="mb-4">Dear [User Name],</p>
                            <p className="mb-4">This is an important notification from WhiteSpace:</p>
                            <p className="mb-6 p-3 bg-secondary rounded-md border border-dashed">
                                [Dynamic Notification Content Placeholder - e.g., System update information, policy changes, or specific alerts.]
                            </p>
                            <p className="mb-6">Please review this information at your earliest convenience. If you have any questions, feel free to reach out to the admin.</p>
                            <p>Best regards,</p>
                            <p>NeuralArc - Creator</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <div className="p-3 bg-muted/50 rounded-md border border-border text-xs text-muted-foreground flex items-start gap-2 mt-4">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 flex-shrink-0"/>
                <span>
                  <strong>Note:</strong> This section is for visual representation only. Actual email template editing, customization, and sending functionality would require backend integration.
                </span>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
