import React from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { authService, userService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const { register, handleSubmit } = useForm();
  const navigate = useNavigate();
  const { login } = useAuth();

  const onSubmit = async data => {
    if (data.password !== data.confirmPassword) {
      alert('Mật khẩu xác nhận không khớp!');
      return;
    }

    try {
      console.log('Registering user:', data);

      const response = await authService.register({
        Email: data.email,
        Password: data.password,
        FirstName: data.firstName,
        LastName: data.lastName,
        ConfirmPassword: data.confirmPassword
      });

      const result = response.data;
      console.log('API response:', result);

      if (result.success !== false) {
        alert('Đăng ký thành công!\n' + (result.message || 'Account created successfully'));
        
        // Sử dụng AuthContext để handle login sau khi đăng ký thành công
        if (result.accessToken && result.user) {
          login(result.user, result.accessToken);
          
          // Fetch user profile từ user-service và lưu vào localStorage
          try {
            const profileResponse = await userService.getProfile();
            if (profileResponse.data.success) {
              const userData = profileResponse.data.user;
              // Lưu thông tin profile đầy đủ vào localStorage
              localStorage.setItem('user', JSON.stringify(userData));
              console.log('User profile fetched and saved to localStorage:', userData);
            } else {
              console.warn('Could not fetch user profile:', profileResponse.data.message);
            }
          } catch (profileError) {
            console.error('Error fetching user profile after registration:', profileError);
            // Không block registration process nếu fetch profile thất bại
          }
        }

        navigate('/'); // Chuyển hướng về trang chủ
      } else {
        alert('Đăng ký thất bại:\n' + result.message);
      }
    } catch (error) {
      console.error('Catch block - Full error:', error);
      if (error.response) {
        alert('Đăng ký thất bại với status ' + error.response.status + ':\n' + (error.response.data?.message || error.response.data));
      } else if (error.message.includes('Network Error')) {
        alert('Lỗi kết nối mạng. Vui lòng kiểm tra:\n- Internet connection\n- Server có đang chạy không?\n- Firewall/Antivirus có block không?');
      } else {
        alert('Lỗi không xác định: ' + error.message);
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-gray-800 p-8 rounded shadow-md w-80 transition-colors duration-200">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">Đăng ký</h2>
        <input
          {...register('email')}
          type="email"
          placeholder="Email"
          className="w-full mb-4 p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400"
          required
        />
        <input
          {...register('firstName')}
          type="text"
          placeholder="Họ"
          className="w-full mb-4 p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400"
          required
        />
        <input
          {...register('lastName')}
          type="text"
          placeholder="Tên"
          className="w-full mb-4 p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400"
          required
        />
        <input
          {...register('password')}
          type="password"
          placeholder="Mật khẩu"
          className="w-full mb-4 p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400"
          required
        />
        <input
          {...register('confirmPassword')}
          type="password"
          placeholder="Xác nhận mật khẩu"
          className="w-full mb-4 p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400"
          required
        />
        <button type="submit" className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 transition-colors duration-200">
          Đăng ký
        </button>
        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
          Đã có tài khoản? <Link to="/login" className="text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300">Đăng nhập</Link>
        </p>
      </form>
    </div>
  );
}