const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../protos/authservice.proto');

let authProto = null;
let packageDefinition = null;

try {
  packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
  authProto = grpc.loadPackageDefinition(packageDefinition).authservice;
} catch (error) {
  console.error('Error loading proto file:', error);
}

class AuthServiceClient {
  constructor() {
    if (!authProto) {
      console.error('AuthService proto not loaded. gRPC calls will fail.');
      return;
    }
    
    const grpcUrl = process.env.AUTH_SERVICE_GRPC_URL || 'auth-service:5087';
    console.log(`Connecting to auth-service gRPC at: ${grpcUrl}`);
    
    this.client = new authProto.AuthService(
      grpcUrl,
      grpc.credentials.createInsecure()
    );
  }

  async deleteUser(userId, requesterId, reason = 'Deleted by admin') {
    if (!this.client) {
      throw new Error('gRPC client not initialized');
    }

    return new Promise((resolve, reject) => {
      console.log(`Calling gRPC deleteUser for userId: ${userId}`);
      
      this.client.deleteUser({
        user_id: userId,
        requester_id: requesterId,
        reason: reason
      }, (error, response) => {
        if (error) {
          console.error('gRPC deleteUser error:', error);
          reject(error);
        } else {
          console.log('gRPC deleteUser response:', response);
          resolve(response);
        }
      });
    });
  }

  async invalidateUserSessions(userId, requesterId) {
    if (!this.client) {
      throw new Error('gRPC client not initialized');
    }

    return new Promise((resolve, reject) => {
      console.log(`Calling gRPC invalidateUserSessions for userId: ${userId}`);
      
      this.client.invalidateUserSessions({
        user_id: userId,
        requester_id: requesterId
      }, (error, response) => {
        if (error) {
          console.error('gRPC invalidateUserSessions error:', error);
          reject(error);
        } else {
          console.log('gRPC invalidateUserSessions response:', response);
          resolve(response);
        }
      });
    });
  }

  async getUserInfo(userId) {
    if (!this.client) {
      throw new Error('gRPC client not initialized');
    }

    return new Promise((resolve, reject) => {
      console.log(`Calling gRPC getUserInfo for userId: ${userId}`);
      
      this.client.getUserInfo({
        user_id: userId
      }, (error, response) => {
        if (error) {
          console.error('gRPC getUserInfo error:', error);
          reject(error);
        } else {
          console.log('gRPC getUserInfo response:', response);
          resolve(response);
        }
      });
    });
  }
}

module.exports = { AuthServiceClient };
