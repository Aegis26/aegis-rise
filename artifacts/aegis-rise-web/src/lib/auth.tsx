import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const [token, setTokenState] = useState<string | null>(() => {
    return localStorage.getItem("aegis_token");
  });
  
  const [member, setMemberState] = useState<AuthMember | null>(() => {
    const saved = localStorage.getItem("aegis_member");
    return saved ? JSON.parse(saved) : null;
  });

  const [isLoading, setIsLoading] = useState(true);
  const authBoundaryRef = useRef({
    token,
    memberId: member?.id ?? null,
    role: member?.role ?? null,
    status: member?.status ?? null,
  });

  const setAuth = useCallback((newToken: string | null, newMember: AuthMember | null) => {
    const nextBoundary = {
      token: newToken,
      memberId: newMember?.id ?? null,
      role: newMember?.role ?? null,
      status: newMember?.status ?? null,
    };
    const currentBoundary = authBoundaryRef.current;
    const boundaryChanged =
      currentBoundary.token !== nextBoundary.token ||
      currentBoundary.memberId !== nextBoundary.memberId ||
      currentBoundary.role !== nextBoundary.role ||
      currentBoundary.status !== nextBoundary.status;

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

    authBoundaryRef.current = nextBoundary;
    if (boundaryChanged) {
      queryClient.clear();
    }

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
  }, [queryClient]);

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
