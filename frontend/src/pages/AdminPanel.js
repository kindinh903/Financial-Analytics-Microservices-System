import React, { useEffect, useState } from 'react';
import { 
  Layout, 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Switch, 
  Tag, 
  Space, 
  Statistic, 
  Row, 
  Col, 
  Tabs, 
  message, 
  Popconfirm,
  DatePicker,
  Badge,
  Tooltip,
  Divider
} from 'antd';
import {
  UserOutlined,
  SettingOutlined,
  BarChartOutlined,
  TeamOutlined,
  DollarOutlined,
  BellOutlined,
  SecurityScanOutlined,
  DatabaseOutlined,
  ApiOutlined,
  FileTextOutlined,
  CrownOutlined,
  LockOutlined,
  UnlockOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  ExportOutlined,
  ImportOutlined
} from '@ant-design/icons';
import { userService } from '../services/api';
import moment from 'moment';

const { Header, Content, Sider } = Layout;
const { Option } = Select;
const { TextArea } = Input;
const { Search } = Input;

const AdminPanel = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('view'); // view, edit, create
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    pages: 0
  });
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    premiumUsers: 0,
    adminUsers: 0
  });

  useEffect(() => {
    console.log('Initial useEffect - fetching users and stats');
    fetchUsers();
    fetchStats();
  }, []);

  // Remove the problematic useEffect that causes loops
  // useEffect(() => {
  //   console.log('Pagination/Search useEffect triggered:', {
  //     paginationCurrent: pagination.current,
  //     paginationPageSize: pagination.pageSize,
  //     searchText: searchText
  //   });
    
  //   if (pagination.current > 0) { // Only fetch if pagination is initialized
  //     console.log('Calling fetchUsers from useEffect');
  //     fetchUsers();
  //   }
  // }, [pagination.current, pagination.pageSize, searchText]);

  useEffect(() => {
    console.log('Users changed, filtering users. Users count:', users.length);
    filterUsers();
  }, [users]);

  const fetchUsers = async (customParams = {}) => {
    console.log('=== fetchUsers START ===');
    console.log('Current pagination state:', pagination);
    console.log('Custom params received:', customParams);
    console.log('Current searchText:', searchText);
    
    setLoading(true);
    try {
      // Pass pagination parameters to the API
      const params = {
        page: customParams.page || pagination.current,
        limit: customParams.limit || pagination.pageSize,
        search: customParams.search !== undefined ? customParams.search : searchText,
        ...customParams
      };
      
      console.log('Final API params to be sent:', params);
      
      const response = await userService.getAllUsers(params);
      console.log('API response received:', response.data);
      
      if (response.data.success) {
        console.log('Setting users. Count:', response.data.users.length);
        setUsers(response.data.users);
        
        // Update pagination state with server response
        if (response.data.pagination) {
          console.log('Updating pagination state with server response:', response.data.pagination);
          console.log('Previous pagination state:', pagination);
          
          setPagination(prev => {
            const newPagination = {
              ...prev,
              current: response.data.pagination.current,
              total: response.data.pagination.total,
              pages: response.data.pagination.pages
            };
            console.log('New pagination state will be:', newPagination);
            return newPagination;
          });
        } else {
          console.log('No pagination data in response');
        }
      } else {
        console.log('API response not successful:', response.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      message.error('Failed to fetch users');
    }
    setLoading(false);
    console.log('=== fetchUsers END ===');
  };

  const fetchStats = async () => {
    try {
      // This would be an admin endpoint to get statistics
      const response = await userService.getAdminStats();
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const filterUsers = () => {
    console.log('=== filterUsers START ===');
    console.log('Users to filter:', users.length);
    console.log('Search text:', searchText);
    
    // When using server-side pagination, we don't filter on client side
    // The filtering is handled by the search parameter sent to the server
    setFilteredUsers(users);
    console.log('Filtered users set to:', users.length);
    console.log('=== filterUsers END ===');
  };

  const handleUserAction = (action, user) => {
    setSelectedUser(user);
    setModalType(action);
    setModalVisible(true);
    
    if (action === 'edit') {
      form.setFieldsValue({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        permissions: user.permissions || [],
        features: user.features || [],
        subscription: user.subscription?.plan || 'free'
      });
    }
  };

  const handleModalOk = async () => {
    if (modalType === 'view') {
      setModalVisible(false);
      return;
    }

    try {
      const values = await form.validateFields();
      
      if (modalType === 'edit') {
        const response = await userService.updateUser(selectedUser._id, values);
        if (response.data.success) {
          message.success('User updated successfully');
          fetchUsers();
          setModalVisible(false);
        }
      } else if (modalType === 'create') {
        const response = await userService.createUser(values);
        if (response.data.success) {
          message.success('User created successfully');
          fetchUsers();
          setModalVisible(false);
        }
      }
    } catch (error) {
      console.error('Error saving user:', error);
      message.error('Failed to save user');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const response = await userService.deleteUser(userId);
      if (response.data.success) {
        message.success('User deleted successfully');
        fetchUsers(); // Refetch current page
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      message.error('Failed to delete user');
    }
  };

  const handleToggleUserStatus = async (user) => {
    try {
      const response = await userService.updateUser(user._id, { 
        isActive: !user.isActive 
      });
      if (response.data.success) {
        message.success(`User ${user.isActive ? 'deactivated' : 'activated'} successfully`);
        fetchUsers(); // Refetch current page
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      message.error('Failed to update user status');
    }
  };

  const handleTableChange = (paginationInfo) => {
    console.log('=== handleTableChange START ===');
    console.log('paginationInfo received:', paginationInfo);
    console.log('Current pagination state before change:', pagination);
    
    // Fetch users with new pagination immediately - don't update state first
    const fetchParams = {
      page: paginationInfo.current,
      limit: paginationInfo.pageSize
    };
    console.log('Calling fetchUsers with params:', fetchParams);
    fetchUsers(fetchParams);
    console.log('=== handleTableChange END ===');
  };

  const handleSearch = (value) => {
    console.log('=== handleSearch START ===');
    console.log('Search value:', value);
    console.log('Current pagination before search:', pagination);
    
    setSearchText(value);
    
    // Fetch with search params immediately - don't update pagination state first
    const fetchParams = {
      page: 1,
      limit: pagination.pageSize,
      search: value
    };
    console.log('Calling fetchUsers with search params:', fetchParams);
    fetchUsers(fetchParams);
    console.log('=== handleSearch END ===');
  };

  const getRoleColor = (role) => {
    const colors = {
      user: 'default',
      premium: 'gold',
      admin: 'red'
    };
    return colors[role] || 'default';
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'green' : 'red';
  };

  const userColumns = [
    {
      title: 'User',
      key: 'user',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.firstName} {record.lastName}</div>
          <div className="text-gray-500 text-sm">{record.email}</div>
        </div>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={getRoleColor(role)} icon={role === 'admin' ? <CrownOutlined /> : <UserOutlined />}>
          {role?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Badge 
          status={isActive ? 'success' : 'error'} 
          text={isActive ? 'Active' : 'Inactive'} 
        />
      ),
    },
    {
      title: 'Subscription',
      key: 'subscription',
      render: (_, record) => (
        <Tag color={record.subscription?.plan === 'premium' ? 'gold' : 'default'}>
          {record.subscription?.plan?.toUpperCase() || 'FREE'}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => moment(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Last Login',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      render: (date) => date ? moment(date).format('DD/MM/YYYY HH:mm') : 'Never',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button 
              icon={<UserOutlined />} 
              size="small" 
              onClick={() => handleUserAction('view', record)}
            />
          </Tooltip>
          <Tooltip title="Edit User">
            <Button 
              icon={<EditOutlined />} 
              size="small" 
              onClick={() => handleUserAction('edit', record)}
            />
          </Tooltip>
          <Tooltip title={record.isActive ? 'Deactivate' : 'Activate'}>
            <Button 
              icon={record.isActive ? <LockOutlined /> : <UnlockOutlined />} 
              size="small" 
              onClick={() => handleToggleUserStatus(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this user?"
            onConfirm={() => handleDeleteUser(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete User">
              <Button 
                icon={<DeleteOutlined />} 
                size="small" 
                danger
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'users',
      label: (
        <span>
          <TeamOutlined />
          User Management
        </span>
      ),
      children: (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <Search
              placeholder="Search users..."
              value={searchText}
              onChange={(e) => {
                if (e.target.value === '') {
                  // If search is cleared, fetch all users
                  handleSearch('');
                }
              }}
              onSearch={handleSearch}
              style={{ width: 300 }}
              allowClear
              onClear={() => handleSearch('')}
            />
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchUsers}
                loading={loading}
              >
                Refresh
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => handleUserAction('create', null)}
              >
                Add User
              </Button>
            </Space>
          </div>
          
          <Table
            columns={userColumns}
            dataSource={filteredUsers}
            rowKey="_id"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} users`,
              pageSizeOptions: ['10', '20', '50', '100'],
              onShowSizeChange: (current, size) => {
                console.log('=== onShowSizeChange ===');
                console.log('Page size change - current:', current, 'size:', size);
                handleTableChange({
                  current: 1,
                  pageSize: size
                });
              }
            }}
            onChange={handleTableChange}
          />
        </div>
      ),
    },
    {
      key: 'analytics',
      label: (
        <span>
          <BarChartOutlined />
          Analytics
        </span>
      ),
      children: (
        <div>
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Total Users"
                  value={stats.totalUsers}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Active Users"
                  value={stats.activeUsers}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Premium Users"
                  value={stats.premiumUsers}
                  prefix={<CrownOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Admin Users"
                  value={stats.adminUsers}
                  prefix={<SettingOutlined />}
                  valueStyle={{ color: '#f5222d' }}
                />
              </Card>
            </Col>
          </Row>
          
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="User Growth" extra={<Button icon={<ExportOutlined />}>Export</Button>}>
                <div className="text-center text-gray-500 py-8">
                  <BarChartOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                  <p>Chart will be implemented here</p>
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Subscription Distribution" extra={<Button icon={<ExportOutlined />}>Export</Button>}>
                <div className="text-center text-gray-500 py-8">
                  <DollarOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                  <p>Chart will be implemented here</p>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'system',
      label: (
        <span>
          <SettingOutlined />
          System Settings
        </span>
      ),
      children: (
        <div>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="Application Settings">
                <Form layout="vertical">
                  <Form.Item label="Maintenance Mode">
                    <Switch />
                  </Form.Item>
                  <Form.Item label="Registration Enabled">
                    <Switch defaultChecked />
                  </Form.Item>
                  <Form.Item label="Email Verification Required">
                    <Switch defaultChecked />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary">Save Settings</Button>
                  </Form.Item>
                </Form>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Security Settings">
                <Form layout="vertical">
                  <Form.Item label="Password Policy">
                    <Select defaultValue="medium">
                      <Option value="weak">Weak (6+ chars)</Option>
                      <Option value="medium">Medium (8+ chars, mixed case)</Option>
                      <Option value="strong">Strong (12+ chars, special chars)</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item label="Session Timeout (minutes)">
                    <Input type="number" defaultValue="30" />
                  </Form.Item>
                  <Form.Item label="Max Login Attempts">
                    <Input type="number" defaultValue="5" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary">Save Settings</Button>
                  </Form.Item>
                </Form>
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <SettingOutlined className="mr-3" />
            Admin Panel
          </h1>
          <p className="text-gray-600">Manage users, system settings, and analytics</p>
        </div>
        
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
          className="bg-white rounded-lg shadow-sm"
        />

        <Modal
          title={
            modalType === 'view' ? 'User Details' :
            modalType === 'edit' ? 'Edit User' :
            'Create New User'
          }
          open={modalVisible}
          onOk={handleModalOk}
          onCancel={() => setModalVisible(false)}
          width={600}
          okText={modalType === 'view' ? 'Close' : 'Save'}
          cancelText="Cancel"
        >
          {modalType === 'view' ? (
            <div>
              {selectedUser && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                      <UserOutlined className="text-2xl text-gray-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </h3>
                      <p className="text-gray-500">{selectedUser.email}</p>
                    </div>
                  </div>
                  
                  <Divider />
                  
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <div>
                        <label className="text-sm text-gray-500">Role</label>
                        <div>
                          <Tag color={getRoleColor(selectedUser.role)}>
                            {selectedUser.role?.toUpperCase()}
                          </Tag>
                        </div>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div>
                        <label className="text-sm text-gray-500">Status</label>
                        <div>
                          <Badge 
                            status={selectedUser.isActive ? 'success' : 'error'} 
                            text={selectedUser.isActive ? 'Active' : 'Inactive'} 
                          />
                        </div>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div>
                        <label className="text-sm text-gray-500">Subscription</label>
                        <div>
                          <Tag color={selectedUser.subscription?.plan === 'premium' ? 'gold' : 'default'}>
                            {selectedUser.subscription?.plan?.toUpperCase() || 'FREE'}
                          </Tag>
                        </div>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div>
                        <label className="text-sm text-gray-500">Created</label>
                        <div>{moment(selectedUser.createdAt).format('DD/MM/YYYY HH:mm')}</div>
                      </div>
                    </Col>
                  </Row>
                  
                  {selectedUser.permissions && selectedUser.permissions.length > 0 && (
                    <div>
                      <label className="text-sm text-gray-500">Permissions</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedUser.permissions.map((permission, index) => (
                          <Tag key={index} size="small">{permission}</Tag>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedUser.features && selectedUser.features.length > 0 && (
                    <div>
                      <label className="text-sm text-gray-500">Features</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedUser.features.map((feature, index) => (
                          <Tag key={index} size="small" color="blue">{feature}</Tag>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item 
                    label="First Name" 
                    name="firstName"
                    rules={[{ required: true, message: 'Please enter first name' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item 
                    label="Last Name" 
                    name="lastName"
                    rules={[{ required: true, message: 'Please enter last name' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              
              <Form.Item 
                label="Email" 
                name="email"
                rules={[
                  { required: true, message: 'Please enter email' },
                  { type: 'email', message: 'Please enter valid email' }
                ]}
              >
                <Input />
              </Form.Item>
              
              <Form.Item 
                label="Role" 
                name="role"
                rules={[{ required: true, message: 'Please select role' }]}
              >
                <Select>
                  <Option value="user">User</Option>
                  <Option value="premium">Premium</Option>
                  <Option value="admin">Admin</Option>
                </Select>
              </Form.Item>
              
              <Form.Item 
                label="Permissions" 
                name="permissions"
                tooltip="Select user permissions"
              >
                <Select
                  mode="multiple"
                  placeholder="Select permissions"
                  allowClear
                >
                  <Option value="free">Free</Option>
                  <Option value="basic">Basic</Option>
                  <Option value="premium">Premium</Option>
                  <Option value="advanced">Advanced</Option>
                  <Option value="admin">Admin</Option>
                  <Option value="super-admin">Super Admin</Option>
                </Select>
              </Form.Item>
              
              <Form.Item 
                label="Features" 
                name="features"
                tooltip="Select available features for user"
              >
                <Select
                  mode="multiple"
                  placeholder="Select features"
                  allowClear
                >
                  <Option value="basic-dashboard">Basic Dashboard</Option>
                  <Option value="advanced-dashboard">Advanced Dashboard</Option>
                  <Option value="news">News</Option>
                  <Option value="real-time-data">Real-time Data</Option>
                  <Option value="advanced-analytics">Advanced Analytics</Option>
                  <Option value="portfolio-management">Portfolio Management</Option>
                  <Option value="alerts">Alerts & Notifications</Option>
                  <Option value="export-data">Export Data</Option>
                  <Option value="api-access">API Access</Option>
                  <Option value="custom-indicators">Custom Indicators</Option>
                  <Option value="backtesting">Backtesting</Option>
                </Select>
              </Form.Item>
              
              <Form.Item 
                label="Subscription Plan" 
                name="subscription"
              >
                <Select>
                  <Option value="free">Free</Option>
                  <Option value="basic">Basic</Option>
                  <Option value="premium">Premium</Option>
                  <Option value="enterprise">Enterprise</Option>
                </Select>
              </Form.Item>
              
              <Form.Item 
                label="Active Status" 
                name="isActive"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Form>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default AdminPanel;
