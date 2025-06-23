import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { authService } from "@/lib/auth";
import { api } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  userProfile: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    userData?: { name?: string },
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    authService.getCurrentSession().then((session) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = authService.onAuthStateChange(async (user) => {
      setUser(user);
      if (user) {
        await loadUserProfile(user.id);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const profile = await api.users.getById(userId);
      setUserProfile(profile);
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { user } = await authService.signIn(email, password);
    if (user) {
      // Ensure user exists in database
      try {
        await loadUserProfile(user.id);
      } catch (error) {
        // If user doesn't exist in database, create them
        try {
          await api.users.create({
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.name || null,
            avatar: user.user_metadata?.avatar_url || null,
            location: null,
            bio: null,
            phone: null,
            email_verified: user.email_confirmed_at ? true : false,
            phone_verified: false,
          });
          await loadUserProfile(user.id);
        } catch (createError) {
          console.error("Error creating user profile:", createError);
        }
      }
    }
  };

  const signUp = async (
    email: string,
    password: string,
    userData?: { name?: string },
  ) => {
    const { user } = await authService.signUp(email, password, userData);
    if (user) {
      // Create user profile in database
      try {
        await api.users.create({
          id: user.id,
          email: user.email!,
          name: userData?.name || null,
          avatar: null,
          location: null,
          bio: null,
          phone: null,
          email_verified: false,
          phone_verified: false,
        });
      } catch (error) {
        console.error("Error creating user profile:", error);
      }
    }
  };

  const signInWithGoogle = async () => {
    const { user } = await authService.signInWithGoogle();
    if (user) {
      // Ensure user exists in database
      try {
        await loadUserProfile(user.id);
      } catch (error) {
        // If user doesn't exist in database, create them
        try {
          await api.users.create({
            id: user.id,
            email: user.email!,
            name:
              user.user_metadata?.full_name || user.user_metadata?.name || null,
            avatar: user.user_metadata?.avatar_url || null,
            location: null,
            bio: null,
            phone: null,
            email_verified: user.email_confirmed_at ? true : false,
            phone_verified: false,
          });
          await loadUserProfile(user.id);
        } catch (createError) {
          console.error("Error creating user profile:", createError);
        }
      }
    }
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setUserProfile(null);
  };

  const updateProfile = async (updates: any) => {
    if (!user) return;
    const updatedProfile = await api.users.update(user.id, updates);
    setUserProfile(updatedProfile);
  };

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
