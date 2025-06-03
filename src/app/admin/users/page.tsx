
// src/app/admin/users/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle, Trash2, Search, UserPlus, KeyIcon, Edit, Loader2, Eye, EyeOff, Image as ImageIcon, Mail } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User as AuthUserType, MockAvatar } from '@/types';
import { MOCK_AVATARS } from '@/lib/mock-data';
import NextImage from 'next/image'; // Renamed to avoid conflict
import { cn } from '@/lib/utils';


interface AdminUserDisplay extends AuthUserType {
  activity?: string;
}

async function generateNewPinForPage(allUsers: AuthUserType[]): Promise<string> {
  await new Promise(res => setTimeout(res, 200));
  let newPin;
  do {
    newPin = Math.floor(1000 + Math.random() * 9000).toString();
  } while (allUsers.some(u => u.pin === newPin));
  return newPin;
}

export default function ManageUsersPage() {
  const { user, loading: authLoading, updateCurrentUserName, updateCurrentUserPin, adminUpdateUserPin, adminAddUser, adminDeleteUser, MOCK_USERS_ARRAY_FOR_SELECT } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  // users state will now be derived from MOCK_USERS_ARRAY_FOR_SELECT from context
  const [users, setUsers] = useState<AdminUserDisplay[]>([]); 
  const [searchTerm, setSearchTerm] = useState('');
  const [revealedPinUserId, setRevealedPinUserId] = useState<string | null>(null);

  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>(MOCK_AVATARS[0].url); 
  const [isGeneratingPin, setIsGeneratingPin] = useState(false);

  const [isEditAdminNameDialogOpen, setIsEditAdminNameDialogOpen] = useState(false);
  const [adminNewName, setAdminNewName] = useState(user?.name || '');
  const [isEditAdminPinDialogOpen, setIsEditAdminPinDialogOpen] = useState(false);
  const [adminNewPin, setAdminNewPin] = useState('');
  const [adminConfirmNewPin, setAdminConfirmNewPin] = useState('');
  const [isEditAdminAvatarDialogOpen, setIsEditAdminAvatarDialogOpen] = useState(false);
  const [adminSelectedAvatarUrl, setAdminSelectedAvatarUrl] = useState(user?.avatarUrl || MOCK_AVATARS[0].url);
  
  const [isEditUserPinDialogOpen, setIsEditUserPinDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserName, setEditingUserName] = useState<string>('');
  const [newUserPinForUser, setNewUserPinForUser] = useState('');
  const [confirmNewUserPinForUser, setConfirmNewUserPinForUser] = useState('');

  // Update local users state when MOCK_USERS_ARRAY_FOR_SELECT from context changes
  useEffect(() => {
    setUsers(MOCK_USERS_ARRAY_FOR_SELECT.map(u => ({...u, activity: u.activity || 'N/A' })).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, [MOCK_USERS_ARRAY_FOR_SELECT]);


  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.replace('/dashboard');
    }
    if (user) {
      setAdminNewName(user.name);
      setAdminSelectedAvatarUrl(user.avatarUrl || MOCK_AVATARS[0].url);
    }
  }, [user, authLoading, router]);

  const handleGeneratePin = async () => {
    setIsGeneratingPin(true);
    const pin = await generateNewPinForPage(MOCK_USERS_ARRAY_FOR_SELECT); // Pass current users to check against
    setGeneratedPin(pin);
    setIsGeneratingPin(false);
  };

  const handleAddUser = async () => {
    if (!generatedPin) {
      toast({ title: "Error", description: "Please generate a PIN first.", variant: "destructive"});
      return;
    }
    if (!newUserName.trim()) {
      toast({ title: "Error", description: "Please enter a name for the user.", variant: "destructive"});
      return;
    }
    if (!newUserEmail.trim() || !/\S+@\S+\.\S+/.test(newUserEmail)) {
      toast({ title: "Error", description: "Please enter a valid email address.", variant: "destructive"});
      return;
    }
     if (!selectedAvatarUrl) {
      toast({ title: "Error", description: "Please select an avatar.", variant: "destructive"});
      return;
    }

    const result = await adminAddUser(newUserName.trim(), newUserEmail.trim(), generatedPin, selectedAvatarUrl);
    if (result.success && result.user) {
      toast({ title: "Success", description: `User ${result.user.name} created.`});
      // AuthProvider will update MOCK_USERS_ARRAY_FOR_SELECT, which will trigger useEffect to update local state
      setGeneratedPin(null);
      setNewUserName('');
      setNewUserEmail('');
      setSelectedAvatarUrl(MOCK_AVATARS[0].url);
      setIsAddUserDialogOpen(false);
    } else {
       toast({ title: "Error", description: result.message || "Failed to create user.", variant: "destructive"});
       if (result.message?.includes("PIN conflicts") || result.message?.includes("Email conflicts")) setGeneratedPin(null);
    }
  };

  const handleDeleteUser = async (userIdToDelete: string) => {
    if (user?.id === userIdToDelete) {
      toast({ title: "Error", description: "Admin account cannot be deleted from this list.", variant: "destructive"});
      return;
    }
    const result = await adminDeleteUser(userIdToDelete);
    if (result.success) {
      toast({ title: "Success", description: `User deleted.`});
      // AuthProvider will update MOCK_USERS_ARRAY_FOR_SELECT
    } else {
      toast({ title: "Error", description: result.message || "Failed to delete user.", variant: "destructive"});
    }
  };

  const handleAdminNameChange = async () => {
    if (!user || !adminNewName.trim()) {
      toast({ title: "Error", description: "Name cannot be empty.", variant: "destructive" });
      return;
    }
    const success = await updateCurrentUserName(adminNewName.trim(), user.avatarUrl);
    if (success) {
      toast({ title: "Success", description: "Your name has been updated." });
      // AuthProvider updates user context
      setIsEditAdminNameDialogOpen(false);
    } else {
      toast({ title: "Error", description: "Failed to update name.", variant: "destructive" });
    }
  };
  
  const handleAdminAvatarChange = async () => {
    if (!user || !adminSelectedAvatarUrl) return;
    const success = await updateCurrentUserName(user.name, adminSelectedAvatarUrl);
    if (success) {
      toast({ title: "Success", description: "Your avatar has been updated." });
      // AuthProvider updates user context
      setIsEditAdminAvatarDialogOpen(false);
    } else {
      toast({ title: "Error", description: "Failed to update avatar.", variant: "destructive" });
    }
  };

  const handleAdminPinChange = async () => {
    if (!user) return;
    if (adminNewPin !== adminConfirmNewPin) {
      toast({ title: "Error", description: "PINs do not match.", variant: "destructive" });
      return;
    }
    if (!/^\d{4}$/.test(adminNewPin)) {
      toast({ title: "Error", description: "PIN must be 4 digits.", variant: "destructive" });
      return;
    }
    
    const result = await updateCurrentUserPin(adminNewPin);
    if (result.success) {
      toast({ title: "Success", description: result.message });
      // AuthProvider updates user context
      setIsEditAdminPinDialogOpen(false);
      setAdminNewPin('');
      setAdminConfirmNewPin('');
    } else {
      toast({ title: "Error", description: result.message || "Failed to update PIN.", variant: "destructive" });
    }
  };

  const openEditUserPinDialog = (userIdToEdit: string, currentUserName: string) => {
    setEditingUserId(userIdToEdit);
    setEditingUserName(currentUserName);
    setIsEditUserPinDialogOpen(true);
    setNewUserPinForUser('');
    setConfirmNewUserPinForUser('');
  };

  const handleUserPinChangeByAdmin = async () => {
    if (!editingUserId) return;
    if (newUserPinForUser !== confirmNewUserPinForUser) {
      toast({ title: "Error", description: "New PINs do not match.", variant: "destructive" });
      return;
    }
    if (!/^\d{4}$/.test(newUserPinForUser)) {
      toast({ title: "Error", description: "New PIN must be 4 digits.", variant: "destructive" });
      return;
    }

    const result = await adminUpdateUserPin(editingUserId, newUserPinForUser);
    if (result.success) {
      toast({ title: "Success", description: result.message });
      // AuthProvider will update MOCK_USERS_ARRAY_FOR_SELECT
      setIsEditUserPinDialogOpen(false);
    } else {
      toast({ title: "Error", description: result.message || "Failed to update user PIN.", variant: "destructive" });
    }
  };

  const togglePinVisibility = (userIdToToggle: string) => {
    setRevealedPinUserId(prev => prev === userIdToToggle ? null : userIdToToggle);
  };
  
  const getInitials = (name?: string | undefined) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };


  const filteredUsers = users.filter(u =>
    u.pin.includes(searchTerm) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (authLoading || !user || !user.isAdmin) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline text-foreground">Manage Users & PINs</h1>

      {user?.isAdmin && (
        <Card className="shadow-lg bg-card border-border">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-foreground">My Admin Account</CardTitle>
            <CardDescription className="text-muted-foreground">Manage your administrator account details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
             <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="admin avatar" />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="text-sm text-muted-foreground">Avatar</p>
                    <p className="font-medium text-foreground">Current Avatar</p>
                </div>
              </div>
               <Dialog open={isEditAdminAvatarDialogOpen} onOpenChange={setIsEditAdminAvatarDialogOpen}>
                <DialogTrigger asChild><Button variant="outline" size="sm"><ImageIcon className="mr-2 h-3 w-3"/>Change Avatar</Button></DialogTrigger>
                <DialogContent className="sm:max-w-md bg-card border-border">
                  <DialogHeader><DialogTitle>Change Your Avatar</DialogTitle></DialogHeader>
                  <div className="py-4 grid grid-cols-5 gap-2">
                    {MOCK_AVATARS.map(avatar => (
                      <button key={avatar.id} onClick={() => setAdminSelectedAvatarUrl(avatar.url)} className={cn("rounded-full border-2 p-0.5", adminSelectedAvatarUrl === avatar.url ? "border-primary ring-2 ring-primary" : "border-transparent hover:border-accent")}>
                        <NextImage src={avatar.url} alt={avatar.name} width={64} height={64} className="rounded-full" data-ai-hint={avatar.aiHint}/>
                      </button>
                    ))}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditAdminAvatarDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAdminAvatarChange}>Save Avatar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium text-foreground">{user.name}</p>
              </div>
              <Dialog open={isEditAdminNameDialogOpen} onOpenChange={setIsEditAdminNameDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setAdminNewName(user.name)}><Edit className="mr-2 h-3 w-3"/>Change Name</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-card border-border">
                  <DialogHeader><DialogTitle>Change Your Name</DialogTitle></DialogHeader>
                  <div className="py-4 space-y-2">
                    <Label htmlFor="adminNewName">New Name</Label>
                    <Input id="adminNewName" value={adminNewName} onChange={(e) => setAdminNewName(e.target.value)} className="bg-input border-input-border"/>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditAdminNameDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAdminNameChange}>Save Name</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-foreground">{user.email || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">PIN</p>
                <p className="font-code font-medium text-foreground">{user.pinFirstTwo}**</p>
              </div>
               <Dialog open={isEditAdminPinDialogOpen} onOpenChange={(isOpen) => { setIsEditAdminPinDialogOpen(isOpen); if(!isOpen){setAdminNewPin(''); setAdminConfirmNewPin('');}}}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm"><KeyIcon className="mr-2 h-3 w-3"/>Change PIN</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-card border-border">
                  <DialogHeader><DialogTitle>Change Your PIN</DialogTitle></DialogHeader>
                  <div className="py-4 space-y-4">
                    <div><Label htmlFor="adminNewPin">New 4-Digit PIN</Label><Input id="adminNewPin" type="password" maxLength={4} value={adminNewPin} onChange={(e) => setAdminNewPin(e.target.value.replace(/\D/g,''))} className="bg-input border-input-border font-code"/></div>
                    <div><Label htmlFor="adminConfirmNewPin">Confirm New PIN</Label><Input id="adminConfirmNewPin" type="password" maxLength={4} value={adminConfirmNewPin} onChange={(e) => setAdminConfirmNewPin(e.target.value.replace(/\D/g,''))} className="bg-input border-input-border font-code"/></div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditAdminPinDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAdminPinChange}>Save PIN</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card className="shadow-lg bg-card border-border">
        <CardHeader className="flex flex-col md:flex-row justify-between items-center gap-2">
          <div>
            <CardTitle className="text-xl font-headline text-foreground">User List</CardTitle>
            <CardDescription className="text-muted-foreground">View, add, or modify users. Current admin user is managed above.</CardDescription>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-grow md:flex-grow-0">
              <Input
                type="search"
                placeholder="Search Name, Email, PIN, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full bg-input border-input-border"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>
            <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setGeneratedPin(null); setNewUserName(''); setNewUserEmail(''); setSelectedAvatarUrl(MOCK_AVATARS[0].url); }}>
                  <UserPlus className="mr-2 h-4 w-4" /> Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>Enter user details, select an avatar, and generate a unique 4-digit PIN.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newUserName" className="text-left text-foreground">User Name*</Label>
                    <Input
                      id="newUserName"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Enter user's full name"
                      className="bg-input border-input-border"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newUserEmail" className="text-left text-foreground">User Email*</Label>
                    <Input
                      id="newUserEmail"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="bg-input border-input-border"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-left text-foreground">Select Avatar*</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {MOCK_AVATARS.map(avatar => (
                        <button key={avatar.id} onClick={() => setSelectedAvatarUrl(avatar.url)} className={cn("rounded-full border-2 p-0.5", selectedAvatarUrl === avatar.url ? "border-primary ring-2 ring-primary" : "border-transparent hover:border-accent")}>
                           <NextImage src={avatar.url} alt={avatar.name} width={64} height={64} className="rounded-full aspect-square object-cover" data-ai-hint={avatar.aiHint}/>
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleGeneratePin} disabled={isGeneratingPin} variant="outline" className="w-full">
                    {isGeneratingPin ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <KeyIcon className="mr-2 h-4 w-4"/>}
                    Generate PIN
                  </Button>
                  {generatedPin && (
                    <div className="p-3 bg-secondary rounded-md text-center">
                      <p className="text-muted-foreground text-sm">New PIN:</p>
                      <p className="text-2xl font-bold text-primary font-code tracking-widest">{generatedPin}</p>
                      <p className="text-xs text-muted-foreground mt-1">Share this PIN securely with the new user.</p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddUser} disabled={!generatedPin || isGeneratingPin || !newUserName.trim() || !newUserEmail.trim() || !selectedAvatarUrl}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Create User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Avatar</TableHead>
                <TableHead>User Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>PIN</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.filter(u => u.id !== user.id).map((u) => ( 
                <TableRow key={u.id}>
                  <TableCell>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.avatarUrl} alt={u.name} data-ai-hint="user avatar" />
                      <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs truncate max-w-[180px]">{u.email || 'N/A'}</TableCell>
                  <TableCell 
                    className="font-code tracking-wider text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => !u.isAdmin && togglePinVisibility(u.id)}
                    title={u.isAdmin ? "Admin PIN managed in 'My Admin Account'" : (revealedPinUserId === u.id ? "Click to hide PIN" : "Click to reveal PIN")}
                  >
                    <span className="flex items-center">
                      {revealedPinUserId === u.id && !u.isAdmin ? u.pin : `${u.pinFirstTwo}**`}
                      {!u.isAdmin && (
                        revealedPinUserId === u.id 
                          ? <EyeOff className="ml-2 h-4 w-4 text-primary/70" /> 
                          : <Eye className="ml-2 h-4 w-4 text-muted-foreground/70" />
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.isAdmin ? "default" : "secondary"} className={u.isAdmin ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}>
                      {u.isAdmin ? 'Admin' : 'Member'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-1">
                     {!u.isAdmin && ( 
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditUserPinDialog(u.id, u.name)}
                          title="Change User PIN"
                        >
                          <KeyIcon className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </Button>
                      )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteUser(u.id)}
                      disabled={u.isAdmin} 
                      title={u.isAdmin ? "Admin cannot be deleted here" : "Delete User"}
                    >
                      <Trash2 className="h-4 w-4 text-destructive/70 hover:text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {filteredUsers.filter(u => u.id !== user.id).length === 0 && (
            <p className="text-center text-muted-foreground py-8">No other users match your search or exist in the system.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditUserPinDialogOpen} onOpenChange={(isOpen) => { setIsEditUserPinDialogOpen(isOpen); if (!isOpen) { setEditingUserId(null); setNewUserPinForUser(''); setConfirmNewUserPinForUser(''); }}}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Change PIN for {editingUserName}</DialogTitle>
            <DialogDescription>Enter a new 4-digit PIN for this user.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="newUserPin">New 4-Digit PIN</Label>
              <Input 
                id="newUserPin" 
                type="password" 
                maxLength={4} 
                value={newUserPinForUser} 
                onChange={(e) => setNewUserPinForUser(e.target.value.replace(/\D/g,''))} 
                className="bg-input border-input-border font-code"
              />
            </div>
            <div>
              <Label htmlFor="confirmNewUserPin">Confirm New PIN</Label>
              <Input 
                id="confirmNewUserPin" 
                type="password" 
                maxLength={4} 
                value={confirmNewUserPinForUser} 
                onChange={(e) => setConfirmNewUserPinForUser(e.target.value.replace(/\D/g,''))} 
                className="bg-input border-input-border font-code"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserPinDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUserPinChangeByAdmin}>Save New PIN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
