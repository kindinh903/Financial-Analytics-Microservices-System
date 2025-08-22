import ReactDOM from 'react-dom/client';

function App() {
  React.useEffect(() => {
    fetch('http://localhost:8080/health')
      .then(res => res.text())
      .then(console.log);
  }, []);
  return <div>Financial Analytics Frontends</div>;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);