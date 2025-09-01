import React from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

export default function Login() {
  const { register, handleSubmit } = useForm();

  const onSubmit = data => {
    // TODO: Gọi API đăng nhập ở đây
    alert('Đăng nhập thành công!');
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