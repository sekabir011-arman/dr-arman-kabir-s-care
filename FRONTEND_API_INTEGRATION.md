# Frontend API Integration Guide

## Replacing Internet Computer with PHP API

### 1. Remove ICP Dependencies

Update `src/frontend/package.json`:

```json
{
  "dependencies": {
    "react": "~19.1.0",
    "react-dom": "~19.1.0",
    // REMOVE these:
    // "@dfinity/agent": "~3.3.0",
    // "@dfinity/auth-client": "~3.3.0",
    // "@dfinity/candid": "~3.3.0",
    // "@dfinity/identity": "~3.3.0",
    // "@dfinity/principal": "~3.3.0",
    // "@icp-sdk/core": "~4.1.0",
    // "@caffeineai/core-infrastructure": "~0.1.0",
    
    // ADD these instead:
    "axios": "^1.6.0"
  }
}
```

### 2. Create API Service Layer

Create `src/frontend/src/services/api.ts`:

```typescript
import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://yourdomain.com/api';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Set authorization token
  setToken(token: string) {
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('auth_token', token);
    } else {
      delete this.client.defaults.headers.common['Authorization'];
      localStorage.removeItem('auth_token');
    }
  }

  // Get stored token
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  // ============ AUTH ENDPOINTS ============

  async register(email: string, password: string, fullName: string, role = 'patient') {
    return this.client.post('/auth.php?action=register', {
      email,
      password,
      full_name: fullName,
      role,
    });
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/auth.php?action=login', {
      email,
      password,
    });
    if (response.data.data.token) {
      this.setToken(response.data.data.token);
    }
    return response;
  }

  async getCurrentUser() {
    return this.client.get('/auth.php?action=current-user');
  }

  async updateProfile(fullName: string, phone?: string) {
    return this.client.post('/auth.php?action=update-profile', {
      full_name: fullName,
      phone,
    });
  }

  async changePassword(oldPassword: string, newPassword: string) {
    return this.client.post('/auth.php?action=change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  }

  logout() {
    this.setToken('');
  }

  // ============ PATIENT ENDPOINTS ============

  async getPatients() {
    return this.client.get('/patient.php?action=list');
  }

  async getPatient(id: number) {
    return this.client.get(`/patient.php?action=get&id=${id}`);
  }

  async createPatient(patientData: any) {
    return this.client.post('/patient.php?action=create', patientData);
  }

  async updatePatient(id: number, patientData: any) {
    return this.client.put('/patient.php?action=update', {
      id,
      ...patientData,
    });
  }

  async deletePatient(id: number) {
    return this.client.delete('/patient.php?action=delete', {
      data: { id },
    });
  }

  async syncPatients(sinceTimestamp: number) {
    return this.client.get(`/patient.php?action=sync&since=${sinceTimestamp}`);
  }

  async assignConsultant(patientId: number, consultantEmail: string, consultantName: string) {
    return this.client.post('/patient.php?action=assign-consultant', {
      patient_id: patientId,
      consultant_email: consultantEmail,
      consultant_name: consultantName,
    });
  }

  // ============ VISIT ENDPOINTS ============

  async getVisits() {
    return this.client.get('/visit.php?action=list');
  }

  async getVisit(id: number) {
    return this.client.get(`/visit.php?action=get&id=${id}`);
  }

  async getVisitsByPatient(patientId: number) {
    return this.client.get(`/visit.php?action=by-patient&patient_id=${patientId}`);
  }

  async createVisit(visitData: any) {
    return this.client.post('/visit.php?action=create', visitData);
  }

  async updateVisit(id: number, visitData: any) {
    return this.client.put('/visit.php?action=update', {
      id,
      ...visitData,
    });
  }

  async deleteVisit(id: number) {
    return this.client.delete('/visit.php?action=delete', {
      data: { id },
    });
  }

  async syncVisits(sinceTimestamp: number) {
    return this.client.get(`/visit.php?action=sync&since=${sinceTimestamp}`);
  }

  // ============ PRESCRIPTION ENDPOINTS ============

  async getPrescriptions() {
    return this.client.get('/prescription.php?action=list');
  }

  async getPrescription(id: number) {
    return this.client.get(`/prescription.php?action=get&id=${id}`);
  }

  async getPrescriptionsByPatient(patientId: number) {
    return this.client.get(`/prescription.php?action=by-patient&patient_id=${patientId}`);
  }

  async getPrescriptionsByVisit(visitId: number) {
    return this.client.get(`/prescription.php?action=by-visit&visit_id=${visitId}`);
  }

  async createPrescription(prescriptionData: any) {
    return this.client.post('/prescription.php?action=create', prescriptionData);
  }

  async updatePrescription(id: number, prescriptionData: any) {
    return this.client.put('/prescription.php?action=update', {
      id,
      ...prescriptionData,
    });
  }

  async deletePrescription(id: number) {
    return this.client.delete('/prescription.php?action=delete', {
      data: { id },
    });
  }

  async syncPrescriptions(sinceTimestamp: number) {
    return this.client.get(`/prescription.php?action=sync&since=${sinceTimestamp}`);
  }
}

export const apiClient = new APIClient();
export default apiClient;
```

### 3. Create Auth Context

Create `src/frontend/src/contexts/AuthContext.tsx`:

```typescript
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '../services/api';

interface User {
  user_id: number;
  email: string;
  full_name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  token: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Check if user is already logged in on mount
  useEffect(() => {
    const storedToken = apiClient.getToken();
    if (storedToken) {
      setToken(storedToken);
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await apiClient.getCurrentUser();
      setUser(response.data.data);
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      apiClient.logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await apiClient.login(email, password);
      const { token: newToken, ...userData } = response.data.data;
      setToken(newToken);
      setUser(userData);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    try {
      const response = await apiClient.register(email, password, fullName);
      const { token: newToken, ...userData } = response.data.data;
      setToken(newToken);
      setUser(userData);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    apiClient.logout();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        token,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### 4. Update Main App Component

Update `src/frontend/src/App.tsx`:

```typescript
import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import MainLayout from './components/MainLayout';

function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

export default App;
```

### 5. Example Login Component

Create `src/frontend/src/components/LoginPage.tsx`:

```typescript
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h1>Dr. Arman Kabir's Care</h1>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
```

### 6. Environment Variables

Create `src/frontend/.env.production`:

```
RACT_APP_API_URL=https://yourdomain.com/api
```

For development, create `.env`:

```
RACT_APP_API_URL=http://localhost/api
```

### 7. Common Migration Patterns

**OLD (Internet Computer):**
```typescript
import { AuthClient } from "@dfinity/auth-client";

const authClient = await AuthClient.create();
const identity = await authClient.getIdentity();
const principal = identity.getPrincipal();
const result = await actor.createPatient(patientData);
```

**NEW (PHP API):**
```typescript
import apiClient from './services/api';

const token = apiClient.getToken();
const response = await apiClient.createPatient(patientData);
const result = response.data.data;
```

## Testing

```bash
# Build frontend
cd src/frontend
npm run build

# Test API integration
curl -X POST https://yourdomain.com/api/auth.php?action=login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123"}'
```

## Performance Optimization

1. Implement request caching
2. Add pagination for large datasets
3. Use lazy loading for components
4. Optimize bundle size (remove ICP dependencies)

