const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const { AuthServiceClient } = require('./authServiceClient');
const { publishUserUpdate } = require('../kafkaPublisher');

// Transaction states
const TRANSACTION_STATES = {
  STARTED: 'STARTED',
  AUTH_SERVICE_DELETED: 'AUTH_SERVICE_DELETED',
  USER_SERVICE_DELETED: 'USER_SERVICE_DELETED',
  COMPLETED: 'COMPLETED',
  COMPENSATING: 'COMPENSATING',
  COMPENSATED: 'COMPENSATED',
  FAILED: 'FAILED'
};

// Transaction types
const TRANSACTION_TYPES = {
  DELETE_USER: 'DELETE_USER'
};

class TransactionOrchestrator {
  constructor() {
    this.authClient = new AuthServiceClient();
    this.activeTransactions = new Map(); // In production, use Redis or database
  }

  /**
   * Start delete user distributed transaction
   */
  async deleteUserTransaction(userId, requesterId, reason = 'Deleted by admin') {
    const transactionId = uuidv4();
    const transaction = {
      id: transactionId,
      type: TRANSACTION_TYPES.DELETE_USER,
      state: TRANSACTION_STATES.STARTED,
      startTime: new Date(),
      userId,
      requesterId,
      reason,
      compensationData: {},
      error: null
    };

    this.activeTransactions.set(transactionId, transaction);
    console.log(`Started delete user transaction: ${transactionId} for user: ${userId}`);

    try {
      // Step 1: Get user data for potential rollback
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found in user-service');
      }

      // Store user data for compensation
      transaction.compensationData.userData = user.toObject();
      this.activeTransactions.set(transactionId, transaction);

      // Step 2: Delete from auth-service first (more critical)
      await this.deleteFromAuthService(transactionId);

      // Step 3: Delete from user-service
      await this.deleteFromUserService(transactionId);

      // Step 4: Complete transaction
      await this.completeTransaction(transactionId);

      return {
        success: true,
        transactionId,
        message: 'User deleted successfully',
        user: {
          id: user._id,
          authUserId: user.authUserId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        },
        authServiceResult: transaction.compensationData.authServiceResult
      };

    } catch (error) {
      console.error(`Transaction ${transactionId} failed:`, error);
      await this.compensateTransaction(transactionId, error);
      throw error;
    }
  }

  /**
   * Step 1: Delete user from auth-service
   */
  async deleteFromAuthService(transactionId) {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    try {
      console.log(`Transaction ${transactionId}: Deleting from auth-service`);
      
      if (transaction.compensationData.userData.authUserId) {
        const authResult = await this.authClient.deleteUser(
          transaction.compensationData.userData.authUserId,
          transaction.requesterId,
          transaction.reason
        );

        if (!authResult.success) {
          throw new Error(`Auth service deletion failed: ${authResult.message}`);
        }

        // Store auth service result for response
        transaction.compensationData.authServiceResult = authResult;
        transaction.state = TRANSACTION_STATES.AUTH_SERVICE_DELETED;
        this.activeTransactions.set(transactionId, transaction);

        console.log(`Transaction ${transactionId}: Auth service deletion successful`);
      } else {
        console.log(`Transaction ${transactionId}: No authUserId, skipping auth service deletion`);
        transaction.state = TRANSACTION_STATES.AUTH_SERVICE_DELETED;
        this.activeTransactions.set(transactionId, transaction);
      }

    } catch (error) {
      transaction.error = error.message;
      this.activeTransactions.set(transactionId, transaction);
      throw error;
    }
  }

  /**
   * Step 2: Delete user from user-service
   */
  async deleteFromUserService(transactionId) {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    try {
      console.log(`Transaction ${transactionId}: Deleting from user-service`);
      
      await User.findByIdAndDelete(transaction.userId);
      
      transaction.state = TRANSACTION_STATES.USER_SERVICE_DELETED;
      this.activeTransactions.set(transactionId, transaction);

      console.log(`Transaction ${transactionId}: User service deletion successful`);

    } catch (error) {
      transaction.error = error.message;
      this.activeTransactions.set(transactionId, transaction);
      throw error;
    }
  }

  /**
   * Complete transaction
   */
  async completeTransaction(transactionId) {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    try {
      // Publish user deletion event to Kafka
      await publishUserUpdate({
        eventType: 'USER_DELETED',
        userId: transaction.compensationData.userData.authUserId,
        transactionId: transactionId,
        timestamp: new Date()
      });

      transaction.state = TRANSACTION_STATES.COMPLETED;
      transaction.endTime = new Date();
      this.activeTransactions.set(transactionId, transaction);

      console.log(`Transaction ${transactionId}: Completed successfully`);

      // Cleanup transaction after some time (in production, use TTL)
      setTimeout(() => {
        this.activeTransactions.delete(transactionId);
      }, 300000); // 5 minutes

    } catch (error) {
      console.error(`Transaction ${transactionId}: Error in completion phase:`, error);
      // Don't fail the transaction for non-critical operations like Kafka
      transaction.state = TRANSACTION_STATES.COMPLETED;
      transaction.endTime = new Date();
      this.activeTransactions.set(transactionId, transaction);
    }
  }

  /**
   * Compensate (rollback) transaction when error occurs
   */
  async compensateTransaction(transactionId, error) {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) {
      console.error(`Cannot compensate: Transaction ${transactionId} not found`);
      return;
    }

    transaction.state = TRANSACTION_STATES.COMPENSATING;
    transaction.error = error.message;
    this.activeTransactions.set(transactionId, transaction);

    console.log(`Transaction ${transactionId}: Starting compensation...`);

    try {
      // Compensation logic based on transaction state
      switch (transaction.state) {
        case TRANSACTION_STATES.USER_SERVICE_DELETED:
          // If user-service deletion succeeded but auth-service failed somehow,
          // restore user in user-service
          await this.restoreUserInUserService(transactionId);
          break;

        case TRANSACTION_STATES.AUTH_SERVICE_DELETED:
          // If auth-service deletion succeeded but user-service failed,
          // we need to restore auth-service user (if supported)
          await this.restoreUserInAuthService(transactionId);
          break;

        default:
          console.log(`Transaction ${transactionId}: No compensation needed for state: ${transaction.state}`);
      }

      transaction.state = TRANSACTION_STATES.COMPENSATED;
      this.activeTransactions.set(transactionId, transaction);

      console.log(`Transaction ${transactionId}: Compensation completed`);

    } catch (compensationError) {
      console.error(`Transaction ${transactionId}: Compensation failed:`, compensationError);
      transaction.state = TRANSACTION_STATES.FAILED;
      transaction.compensationError = compensationError.message;
      this.activeTransactions.set(transactionId, transaction);

      // In production, this would trigger manual intervention/alerting
      await this.handleCompensationFailure(transactionId);
    }
  }

  /**
   * Restore user in user-service (compensation action)
   */
  async restoreUserInUserService(transactionId) {
    const transaction = this.activeTransactions.get(transactionId);
    
    try {
      const userData = transaction.compensationData.userData;
      delete userData._id; // Remove MongoDB _id to create new document
      
      const restoredUser = new User(userData);
      await restoredUser.save();
      
      console.log(`Transaction ${transactionId}: User restored in user-service`);
      
    } catch (error) {
      console.error(`Transaction ${transactionId}: Failed to restore user in user-service:`, error);
      throw error;
    }
  }

  /**
   * Restore user in auth-service (compensation action)
   * Note: This would require auth-service to support user restoration
   */
  async restoreUserInAuthService(transactionId) {
    const transaction = this.activeTransactions.get(transactionId);
    
    console.log(`Transaction ${transactionId}: Auth-service restoration not implemented`);
    // In practice, auth-service would need a restore/reactivate endpoint
    // For now, we log this as a manual intervention needed
    
    await this.handleCompensationFailure(transactionId);
  }

  /**
   * Handle compensation failure - would trigger alerts in production
   */
  async handleCompensationFailure(transactionId) {
    const transaction = this.activeTransactions.get(transactionId);
    
    console.error(`CRITICAL: Transaction ${transactionId} compensation failed. Manual intervention required.`);
    console.error('Transaction details:', JSON.stringify(transaction, null, 2));
    
    // In production:
    // 1. Send alert to operations team
    // 2. Create support ticket
    // 3. Log to monitoring system
    // 4. Potentially notify affected user
  }

  /**
   * Get transaction status
   */
  getTransactionStatus(transactionId) {
    return this.activeTransactions.get(transactionId);
  }

  /**
   * Get all active transactions (for monitoring)
   */
  getActiveTransactions() {
    return Array.from(this.activeTransactions.values());
  }
}

module.exports = { 
  TransactionOrchestrator, 
  TRANSACTION_STATES, 
  TRANSACTION_TYPES 
};
