// gRPC Client configuration for user-service to call auth-service
// This file can be used as reference for user-service implementation

// 1. Add to user-service package.json (if using Node.js):
// "@grpc/grpc-js": "^1.9.0",
// "@grpc/proto-loader": "^0.7.0"

// 2. Copy authservice.proto to user-service/protos/authservice.proto

// 3. Example Node.js gRPC client:
/*
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../protos/authservice.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const authProto = grpc.loadPackageDefinition(packageDefinition).authservice;

class AuthServiceClient {
  constructor() {
    this.client = new authProto.AuthService(
      process.env.AUTH_SERVICE_GRPC_URL || 'auth-service:5001',
      grpc.credentials.createInsecure()
    );
  }

  async deleteUser(userId, requesterId, reason = 'Deleted by admin') {
    return new Promise((resolve, reject) => {
      this.client.deleteUser({
        user_id: userId,
        requester_id: requesterId,
        reason: reason
      }, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  async invalidateUserSessions(userId, requesterId) {
    return new Promise((resolve, reject) => {
      this.client.invalidateUserSessions({
        user_id: userId,
        requester_id: requesterId
      }, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  async getUserInfo(userId) {
    return new Promise((resolve, reject) => {
      this.client.getUserInfo({
        user_id: userId
      }, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }
}

module.exports = { AuthServiceClient };
*/

// 4. Usage in user-service routes:
/*
const { AuthServiceClient } = require('../services/authServiceClient');
const authClient = new AuthServiceClient();

// In delete user route:
router.delete('/admin/users/:id', requireRole(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    // Call auth-service to delete user account and tokens via gRPC
    const authResponse = await authClient.deleteUser(
      user.authUserId,
      req.user.authUserId,
      'Deleted by admin via user-service'
    );

    if (!authResponse.success) {
      console.error('Failed to delete user from auth-service:', authResponse.message);
      // Continue with user-service deletion even if auth-service fails
    } else {
      console.log(`Successfully deleted user from auth-service. Tokens deleted: ${authResponse.deleted_tokens_count}`);
    }

    // Delete user from user-service database
    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully',
      auth_service_response: authResponse
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      message: error.message
    });
  }
});
*/
