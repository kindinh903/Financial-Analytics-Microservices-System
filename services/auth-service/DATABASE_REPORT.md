# Báo Cáo Cơ Sở Dữ Liệu - Auth Service

## 1. Tổng Quan Thiết Kế Hiện Tại

### 1.1 Kiến Trúc Database
Auth Service sử dụng một kiến trúc database đơn giản với:
- **Database Engine**: PostgreSQL 
- **ORM Framework**: Entity Framework Core 8.0
- **Identity Management**: ASP.NET Core Identity
- **Caching Layer**: Redis (cho caching và session management)

### 1.2 Schema Database

#### A. Bảng Chính (Core Tables)

**1. AspNetUsers (ApplicationUser)**
```sql
-- Bảng người dùng chính kế thừa từ IdentityUser
- Id (text, PK) - Unique identifier
- FirstName (varchar(50)) - Tên
- LastName (varchar(50)) - Họ
- Email (varchar(256)) - Email với index
- UserName (varchar(256)) - Username với unique index
- PasswordHash (text) - Mật khẩu đã hash
- Role (varchar(20)) - Vai trò người dùng
- IsActive (boolean) - Trạng thái hoạt động
- CreatedAt (timestamp) - Thời gian tạo
- LastLogin (timestamp nullable) - Lần đăng nhập cuối
- LoginAttempts (integer) - Số lần thử đăng nhập
- AccountLockoutEnd (timestamp nullable) - Thời gian kết thúc khóa tài khoản
- IsEmailVerified (boolean) - Trạng thái xác thực email
- EmailVerificationToken (varchar(100)) - Token xác thực email
- EmailVerificationExpires (timestamp nullable) - Hết hạn token xác thực
- PasswordResetToken (varchar(100)) - Token reset mật khẩu
- PasswordResetExpires (timestamp nullable) - Hết hạn token reset
```

**2. RefreshTokens**
```sql
-- Bảng lưu trữ refresh tokens
- Id (integer, PK, Auto-increment) - ID duy nhất
- Token (varchar(512)) - Refresh token
- UserId (text, FK -> AspNetUsers.Id) - User liên kết
- ExpiresAt (timestamp) - Thời gian hết hạn
- IsRevoked (boolean) - Trạng thái thu hồi
- CreatedAt (timestamp) - Thời gian tạo
```

#### B. Bảng Identity Framework (Được tự động tạo)

**3. AspNetRoles** - Quản lý vai trò
**4. AspNetUserRoles** - Ánh xạ user-role
**5. AspNetUserClaims** - Claims của user
**6. AspNetRoleClaims** - Claims của role
**7. AspNetUserLogins** - Thông tin đăng nhập external
**8. AspNetUserTokens** - Tokens của user

### 1.3 Relationships và Constraints

```
ApplicationUser (1) -----> (N) RefreshTokens
- One-to-Many relationship
- Cascade delete enabled
- Foreign key: RefreshTokens.UserId -> AspNetUsers.Id
```

### 1.4 Indexing Strategy Hiện Tại

```sql
-- Indexes tự động được tạo bởi ASP.NET Identity:
1. EmailIndex (AspNetUsers.NormalizedEmail)
2. UserNameIndex (AspNetUsers.NormalizedUserName) - UNIQUE
3. RoleNameIndex (AspNetRoles.NormalizedName) - UNIQUE
4. FK_RefreshTokens_UserId (RefreshTokens.UserId)
```

## 2. Trade-offs Của Thiết Kế Hiện Tại

### 2.1 Ưu Điểm

**A. Tính Đơn Giản**
- Schema rõ ràng, dễ hiểu và maintain
- Sử dụng ASP.NET Identity framework đã được test kỹ
- Setup nhanh chóng với Entity Framework Code-First

**B. Tính Nhất Quán**
- ACID compliance với PostgreSQL
- Strong consistency cho authentication data
- Transactional integrity đảm bảo data consistency

**C. Bảo Mật**
- Password hashing với ASP.NET Identity
- Token-based authentication với JWT + Refresh tokens
- Built-in protection against common vulnerabilities

**D. Tích Hợp Tốt**
- Seamless integration với ASP.NET Core ecosystem
- Built-in support cho roles, claims, external logins
- Easy testing và development

### 2.2 Nhược Điểm

**A. Khả Năng Mở Rộng (Scalability)**
- Single database instance - không horizontal scale
- Bottleneck khi user base tăng lên
- Không hỗ trợ multi-region deployment

**B. Hiệu Suất**
- Tất cả operations đều hit primary database
- Không có read replicas cho read-heavy operations
- Limited caching strategy (chỉ có Redis cho session)

**C. Availability**
- Single point of failure
- Downtime khi database maintenance
- Không có failover mechanism

**D. Data Locality**
- Tất cả user data ở một nơi
- Latency issues cho global users
- Compliance challenges với data residency requirements

## 3. Chiến Lược Mở Rộng Cơ Sở Dữ Liệu

### 3.1 Database Sharding

#### A. Horizontal Sharding Strategy

**Sharding Key Selection:**
```sql
-- Option 1: User ID based sharding
Shard = hash(user_id) % number_of_shards

-- Option 2: Geographic sharding
Shard = user_region (US, EU, ASIA)

-- Option 3: Tenant-based sharding (for B2B)
Shard = organization_id
```

**Implementation Plan:**
```csharp
// Shard Router Service
public class DatabaseShardRouter
{
    public string GetShardConnectionString(string userId)
    {
        var shardId = CalculateShardId(userId);
        return _connectionStrings[shardId];
    }
    
    private int CalculateShardId(string userId)
    {
        return Math.Abs(userId.GetHashCode()) % _totalShards;
    }
}

// Modified DbContext
public class ShardedApplicationDbContext : ApplicationDbContext
{
    public ShardedApplicationDbContext(string connectionString) 
        : base(GetOptions(connectionString))
    {
    }
}
```

**Benefits:**
- Linear scalability với số lượng users
- Improved performance do reduced dataset per shard
- Better isolation giữa các user groups

**Challenges:**
- Cross-shard queries complexity
- Rebalancing khi thêm/bớt shards
- Distributed transaction management

#### B. Vertical Sharding

```sql
-- Auth Core Shard (Hot data)
Users_Core: Id, Email, PasswordHash, Role, IsActive

-- Profile Shard (Warm data)  
Users_Profile: UserId, FirstName, LastName, CreatedAt, LastLogin

-- Security Shard (Cold data)
Users_Security: UserId, LoginAttempts, EmailVerificationToken, PasswordResetToken
```

### 3.2 Database Replication

#### A. Master-Slave Replication

**Architecture:**
```
Write Operations    Read Operations
      ↓                    ↓
[Master DB] -----> [Read Replica 1]
     ↓              [Read Replica 2]
[Binlog] -----> [Read Replica 3]
```

**Implementation:**
```csharp
public class ReplicationDbContextFactory
{
    public ApplicationDbContext CreateWriteContext()
    {
        return new ApplicationDbContext(_masterConnectionString);
    }
    
    public ApplicationDbContext CreateReadContext()
    {
        var replica = _loadBalancer.GetNextReplica();
        return new ApplicationDbContext(replica.ConnectionString);
    }
}

// Service Layer
public class AuthService
{
    public async Task<User> GetUserAsync(string id)
    {
        using var context = _dbFactory.CreateReadContext();
        return await context.Users.FindAsync(id);
    }
    
    public async Task UpdateUserAsync(User user)
    {
        using var context = _dbFactory.CreateWriteContext();
        context.Users.Update(user);
        await context.SaveChangesAsync();
    }
}
```

#### B. Multi-Master Replication

**For Global Distribution:**
```
[US Master] <---> [EU Master] <---> [ASIA Master]
     ↓                ↓                 ↓
[US Replicas]    [EU Replicas]    [ASIA Replicas]
```

**Conflict Resolution Strategy:**
```csharp
public class ConflictResolutionService
{
    public User ResolveConflict(User local, User remote)
    {
        // Last-write-wins với timestamp
        return local.UpdatedAt > remote.UpdatedAt ? local : remote;
    }
}
```

### 3.3 Read Replicas Strategy

#### A. Read Replica Configuration

**PostgreSQL Streaming Replication:**
```bash
# Primary server postgresql.conf
wal_level = replica
max_wal_senders = 3
wal_keep_segments = 32

# Replica server recovery.conf
standby_mode = 'on'
primary_conninfo = 'host=primary_host port=5432 user=replicator'
```

**Application Layer Load Balancing:**
```csharp
public class ReadReplicaLoadBalancer
{
    private readonly List<string> _replicaConnections;
    private int _currentIndex = 0;
    
    public string GetNextReplica()
    {
        var replica = _replicaConnections[_currentIndex];
        _currentIndex = (_currentIndex + 1) % _replicaConnections.Count;
        return replica;
    }
}
```

#### B. CQRS Pattern Implementation

```csharp
// Command Side (Write)
public class CreateUserCommand
{
    public string Email { get; set; }
    public string Password { get; set; }
}

public class CreateUserCommandHandler
{
    public async Task<string> Handle(CreateUserCommand command)
    {
        using var writeContext = _dbFactory.CreateWriteContext();
        var user = new ApplicationUser { Email = command.Email };
        writeContext.Users.Add(user);
        await writeContext.SaveChangesAsync();
        return user.Id;
    }
}

// Query Side (Read)
public class GetUserQuery
{
    public string UserId { get; set; }
}

public class GetUserQueryHandler
{
    public async Task<UserDto> Handle(GetUserQuery query)
    {
        using var readContext = _dbFactory.CreateReadContext();
        return await readContext.Users
            .Where(u => u.Id == query.UserId)
            .Select(u => new UserDto { ... })
            .FirstOrDefaultAsync();
    }
}
```

## 4. Kỹ Thuật Tối Ưu Hóa

### 4.1 Advanced Indexing Strategies

#### A. Composite Indexes

```sql
-- Optimized indexes cho auth service
CREATE INDEX IX_Users_Email_Active ON AspNetUsers(Email, IsActive) 
WHERE IsActive = true;

CREATE INDEX IX_Users_Role_Created ON AspNetUsers(Role, CreatedAt);

CREATE INDEX IX_RefreshTokens_UserId_Expiry ON RefreshTokens(UserId, ExpiresAt)
WHERE IsRevoked = false;

-- Partial indexes cho performance
CREATE INDEX IX_Users_LoginAttempts ON AspNetUsers(LoginAttempts)
WHERE LoginAttempts > 0;

CREATE INDEX IX_Users_PasswordReset ON AspNetUsers(PasswordResetToken, PasswordResetExpires)
WHERE PasswordResetToken IS NOT NULL;
```

#### B. Full-Text Search Indexes

```sql
-- Cho user search functionality
CREATE INDEX IX_Users_Fulltext ON AspNetUsers 
USING gin(to_tsvector('english', FirstName || ' ' || LastName || ' ' || Email));

-- Usage
SELECT * FROM AspNetUsers 
WHERE to_tsvector('english', FirstName || ' ' || LastName || ' ' || Email) 
@@ to_tsquery('english', 'john & doe');
```

#### C. Expression Indexes

```sql
-- Optimized cho case-insensitive searches
CREATE INDEX IX_Users_Email_Lower ON AspNetUsers(LOWER(Email));
CREATE INDEX IX_Users_Username_Lower ON AspNetUsers(LOWER(UserName));
```

### 4.2 Database Partitioning

#### A. Table Partitioning by Time

```sql
-- Partition RefreshTokens table by creation date
CREATE TABLE RefreshTokens_Y2025M01 PARTITION OF RefreshTokens
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE RefreshTokens_Y2025M02 PARTITION OF RefreshTokens
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Auto-create partitions
CREATE OR REPLACE FUNCTION create_monthly_partitions()
RETURNS void AS $$
DECLARE
    start_date date;
    end_date date;
BEGIN
    start_date := date_trunc('month', CURRENT_DATE);
    end_date := start_date + interval '1 month';
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS RefreshTokens_%s PARTITION OF RefreshTokens
                   FOR VALUES FROM (%L) TO (%L)',
                   to_char(start_date, 'YYYY_MM'),
                   start_date,
                   end_date);
END;
$$ LANGUAGE plpgsql;
```

#### B. Hash Partitioning for Users

```sql
-- Partition users table by hash
CREATE TABLE AspNetUsers_Part0 PARTITION OF AspNetUsers
FOR VALUES WITH (modulus 4, remainder 0);

CREATE TABLE AspNetUsers_Part1 PARTITION OF AspNetUsers
FOR VALUES WITH (modulus 4, remainder 1);

CREATE TABLE AspNetUsers_Part2 PARTITION OF AspNetUsers
FOR VALUES WITH (modulus 4, remainder 2);

CREATE TABLE AspNetUsers_Part3 PARTITION OF AspNetUsers
FOR VALUES WITH (modulus 4, remainder 3);
```

### 4.3 Advanced Caching Strategies

#### A. Multi-Level Caching

```csharp
public class MultiLevelCacheService
{
    private readonly IMemoryCache _l1Cache;     // Application cache
    private readonly RedisCacheService _l2Cache; // Distributed cache
    private readonly ApplicationDbContext _database; // Database
    
    public async Task<T> GetAsync<T>(string key)
    {
        // L1 Cache (Memory)
        if (_l1Cache.TryGetValue(key, out T cachedValue))
            return cachedValue;
            
        // L2 Cache (Redis)
        var distributedValue = await _l2Cache.GetAsync<T>(key);
        if (distributedValue != null)
        {
            _l1Cache.Set(key, distributedValue, TimeSpan.FromMinutes(5));
            return distributedValue;
        }
        
        // Database
        var dbValue = await LoadFromDatabase<T>(key);
        if (dbValue != null)
        {
            await _l2Cache.SetAsync(key, dbValue, 1800); // 30 minutes
            _l1Cache.Set(key, dbValue, TimeSpan.FromMinutes(5));
        }
        
        return dbValue;
    }
}
```

#### B. Cache-Aside Pattern với Invalidation

```csharp
public class CachedUserService
{
    private readonly IUserRepository _userRepository;
    private readonly ICacheService _cache;
    
    public async Task<User> GetUserAsync(string userId)
    {
        var cacheKey = $"user:{userId}";
        
        var user = await _cache.GetAsync<User>(cacheKey);
        if (user == null)
        {
            user = await _userRepository.GetByIdAsync(userId);
            if (user != null)
            {
                await _cache.SetAsync(cacheKey, user, TimeSpan.FromMinutes(30));
            }
        }
        
        return user;
    }
    
    public async Task UpdateUserAsync(User user)
    {
        await _userRepository.UpdateAsync(user);
        
        // Invalidate cache
        var cacheKey = $"user:{user.Id}";
        await _cache.RemoveAsync(cacheKey);
        
        // Optional: Warm cache
        await _cache.SetAsync(cacheKey, user, TimeSpan.FromMinutes(30));
    }
}
```

#### C. Write-Through Caching

```csharp
public class WriteThroughUserService
{
    public async Task CreateUserAsync(User user)
    {
        // Write to database
        await _userRepository.CreateAsync(user);
        
        // Write to cache immediately
        var cacheKey = $"user:{user.Id}";
        await _cache.SetAsync(cacheKey, user, TimeSpan.FromHours(1));
        
        // Warm related caches
        await _cache.SetAsync($"user:email:{user.Email}", user.Id, TimeSpan.FromHours(1));
    }
}
```

### 4.4 Query Optimization

#### A. Query Batching

```csharp
public class BatchedUserService
{
    public async Task<List<User>> GetUsersByIdsAsync(List<string> userIds)
    {
        // Batch database query
        return await _context.Users
            .Where(u => userIds.Contains(u.Id))
            .ToListAsync();
    }
    
    public async Task<Dictionary<string, User>> GetUsersDictionaryAsync(List<string> userIds)
    {
        var users = await GetUsersByIdsAsync(userIds);
        return users.ToDictionary(u => u.Id);
    }
}
```

#### B. Projection và Minimal Queries

```csharp
public class OptimizedUserQueries
{
    // Instead of loading full user object
    public async Task<UserSummaryDto> GetUserSummaryAsync(string userId)
    {
        return await _context.Users
            .Where(u => u.Id == userId)
            .Select(u => new UserSummaryDto
            {
                Id = u.Id,
                FullName = u.FirstName + " " + u.LastName,
                Email = u.Email,
                Role = u.Role
            })
            .FirstOrDefaultAsync();
    }
    
    // Aggregation queries
    public async Task<UserStatsDto> GetUserStatsAsync()
    {
        return await _context.Users
            .GroupBy(u => u.Role)
            .Select(g => new UserStatsDto
            {
                Role = g.Key,
                Count = g.Count(),
                ActiveCount = g.Count(u => u.IsActive)
            })
            .ToListAsync();
    }
}
```

## 5. Monitoring và Metrics

### 5.1 Database Performance Monitoring

```sql
-- Query performance monitoring
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements
WHERE query LIKE '%AspNetUsers%'
ORDER BY total_time DESC;

-- Index usage monitoring
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public';

-- Connection monitoring
SELECT datname, numbackends, xact_commit, xact_rollback, blks_read, blks_hit
FROM pg_stat_database;
```

### 5.2 Application Metrics

```csharp
public class DatabaseMetricsService
{
    private readonly ILogger<DatabaseMetricsService> _logger;
    private readonly IMetrics _metrics;
    
    public async Task<T> ExecuteWithMetrics<T>(Func<Task<T>> operation, string operationName)
    {
        var stopwatch = Stopwatch.StartNew();
        try
        {
            var result = await operation();
            _metrics.Increment($"database.{operationName}.success");
            _metrics.Timer($"database.{operationName}.duration", stopwatch.ElapsedMilliseconds);
            return result;
        }
        catch (Exception ex)
        {
            _metrics.Increment($"database.{operationName}.error");
            _logger.LogError(ex, "Database operation failed: {Operation}", operationName);
            throw;
        }
    }
}
```

## 6. Kết Luận và Khuyến Nghị

### 6.1 Roadmap Triển Khai

**Phase 1: Immediate Optimizations (1-2 months)**
- Implement Redis caching layer
- Add database indexes
- Query optimization
- Connection pooling

**Phase 2: Read Scalability (3-4 months)**  
- Setup read replicas
- Implement CQRS pattern
- Advanced caching strategies

**Phase 3: Write Scalability (6-12 months)**
- Database sharding implementation
- Multi-master replication
- Geographic distribution

**Phase 4: Advanced Features (12+ months)**
- Auto-scaling mechanisms
- AI-powered query optimization
- Real-time analytics

### 6.2 Key Considerations

1. **Performance vs Complexity**: Cân bằng giữa hiệu suất và độ phức tạp của hệ thống
2. **Consistency vs Availability**: Trade-off giữa strong consistency và high availability
3. **Cost vs Scalability**: Optimization chi phí infrastructure khi scale
4. **Security vs Performance**: Đảm bảo security không ảnh hưởng quá nhiều đến performance

### 6.3 Success Metrics

- **Latency**: < 100ms cho 95% authentication requests
- **Throughput**: > 10,000 concurrent authentications
- **Availability**: 99.9% uptime
- **Scalability**: Support > 1M users với linear cost scaling
