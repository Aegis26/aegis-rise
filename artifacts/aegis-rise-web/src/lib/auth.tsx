import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { setAuthTokenGetter, type AuthMember } from "@workspace/api-client-react";

interface AuthContextType {
  token: string | null;
  member: AuthMember | null;
  setAuth: (token: string | null, member: AuthMember | null) => void;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => {
    return localStorage.getItem("aegis_token");
  });
  
  const [member, setMemberState] = useState<AuthMember | null>(() => {
    const saved = localStorage.getItem("aegis_member");
    return saved ? JSON.parse(saved) : null;
  });

  const [isLoading, setIsLoading] = useState(true);

  const setAuth = useCallback((newToken: string | null, newMember: AuthMember | null) => {
    setTokenState((currentToken) =>
      currentToken === newToken ? currentToken : newToken,
    );
    setMemberState((currentMember) => {
      if (
        currentMember &&
        newMember &&
        currentMember.id === newMember.id &&
        currentMember.name === newMember.name &&
        currentMember.email === newMember.email &&
        currentMember.role === newMember.role &&
        currentMember.status === newMember.status
      ) {
        return currentMember;
      }

      return newMember;
    });
    
    if (newToken) {
      localStorage.setItem("aegis_token", newToken);
      setAuthTokenGetter(() => newToken);
    } else {
      localStorage.removeItem("aegis_token");
      setAuthTokenGetter(null);
    }
    
    if (newMember) {
      localStorage.setItem("aegis_member", JSON.stringify(newMember));
    } else {
      localStorage.removeItem("aegis_member");
    }
  }, []);

  const logout = useCallback(() => {
    setAuth(null, null);
  }, [setAuth]);

  useEffect(() => {
    // Initial setup
    if (token) {
      setAuthTokenGetter(() => token);
    } else {
      setAuthTokenGetter(null);
    }
    setIsLoading(false);
    
    // Add dark mode default class to html root
    document.documentElement.classList.add("dark");
  }, [token]);

  const contextValue = useMemo(
    () => ({ token, member, setAuth, isLoading, logout }),
    [token, member, setAuth, isLoading, logout],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
