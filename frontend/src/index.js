import React from 'react';
import ReactDOM from 'react-dom/client';

function App() {
  React.useEffect(() => {
    // Gọi gateway health check
    fetch('http://localhost:8080/health')
      .then(res => res.text())
      .then(console.log);
      
    // Test các services qua gateway
    fetch('http://localhost:8080/api/auth/health')
      .then(res => res.text())
      .then(data => console.log('Auth Service via Gateway:', data));
      
    fetch('http://localhost:8080/api/price/health')
      .then(res => res.text())
      .then(data => console.log('Price Service via Gateway:', data));
  }, []);
  
  return <div>Financial Analytics Frontend</div>;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);