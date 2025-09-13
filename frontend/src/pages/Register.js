import React from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

export default function Register() {
  const { register, handleSubmit } = useForm();
  const navigate = useNavigate();

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
      },
      { withCredentials: true });

      // Nếu API trả về status 201 hoặc 200
      const result = response.data;
      console.log('API response:', result);

      if (result.success !== false) {
        alert('Đăng ký thành công!\n' + (result.message || 'Account created successfully'));
        if (result.accessToken) {
          localStorage.setItem('accessToken', result.accessToken);
          localStorage.setItem('refreshToken', result.refreshToken);
          console.log('Access token saved');
        }
        if (result.user) {
        localStorage.setItem('user', JSON.stringify(result.user));
        }

        navigate('/'); // Chuyển hướng về dashboard
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