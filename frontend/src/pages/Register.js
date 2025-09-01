import React from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

export default function Register() {
  const { register, handleSubmit } = useForm();

  const onSubmit = async data => {
    try {
      const response = await fetch('http://localhost:8080/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          confirmPassword: data.confirmPassword
        })
      });

      if (response.ok) {
        alert('Đăng ký thành công!');
        // Có thể chuyển hướng sang trang đăng nhập ở đây
      } else {
        const errorData = await response.json();
        alert('Đăng ký thất bại: ' + (errorData.message || 'Có lỗi xảy ra'));
      }
    } catch (error) {
      alert('Đăng ký thất bại: ' + error.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded shadow-md w-80">
        <h2 className="text-2xl font-bold mb-6 text-center">Đăng ký</h2>
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
        <input
          {...register('confirmPassword')}
          type="password"
          placeholder="Nhập lại mật khẩu"
          className="w-full mb-4 p-2 border rounded"
          required
        />
        <button type="submit" className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600">
          Đăng ký
        </button>
        <p className="mt-4 text-center text-sm">
          Đã có tài khoản? <Link to="/login" className="text-green-500">Đăng nhập</Link>
        </p>
      </form>
    </div>
  );
}