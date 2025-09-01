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
        'Content-Type': 'application/json',
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
    console.log('Response ok:', response.ok);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    // Vì status là 201 Created, response.ok sẽ là true
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      
      // Đọc response as text trước
      const textResult = await response.text();
      console.log('Raw response text:', textResult);
      
      // Thử parse JSON
      try {
        const result = JSON.parse(textResult);
        console.log('Parsed JSON successfully:', result);
        
        if (result.success !== false) {
          alert('Đăng ký thành công!\n' + (result.message || 'Account created successfully'));
          
          // Lưu tokens nếu cần
          if (result.accessToken) {
            localStorage.setItem('accessToken', result.accessToken);
            localStorage.setItem('refreshToken', result.refreshToken);
            console.log('Tokens saved');
          }
        } else {
          alert('Đăng ký thất bại:\n' + result.message);
        }
      } catch (parseError) {
        console.log('Cannot parse JSON:', parseError);
        console.log('Response text:', textResult);
        
        // Nếu status OK nhưng không parse được JSON, coi như thành công
        alert('Đăng ký thành công! (Response không phải JSON format)');
      }
    } else {
      // Status không OK (4xx, 5xx)
      const errorText = await response.text();
      console.log('Error Response:', errorText);
      alert('Đăng ký thất bại với status ' + response.status + ':\n' + errorText);
    }
    
  } catch (error) {
    console.error('Catch block - Full error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Chi tiết hơn về lỗi
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      alert('Lỗi kết nối mạng. Vui lòng kiểm tra:\n- Internet connection\n- Server có đang chạy không?\n- Firewall/Antivirus có block không?');
    } else if (error.name === 'SyntaxError') {
      alert('Lỗi parsing JSON response');
    } else {
      alert('Lỗi không xác định: ' + error.message);
    }
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