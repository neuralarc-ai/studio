
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, KeyRound, RefreshCw, Trash2, Eye, EyeOff, Copy, PlusCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import type { ApiKey } from '@/types';
import { getApiKeysAction, deleteApiKeyAction, suggestApiIntegrationAction } from '@/app/actions/repository';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, parseISO } from 'date-fns';
// import { MOCK_USERS_ARRAY } from '@/lib/mock-data'; // Use from AuthContext
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { AddApiKeyForm } from '@/components/repository/add-api-key-form';
import { PinVerificationModal } from '@/components/repository/pin-verification-modal';


export default function AdminRepositoryPage() {
  const [isPinModalOpen, setIsPinModalOpen] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Start as false until verified
  const [visibleKeyValueId, setVisibleKeyValueId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const { user, loading: authLoading, MOCK_USERS_ARRAY_FOR_SELECT } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const fetchApiKeys = useCallback(async () => {
    if (!user || !user.isAdmin || !isVerified) return;
    setIsLoading(true);
    try {
      const keys = await getApiKeysAction(user.id); // Admin ID fetches all
      setApiKeys(keys);
    } catch (e) {
      toast({ title: "Error", description: "Failed to load API keys.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [user, isVerified, toast]);

  useEffect(() => {
    if (!authLoading) {
      if (!user || !user.isAdmin) {
        router.replace('/dashboard');
      } else if (isVerified) { // Fetch keys only if admin and verified
        fetchApiKeys();
      }
    }
  }, [user, authLoading, router, isVerified, fetchApiKeys]);
  
  const handlePinVerified = () => {
    setIsVerified(true);
    setIsPinModalOpen(false);
    // fetchApiKeys(); // fetch will be triggered by useEffect on isVerified change
  };
  
  const handleModalClose = () => {
    setIsPinModalOpen(false);
    if (!isVerified && (!user || !user.isAdmin)) {
       router.replace('/admin'); // If not verified and closed, maybe redirect from sensitive page
    } else if (!isVerified && user?.isAdmin) {
        // Admin closed modal without verifying, allow them to try again or see non-sensitive parts
    }
  };

  const handleApiKeyAdded = () => {
    if(isVerified) fetchApiKeys();
    setShowAddForm(false); 
  };

  const handleDeleteApiKey = async (id: string) => {
    if (!user || !user.isAdmin || !isVerified) return;
    const originalKeys = [...apiKeys];
    setApiKeys(prev => prev.filter(key => key.id !== id));
    const result = await deleteApiKeyAction(id, user.id); // Pass admin ID
    if (!result.success) {
      setApiKeys(originalKeys);
      toast({ title: "Error", description: result.message || "Failed to delete API key.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: result.message });
    }
  };

  const handleToggleVisibility = (id: string) => {
    setVisibleKeyValueId(prev => prev === id ? null : id);
  };

  const handleCopyValue = (value: string) => {
    navigator.clipboard.writeText(value);
    toast({ title: "Copied!", description: "API Key value copied to clipboard." });
  };

  const getUserName = (userId: string) => {
    const keyOwner = MOCK_USERS_ARRAY_FOR_SELECT.find(u => u.id === userId);
    return keyOwner ? keyOwner.name : 'Unknown User';
  };
  
  const handleSuggestIntegration = async (keyId: string, keyName: string, keyValue: string) => {
    if (!isVerified) return;
    try {
      const suggestion = await suggestApiIntegrationAction(keyId, keyName, keyValue); // keyId passed
      setApiKeys(prevKeys => prevKeys.map(key => 
        key.id === keyId ? { ...key, apiType: suggestion.apiType, integrationGuide: suggestion.integrationGuide } : key
      ));
      toast({ title: "AI Suggestion", description: `Detected API Type: ${suggestion.apiType}. Guide added.`, duration: 5000});
    } catch (error) {
      toast({ title: "AI Suggestion Failed", description: "Could not get integration suggestions.", variant: "destructive"});
    }
  };

  if (authLoading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  if (!user || !user.isAdmin) return null; // Should be caught by useEffect redirect

  if (!isVerified) {
    return (
      <div>
        <PinVerificationModal
          isOpen={isPinModalOpen}
          onClose={handleModalClose}
          onVerified={handlePinVerified}
        />
        {!isPinModalOpen && (
           <Card className="mt-6 text-center bg-card border-border">
             <CardHeader><CardTitle className="text-xl text-foreground">Access Restricted</CardTitle></CardHeader>
             <CardContent>
               <p className="text-muted-foreground">Verify your PIN to access the API Repository.</p>
               <Button onClick={() => setIsPinModalOpen(true)} className="mt-4">Verify PIN</Button>
             </CardContent>
           </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline text-foreground flex items-center">
          <KeyRound className="mr-3 h-8 w-8 text-primary" /> Admin: All API Keys
        </h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddForm(!showAddForm)} variant="outline" className="border-primary text-primary hover:bg-primary/10">
            <PlusCircle className="mr-2 h-4 w-4" /> {showAddForm ? 'Cancel' : 'Add API Key'}
          </Button>
          <Button onClick={fetchApiKeys} variant="ghost" size="icon" title="Refresh Keys" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground">View and manage all API keys stored by users on the platform. Admins can add keys for their own account.</p>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <AddApiKeyForm onApiKeyAdded={handleApiKeyAdded} />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && (
        <div className="flex justify-center items-center py-10"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
      )}

      {!isLoading && apiKeys.length === 0 && !showAddForm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 border-2 border-dashed border-border rounded-lg bg-card">
          <KeyRound className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground">No API Keys Found</h3>
          <p className="text-muted-foreground mt-1">There are currently no API keys in the system.</p>
        </motion.div>
      )}

      {apiKeys.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {apiKeys.map(key => (
              <motion.div
                key={key.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full" 
              >
                <Card className="shadow-md hover:shadow-lg transition-shadow bg-card border-border h-full flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg font-semibold text-foreground">{key.keyName}</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">Owner: {getUserName(key.userId)}</CardDescription>
                      </div>
                      {key.tag && <Badge variant="secondary" className="text-xs bg-secondary text-secondary-foreground">{key.tag}</Badge>}
                    </div>
                     <CardDescription className="text-xs text-muted-foreground pt-1">
                      Added {formatDistanceToNow(parseISO(key.createdAt), { addSuffix: true })}
                      {key.expiresAt && ` • Expires ${formatDistanceToNow(parseISO(key.expiresAt), { addSuffix: true })}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 flex-grow">
                    <div className="flex items-center space-x-2">
                      <Input
                        type={visibleKeyValueId === key.id ? 'text' : 'password'}
                        value={key.keyValue}
                        readOnly
                        className="flex-grow bg-input/50 border-input-border text-sm font-code"
                      />
                      <Button variant="ghost" size="icon" onClick={() => handleToggleVisibility(key.id)} title={visibleKeyValueId === key.id ? "Hide Key" : "Show Key"}>
                        {visibleKeyValueId === key.id ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleCopyValue(key.keyValue)} title="Copy Key Value">
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                    {key.notes && <p className="text-sm text-foreground/80 pt-1">{key.notes}</p>}
                     {key.apiType && (
                      <div className="p-3 bg-secondary/50 rounded-md mt-2">
                        <h4 className="text-sm font-semibold text-foreground flex items-center"><Sparkles className="w-4 h-4 mr-2 text-primary"/>AI Suggestion</h4>
                        <p className="text-xs text-muted-foreground">Type: {key.apiType}</p>
                        {key.integrationGuide && (
                          <details className="mt-1">
                            <summary className="text-xs text-primary cursor-pointer hover:underline">View Integration Guide</summary>
                            <pre className="mt-1 p-2 bg-background text-xs rounded-md overflow-x-auto max-h-40 text-foreground font-code border border-border">{key.integrationGuide}</pre>
                          </details>
                        )}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-end space-x-2 mt-auto">
                     {!key.apiType && (
                       <Button variant="outline" size="sm" onClick={() => handleSuggestIntegration(key.id, key.keyName, key.keyValue)} title="Suggest API Type & Integration">
                         <Sparkles className="h-3 w-3 mr-1.5" /> Suggest
                       </Button>
                     )}
                    <Button variant="outline" size="sm" onClick={() => handleDeleteApiKey(key.id)} className="text-destructive/80 border-destructive/50 hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-3 w-3 mr-1.5"/> Delete
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
