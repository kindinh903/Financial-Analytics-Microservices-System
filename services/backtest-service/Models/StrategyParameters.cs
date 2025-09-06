using System.ComponentModel.DataAnnotations;

namespace BacktestService.Models
{
    public class StrategyParameters
    {
        private readonly Dictionary<string, object> _parameters = new();

        public void SetParameter<T>(string key, T value)
        {
            if (string.IsNullOrWhiteSpace(key))
                throw new ArgumentException("Parameter key cannot be null or empty", nameof(key));
            
            _parameters[key] = value ?? throw new ArgumentNullException(nameof(value));
        }

        public T GetParameter<T>(string key, T defaultValue = default!)
        {
            if (string.IsNullOrWhiteSpace(key))
                throw new ArgumentException("Parameter key cannot be null or empty", nameof(key));

            if (_parameters.TryGetValue(key, out var value) && value is T typedValue)
            {
                return typedValue;
            }

            return defaultValue;
        }

        public bool HasParameter(string key)
        {
            return !string.IsNullOrWhiteSpace(key) && _parameters.ContainsKey(key);
        }

        public void RemoveParameter(string key)
        {
            if (!string.IsNullOrWhiteSpace(key))
            {
                _parameters.Remove(key);
            }
        }

        public Dictionary<string, object> GetAllParameters()
        {
            return new Dictionary<string, object>(_parameters);
        }

        public void Clear()
        {
            _parameters.Clear();
        }
    }
}

