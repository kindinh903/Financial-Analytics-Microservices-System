# PHÂN TÍCH 3 FLOW REQUEST THÔNG QUA GATEWAY

## Tổng quan về Gateway

Gateway trong hệ thống được xây dựng bằng **Spring Cloud Gateway** với các tính năng chính:
- **Route Management**: Định tuyến request đến các microservice
- **Authentication Filter**: Xử lý JWT token và extract user context
- **Rate Limiting**: Giới hạn số lượng request với Redis
- **WebSocket Proxy**: Hỗ trợ WebSocket connections

## Flow 1: LOGIN REQUEST

### Mô tả Flow
Client đăng nhập thông qua gateway để xác thực và nhận JWT token.

### Chi tiết Flow

```
1. Client → Gateway: POST /api/auth/login
   Headers: Content-Type: application/json
   Body: { "email": "user@example.com", "password": "password123" }

2. Gateway Processing:
   - Route matching: Path=/api/auth/** → auth-service route
   - Filter: RewritePath=/api/(?<segment>.*), /api/${segment}
   - Filter: RequestRateLimiter (Redis-based)
   - NO AuthenticationFilter (auth routes không cần auth)

3. Gateway → Auth-Service: POST /api/auth/login
   Headers: Content-Type: application/json
   Body: { "email": "user@example.com", "password": "password123" }

4. Auth-Service Processing:
   - Validate credentials với PostgreSQL
   - Get user permissions từ User-Service (HTTP call)
   - Cache permissions trong Redis
   - Generate JWT token với claims (permissions, role, features)
   - Generate refresh token

5. Auth-Service → Gateway: 200 OK
   Body: {
     "success": true,
     "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "refreshToken": "refresh_token_string",
     "user": { "id": "user123", "email": "user@example.com", ... }
   }

6. Gateway → Client: 200 OK
   Body: Same as Auth-Service response
```

### Đặc điểm quan trọng:
- **Không cần AuthenticationFilter**: Route `/api/auth/**` không có AuthenticationFilter
- **Rate Limiting**: Áp dụng rate limiting để bảo vệ khỏi brute force attacks
- **Direct Forward**: Gateway chỉ forward request, không xử lý authentication logic

---

## Flow 2: REGISTRATION REQUEST

### Mô tả Flow
Client đăng ký tài khoản mới thông qua gateway.

### Chi tiết Flow

```
1. Client → Gateway: POST /api/auth/register
   Headers: Content-Type: application/json
   Body: { 
     "email": "newuser@example.com", 
     "password": "password123",
     "firstName": "John",
     "lastName": "Doe"
   }

2. Gateway Processing:
   - Route matching: Path=/api/auth/** → auth-service route
   - Filter: RewritePath=/api/(?<segment>.*), /api/${segment}
   - Filter: RequestRateLimiter (Redis-based)
   - NO AuthenticationFilter

3. Gateway → Auth-Service: POST /api/auth/register
   Headers: Content-Type: application/json
   Body: { "email": "newuser@example.com", "password": "password123", ... }

4. Auth-Service Processing:
   - Validate input data
   - Check email uniqueness trong PostgreSQL
   - Create user trong PostgreSQL với ASP.NET Core Identity
   - Generate JWT tokens
   - Publish "UserRegistered" event lên Kafka (async)

5. Kafka Event Processing (Async):
   - User-Service consume "UserRegistered" event
   - Create user profile trong MongoDB với default permissions
   - Set default features: ['basic-dashboard', 'news']

6. Auth-Service → Gateway: 200 OK
   Body: {
     "success": true,
     "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "refreshToken": "refresh_token_string",
     "user": { "id": "newuser123", "email": "newuser@example.com", ... }
   }

7. Gateway → Client: 200 OK
   Body: Same as Auth-Service response
```

### Đặc điểm quan trọng:
- **Event-Driven**: Registration trigger Kafka event để sync data
- **Async Processing**: User profile creation không block response
- **Default Permissions**: New user được assign default permissions và features

---

## Flow 3: REQUEST TỚI SERVICE CON (Protected Resource)

### Mô tả Flow
Client gửi request đến protected resource (user-service, price-service, etc.) với JWT token.

### Chi tiết Flow

```
1. Client → Gateway: GET /api/user/profile
   Headers: 
     Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     Content-Type: application/json

2. Gateway Processing:
   - Route matching: Path=/api/user/** → user-service route
   - Filter: RewritePath=/api/(?<segment>.*), /api/${segment}
   - Filter: AuthenticationFilter (JWT processing)
   - Filter: RequestRateLimiter

3. AuthenticationFilter Processing:
   - Extract JWT token từ Authorization header
   - Validate JWT với secret key
   - Decode claims: userId, email, role, permissions, features
   - Add user context headers:
     X-User-Id: user123
     X-User-Email: user@example.com
     X-User-Role: premium
     X-User-First-Name: John
     X-User-Last-Name: Doe
     X-User-Permissions: premium,advanced-charts
     X-User-Features: ai-predictions,backtest

4. Gateway → User-Service: GET /api/user/profile
   Headers:
     X-User-Id: user123
     X-User-Email: user@example.com
     X-User-Role: premium
     X-User-First-Name: John
     X-User-Last-Name: Doe
     X-User-Permissions: premium,advanced-charts
     X-User-Features: ai-predictions,backtest
     Content-Type: application/json

5. User-Service Processing:
   - Extract user context từ headers (middleware/auth.js)
   - Validate user context
   - Process business logic với user context
   - Query MongoDB với authUserId

6. User-Service → Gateway: 200 OK
   Body: {
     "success": true,
     "user": { "authUserId": "user123", "firstName": "John", ... }
   }

7. Gateway → Client: 200 OK
   Body: Same as User-Service response
```

### Đặc điểm quan trọng:
- **JWT Validation**: Gateway validate JWT locally với secret key
- **Header Injection**: User context được inject vào request headers
- **Service Independence**: Backend services không cần validate JWT
- **Context Passing**: User context được pass qua headers

---

## So sánh 3 Flow

| Aspect | Login Flow | Registration Flow | Protected Resource Flow |
|--------|------------|-------------------|------------------------|
| **Authentication Required** | ❌ No | ❌ No | ✅ Yes (JWT) |
| **AuthenticationFilter** | ❌ Not applied | ❌ Not applied | ✅ Applied |
| **Rate Limiting** | ✅ Applied | ✅ Applied | ✅ Applied |
| **External Service Calls** | Auth-Service → User-Service | Auth-Service → Kafka | None |
| **Response Time** | Medium (có HTTP call) | Medium (có async event) | Fast (local JWT validation) |
| **Error Handling** | Auth validation errors | Registration validation errors | JWT validation errors |

## Kiến trúc Gateway

### Route Configuration
```yaml
# Auth Service Routes (No AuthenticationFilter)
- id: auth-service
  uri: http://auth-service:8087
  predicates:
    - Path=/api/auth/**
  filters:
    - RewritePath=/api/(?<segment>.*), /api/${segment}
    - name: RequestRateLimiter

# Protected Service Routes (With AuthenticationFilter)
- id: user-service
  uri: http://user-service:8088
  predicates:
    - Path=/api/user/**
  filters:
    - RewritePath=/api/(?<segment>.*), /api/${segment}
    - name: AuthenticationFilter
    - name: RequestRateLimiter
```

### AuthenticationFilter Logic
```java
// Extract JWT token
String token = authHeader.substring(7);

// Validate JWT locally
Claims claims = Jwts.parserBuilder()
    .setSigningKey(key)
    .build()
    .parseClaimsJws(token)
    .getBody();

// Extract user context
String userId = claims.get("nameid", String.class);
String email = claims.get("email", String.class);
String role = claims.get("role", String.class);

// Inject headers
var mutated = exchange.getRequest().mutate()
    .header("X-User-Id", userId)
    .header("X-User-Email", email)
    .header("X-User-Role", role)
    .build();
```

## Điểm mạnh của Kiến trúc

1. **Centralized Authentication**: Gateway xử lý authentication một cách tập trung
2. **Performance**: Local JWT validation nhanh hơn HTTP calls
3. **Security**: Rate limiting và JWT validation ở gateway level
4. **Scalability**: Services không cần implement authentication logic
5. **Flexibility**: Dễ dàng thêm/bớt services mà không ảnh hưởng authentication

## Điểm cần cải thiện

1. **JWT Secret Management**: Cần secure secret management
2. **Token Blacklisting**: Chưa implement token blacklist
3. **Monitoring**: Cần comprehensive monitoring cho gateway
4. **Circuit Breaker**: Cần circuit breaker cho service calls
5. **Caching**: Có thể cache JWT validation results

## Kết luận

Gateway đóng vai trò quan trọng trong việc:
- **Authentication**: Xử lý JWT validation và user context extraction
- **Routing**: Định tuyến request đến đúng service
- **Security**: Rate limiting và request filtering
- **Performance**: Local JWT validation giảm latency

Kiến trúc này cung cấp một giải pháp scalable và secure cho microservice authentication và routing.

