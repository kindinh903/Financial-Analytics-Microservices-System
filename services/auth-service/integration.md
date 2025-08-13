```bash
# Authentication Service URL
AUTH_SERVICE_URL=http://localhost:8087

JWT_SECRET=7ac91ccdf339dc88aba1406252e53ce36d5dbb5af66d70daa99ba904bdcab69e34f7feca655504ad72e0de14458330796
```

### 2. Token Validation

#### Option A: HTTP Request Validation (Recommended)

```javascript
const axios = require('axios');

async function validateToken(token) {
  try {
    const response = await axios.get(`${process.env.AUTH_SERVICE_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 5000
    });
    
    return {
      valid: true,
      user: response.data.user
    };
  } catch (error) {
    return {
      valid: false,
      error: error.response?.data?.error || 'Validation failed',
      message: error.response?.data?.message || 'Token validation failed'
    };
  }
}

// Usage
const result = await validateToken(token);
if (result.valid) {
  console.log('Authenticated user:', result.user);
} else {
  console.log('Authentication failed:', result.message);
}
```

#### Option B: Local Validation (Requires JWT_SECRET)

```javascript
const jwt = require('jsonwebtoken');

function validateTokenLocally(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return {
      valid: true,
      decoded
    };
  } catch (error) {
    return {
      valid: false,
      error: error.name,
      message: error.message
    };
  }
}
```

### 3. Express Middleware

Create authentication middleware for your Express service:

```javascript
const axios = require('axios');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        message: 'No token provided in Authorization header'
      });
    }

    const result = await validateToken(token);
    if (!result.valid) {
      return res.status(401).json({
        error: result.error,
        message: result.message
      });
    }

    req.user = result.user;
    next();
  } catch (error) {
    return res.status(500).json({
      error: 'Authentication failed',
      message: 'Internal server error during authentication'
    });
  }
};

// Usage in routes
app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Protected data', user: req.user });
});
```

### 4. Role-Based Access Control

```javascript
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'User does not have required role'
      });
    }

    next();
  };
};

// Usage
app.get('/admin-only', authenticateToken, requireRole(['admin']), (req, res) => {
  res.json({ message: 'Admin only data' });
});

app.get('/premium-feature', authenticateToken, requireRole(['premium', 'admin']), (req, res) => {
  res.json({ message: 'Premium feature data' });
});
```

### 5. Subscription-Based Access Control

```javascript
const requireSubscription = (requiredPlan = 'free') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated'
      });
    }

    const planHierarchy = {
      'free': 0,
      'basic': 1,
      'premium': 2,
      'enterprise': 3
    };

    const userPlanLevel = planHierarchy[req.user.subscription?.plan || 'free'];
    const requiredPlanLevel = planHierarchy[requiredPlan];

    if (userPlanLevel < requiredPlanLevel) {
      return res.status(403).json({
        error: 'Subscription required',
        message: `${requiredPlan} subscription required for this feature`
      });
    }

    if (!req.user.subscription?.isActive) {
      return res.status(403).json({
        error: 'Subscription inactive',
        message: 'Active subscription required for this feature'
      });
    }

    next();
  };
};

// Usage
app.get('/ai-predictions', authenticateToken, requireSubscription('premium'), (req, res) => {
  res.json({ message: 'AI predictions data' });
});
```

## Integration Examples

### Spring Boot (Java)

```java
@Component
public class AuthService {
    
    @Value("${auth.service.url}")
    private String authServiceUrl;
    
    public User validateToken(String token) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(
                authServiceUrl + "/api/auth/me",
                HttpMethod.GET,
                entity,
                Map.class
            );
            
            Map<String, Object> userData = (Map<String, Object>) response.getBody().get("user");
            return new User(userData);
        } catch (Exception e) {
            throw new AuthenticationException("Invalid token");
        }
    }
}

@Component
public class AuthInterceptor implements HandlerInterceptor {
    
    @Autowired
    private AuthService authService;
    
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String token = request.getHeader("Authorization");
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
            User user = authService.validateToken(token);
            request.setAttribute("user", user);
        }
        return true;
    }
}
```

### Python (Flask/FastAPI)

```python
import requests
from functools import wraps
from flask import request, jsonify

def authenticate_token(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            response = requests.get(
                f"{os.getenv('AUTH_SERVICE_URL')}/api/auth/me",
                headers={'Authorization': f'Bearer {token}'},
                timeout=5
            )
            response.raise_for_status()
            request.user = response.json()['user']
        except requests.exceptions.RequestException:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(*args, **kwargs)
    return decorated_function

# Usage
@app.route('/protected')
@authenticate_token
def protected_route():
    return jsonify({'message': 'Protected data', 'user': request.user})
```

### Go

```go
package middleware

import (
    "encoding/json"
    "net/http"
    "strings"
)

type User struct {
    ID       string `json:"id"`
    Username string `json:"username"`
    Email    string `json:"email"`
    Role     string `json:"role"`
}

type AuthResponse struct {
    User User `json:"user"`
}

func AuthenticateToken(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        authHeader := r.Header.Get("Authorization")
        if authHeader == "" {
            http.Error(w, "Authorization header required", http.StatusUnauthorized)
            return
        }

        tokenParts := strings.Split(authHeader, " ")
        if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
            http.Error(w, "Invalid token format", http.StatusUnauthorized)
            return
        }

        token := tokenParts[1]
        
        // Make request to auth service
        req, err := http.NewRequest("GET", os.Getenv("AUTH_SERVICE_URL")+"/api/auth/me", nil)
        if err != nil {
            http.Error(w, "Internal server error", http.StatusInternalServerError)
            return
        }
        
        req.Header.Set("Authorization", "Bearer "+token)
        
        client := &http.Client{}
        resp, err := client.Do(req)
        if err != nil || resp.StatusCode != http.StatusOK {
            http.Error(w, "Invalid token", http.StatusUnauthorized)
            return
        }
        defer resp.Body.Close()

        var authResp AuthResponse
        if err := json.NewDecoder(resp.Body).Decode(&authResp); err != nil {
            http.Error(w, "Invalid response from auth service", http.StatusInternalServerError)
            return
        }

        // Add user to request context
        ctx := context.WithValue(r.Context(), "user", authResp.User)
        next.ServeHTTP(w, r.WithContext(ctx))
    }
}

// Usage
func main() {
    http.HandleFunc("/protected", AuthenticateToken(protectedHandler))
    http.ListenAndServe(":8080", nil)
}

func protectedHandler(w http.ResponseWriter, r *http.Request) {
    user := r.Context().Value("user").(User)
    json.NewEncoder(w).Encode(map[string]interface{}{
        "message": "Protected data",
        "user":    user,
    })
}
```

## Error Handling

The authentication service returns consistent error responses:

```json
{
  "error": "Error type",
  "message": "Human-readable error message"
}
```

Common error types:
- `Access token required`: No token provided
- `Invalid token`: Token is malformed or invalid
- `Token expired`: Token has expired
- `User not found`: User associated with token no longer exists
- `Account disabled`: User account has been disabled
- `Insufficient permissions`: User doesn't have required role
- `Subscription required`: User doesn't have required subscription

## Best Practices

1. **Always validate tokens**: Never trust client-side data
2. **Use HTTPS**: Always use HTTPS in production
3. **Handle timeouts**: Set appropriate timeouts for auth service requests
4. **Cache user data**: Consider caching user data to reduce auth service load
5. **Log authentication events**: Log failed authentication attempts
6. **Use environment variables**: Don't hardcode auth service URLs
7. **Implement retry logic**: Handle temporary auth service unavailability

## Testing

Use the provided test script to verify your integration:

```bash
cd services/auth-service
node test-auth.js
```

This will test all major authentication flows and help you verify your integration is working correctly.
