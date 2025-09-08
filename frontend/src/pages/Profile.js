import React, { useEffect, useState } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Card, 
  message, 
  Avatar, 
  Upload, 
  Select, 
  DatePicker, 
  Row, 
  Col, 
  Divider,
  Tag,
  Badge,
  Tabs,
  Spin
} from 'antd';
import { 
  UserOutlined, 
  CameraOutlined, 
  SettingOutlined, 
  CrownOutlined,
  CalendarOutlined,
  PhoneOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import { userService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';

const { Option } = Select;
const { TextArea } = Input;

const Profile = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  // ✅ Gọi API thay vì đọc localStorage
  const fetchUserProfile = async () => {
    setPageLoading(true);
    try {
      const response = await userService.getProfile();
      if (response.data.success) {
        const userData = response.data.user;
        setUser(userData);
        
        // Set form values
        form.setFieldsValue({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          bio: userData.bio,
          phoneNumber: userData.phoneNumber,
          dateOfBirth: userData.dateOfBirth ? moment(userData.dateOfBirth) : null
        });


        // ✅ Cập nhật localStorage với dữ liệu mới từ API
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        message.error('Không thể tải thông tin người dùng');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      message.error('Lỗi khi tải thông tin: ' + (error.response?.data?.message || error.message));
    }
    setPageLoading(false);
  };

  const onFinishProfile = async (values) => {
    setLoading(true);
    try {
      const updateData = {
        ...values,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.toISOString() : null
      };
      
      const res = await userService.updateProfile(updateData);
      if (res.data.success) {
        message.success('Cập nhật thông tin cá nhân thành công!');
        // ✅ Refresh data từ API
        await fetchUserProfile();
      } else {
        message.error('Cập nhật thất bại: ' + res.data.message);
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      message.error('Lỗi cập nhật: ' + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };


  const handleAvatarUpload = async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      const res = await userService.uploadAvatar(formData);
      if (res.data.success) {
        message.success('Cập nhật avatar thành công!');
        await fetchUserProfile();
      } else {
        message.error('Upload thất bại: ' + res.data.message);
      }
    } catch (err) {
      console.error('Error uploading avatar:', err);
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

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // ✅ Loading state
  if (pageLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p>Không tìm thấy thông tin người dùng.</p>
          <Button type="primary" onClick={fetchUserProfile}>
            Thử lại
          </Button>
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
                
                {/* Admin Panel Access Button */}
                {user.role === 'admin' && (
                  <div className="mt-4 pt-4 border-t">
                    <Button 
                      type="primary" 
                      icon={<DashboardOutlined />}
                      onClick={() => navigate('/admin')}
                      className="w-full"
                      size="large"
                    >
                      Admin Panel
                    </Button>
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
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="mt-2 text-gray-600">Manage your personal information and account settings</p>
      </div>
      
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
        className="bg-white rounded-lg shadow-sm p-4"
      />
    </div>
  );
};

export default Profile;