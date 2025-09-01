import React from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

export default function Register() {
  const { register, handleSubmit } = useForm();

  const onSubmit = async data => {
    if (data.password !== data.confirmPassword) {
      alert('Mật khẩu xác nhận không khớp!');
      return;
    }
    try {
        console.log('Registering user:', data);
      const response = await fetch('http://localhost:8080/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          Email: data.email,
          Password: data.password,
          FirstName: data.firstName,
          LastName: data.lastName,
          ConfirmPassword: data.confirmPassword
        })
      });
      console.log('Response status:', response.status);
      const result = await response.json();
      console.log(result);
      if (response.ok && result.success) {
        alert('Đăng ký thành công!\n' + result.message);
        // Có thể chuyển hướng sang trang đăng nhập ở đây
      } else {
        alert('Đăng ký thất bại:\n' + (result.message || JSON.stringify(result, null, 2)));
      }
    } catch (error) {
      alert('Regis fail: ' + error.message);
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
          {...register('firstName')}
          type="text"
          placeholder="Họ"
          className="w-full mb-4 p-2 border rounded"
          required
        />
        <input
          {...register('lastName')}
          type="text"
          placeholder="Tên"
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
          placeholder="Xác nhận mật khẩu"
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