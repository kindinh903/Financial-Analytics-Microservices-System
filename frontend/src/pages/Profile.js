import React, { useEffect, useState } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Card, 
  message, 
  Avatar, 
  Upload, 
  Switch, 
  Select, 
  DatePicker, 
  Row, 
  Col, 
  Divider,
  Tag,
  Badge,
  Tabs
} from 'antd';
import { 
  UserOutlined, 
  CameraOutlined, 
  SettingOutlined, 
  BellOutlined,
  HomeOutlined,
  CrownOutlined,
  CalendarOutlined,
  PhoneOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import { userService } from '../services/api';
import moment from 'moment';

const { Option } = Select;
const { TextArea } = Input;

const Profile = () => {
  const [form] = Form.useForm();
  const [preferencesForm] = Form.useForm();
  const [addressForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      // Lấy user từ localStorage hoặc API
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Set form values
        form.setFieldsValue({
          firstName: parsedUser.firstName,
          lastName: parsedUser.lastName,
          email: parsedUser.email,
          bio: parsedUser.bio,
          phoneNumber: parsedUser.phoneNumber,
          dateOfBirth: parsedUser.dateOfBirth ? moment(parsedUser.dateOfBirth) : null
        });

        preferencesForm.setFieldsValue({
          theme: parsedUser.preferences?.theme || 'light',
          timezone: parsedUser.preferences?.timezone || 'UTC',
          currency: parsedUser.preferences?.currency || 'USD',
          emailNotifications: parsedUser.preferences?.notifications?.email || true,
          pushNotifications: parsedUser.preferences?.notifications?.push || true,
          smsNotifications: parsedUser.preferences?.notifications?.sms || false
        });

        addressForm.setFieldsValue({
          street: parsedUser.address?.street,
          city: parsedUser.address?.city,
          state: parsedUser.address?.state,
          country: parsedUser.address?.country,
          zipCode: parsedUser.address?.zipCode
        });
      }
    } catch (error) {
      message.error('Lỗi khi tải thông tin người dùng');
    }
  };

  const onFinishProfile = async (values) => {
    setLoading(true);
    try {
      const updateData = {
        ...values,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.toISOString() : null
      };
      
      const res = await userService.updateProfile(updateData);
      if (res.data.success !== false) {
        message.success('Cập nhật thông tin cá nhân thành công!');
        const updatedUser = { ...user, ...updateData };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        message.error('Cập nhật thất bại: ' + res.data.message);
      }
    } catch (err) {
      message.error('Lỗi cập nhật: ' + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };

  const onFinishPreferences = async (values) => {
    setLoading(true);
    try {
      const preferencesData = {
        preferences: {
          theme: values.theme,
          timezone: values.timezone,
          currency: values.currency,
          notifications: {
            email: values.emailNotifications,
            push: values.pushNotifications,
            sms: values.smsNotifications
          }
        }
      };
      
      const res = await userService.updateProfile(preferencesData);
      if (res.data.success !== false) {
        message.success('Cập nhật cài đặt thành công!');
        const updatedUser = { ...user, ...preferencesData };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        message.error('Cập nhật thất bại: ' + res.data.message);
      }
    } catch (err) {
      message.error('Lỗi cập nhật: ' + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };

  const onFinishAddress = async (values) => {
    setLoading(true);
    try {
      const addressData = { address: values };
      
      const res = await userService.updateProfile(addressData);
      if (res.data.success !== false) {
        message.success('Cập nhật địa chỉ thành công!');
        const updatedUser = { ...user, ...addressData };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        message.error('Cập nhật thất bại: ' + res.data.message);
      }
    } catch (err) {
      message.error('Lỗi cập nhật: ' + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };

  const handleAvatarUpload = async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      const res = await userService.uploadAvatar(formData);
      if (res.data.success !== false) {
        message.success('Cập nhật avatar thành công!');
        const updatedUser = { ...user, avatar: res.data.avatarUrl };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      message.error('Lỗi upload avatar: ' + (err.response?.data?.message || err.message));
    }
    return false; // Prevent default upload
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      user: { color: 'default', icon: <UserOutlined /> },
      premium: { color: 'gold', icon: <CrownOutlined /> },
      admin: { color: 'red', icon: <SettingOutlined /> }
    };
    
    const config = roleConfig[role] || roleConfig.user;
    return <Badge color={config.color} text={role?.toUpperCase()} />;
  };

  const getSubscriptionStatus = (subscription) => {
    if (!subscription || !subscription.isActive) {
      return <Tag color="default">Chưa đăng ký</Tag>;
    }
    
    const planColors = {
      free: 'default',
      basic: 'blue',
      premium: 'gold',
      enterprise: 'purple'
    };
    
    return <Tag color={planColors[subscription.plan]}>{subscription.plan.toUpperCase()}</Tag>;
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  const tabItems = [
    {
      key: 'profile',
      label: (
        <span>
          <UserOutlined />
          Thông tin cá nhân
        </span>
      ),
      children: (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={8}>
            <Card className="text-center">
              <Upload
                name="avatar"
                listType="picture-circle"
                className="avatar-uploader"
                showUploadList={false}
                beforeUpload={handleAvatarUpload}
              >
                <Avatar 
                  size={120} 
                  src={user.avatar} 
                  icon={<UserOutlined />}
                  className="mb-4"
                />
                <div className="mt-2">
                  <Button icon={<CameraOutlined />} type="text">
                    Thay đổi ảnh
                  </Button>
                </div>
              </Upload>
              
              <Divider />
              
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold">{user.firstName} {user.lastName}</h3>
                  <p className="text-gray-500">{user.email}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Vai trò:</p>
                  {getRoleBadge(user.role)}
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Gói dịch vụ:</p>
                  {getSubscriptionStatus(user.subscription)}
                </div>
                
                {user.features && user.features.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Tính năng:</p>
                    <div className="flex flex-wrap gap-1">
                      {user.features.map((feature, index) => (
                        <Tag key={index} size="small">{feature}</Tag>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </Col>
          
          <Col xs={24} lg={16}>
            <Card title="Chỉnh sửa thông tin">
              <Form
                form={form}
                layout="vertical"
                onFinish={onFinishProfile}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item 
                      label="Họ" 
                      name="firstName" 
                      rules={[{ required: true, message: 'Vui lòng nhập họ!' }]}
                    >
                      <Input prefix={<UserOutlined />} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item 
                      label="Tên" 
                      name="lastName" 
                      rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}
                    >
                      <Input prefix={<UserOutlined />} />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Form.Item label="Email" name="email">
                  <Input prefix={<UserOutlined />} disabled />
                </Form.Item>
                
                <Form.Item label="Số điện thoại" name="phoneNumber">
                  <Input prefix={<PhoneOutlined />} />
                </Form.Item>
                
                <Form.Item label="Ngày sinh" name="dateOfBirth">
                  <DatePicker 
                    className="w-full"
                    placeholder="Chọn ngày sinh"
                    format="DD/MM/YYYY"
                  />
                </Form.Item>
                
                <Form.Item label="Giới thiệu bản thân" name="bio">
                  <TextArea 
                    rows={4} 
                    placeholder="Viết vài dòng về bản thân..." 
                    maxLength={500}
                    showCount
                  />
                </Form.Item>
                
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading} size="large">
                    Lưu thay đổi
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'address',
      label: (
        <span>
          <HomeOutlined />
          Địa chỉ
        </span>
      ),
      children: (
        <Card title="Thông tin địa chỉ">
          <Form
            form={addressForm}
            layout="vertical"
            onFinish={onFinishAddress}
          >
            <Form.Item label="Địa chỉ" name="street">
              <Input placeholder="Số nhà, tên đường..." />
            </Form.Item>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Thành phố" name="city">
                  <Input placeholder="Thành phố" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Tỉnh/Bang" name="state">
                  <Input placeholder="Tỉnh/Bang" />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Quốc gia" name="country">
                  <Select placeholder="Chọn quốc gia">
                    <Option value="VN">Việt Nam</Option>
                    <Option value="US">Hoa Kỳ</Option>
                    <Option value="JP">Nhật Bản</Option>
                    <Option value="KR">Hàn Quốc</Option>
                    <Option value="CN">Trung Quốc</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Mã bưu chính" name="zipCode">
                  <Input placeholder="Mã bưu chính" />
                </Form.Item>
              </Col>
            </Row>
            
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} size="large">
                Cập nhật địa chỉ
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'preferences',
      label: (
        <span>
          <SettingOutlined />
          Cài đặt
        </span>
      ),
      children: (
        <Card title="Tùy chỉnh & Thông báo">
          <Form
            form={preferencesForm}
            layout="vertical"
            onFinish={onFinishPreferences}
          >
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Card size="small" title="Giao diện" className="mb-4">
                  <Form.Item label="Chủ đề" name="theme">
                    <Select>
                      <Option value="light">Sáng</Option>
                      <Option value="dark">Tối</Option>
                    </Select>
                  </Form.Item>
                  
                  <Form.Item label="Múi giờ" name="timezone">
                    <Select>
                      <Option value="UTC">UTC</Option>
                      <Option value="Asia/Ho_Chi_Minh">Hồ Chí Minh</Option>
                      <Option value="America/New_York">New York</Option>
                      <Option value="Europe/London">London</Option>
                      <Option value="Asia/Tokyo">Tokyo</Option>
                    </Select>
                  </Form.Item>
                  
                  <Form.Item label="Tiền tệ" name="currency">
                    <Select>
                      <Option value="VND">VND (₫)</Option>
                      <Option value="USD">USD ($)</Option>
                      <Option value="EUR">EUR (€)</Option>
                      <Option value="JPY">JPY (¥)</Option>
                    </Select>
                  </Form.Item>
                </Card>
              </Col>
              
              <Col xs={24} md={12}>
                <Card size="small" title={<><BellOutlined /> Thông báo</>}>
                  <Form.Item 
                    label="Email thông báo" 
                    name="emailNotifications" 
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                  
                  <Form.Item 
                    label="Thông báo đẩy" 
                    name="pushNotifications" 
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                  
                  <Form.Item 
                    label="SMS thông báo" 
                    name="smsNotifications" 
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Card>
              </Col>
            </Row>
            
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} size="large">
                Lưu cài đặt
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Hồ sơ cá nhân</h1>
          <p className="text-gray-600">Quản lý thông tin cá nhân và cài đặt tài khoản</p>
        </div>
        
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
          className="bg-white rounded-lg shadow-sm p-4"
        />
      </div>
    </div>
  );
};

export default Profile;