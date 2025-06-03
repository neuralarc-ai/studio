
'use client';

import type { User } from '@/types';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { MOCK_AVATARS } from '@/lib/mock-data'; // Keep MOCK_AVATARS for selection
import { database } from '@/lib/firebase';
import { ref, set, get, query, orderByChild, equalTo, remove, Unsubscribe, onValue } from 'firebase/database';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  verifyPin: (pin: string) => Promise<boolean>;
  updateCurrentUserName: (newName: string, newAvatarUrl?: string) => Promise<boolean>;
  updateCurrentUserPin: (newPin: string) => Promise<{success: boolean, message?: string}>;
  adminUpdateUserPin: (userId: string, newPin: string) => Promise<{success: boolean, message?: string}>;
  adminAddUser: (name: string, email: string, pin: string, avatarUrl: string) => Promise<{success: boolean, message?: string, user?: User}>;
  adminDeleteUser: (userId: string) => Promise<{success: boolean, message?: string}>;
  MOCK_USERS_ARRAY_FOR_SELECT: User[]; // For populating user selection dropdowns
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// This MOCK_USERS_ARRAY_FOR_SELECT will be kept in sync by AuthProvider for UI selections.
let MOCK_USERS_ARRAY_FOR_SELECT_INTERNAL: User[] = [];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const [MOCK_USERS_ARRAY_FOR_SELECT, setUsersForSelect] = useState<User[]>([]);

  // Effect to load initial user list for dropdowns and keep it updated
  useEffect(() => {
    const usersRef = ref(database, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const usersData = snapshot.val();
      if (usersData) {
        const usersList = Object.values(usersData) as User[];
        MOCK_USERS_ARRAY_FOR_SELECT_INTERNAL = usersList;
        setUsersForSelect(usersList);
      } else {
        MOCK_USERS_ARRAY_FOR_SELECT_INTERNAL = [];
        setUsersForSelect([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('whitespace-user');
    if (storedUser) {
      const parsedUser: User = JSON.parse(storedUser);
      // Verify user still exists and PIN matches, effectively re-authenticating session silently
      const userRef = ref(database, `users/${parsedUser.id}`);
      get(userRef).then((snapshot) => {
        const dbUser = snapshot.val();
        if (dbUser && dbUser.pin === parsedUser.pin) {
          setUser(dbUser);
        } else {
          localStorage.removeItem('whitespace-user'); // Stale or invalid session
        }
        setLoading(false);
      }).catch(() => {
        localStorage.removeItem('whitespace-user');
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (pinToLogin: string): Promise<boolean> => {
    setLoading(true);
    try {
      const usersQuery = query(ref(database, 'users'), orderByChild('pin'), equalTo(pinToLogin));
      const snapshot = await get(usersQuery);
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const userId = Object.keys(usersData)[0];
        const foundUser = usersData[userId] as User;
        setUser(foundUser);
        localStorage.setItem('whitespace-user', JSON.stringify(foundUser));
        router.push(foundUser.isAdmin ? '/admin' : '/dashboard');
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('whitespace-user');
    router.push('/auth/login');
  };

  const verifyPin = async (pinToVerify: string): Promise<boolean> => {
    if (!user) return false;
    const userRef = ref(database, `users/${user.id}`);
    try {
      const snapshot = await get(userRef);
      const dbUser = snapshot.val();
      return dbUser ? dbUser.pin === pinToVerify : false;
    } catch (error) {
      console.error("PIN verification error:", error);
      return false;
    }
  };

  const updateCurrentUserName = async (newName: string, newAvatarUrl?: string): Promise<boolean> => {
    if (!user) return false;
    const userRef = ref(database, `users/${user.id}`);
    try {
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const updates = {
          name: newName,
          avatarUrl: newAvatarUrl !== undefined ? newAvatarUrl : userData.avatarUrl,
        };
        await set(userRef, { ...userData, ...updates });
        const updatedUserSession = { ...user, ...updates };
        setUser(updatedUserSession);
        localStorage.setItem('whitespace-user', JSON.stringify(updatedUserSession));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Update user name/avatar error:", error);
      return false;
    }
  };

  const updateCurrentUserPin = async (newPin: string): Promise<{success: boolean, message?: string}> => {
    if (!user) return {success: false, message: "No user logged in."};
    if (!/^\d{4}$/.test(newPin)) return {success: false, message: "PIN must be 4 digits."};

    try {
      const pinQuery = query(ref(database, 'users'), orderByChild('pin'), equalTo(newPin));
      const snapshot = await get(pinQuery);
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const conflictingUserId = Object.keys(usersData)[0];
        if (conflictingUserId !== user.id) {
          return {success: false, message: "This PIN is already in use by another user."};
        }
      }

      const userRef = ref(database, `users/${user.id}`);
      const userSnapshot = await get(userRef);
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        const updates = {
          pin: newPin,
          pinFirstTwo: newPin.substring(0, 2),
        };
        await set(userRef, { ...userData, ...updates });
        const updatedUserSession = { ...user, ...updates };
        setUser(updatedUserSession);
        localStorage.setItem('whitespace-user', JSON.stringify(updatedUserSession));
        return {success: true, message: "PIN updated successfully."};
      }
      return {success: false, message: "User not found."};
    } catch (error) {
      console.error("Update PIN error:", error);
      return {success: false, message: "Failed to update PIN due to a server error."};
    }
  };

  const adminUpdateUserPin = async (userId: string, newPin: string): Promise<{success: boolean, message?: string}> => {
    if (!user || !user.isAdmin) return {success: false, message: "Unauthorized action."};
    if (!/^\d{4}$/.test(newPin)) return {success: false, message: "New PIN must be 4 digits."};

    try {
      const pinQuery = query(ref(database, 'users'), orderByChild('pin'), equalTo(newPin));
      const snapshot = await get(pinQuery);
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const conflictingUserId = Object.keys(usersData)[0];
        if (conflictingUserId !== userId) {
          return {success: false, message: "This PIN is already in use by another user."};
        }
      }

      const userToUpdateRef = ref(database, `users/${userId}`);
      const userSnapshot = await get(userToUpdateRef);
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        await set(userToUpdateRef, { ...userData, pin: newPin, pinFirstTwo: newPin.substring(0,2) });
        return {success: true, message: `PIN for user ${userData.name} updated successfully.`};
      }
      return {success: false, message: "User not found."};
    } catch (error) {
      console.error("Admin update user PIN error:", error);
      return {success: false, message: "Failed to update user PIN due to a server error."};
    }
  };

  const adminAddUser = async (name: string, email: string, pin: string, avatarUrl: string): Promise<{success: boolean, message?: string, user?:User}> => {
    if (!user || !user.isAdmin) return {success: false, message: "Unauthorized action."};
    
    try {
      const pinQuery = query(ref(database, 'users'), orderByChild('pin'), equalTo(pin));
      const pinSnapshot = await get(pinQuery);
      if (pinSnapshot.exists()) {
        return {success: false, message: "PIN conflicts with an existing user. Please regenerate."};
      }

      const emailQuery = query(ref(database, 'users'), orderByChild('email'), equalTo(email.toLowerCase()));
      const emailSnapshot = await get(emailQuery);
      if (emailSnapshot.exists()) {
        return {success: false, message: "Email conflicts with an existing user."};
      }
      
      const newUserId = `user-${Date.now()}`;
      const newUser: User = {
        id: newUserId,
        name,
        email: email.toLowerCase(),
        pin,
        pinFirstTwo: pin.substring(0,2),
        isAdmin: false,
        createdAt: new Date().toISOString(),
        avatarUrl
      };
      await set(ref(database, `users/${newUserId}`), newUser);
      return {success: true, message: "User added successfully", user: newUser};
    } catch (error) {
      console.error("Admin add user error:", error);
      return {success: false, message: "Failed to add user due to a server error."};
    }
  };

  const adminDeleteUser = async (userId: string): Promise<{success: boolean, message?: string}> => {
    if (!user || !user.isAdmin) return {success: false, message: "Unauthorized action."};
    if (userId === user.id) return {success: false, message: "Admin cannot delete self."};
    
    try {
      await remove(ref(database, `users/${userId}`));
      return {success: true, message: "User deleted."};
    } catch (error) {
      console.error("Admin delete user error:", error);
      return {success: false, message: "Failed to delete user due to a server error."};
    }
  };

  useEffect(() => {
    if (!loading && !user && !pathname.startsWith('/auth')) {
      router.push('/auth/login');
    }
  }, [user, loading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, verifyPin, updateCurrentUserName, updateCurrentUserPin, adminUpdateUserPin, adminAddUser, adminDeleteUser, MOCK_USERS_ARRAY_FOR_SELECT }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
