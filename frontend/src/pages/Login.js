import React from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { register, handleSubmit } = useForm();
  const navigate = useNavigate();
  const { login } = useAuth();

  const onSubmit = async data => {
    try {
      const response = await authService.login({
        Email: data.email,
        Password: data.password
      });

      const result = response.data;
      if (result.success !== false) {
        alert('Đăng nhập thành công!');
        
        // Sử dụng AuthContext để handle login
        if (result.accessToken && result.user) {
          login(result.user, result.accessToken);
        }
        
        navigate('/'); // Chuyển hướng về trang chủ
      } else {
        alert('Đăng nhập thất bại:\n' + result.message);
      }
    } catch (error) {
      if (error.response) {
        alert('Đăng nhập thất bại với status ' + error.response.status + ':\n' + (error.response.data?.message || error.response.data));
      } else if (error.message.includes('Network Error')) {
        alert('Lỗi kết nối mạng. Vui lòng kiểm tra kết nối Internet hoặc server.');
      } else {
        alert('Lỗi không xác định: ' + error.message);
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-gray-800 p-8 rounded shadow-md w-80 transition-colors duration-200">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">Đăng nhập</h2>
        <input
          {...register('email')}
          type="email"
          placeholder="Email"
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
        <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors duration-200">
          Đăng nhập
        </button>
        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
          Chưa có tài khoản? <Link to="/register" className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300">Đăng ký</Link>
        </p>
      </form>
    </div>
  );
}