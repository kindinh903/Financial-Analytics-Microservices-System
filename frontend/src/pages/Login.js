import React from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

export default function Login() {
  const { register, handleSubmit } = useForm();
  const navigate = useNavigate();

  const onSubmit = async data => {
    try {
      const response = await authService.login({
        Email: data.email,
        Password: data.password
      });

      const result = response.data;
      if (result.success !== false) {
        alert('Đăng nhập thành công!');
        if (result.accessToken) {
          localStorage.setItem('accessToken', result.accessToken);
          localStorage.setItem('refreshToken', result.refreshToken);
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
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded shadow-md w-80">
        <h2 className="text-2xl font-bold mb-6 text-center">Đăng nhập</h2>
        <input
          {...register('email')}
          type="email"
          placeholder="Email"
          className="w-full mb-4 p-2 border rounded"
          required
        />
        <input
          {...register('password')}
          type="password"
          placeholder="Mật khẩu"
          className="w-full mb-4 p-2 border rounded"
          required
        />
        <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">
          Đăng nhập
        </button>
        <p className="mt-4 text-center text-sm">
          Chưa có tài khoản? <Link to="/register" className="text-blue-500">Đăng ký</Link>
        </p>
      </form>
    </div>
  );
}